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

describe('Tasks endpoints (e2e)', () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let owner: TestUser;
  let admin: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let orgId: string;
  let projectId: string;
  const orgs: string[] = [];

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    owner = await registerUser(app, 'towner');
    admin = await registerUser(app, 'tadmin');
    member = await registerUser(app, 'tmember');
    outsider = await registerUser(app, 'toutsider');
  });

  beforeEach(async () => {
    orgId = await createOrg(app, owner, `Task Org ${Date.now()}`);
    orgs.push(orgId);
    await addMember(db, orgId, admin.id, 'admin');
    await addMember(db, orgId, member.id, 'member');

    // Create a project for tasks
    const projectRes = await call(app, 'post', '/projects', owner, orgId)
      .send({ name: 'Task Project', status: 'active' })
      .expect(201);
    projectId = projectRes.body.id;
  });

  afterAll(async () => {
    await cleanup(
      db,
      orgs,
      [owner.id, admin.id, member.id, outsider.id],
    );
    await app.close();
  });

  describe('POST /tasks', () => {
    it('lets member create a task', async () => {
      const res = await call(app, 'post', '/tasks', member, orgId)
        .send({
          projectId,
          title: 'Implement feature X',
          description: 'Detailed description of feature X',
          status: 'todo',
          priority: 'high',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Implement feature X');
      expect(res.body.projectId).toBe(projectId);
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('high');
      expect(res.body.createdBy).toBe(member.id);
    });

    it('validates request payload (400)', async () => {
      await call(app, 'post', '/tasks', member, orgId)
        .send({
          projectId,
          title: '', // invalid title length
        })
        .expect(400);
    });

    it('blocks non-members (403)', async () => {
      await call(app, 'post', '/tasks', outsider, orgId)
        .send({
          projectId,
          title: 'Unauthorized Task',
        })
        .expect(403);
    });
  });

  describe('GET /tasks', () => {
    it('returns paginated tasks with filters', async () => {
      await call(app, 'post', '/tasks', owner, orgId)
        .send({ projectId, title: 'Bug Fix 1', status: 'todo' })
        .expect(201);

      await call(app, 'post', '/tasks', owner, orgId)
        .send({ projectId, title: 'Feature 2', status: 'in_progress' })
        .expect(201);

      const res = await call(app, 'get', `/tasks?projectId=${projectId}&status=todo`, owner, orgId)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Bug Fix 1');
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('GET /tasks/:id', () => {
    it('retrieves a specific task', async () => {
      const createRes = await call(app, 'post', '/tasks', owner, orgId)
        .send({ projectId, title: 'Specific Task' })
        .expect(201);

      const taskId = createRes.body.id;

      const res = await call(app, 'get', `/tasks/${taskId}`, member, orgId).expect(200);
      expect(res.body.id).toBe(taskId);
      expect(res.body.title).toBe('Specific Task');
    });

    it('returns 404 for non-existent task', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174999';
      await call(app, 'get', `/tasks/${fakeId}`, owner, orgId).expect(404);
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('lets user update a task', async () => {
      const createRes = await call(app, 'post', '/tasks', owner, orgId)
        .send({ projectId, title: 'Old Title', status: 'todo' })
        .expect(201);

      const taskId = createRes.body.id;

      await call(app, 'patch', `/tasks/${taskId}`, owner, orgId)
        .send({ title: 'New Title', status: 'done' })
        .expect(200);

      const res = await call(app, 'get', `/tasks/${taskId}`, owner, orgId).expect(200);
      expect(res.body.title).toBe('New Title');
      expect(res.body.status).toBe('done');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('lets creator or admin/owner delete task', async () => {
      const createRes = await call(app, 'post', '/tasks', member, orgId)
        .send({ projectId, title: 'Delete Me' })
        .expect(201);

      const taskId = createRes.body.id;

      await call(app, 'delete', `/tasks/${taskId}`, owner, orgId).expect(204);
    });
  });
});
