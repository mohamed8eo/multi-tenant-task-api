import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../tenancy/guards/tenant.guard.js';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator.js';
import type { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { MemberResponse } from './dto/members.dto.js';
import { MembersService } from './members.service.js';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiOkResponse, ApiNoContentResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdateRoleDto } from './dto/updateRole.dto.js';
import { Role } from '../tenancy/decorators/role.decorator.js';
import { RolesGuard } from '../tenancy/guards/roles.guard.js';

@ApiTags('members')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Organization ID' })
@Controller('members')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class MembersController {
    constructor(private readonly membersService: MembersService) { }

    @Get()
    @ApiOperation({ summary: 'Get all members of the current organization' })
    @ApiOkResponse({ type: [MemberResponse] })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    findAll(@CurrentTenant() tenant: Tenant): Promise<MemberResponse[]> {
        return this.membersService.findAll(tenant.organizationId);
    }

    @Patch(':userId')
    @Role('owner')
    @HttpCode(204)
    @ApiOperation({ summary: 'Update member role (Owner only)' })
    @ApiNoContentResponse({ description: 'Role updated successfully.' })
    @ApiResponse({ status: 400, description: 'Bad request / validation error.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden (Owner role required).' })
    @ApiResponse({ status: 404, description: 'Member not found.' })
    async updateRole(
        @CurrentTenant() tenant: Tenant,
        @Body() dto: UpdateRoleDto,
        @Param('userId', ParseUUIDPipe) userId: string,
    ): Promise<void> {
        return await this.membersService.updateRole(tenant, dto, userId);
    }

    @Delete(':userId')
    @Role('owner', 'admin')
    @HttpCode(204)
    @ApiOperation({ summary: 'Remove a member from the organization (Owner/Admin)' })
    @ApiNoContentResponse({ description: 'Member removed successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Member not found.' })
    async removeMember(
        @CurrentTenant() tenant: Tenant,
        @Param('userId', ParseUUIDPipe) userId: string,
    ): Promise<void> {
        return await this.membersService.removeMember(tenant, userId);
    }
}
