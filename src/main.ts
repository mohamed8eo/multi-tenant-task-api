import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        routeConflictPolicy: { duplicate: 'error', shadow: 'warn' },
    });
    app.use(cookieParser());
    app.useSecurityHeaders();
    app.enableCors();
    app.enableCsrfProtection();
    app.setGlobalPrefix('api/v1')


    const config = new DocumentBuilder()
        .setTitle('multi-tenant')
        .setDescription('API documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('docs', app, document);


    await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
