import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateInvitationDto } from './dto/CreateInvitation.dto.js';
import { users } from '../db/schema/users.js';
import { and, eq, isNull } from 'drizzle-orm';
import { memberships } from '../db/schema/memberships.js';
import { invitations } from '../db/schema/invitations.js';
import { createHash, randomBytes } from 'crypto';
@Injectable()
export class InvitationService {
    constructor(@InjectDrizzle() private readonly db: NodePgDatabase) { }


    async createInvitation(dto: CreateInvitationDto, orgId: string) {

        return await this.db.transaction(async (tx) => {
            await this.ensureNotMember(tx, orgId, dto.email)
            await this.revokePendingInvitation(tx, orgId, dto.email);

            const token = randomBytes(32).toString("hex")
            const tokenHash = createHash('sha256')
                .update(token)
                .digest("hex")

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
        })


    }

    private async ensureNotMember(
        tx: any,
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
        tx: any,
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
