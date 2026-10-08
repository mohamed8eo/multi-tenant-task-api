import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { Task, tasks } from '../db/schema/tasks.js';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, sql, ilike, or, asc, desc } from 'drizzle-orm';
import type { OrgRole } from '../db/schema/memberships.js';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto.js';
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

    async findAll(orgId: string, query: GetTasksQueryDto): Promise<PaginatedResponse<Task>> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const offset = query.offset;

        const conditions = [eq(tasks.organizationId, orgId)];

        if (query.projectId) {
            conditions.push(eq(tasks.projectId, query.projectId));
        }
        if (query.status) {
            conditions.push(eq(tasks.status, query.status));
        }
        if (query.assigneeId) {
            conditions.push(eq(tasks.assigneeId, query.assigneeId));
        }
        if (query.search) {
            const searchTerm = `%${query.search}%`;
            conditions.push(
                or(
                    ilike(tasks.title, searchTerm),
                    ilike(tasks.description, searchTerm)
                )!
            );
        }

        const whereClause = and(...conditions);

        let queryBuilder = this.db
            .select()
            .from(tasks)
            .where(whereClause);

        if (query.sort) {
            const [field, direction] = query.sort.split(':');
            const orderFn = direction === 'asc' ? asc : desc;
            switch (field) {
                case 'dueDate':
                    queryBuilder = queryBuilder.orderBy(orderFn(tasks.dueDate)) as any;
                    break;
                case 'createdAt':
                    queryBuilder = queryBuilder.orderBy(orderFn(tasks.createdAt)) as any;
                    break;
                case 'updatedAt':
                    queryBuilder = queryBuilder.orderBy(orderFn(tasks.updatedAt)) as any;
                    break;
                case 'title':
                    queryBuilder = queryBuilder.orderBy(orderFn(tasks.title)) as any;
                    break;
                case 'status':
                    queryBuilder = queryBuilder.orderBy(orderFn(tasks.status)) as any;
                    break;
                case 'priority':
                    queryBuilder = queryBuilder.orderBy(orderFn(tasks.priority)) as any;
                    break;
                default:
                    queryBuilder = queryBuilder.orderBy(desc(tasks.createdAt)) as any;
            }
        } else {
            queryBuilder = queryBuilder.orderBy(desc(tasks.createdAt)) as any;
        }

        const [data, [{ count }]] = await Promise.all([
            queryBuilder.limit(limit).offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(tasks)
                .where(whereClause),
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

        if (!task) {
            throw new NotFoundException('Task not found');
        }

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
