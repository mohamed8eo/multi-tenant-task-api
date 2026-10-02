import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface AccessTokenPayload {
    sub: string;
}

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
    Strategy,
    'access-token',
) {
    constructor(
        private readonly config: ConfigService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.getOrThrow<string>(
                'JWT_ACCESS_SECRET',
            ),
        });
    }

    async validate(payload: AccessTokenPayload) {
        return {
            userId: payload.sub
        }
    }
}
