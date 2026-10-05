import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { memberships } from '../db/schema/memberships.js';
import { users } from '../db/schema/users.js';
import { eq } from 'drizzle-orm';
import { MemberResponse } from './dto/members.dto.js';

@Injectable()
export class MembersService {
    constructor(@InjectDrizzle() private readonly db: NodePgDatabase) { }

    async findAll(tenatId: string): Promise<MemberResponse[]> {
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
            .where(eq(memberships.organizationId, tenatId))
            .orderBy(memberships.createdAt)


    }

}
