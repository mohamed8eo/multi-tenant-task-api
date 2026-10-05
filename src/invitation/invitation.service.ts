import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateInvitationDto } from './dto/CreateInvitation.dto.js';
import { users } from '../db/schema/users.js';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { memberships } from '../db/schema/memberships.js';
import { invitations } from '../db/schema/invitations.js';
import { createHash, randomBytes } from 'crypto';
import { InvitationResponse } from './dto/invitation-response.dto.js';

type Tx = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];

@Injectable()
export class InvitationService {
    constructor(@InjectDrizzle() private readonly db: NodePgDatabase) { }

    async createInvitation(dto: CreateInvitationDto, orgId: string, invitedBy: string) {
        try {
            return await this.db.transaction(async (tx) => {
                await this.ensureNotMember(tx, orgId, dto.email);
                await this.revokePendingInvitation(tx, orgId, dto.email);

                const token = randomBytes(32).toString('hex');
                const tokenHash = createHash('sha256')
                    .update(token)
                    .digest('hex');

                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);

                const [invitation] = await tx
                    .insert(invitations)
                    .values({
                        organizationId: orgId,
                        email: dto.email,
                        role: dto.role,
                        tokenHash,
                        expiresAt,
                        invitedBy,
                    })
                    .returning();
                // TODO: remove in Phase 6 — email delivery comes later

                return {
                    id: invitation.id,
                    email: invitation.email,
                    role: invitation.role,
                    expiresAt: invitation.expiresAt,
                    token,
                };
            });
        } catch (error) {
            const e = error as { code?: string; cause?: { code?: string } };
            if ((e.cause?.code ?? e.code) === '23505') {
                throw new ConflictException('An invitation for this email is already pending');
            }
            throw error;
        }
    }

    async listPending(orgId: string): Promise<InvitationResponse[]> {
        return await this.db
            .select({
                id: invitations.id,
                email: invitations.email,
                role: invitations.role,
                expiresAt: invitations.expiresAt,
                createdAt: invitations.createdAt,
                invitedBy: invitations.invitedBy,
            })
            .from(invitations)
            .where(and(
                eq(invitations.organizationId, orgId),
                isNull(invitations.acceptedAt),
                isNull(invitations.revokedAt),
                gt(invitations.expiresAt, new Date()),
            ))
            .orderBy(invitations.createdAt);
    }

    async revokeInvitation(orgId: string, invId: string): Promise<void> {
        const [revoked] = await this.db
            .update(invitations)
            .set({ revokedAt: new Date() })
            .where(and(
                eq(invitations.organizationId, orgId),
                eq(invitations.id, invId),
                isNull(invitations.acceptedAt),
                isNull(invitations.revokedAt),
            )).returning();

        if (!revoked) {
            throw new NotFoundException('Invitation not found or already processed');
        }
    }

    private async ensureNotMember(
        tx: Tx,
        organizationId: string,
        email: string,
    ): Promise<void> {
        const [membership] = await tx
            .select()
            .from(memberships)
            .innerJoin(users, eq(memberships.userId, users.id))
            .where(
                and(
                    eq(memberships.organizationId, organizationId),
                    eq(users.email, email),
                ),
            );

        if (membership) {
            throw new ConflictException('User is already a member of this organization');
        }
    }

    private async revokePendingInvitation(
        tx: Tx,
        organizationId: string,
        email: string,
    ): Promise<void> {
        await tx
            .update(invitations)
            .set({ revokedAt: new Date() })
            .where(
                and(
                    eq(invitations.organizationId, organizationId),
                    eq(invitations.email, email),
                    isNull(invitations.acceptedAt),
                    isNull(invitations.revokedAt),
                ),
            );
    }
}
