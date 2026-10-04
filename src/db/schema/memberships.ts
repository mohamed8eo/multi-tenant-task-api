import { pgTable, uuid, timestamp, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { organizations } from './organizations.js';

export const orgRole = pgEnum('org_role', ['owner', 'admin', 'member']);
export type OrgRole = (typeof orgRole.enumValues)[number];

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: orgRole('role').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.organizationId),   // can't join the same org twice
  index().on(t.organizationId),              // fast "list members of org"
]);

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
