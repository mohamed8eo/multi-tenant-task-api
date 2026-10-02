import { Body, Controller, Post, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { Response } from 'express';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.register(dto)
        this.setRefreshTokenCookie(res, result.refreshToken)

        return {
            user: result.user,
            accessToken: result.accessToken,
        };
    }

    @Post('login')
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.login(dto)

        this.setRefreshTokenCookie(res, result.refreshToken)

        return {
            user: result.user,
            accessToken: result.accessToken,
        };
    }

    @Post('refresh')
    async refresh(
        @Req() req: { cookies?: Record<string, string> },
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }

        const result = await this.authService.refresh(refreshToken);

        this.setRefreshTokenCookie(res, result.refreshToken)
        return {
            accessToken: result.accessToken,
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    async logout(
        @Req() req: { user: { userId: string } },
        @Res({ passthrough: true }) res: Response,
    ) {
        await this.authService.logout(req.user.userId);
        res.clearCookie(REFRESH_TOKEN_COOKIE);

        return {
            message: 'Logged out successfully',
        };
    }

    private setRefreshTokenCookie(
        res: Response,
        refreshToken: string,
    ) {
        res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
        });
    }
}
