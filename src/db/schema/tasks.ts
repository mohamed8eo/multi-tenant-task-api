import { pgTable, uuid, text, timestamp, pgEnum, unique, index, foreignKey } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { projects } from './projects.js';
import { users } from './users.js';

export const taskStatus = pgEnum('task_status', ['todo', 'in_progress', 'done']);
export type TaskStatus = (typeof taskStatus.enumValues)[number];

export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high']);
export type TaskPriority = (typeof taskPriority.enumValues)[number];

export const tasks = pgTable('tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: taskStatus('status').notNull().default('todo'),
    priority: taskPriority('priority').notNull().default('medium'),
    // must be a member of the same organization, checked in the service
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    dueDate: timestamp('due_date'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    // a task's project must belong to the SAME organization, enforced by the database
    foreignKey({
        name: 'tasks_project_org_fk',
        columns: [t.projectId, t.organizationId],
        foreignColumns: [projects.id, projects.organizationId],
    }).onDelete('cascade'),
    // lets comments reference (id, organization_id) as a pair, see comments.ts
    unique('tasks_id_org_unique').on(t.id, t.organizationId),
    index('tasks_org_project_idx').on(t.organizationId, t.projectId),
    index('tasks_org_status_idx').on(t.organizationId, t.status),
    index('tasks_org_assignee_idx').on(t.organizationId, t.assigneeId),
]);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
