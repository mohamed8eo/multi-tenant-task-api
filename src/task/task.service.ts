import { Injectable } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { Task, tasks } from '../db/schema/tasks.js';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import type { OrgRole } from '../db/schema/memberships.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface.js';

@Injectable()
export class TaskService {
    constructor(@InjectDrizzle() private readonly db: NodePgDatabase) { }

    async create(createTaskDto: CreateTaskDto, userId: string, orgId: string): Promise<Task> {
        const [task] = await this.db
            .insert(tasks)
            .values({
                title: createTaskDto.title,
                description: createTaskDto.description,
                status: createTaskDto.status,
                priority: createTaskDto.priority,
                projectId: createTaskDto.projectId,
                assigneeId: createTaskDto.assigneeId,
                dueDate: createTaskDto.dueDate,
                organizationId: orgId,
                createdBy: userId,
            }).returning()
        return task
    }

    async findAll(orgId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedResponse<Task>> {
        const page = paginationQuery.page ?? 1;
        const limit = paginationQuery.limit ?? 20;
        const offset = paginationQuery.offset;

        const [data, [{ count }]] = await Promise.all([
            this.db
                .select()
                .from(tasks)
                .where(eq(tasks.organizationId, orgId))
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(tasks)
                .where(eq(tasks.organizationId, orgId)),
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

    async findOne(id: string, orgId: string): Promise<Task> {
        const [task] = await this.db
            .select()
            .from(tasks)
            .where(and(
                eq(tasks.id, id),
                eq(tasks.organizationId, orgId)
            ))

        return task
    }

    async update(id: string, updateTaskDto: UpdateTaskDto, orgId: string): Promise<void> {
        await this.db
            .update(tasks)
            .set({
                title: updateTaskDto.title,
                description: updateTaskDto.description,
                status: updateTaskDto.status,
                priority: updateTaskDto.priority
            })
            .where(and(
                eq(tasks.id, id),
                eq(tasks.organizationId, orgId)

            ))
    }

    async remove(id: string, orgId: string, role: OrgRole, userId: string): Promise<void> {
        if (role === 'owner' || role === 'admin') {
            await this.db
                .delete(tasks)
                .where(and(
                    eq(tasks.id, id),
                    eq(tasks.organizationId, orgId)
                ))
            return
        }

        await this.db
            .delete(tasks)
            .where(and(
                eq(tasks.id, id),
                eq(tasks.organizationId, orgId),
                eq(tasks.createdBy, userId),
            ))

    }
}
