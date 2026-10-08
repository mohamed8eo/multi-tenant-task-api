import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Comment, comments } from '../db/schema/comments.js';
import { tasks } from '../db/schema/tasks.js';
import { OrgRole } from '../db/schema/memberships.js';
import { and, eq, sql } from 'drizzle-orm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface.js';

@Injectable()
export class CommentsService {
    constructor(@InjectDrizzle() private readonly db: NodePgDatabase) { }

    async create(
        taskId: string,
        orgId: string,
        userId: string,
        createCommentDto: CreateCommentDto,
    ): Promise<Comment> {
        const [task] = await this.db
            .select()
            .from(tasks)
            .where(and(
                eq(tasks.id, taskId),
                eq(tasks.organizationId, orgId)
            ));

        if (!task) {
            throw new NotFoundException('Task not found');
        }

        const [comment] = await this.db
            .insert(comments)
            .values({
                taskId,
                body: createCommentDto.body,
                organizationId: orgId,
                authorId: userId,
            }).returning();

        return comment;
    }

    async findAllByTask(
        taskId: string,
        orgId: string,
        paginationQuery: PaginationQueryDto,
    ): Promise<PaginatedResponse<Comment>> {
        const page = paginationQuery.page ?? 1;
        const limit = paginationQuery.limit ?? 20;
        const offset = paginationQuery.offset;

        const whereClause = and(
            eq(comments.organizationId, orgId),
            eq(comments.taskId, taskId)
        );

        const [data, [{ count }]] = await Promise.all([
            this.db
                .select()
                .from(comments)
                .where(whereClause)
                .orderBy(comments.createdAt)
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(comments)
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

    async update(
        id: string,
        orgId: string,
        userId: string,
        updateCommentDto: UpdateCommentDto,
    ): Promise<Comment> {
        const [comment] = await this.db
            .select()
            .from(comments)
            .where(and(
                eq(comments.id, id),
                eq(comments.organizationId, orgId)
            ));

        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        if (comment.authorId !== userId) {
            throw new ForbiddenException('You can only update your own comments');
        }

        const [updated] = await this.db
            .update(comments)
            .set({
                body: updateCommentDto.body,
            })
            .where(and(
                eq(comments.id, id),
                eq(comments.organizationId, orgId)
            ))
            .returning();

        return updated;
    }

    async remove(id: string, orgId: string, userId: string, role: OrgRole): Promise<void> {
        const [comment] = await this.db
            .select()
            .from(comments)
            .where(and(
                eq(comments.id, id),
                eq(comments.organizationId, orgId)
            ));

        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        const isAuthor = comment.authorId === userId;
        const isAdminOrOwner = role === 'admin' || role === 'owner';

        if (!isAuthor && !isAdminOrOwner) {
            throw new ForbiddenException('You are not allowed to delete this comment');
        }

        await this.db
            .delete(comments)
            .where(and(
                eq(comments.id, id),
                eq(comments.organizationId, orgId)
            ));
    }
}
