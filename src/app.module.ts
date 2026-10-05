import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { MembersModule } from './members/members.module.js';
import { InvitationModule } from './invitation/invitation.module.js';
import Joi from 'joi';

const validationSchema = Joi.object({
    DATABASE_URL: Joi.string().required(),
    JWT_ACCESS_SECRET: Joi.string().required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
    JWT_REFRESH_SECRET: Joi.string().required(),
    JWT_REFRESH_EXPIRES_IN: Joi.string().required(),
    FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
    PORT: Joi.number().default(3000),
}).unknown(true);

function validate(config: Record<string, unknown>) {
    const { error, value } = validationSchema.validate(config, {
        abortEarly: false,
    });
    if (error) {
        throw new Error(`Config validation error: ${error.message}`);
    }
    return value;
}

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate,
        }),
        DrizzleModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                drizzle,
                connection: config.getOrThrow<string>('DATABASE_URL'),
            })
        }),
        AuthModule,
        HealthModule,
        OrganizationsModule,
        MembersModule,
        InvitationModule,
    ],
    controllers: [],
    providers: [
        {
            provide: APP_PIPE,
            useValue: new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
                transformOptions: {
                    enableImplicitConversion: true,
                },
                validationError: {
                    target: false,
                    value: false,
                }
            })
        }
    ]
})
export class AppModule { }
