import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { users } from './users.js';
import { orgRole } from './memberships.js';
import { sql } from 'drizzle-orm';

export const invitations = pgTable('invitations', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: orgRole('role').notNull().default('member'),
    tokenHash: text('token_hash').notNull().unique(),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
    index('invitations_organization_id_idx').on(t.organizationId),
    uniqueIndex('invitations_org_email_active_idx')
        .on(t.organizationId, t.email)
        .where(sql`${t.acceptedAt} IS NULL AND ${t.revokedAt} IS NULL`),
]);

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
