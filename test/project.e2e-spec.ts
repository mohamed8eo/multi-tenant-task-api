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

describe('Projects endpoints (e2e)', () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let owner: TestUser;
  let admin: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let orgId: string;
  const orgs: string[] = [];

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    owner = await registerUser(app, 'powner');
    admin = await registerUser(app, 'padmin');
    member = await registerUser(app, 'pmember');
    outsider = await registerUser(app, 'poutsider');
  });

  beforeEach(async () => {
    orgId = await createOrg(app, owner, `Project Org ${Date.now()}`);
    orgs.push(orgId);
    await addMember(db, orgId, admin.id, 'admin');
    await addMember(db, orgId, member.id, 'member');
  });

  afterAll(async () => {
    await cleanup(
      db,
      orgs,
      [owner.id, admin.id, member.id, outsider.id],
    );
    await app.close();
  });

  describe('POST /projects', () => {
    it('lets owner/admin create a project', async () => {
      const res = await call(app, 'post', '/projects', owner, orgId)
        .send({
          name: 'New Website',
          description: 'Redesign website',
          status: 'active',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('New Website');
      expect(res.body.status).toBe('active');
    });

    it('blocks regular member from creating a project (403)', async () => {
      await call(app, 'post', '/projects', member, orgId)
        .send({
          name: 'Member Project',
          status: 'active',
        })
        .expect(403);
    });

    it('validates request payload (400)', async () => {
      await call(app, 'post', '/projects', owner, orgId)
        .send({
          name: '', // too short
          status: 'invalid-status',
        })
        .expect(400);
    });
  });

  describe('GET /projects (Pagination)', () => {
    it('returns paginated projects with correct metadata', async () => {
      // Create 3 projects
      for (let i = 1; i <= 3; i++) {
        await call(app, 'post', '/projects', owner, orgId)
          .send({ name: `Project ${i}`, status: 'active' })
          .expect(201);
      }

      const res = await call(app, 'get', '/projects?page=1&limit=2', owner, orgId).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });
  });

  describe('GET /projects/:id', () => {
    it('retrieves a specific project', async () => {
      const createRes = await call(app, 'post', '/projects', owner, orgId)
        .send({ name: 'Find Me', status: 'active' })
        .expect(201);

      const projectId = createRes.body.id;

      const res = await call(app, 'get', `/projects/${projectId}`, member, orgId).expect(200);
      expect(res.body.id).toBe(projectId);
      expect(res.body.name).toBe('Find Me');
    });
  });

  describe('PATCH /projects/:id', () => {
    it('lets owner update project', async () => {
      const createRes = await call(app, 'post', '/projects', owner, orgId)
        .send({ name: 'Old Name', status: 'active' })
        .expect(201);

      const projectId = createRes.body.id;

      const res = await call(app, 'patch', `/projects/${projectId}`, owner, orgId)
        .send({ name: 'Updated Name', status: 'archived' })
        .expect(200);

      expect(res.body.name).toBe('Updated Name');
      expect(res.body.status).toBe('archived');
    });

    it('blocks regular member from updating (403)', async () => {
      const createRes = await call(app, 'post', '/projects', owner, orgId)
        .send({ name: 'Protected', status: 'active' })
        .expect(201);

      await call(app, 'patch', `/projects/${createRes.body.id}`, member, orgId)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('lets creator/owner delete project', async () => {
      const createRes = await call(app, 'post', '/projects', owner, orgId)
        .send({ name: 'Delete Me', status: 'active' })
        .expect(201);

      await call(app, 'delete', `/projects/${createRes.body.id}`, owner, orgId).expect(200);
    });
  });
});
