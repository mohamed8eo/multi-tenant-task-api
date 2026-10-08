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

describe('Members rules (e2e)', () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let owner: TestUser;
  let admin: TestUser;
  let admin2: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let orgId: string;
  const orgs: string[] = [];

  const roleOf = (members: { userId: string; role: string }[], userId: string) =>
    members.find((m) => m.userId === userId)?.role;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    owner = await registerUser(app, 'owner');
    admin = await registerUser(app, 'admin');
    admin2 = await registerUser(app, 'admintwo');
    member = await registerUser(app, 'member');
    outsider = await registerUser(app, 'outsider');
  });

  // a fresh organization per test, so destructive tests cannot affect each other
  beforeEach(async () => {
    orgId = await createOrg(app, owner);
    orgs.push(orgId);
    await addMember(db, orgId, admin.id, 'admin');
    await addMember(db, orgId, admin2.id, 'admin');
    await addMember(db, orgId, member.id, 'member');
  });

  afterAll(async () => {
    await cleanup(
      db,
      orgs,
      [owner.id, admin.id, admin2.id, member.id, outsider.id],
    );
    await app.close();
  });

  describe('GET /members', () => {
    it('lets any member list members, without password data', async () => {
      const res = await call(app, 'get', '/members', member, orgId).expect(200);
      expect(res.body).toHaveLength(4);
      expect(roleOf(res.body, owner.id)).toBe('owner');
      expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    });

    it('blocks non-members (403)', async () => {
      await call(app, 'get', '/members', outsider, orgId).expect(403);
    });
  });

  describe('PATCH /members/:userId', () => {
    it('lets the owner promote a member to admin', async () => {
      await call(app, 'patch', `/members/${member.id}`, owner, orgId)
        .send({ role: 'admin' })
        .expect(204);

      const res = await call(app, 'get', '/members', owner, orgId).expect(200);
      expect(roleOf(res.body, member.id)).toBe('admin');
    });

    it("never lets the owner's role change, even by the owner (403)", async () => {
      await call(app, 'patch', `/members/${owner.id}`, owner, orgId)
        .send({ role: 'member' })
        .expect(403);
    });

    it('rejects role "owner" in the body (400)', async () => {
      await call(app, 'patch', `/members/${member.id}`, owner, orgId)
        .send({ role: 'owner' })
        .expect(400);
    });

    it('does not let an admin change roles (403)', async () => {
      await call(app, 'patch', `/members/${member.id}`, admin, orgId)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('does not let an admin demote the owner (403)', async () => {
      await call(app, 'patch', `/members/${owner.id}`, admin, orgId)
        .send({ role: 'member' })
        .expect(403);

      const res = await call(app, 'get', '/members', owner, orgId).expect(200);
      expect(roleOf(res.body, owner.id)).toBe('owner');
    });

    it('does not let a member change roles (403)', async () => {
      await call(app, 'patch', `/members/${admin.id}`, member, orgId)
        .send({ role: 'member' })
        .expect(403);
    });

    it('returns 404 for a user who is not in this organization', async () => {
      await call(app, 'patch', `/members/${outsider.id}`, owner, orgId)
        .send({ role: 'admin' })
        .expect(404);
    });

    it('returns 400 for an invalid user id', async () => {
      await call(app, 'patch', '/members/abc', owner, orgId)
        .send({ role: 'admin' })
        .expect(400);
    });
  });

  describe('DELETE /members/:userId', () => {
    it('lets the owner remove an admin, who then loses access', async () => {
      await call(app, 'delete', `/members/${admin.id}`, owner, orgId).expect(204);
      await call(app, 'get', '/members', admin, orgId).expect(403);
    });

    it('lets the owner remove a member', async () => {
      await call(app, 'delete', `/members/${member.id}`, owner, orgId).expect(204);
    });

    it('lets an admin remove a member', async () => {
      await call(app, 'delete', `/members/${member.id}`, admin, orgId).expect(204);
    });

    it('does not let an admin remove another admin (403)', async () => {
      await call(app, 'delete', `/members/${admin2.id}`, admin, orgId).expect(403);
    });

    it('does not let an admin remove the owner (403)', async () => {
      await call(app, 'delete', `/members/${owner.id}`, admin, orgId).expect(403);
    });

    it('never lets the owner be removed, even by the owner (403)', async () => {
      await call(app, 'delete', `/members/${owner.id}`, owner, orgId).expect(403);
    });

    it('does not let a member remove anyone (403)', async () => {
      await call(app, 'delete', `/members/${admin.id}`, member, orgId).expect(403);
    });

    it('returns 404 for a user who is not in this organization', async () => {
      await call(app, 'delete', `/members/${outsider.id}`, owner, orgId).expect(404);
    });
  });
});
