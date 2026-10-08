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

describe('Comments endpoints (e2e)', () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let owner: TestUser;
  let admin: TestUser;
  let member: TestUser;
  let member2: TestUser;
  let outsider: TestUser;
  let orgId: string;
  let projectId: string;
  let taskId: string;
  const orgs: string[] = [];

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    owner = await registerUser(app, 'cowner');
    admin = await registerUser(app, 'cadmin');
    member = await registerUser(app, 'cmember');
    member2 = await registerUser(app, 'cmember2');
    outsider = await registerUser(app, 'coutsider');
  });

  beforeEach(async () => {
    orgId = await createOrg(app, owner, `Comment Org ${Date.now()}`);
    orgs.push(orgId);
    await addMember(db, orgId, admin.id, 'admin');
    await addMember(db, orgId, member.id, 'member');
    await addMember(db, orgId, member2.id, 'member');

    // Create a project
    const projectRes = await call(app, 'post', '/projects', owner, orgId)
      .send({ name: 'Comment Project', status: 'active' })
      .expect(201);
    projectId = projectRes.body.id;

    // Create a task
    const taskRes = await call(app, 'post', '/tasks', owner, orgId)
      .send({ projectId, title: 'Comment Task' })
      .expect(201);
    taskId = taskRes.body.id;
  });

  afterAll(async () => {
    await cleanup(
      db,
      orgs,
      [owner.id, admin.id, member.id, member2.id, outsider.id],
    );
    await app.close();
  });

  describe('POST /tasks/:id/comments', () => {
    it('lets member create a comment on a task', async () => {
      const res = await call(app, 'post', `/tasks/${taskId}/comments`, member, orgId)
        .send({ body: 'This is a test comment.' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.body).toBe('This is a test comment.');
      expect(res.body.taskId).toBe(taskId);
      expect(res.body.authorId).toBe(member.id);
    });

    it('validates comment body (400)', async () => {
      await call(app, 'post', `/tasks/${taskId}/comments`, member, orgId)
        .send({ body: '' })
        .expect(400);
    });

    it('returns 404 if task does not exist', async () => {
      const fakeTaskId = '123e4567-e89b-12d3-a456-426614174999';
      await call(app, 'post', `/tasks/${fakeTaskId}/comments`, member, orgId)
        .send({ body: 'Orphan comment' })
        .expect(404);
    });
  });

  describe('GET /tasks/:id/comments', () => {
    it('returns paginated comments for a task', async () => {
      await call(app, 'post', `/tasks/${taskId}/comments`, member, orgId)
        .send({ body: 'Comment 1' })
        .expect(201);
      await call(app, 'post', `/tasks/${taskId}/comments`, member, orgId)
        .send({ body: 'Comment 2' })
        .expect(201);

      const res = await call(app, 'get', `/tasks/${taskId}/comments?page=1&limit=10`, member, orgId)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });
  });

  describe('PATCH /comments/:id', () => {
    it('lets author update their comment', async () => {
      const createRes = await call(app, 'post', `/tasks/${taskId}/comments`, member, orgId)
        .send({ body: 'Original comment' })
        .expect(201);

      const commentId = createRes.body.id;

      const res = await call(app, 'patch', `/comments/${commentId}`, member, orgId)
        .send({ body: 'Updated comment' })
        .expect(200);

      expect(res.body.body).toBe('Updated comment');
    });

    it('blocks non-author from updating comment (403)', async () => {
      const createRes = await call(app, 'post', `/tasks/${taskId}/comments`, member, orgId)
        .send({ body: 'Member 1 comment' })
        .expect(201);

      const commentId = createRes.body.id;

      await call(app, 'patch', `/comments/${commentId}`, member2, orgId)
        .send({ body: 'Hacked comment' })
        .expect(403);
    });
  });

  describe('DELETE /comments/:id', () => {
    it('lets author delete their comment', async () => {
      const createRes = await call(app, 'post', `/tasks/${taskId}/comments`, member, orgId)
        .send({ body: 'Delete me' })
        .expect(201);

      const commentId = createRes.body.id;

      await call(app, 'delete', `/comments/${commentId}`, member, orgId).expect(204);
    });

    it('lets admin/owner delete any comment', async () => {
      const createRes = await call(app, 'post', `/tasks/${taskId}/comments`, member, orgId)
        .send({ body: 'Delete me admin' })
        .expect(201);

      const commentId = createRes.body.id;

      await call(app, 'delete', `/comments/${commentId}`, owner, orgId).expect(204);
    });

    it('blocks regular member from deleting another members comment (403)', async () => {
      const createRes = await call(app, 'post', `/tasks/${taskId}/comments`, member, orgId)
        .send({ body: 'Protected comment' })
        .expect(201);

      const commentId = createRes.body.id;

      await call(app, 'delete', `/comments/${commentId}`, member2, orgId).expect(403);
    });
  });
});
