import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, HttpCode, Query } from '@nestjs/common';
import { TaskService } from './task.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../tenancy/guards/roles.guard.js';
import { TenantGuard } from '../tenancy/guards/tenant.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator.js';
import type { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { Task } from '../db/schema/tasks.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface.js';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('tasks')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Organization ID' })
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('tasks')
export class TaskController {
    constructor(private readonly taskService: TaskService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new task' })
    @ApiCreatedResponse({ description: 'Task successfully created.' })
    @ApiResponse({ status: 400, description: 'Bad request / validation error.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    async create(
        @Body() createTaskDto: CreateTaskDto,
        @CurrentUser() userId: string,
        @CurrentTenant() tenant: Tenant,
    ): Promise<Task> {
        return await this.taskService.create(createTaskDto, userId, tenant.organizationId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tasks with pagination' })
    @ApiOkResponse({ description: 'Tasks retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    async findAll(
        @CurrentTenant() tenant: Tenant,
        @Query() paginationQuery: PaginationQueryDto,
    ): Promise<PaginatedResponse<Task>> {
        return await this.taskService.findAll(tenant.organizationId, paginationQuery);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a task by ID' })
    @ApiOkResponse({ description: 'Task retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Task not found.' })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentTenant() tenant: Tenant
    ): Promise<Task> {
        return await this.taskService.findOne(id, tenant.organizationId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a task' })
    @ApiOkResponse({ description: 'Task updated successfully.' })
    @ApiResponse({ status: 400, description: 'Validation error.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Task not found.' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateTaskDto: UpdateTaskDto,
        @CurrentTenant() tenant: Tenant,
    ): Promise<void> {
        return await this.taskService.update(id, updateTaskDto, tenant.organizationId);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({ summary: 'Delete a task' })
    @ApiNoContentResponse({ description: 'Task deleted successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Task not found.' })
    async remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentTenant() tenant: Tenant,
        @CurrentUser() userId: string
    ): Promise<void> {
        return this.taskService.remove(id, tenant.organizationId, tenant.role, userId);
    }
}
