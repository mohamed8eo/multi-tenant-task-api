import { pgTable, uuid, text, timestamp, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { users } from './users.js';

export const projectStatus = pgEnum('project_status', ['active', 'archived']);
export type ProjectStatus = (typeof projectStatus.enumValues)[number];

export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    status: projectStatus('status').notNull().default('active'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    // lets tasks reference (id, organization_id) as a pair, see tasks.ts
    unique('projects_id_org_unique').on(t.id, t.organizationId),
    index('projects_org_status_idx').on(t.organizationId, t.status),
]);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
