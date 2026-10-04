import {
    Injectable,
    InternalServerErrorException,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateOrganizationDto } from './dto/create.dto.js';
import { organizations } from '../db/schema/organizations.js';
import { memberships } from '../db/schema/memberships.js';
import { OrganizationResponse } from './dto/organization-response.dto.js';
import { eq } from 'drizzle-orm';

function pgCode(error: unknown): string | undefined {
    const e = error as { code?: string; cause?: { code?: string } };
    return e?.cause?.code ?? e?.code;
}

@Injectable()
export class OrganizationsService {
    private readonly logger = new Logger(OrganizationsService.name);

    constructor(@InjectDrizzle() private readonly db: NodePgDatabase) { }

    async create(dto: CreateOrganizationDto, userId: string): Promise<OrganizationResponse> {
        try {
            return await this.db.transaction(async (tx) => {
                const [org] = await tx
                    .insert(organizations)
                    .values({ name: dto.name })
                    .returning();

                await tx.insert(memberships).values({
                    organizationId: org.id,
                    userId,
                    role: 'owner',
                });

                return { ...org, role: 'owner' as const };
            });
        } catch (error) {
            // 23503 = foreign key violation: the user in the token no longer exists
            if (pgCode(error) === '23503') {
                throw new UnauthorizedException('User no longer exists');
            }

            this.logger.error(
                'Failed to create organization',
                error instanceof Error ? error.stack : String(error),
            );
            throw new InternalServerErrorException('Could not create organization');
        }
    }


    async findAllForUser(userId: string): Promise<OrganizationResponse[]> {
        return await this.db
            .select({
                id: organizations.id,
                name: organizations.name,
                role: memberships.role,
                createdAt: organizations.createdAt,
            })
            .from(memberships)
            .innerJoin(
                organizations,
                eq(memberships.organizationId, organizations.id),
            )
            .where(eq(memberships.userId, userId))
            .orderBy(organizations.createdAt);
    }
}
