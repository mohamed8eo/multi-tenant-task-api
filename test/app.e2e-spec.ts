import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/main.js';
import { users, organizations } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

describe('Auth & Organizations (e2e)', () => {
  let app: INestApplication;
  let db: any;
  let accessToken: string;

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
      await db.delete(organizations).where(eq(organizations.name, 'E2E Org'));
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

  it('/api/v1/auth/login (POST) - success', async () => {
    const loginBody = {
      email: 'e2e@example.com',
      password: 'Password123!',
    };
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(loginBody)
      .expect(200);

    accessToken = res.body.accessToken;
    expect(accessToken).toBeDefined();
  });

  it('/api/v1/organizations (POST & GET) - create and list organizations', async () => {
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E Org' })
      .expect(201);

    expect(orgRes.body).toHaveProperty('id');
    expect(orgRes.body.name).toBe('E2E Org');
    expect(orgRes.body.role).toBe('owner');

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThan(0);
    expect(listRes.body.find((o: any) => o.name === 'E2E Org')).toBeDefined();
  });
});
