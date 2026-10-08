import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Project, projects } from '../db/schema/projects.js';
import { and, eq, sql } from 'drizzle-orm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface.js';

@Injectable()
export class ProjectService {
    constructor(@InjectDrizzle() private readonly db: NodePgDatabase) { }

    async create(createProjectDto: CreateProjectDto, orgId: string, userId: string): Promise<Project> {
        const [project] = await this.db
            .insert(projects)
            .values({
                name: createProjectDto.name,
                description: createProjectDto.description,
                status: createProjectDto.status,
                organizationId: orgId,
                createdBy: userId,
            }).returning()

        return project
    }

    async findAll(orgId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedResponse<Project>> {
        const page = paginationQuery.page ?? 1;
        const limit = paginationQuery.limit ?? 20;
        const offset = paginationQuery.offset;

        const [data, [{ count }]] = await Promise.all([
            this.db
                .select()
                .from(projects)
                .where(eq(projects.organizationId, orgId))
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(projects)
                .where(eq(projects.organizationId, orgId)),
        ]);

        const total = Number(count) || 0;
        const totalPages = Math.ceil(total / limit) || 0;

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    async findOne(id: string, orgId: string): Promise<Project> {
        const [project] = await this.db
            .select()
            .from(projects)
            .where(and(
                eq(projects.organizationId, orgId),
                eq(projects.id, id)
            ))
        return project

    }

    async update(id: string, updateProjectDto: UpdateProjectDto, orgId: string): Promise<Project> {
        const [project] = await this.db
            .update(projects)
            .set({
                name: updateProjectDto.name,
                description: updateProjectDto.description,
                status: updateProjectDto.status,
            })
            .where(and(
                eq(projects.organizationId, orgId),
                eq(projects.id, id)
            )).returning()

        return project

    }

    async remove(id: string, orgId: string, userId: string): Promise<void> {
        await this.db
            .delete(projects)
            .where(and(
                eq(projects.organizationId, orgId),
                eq(projects.createdBy, userId),
                eq(projects.id, id),
            ))
    }
}
