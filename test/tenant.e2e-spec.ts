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

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let a: TestUser;
  let b: TestUser;
  let orgA: string;
  let orgB: string;
  const extraOrgs: string[] = [];

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    a = await registerUser(app, 'a');
    b = await registerUser(app, 'b');
    orgA = await createOrg(app, a, 'Acme');
    orgB = await createOrg(app, b, 'Globex');
  });

  afterAll(async () => {
    await cleanup(db, [orgA, orgB, ...extraOrgs], [a.id, b.id]);
    await app.close();
  });

  it('returns my organization with my role', async () => {
    const res = await call(app, 'get', '/organizations/current', a, orgA).expect(200);
    expect(res.body).toMatchObject({ id: orgA, name: 'Acme', role: 'owner' });
  });

  it("blocks another user's organization (403)", async () => {
    await call(app, 'get', '/organizations/current', a, orgB).expect(403);
  });

  it('blocks a random organization id (403, same as above)', async () => {
    await call(
      app,
      'get',
      '/organizations/current',
      a,
      '11111111-1111-4111-8111-111111111111',
    ).expect(403);
  });

  it('requires the X-Tenant-Id header (400)', async () => {
    await call(app, 'get', '/organizations/current', a).expect(400);
  });

  it('rejects a malformed X-Tenant-Id (400)', async () => {
    await call(app, 'get', '/organizations/current', a, 'abc').expect(400);
  });

  it('requires a token (401)', async () => {
    await call(app, 'get', '/organizations/current', null, orgA).expect(401);
  });

  it('lists only my organizations', async () => {
    const res = await call(app, 'get', '/organizations', a).expect(200);
    const ids = res.body.map((o: { id: string }) => o.id);
    expect(ids).toContain(orgA);
    expect(ids).not.toContain(orgB);
  });

  it('does not leak members between organizations', async () => {
    const res = await call(app, 'get', '/members', a, orgA).expect(200);
    const emails = res.body.map((m: { email: string }) => m.email);
    expect(emails).toContain(a.email);
    expect(emails).not.toContain(b.email);
  });

  it('gives the same user different roles in different organizations', async () => {
    const shared = await createOrg(app, a, 'Shared');
    extraOrgs.push(shared);
    await addMember(db, shared, b.id, 'member');

    const inShared = await call(app, 'get', '/organizations/current', b, shared).expect(200);
    const inOwn = await call(app, 'get', '/organizations/current', b, orgB).expect(200);
    expect(inShared.body.role).toBe('member');
    expect(inOwn.body.role).toBe('owner');
  });
});
