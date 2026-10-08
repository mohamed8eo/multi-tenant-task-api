import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, UseGuards, Query, HttpCode } from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator.js';
import type { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Comment } from '../db/schema/comments.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../tenancy/guards/tenant.guard.js';
import { RolesGuard } from '../tenancy/guards/roles.guard.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface.js';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('comments')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Organization ID' })
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller()
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) { }

    @Post('tasks/:id/comments')
    @ApiOperation({ summary: 'Create a new comment on a task' })
    @ApiCreatedResponse({ description: 'Comment successfully created.' })
    @ApiResponse({ status: 400, description: 'Bad request / validation error.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Task not found.' })
    async create(
        @Param('id', ParseUUIDPipe) taskId: string,
        @Body() createCommentDto: CreateCommentDto,
        @CurrentTenant() tenant: Tenant,
        @CurrentUser('userId') userId: string,
    ): Promise<Comment> {
        return await this.commentsService.create(
            taskId,
            tenant.organizationId,
            userId,
            createCommentDto,
        );
    }

    @Get('tasks/:id/comments')
    @ApiOperation({ summary: 'Get paginated comments for a task' })
    @ApiOkResponse({ description: 'Comments retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Task not found.' })
    async findAll(
        @Param('id', ParseUUIDPipe) taskId: string,
        @CurrentTenant() tenant: Tenant,
        @Query() paginationQuery: PaginationQueryDto,
    ): Promise<PaginatedResponse<Comment>> {
        return await this.commentsService.findAllByTask(
            taskId,
            tenant.organizationId,
            paginationQuery,
        );
    }

    @Patch('comments/:id')
    @ApiOperation({ summary: 'Update a comment (author only)' })
    @ApiOkResponse({ description: 'Comment updated successfully.' })
    @ApiResponse({ status: 400, description: 'Validation error.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Comment not found.' })
    async update(
        @Param('id', ParseUUIDPipe) commentId: string,
        @CurrentTenant() tenant: Tenant,
        @CurrentUser('userId') userId: string,
        @Body() dto: UpdateCommentDto,
    ): Promise<Comment> {
        return await this.commentsService.update(
            commentId,
            tenant.organizationId,
            userId,
            dto,
        );
    }

    @Delete('comments/:id')
    @HttpCode(204)
    @ApiOperation({ summary: 'Delete a comment (author or admin/owner)' })
    @ApiNoContentResponse({ description: 'Comment deleted successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Comment not found.' })
    async remove(
        @Param('id', ParseUUIDPipe) commentId: string,
        @CurrentTenant() tenant: Tenant,
        @CurrentUser('userId') userId: string,
    ): Promise<void> {
        return await this.commentsService.remove(
            commentId,
            tenant.organizationId,
            userId,
            tenant.role,
        );
    }
}
