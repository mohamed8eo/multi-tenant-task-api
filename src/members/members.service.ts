import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { memberships } from '../db/schema/memberships.js';
import { users } from '../db/schema/users.js';
import { tasks } from '../db/schema/tasks.js';
import { and, eq } from 'drizzle-orm';
import { MemberResponse } from './dto/members.dto.js';
import { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { UpdateRoleDto } from './dto/updateRole.dto.js';

type Tx = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];

@Injectable()
export class MembersService {
    constructor(@InjectDrizzle() private readonly db: NodePgDatabase) { }

    async findAll(tenantId: string): Promise<MemberResponse[]> {
        return await this.db
            .select({
                userId: memberships.userId,
                name: users.name,
                username: users.username,
                email: users.email,
                role: memberships.role,
                joinedAt: memberships.createdAt,
            })
            .from(memberships)
            .innerJoin(users,
                eq(memberships.userId, users.id),
            )
            .where(eq(memberships.organizationId, tenantId))
            .orderBy(memberships.createdAt)
    }

    async updateRole(tenant: Tenant, dto: UpdateRoleDto, userId: string): Promise<void> {
        const target = await this.getMembership(this.db, tenant.organizationId, userId)

        if (target.role === 'owner') {
            throw new ForbiddenException("The owner's role can't be changed");
        }

        const [val] = await this.db
            .update(memberships)
            .set({ role: dto.role })
            .where(and(
                eq(memberships.organizationId, tenant.organizationId),
                eq(memberships.userId, userId)
            )).returning();

        if (!val) {
            throw new NotFoundException("Member not found in this organization");
        }
    }

    async removeMember(tenant: Tenant, userId: string): Promise<void> {
        await this.db.transaction(async (tx) => {
            const target = await this.getMembership(tx, tenant.organizationId, userId);

            if (target.role === 'owner') {
                throw new ForbiddenException('The owner cannot be removed');
            }
            if (tenant.role === 'admin' && target.role !== 'member') {
                throw new ForbiddenException('Admins can only remove members');
            }

            await tx
                .delete(memberships)
                .where(and(
                    eq(memberships.organizationId, tenant.organizationId),
                    eq(memberships.userId, userId),
                ));

            await tx
                .update(tasks)
                .set({ assigneeId: null })
                .where(and(
                    eq(tasks.organizationId, tenant.organizationId),
                    eq(tasks.assigneeId, userId)
                ));
        });
    }


    private async getMembership(dbInstance: NodePgDatabase | Tx, orgId: string, userId: string) {
        const [membership] = await dbInstance
            .select()
            .from(memberships)
            .where(and(
                eq(memberships.organizationId, orgId),
                eq(memberships.userId, userId)
            ))
        if (!membership) {
            throw new NotFoundException('Member not found in this organization');
        }
        return membership;
    }

}
