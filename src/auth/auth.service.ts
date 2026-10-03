import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { RegisterDto } from './dto/register.dto.js';
import { users, refreshTokens } from './../db/schema/index.js'
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { RegisterResponse } from './interfaces/register.interface.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponse } from './interfaces/login.interface.js';
import { eq, and, isNull } from 'drizzle-orm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenResponse } from './interfaces/token.interface.js'
import type { StringValue } from 'ms';
import ms from 'ms';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
        @InjectDrizzle() private readonly db: NodePgDatabase
    ) { }

    async register(dto: RegisterDto): Promise<RegisterResponse> {
        const hashedPassword = await argon2.hash(dto.password);
        const userId = crypto.randomUUID();

        const { accessToken, refreshToken, tokenId } = await this.createToken(userId);
        const tokenHash = await argon2.hash(refreshToken);
        const expiresAt = new Date(
            Date.now() + ms(this.config.getOrThrow<StringValue>('JWT_REFRESH_EXPIRES_IN')),
        );

        let user: any;
        try {
            await this.db.transaction(async (tx) => {
                const [insertedUser] = await tx
                    .insert(users)
                    .values({
                        id: userId,
                        email: dto.email,
                        username: dto.username,
                        name: dto.name,
                        password: hashedPassword,
                    })
                    .returning();
                user = insertedUser;

                await tx.insert(refreshTokens).values({
                    id: tokenId,
                    userId: user.id,
                    tokenHash,
                    expiresAt,
                });
            });
        } catch (err: any) {
            const pgErr = err.cause ?? err;
            if (pgErr.code === '23505') {
                const constraint = pgErr.constraint ?? '';
                if (constraint.includes('email')) {
                    throw new ConflictException('Email already exists');
                }
                if (constraint.includes('username')) {
                    throw new ConflictException('Username already exists');
                }
                throw new ConflictException('User already exists');
            }
            throw err;
        }

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
            },
            accessToken,
            refreshToken,
        };
    }



    async login(dto: LoginDto): Promise<LoginResponse> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.email, dto.email))

        const passwordToVerify = user ? user.password : this.dummyHash
        const isValid = await argon2.verify(passwordToVerify, dto.password)
        if (!user || !isValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const { accessToken, refreshToken, tokenId } = await this.createToken(user.id)
        await this.saveRefreshToken(user.id, refreshToken, tokenId);

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
            },
            accessToken,
            refreshToken,
        }
    }

    async refresh(oldRefreshToken: string): Promise<TokenResponse> {
        let payload: { sub: string; jti: string };
        try {
            payload = await this.jwtService.verifyAsync(oldRefreshToken, {
                secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const userId = payload.sub;
        const tokenId = payload.jti;

        if (!tokenId) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const [tokenRecord] = await this.db
            .select()
            .from(refreshTokens)
            .where(
                and(
                    eq(refreshTokens.id, tokenId),
                    eq(refreshTokens.userId, userId),
                ),
            );

        if (!tokenRecord) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (tokenRecord.revokedAt !== null || new Date() > tokenRecord.expiresAt) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Revoke Token A
        await this.db
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(eq(refreshTokens.id, tokenRecord.id));

        const { accessToken, refreshToken, tokenId: newTokenId } = await this.createToken(userId);
        await this.saveRefreshToken(userId, refreshToken, newTokenId);

        return {
            accessToken,
            refreshToken,
        };
    }

    async logout(userId: string): Promise<void> {
        await this.db
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(
                and(
                    eq(refreshTokens.userId, userId),
                    isNull(refreshTokens.revokedAt),
                ),
            );
    }

    async createToken(userID: string): Promise<TokenResponse & { tokenId: string }> {
        const tokenId = crypto.randomUUID();
        const accessPayload = {
            sub: userID,
        };
        const refreshPayload = {
            sub: userID,
            jti: tokenId,
        };

        const accessToken: string = await this.jwtService.signAsync(accessPayload)
        const refreshToken: string = await this.jwtService.signAsync(refreshPayload, {
            secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN') as StringValue,
        })
        return {
            accessToken,
            refreshToken,
            tokenId,
        }

    }

    private async saveRefreshToken(userId: string, refreshToken: string, tokenId: string) {
        const tokenHash = await argon2.hash(refreshToken);
        const expiresAt = new Date(
            Date.now() + ms(this.config.getOrThrow<StringValue>('JWT_REFRESH_EXPIRES_IN')),
        );

        await this.db.insert(refreshTokens).values({
            id: tokenId,
            userId,
            tokenHash,
            expiresAt,
        });
    }

    private readonly dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$dHVtbGVzc2VjcmV0aGFzaA';
}
