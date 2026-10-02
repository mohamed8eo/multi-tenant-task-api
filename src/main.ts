import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupApp(app: INestApplication) {
    app.use(cookieParser());
    app.useSecurityHeaders();
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
    app.setGlobalPrefix('api/v1');
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        routeConflictPolicy: { duplicate: 'error', shadow: 'warn' },
    });
    app.enableShutdownHooks();
    setupApp(app);

    const config = new DocumentBuilder()
        .setTitle('multi-tenant-task-api')
        .setDescription('API documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    await app.listen(process.env.PORT ?? 3000);
}

if (process.env.NODE_ENV !== 'test') {
    void bootstrap();
}
