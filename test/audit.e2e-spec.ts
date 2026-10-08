import { INestApplication } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  addMember,
  call,
  cleanup,
  createOrg,
  createTestApp,
  registerUser,
  type TestUser,
} from './helpers.js';

describe('Audit Logs endpoints (e2e)', () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let owner: TestUser;
  let admin: TestUser;
  let member: TestUser;
  let orgId: string;
  const orgs: string[] = [];

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    owner = await registerUser(app, 'aowner');
    admin = await registerUser(app, 'aadmin');
    member = await registerUser(app, 'amember');
  });

  beforeEach(async () => {
    orgId = await createOrg(app, owner, `Audit Org ${Date.now()}`);
    orgs.push(orgId);
    await addMember(db, orgId, admin.id, 'admin');
    await addMember(db, orgId, member.id, 'member');
  });

  afterAll(async () => {
    await cleanup(db, orgs, [owner.id, admin.id, member.id]);
    await app.close();
  });

  it('blocks regular members from viewing audit logs (403)', async () => {
    await call(app, 'get', '/audit-logs', member, orgId).expect(403);
  });

  it('lets owner/admin view audit logs', async () => {
    const res = await call(app, 'get', '/audit-logs', owner, orgId).expect(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
  });
});
