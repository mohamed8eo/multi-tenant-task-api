import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        routeConflictPolicy: { duplicate: 'error', shadow: 'warn' },
    });
    app.use(cookieParser())
    app.setGlobalPrefix('api/v1')

    await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
