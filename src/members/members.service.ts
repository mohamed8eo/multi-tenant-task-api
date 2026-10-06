import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { memberships } from '../db/schema/memberships.js';
import { users } from '../db/schema/users.js';
import { and, eq } from 'drizzle-orm';
import { MemberResponse } from './dto/members.dto.js';
import { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { UpdateRoleDto } from './dto/updateRole.dto.js';

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
        const [membership] = await this.db
            .select()
            .from(memberships)
            .where(and(
                eq(memberships.organizationId, tenant.organizationId),
                eq(memberships.userId, userId)
            ));

        if (!membership) {
            throw new NotFoundException('Member not found in this organization');
        }

        if (membership.role === 'owner') {
            throw new BadRequestException('Cannot remove organization owner');
        }

        await this.db
            .delete(memberships)
            .where(and(
                eq(memberships.organizationId, tenant.organizationId),
                eq(memberships.userId, userId)
            ));
    }

}
