import { pgTable, uuid, text, timestamp, index, foreignKey } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { tasks } from './tasks.js';
import { users } from './users.js';

export const comments = pgTable('comments', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').notNull(),
    // null if the author's account was deleted, so the comment itself survives
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    // a comment's task must belong to the SAME organization
    foreignKey({
        name: 'comments_task_org_fk',
        columns: [t.taskId, t.organizationId],
        foreignColumns: [tasks.id, tasks.organizationId],
    }).onDelete('cascade'),
    index('comments_org_task_created_idx').on(t.organizationId, t.taskId, t.createdAt),
]);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
