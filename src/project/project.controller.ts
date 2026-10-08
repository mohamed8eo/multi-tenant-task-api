import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Query, HttpCode } from '@nestjs/common';
import { ProjectService } from './project.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../tenancy/guards/roles.guard.js';
import { TenantGuard } from '../tenancy/guards/tenant.guard.js';
import { Role } from '../tenancy/decorators/role.decorator.js';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator.js';
import type { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Project } from '../db/schema/projects.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface.js';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Projects')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Organization ID' })
@Controller('projects')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProjectController {
    constructor(private readonly projectService: ProjectService) { }

    @Post()
    @Role('admin', 'owner')
    @ApiOperation({ summary: 'Create a new project (Admin/Owner)' })
    @ApiCreatedResponse({ description: 'Project successfully created.' })
    @ApiResponse({ status: 400, description: 'Bad request / validation error.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    async create(
        @Body() createProjectDto: CreateProjectDto,
        @CurrentTenant() tenant: Tenant,
        @CurrentUser('userId') userId: string,
    ): Promise<Project> {
        return await this.projectService.create(createProjectDto, tenant.organizationId, userId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all projects with pagination' })
    @ApiOkResponse({ description: 'Projects retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    async findAll(
        @CurrentTenant() tenant: Tenant,
        @Query() paginationQuery: PaginationQueryDto,
    ): Promise<PaginatedResponse<Project>> {
        return await this.projectService.findAll(tenant.organizationId, paginationQuery);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a project by ID' })
    @ApiOkResponse({ description: 'Project retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Project not found.' })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentTenant() tenant: Tenant,
    ): Promise<Project> {
        return await this.projectService.findOne(id, tenant.organizationId);
    }

    @Patch(':id')
    @Role('admin', 'owner')
    @ApiOperation({ summary: 'Update a project (Admin/Owner)' })
    @ApiOkResponse({ description: 'Project updated successfully.' })
    @ApiResponse({ status: 400, description: 'Validation error.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Project not found.' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateProjectDto: UpdateProjectDto,
        @CurrentTenant() tenant: Tenant,
    ) {
        return await this.projectService.update(id, updateProjectDto, tenant.organizationId);
    }

    @Delete(':id')
    @Role('admin', 'owner')
    @HttpCode(204)
    @ApiOperation({ summary: 'Delete a project (Admin/Owner)' })
    @ApiNoContentResponse({ description: 'Project deleted successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Project not found.' })
    async remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentTenant() tenant: Tenant,
        @CurrentUser('userId') userId: string,
    ): Promise<void> {
        return await this.projectService.remove(id, tenant.organizationId, userId);
    }
}
