import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { RegisterDto } from './dto/register.dto.js';
import { users, refreshTokens } from './../db/schema/index.js'
import * as argon2 from 'argon2';
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
        let user;
        try {
            const [insertedUser] = await this.db
                .insert(users)
                .values({
                    email: dto.email,
                    username: dto.username,
                    name: dto.name,
                    password: hashedPassword,
                }).returning();
            user = insertedUser;
        } catch (err: any) {
            const code = err.code || err.cause?.code;
            if (code === '23505') {
                const detail = err.detail || '';
                const constraint = err.constraint || '';
                if (detail.includes('email') || constraint.includes('email')) {
                    throw new ConflictException('Email already exists');
                }
                if (detail.includes('username') || constraint.includes('username')) {
                    throw new ConflictException('Username already exists');
                }
                throw new ConflictException('User already exists');
            }
            throw err;
        }

        const { accessToken, refreshToken } = await this.createToken(user.id)

        await this.saveRefreshToken(user.id, refreshToken);

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

    async login(dto: LoginDto): Promise<LoginResponse> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.email, dto.email))
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isValid = await argon2.verify(user.password, dto.password)
        if (!isValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const { accessToken, refreshToken } = await this.createToken(user.id)
        await this.saveRefreshToken(user.id, refreshToken);

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
        let payload: { sub: string };
        try {
            payload = await this.jwtService.verifyAsync(oldRefreshToken, {
                secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const userId = payload.sub;

        const storedTokens = await this.db
            .select()
            .from(refreshTokens)
            .where(eq(refreshTokens.userId, userId));

        let validTokenRecord = null;
        for (const record of storedTokens) {
            if (record.revokedAt !== null) {
                continue;
            }
            if (new Date() > record.expiresAt) {
                continue;
            }
            const isValid = await argon2.verify(record.tokenHash, oldRefreshToken);
            if (isValid) {
                validTokenRecord = record;
                break;
            }
        }

        if (!validTokenRecord) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Revoke Token A
        await this.db
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(eq(refreshTokens.id, validTokenRecord.id));

        const { accessToken, refreshToken } = await this.createToken(userId);
        await this.saveRefreshToken(userId, refreshToken);

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

    async createToken(userID: string): Promise<TokenResponse> {
        const payload = {
            sub: userID
        }

        const accessToken: string = await this.jwtService.signAsync(payload)
        const refreshToken: string = await this.jwtService.signAsync(payload, {
            secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN') as StringValue,
        })
        return {
            accessToken,
            refreshToken,
        }

    }

    private async saveRefreshToken(userId: string, refreshToken: string) {
        const tokenHash = await argon2.hash(refreshToken);
        const expiresAt = new Date(
            Date.now() + ms(this.config.getOrThrow<StringValue>('JWT_REFRESH_EXPIRES_IN')),
        );

        await this.db.insert(refreshTokens).values({
            userId,
            tokenHash,
            expiresAt,
        });
    }
}
