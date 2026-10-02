import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/main.js';
import { users } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let db: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    db = app.get('DrizzleDatabase');
  });

  afterAll(async () => {
    if (db) {
      await db.delete(users).where(eq(users.email, 'e2e@example.com'));
    }
    await app.close();
  });

  it('/api/v1/auth/register (POST) - success and conflict', async () => {
    const body = {
      email: 'e2e@example.com',
      username: 'e2e_user',
      name: 'E2E User',
      password: 'Password123!',
    };

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(body)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(body)
      .expect(409);
  });
});
