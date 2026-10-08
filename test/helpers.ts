import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/main.js';
import { memberships, organizations, users } from '../src/db/schema/index.js';
import type { OrgRole } from '../src/db/schema/memberships.js';

export const PASSWORD = 'Password123!';

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  return { app, db: app.get('DrizzleDatabase') as NodePgDatabase };
}

/** Registers a user with a unique email and returns its id and access token. */
export async function registerUser(
  app: INestApplication,
  tag: string,
): Promise<TestUser> {
  const run = randomBytes(4).toString('hex');
  const email = `${tag}-${run}@example.com`;
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email,
      username: `${tag}_${run}`,
      name: `E2E ${tag}`,
      password: PASSWORD,
    })
    .expect(201);
  return { id: res.body.user.id, email, token: res.body.accessToken };
}

/** Creates an organization owned by `user`. The name is unique per call by default. */
export async function createOrg(
  app: INestApplication,
  user: TestUser,
  name = `E2E Org ${randomBytes(3).toString('hex')}`,
) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/organizations')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ name })
    .expect(201);
  return res.body.id as string;
}

/** Builds a request for /api/v1{url}, with optional bearer token and tenant header. */
export function call(
  app: INestApplication,
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  user: TestUser | null,
  orgId?: string,
) {
  let req = request(app.getHttpServer())[method](`/api/v1${url}`);
  if (user) req = req.set('Authorization', `Bearer ${user.token}`);
  if (orgId) req = req.set('X-Tenant-Id', orgId);
  return req;
}

/** Adds a user to an organization directly in the database (skips the invitation flow). */
export async function addMember(
  db: NodePgDatabase,
  orgId: string,
  userId: string,
  role: OrgRole,
) {
  await db.insert(memberships).values({ organizationId: orgId, userId, role });
}

/** Deletes test data. Memberships, invitations and refresh tokens cascade. */
export async function cleanup(
  db: NodePgDatabase,
  orgIds: string[],
  userIds: string[],
) {
  if (orgIds.length) {
    await db.delete(organizations).where(inArray(organizations.id, orgIds));
  }
  if (userIds.length) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
}
