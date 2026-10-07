import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../tenancy/guards/tenant.guard.js';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator.js';
import type { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { MemberResponse } from './dto/members.dto.js';
import { MembersService } from './members.service.js';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiOkResponse, ApiNoContentResponse } from '@nestjs/swagger';
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
    @ApiOkResponse({ type: [MemberResponse] })
    findAll(@CurrentTenant() tenant: Tenant): Promise<MemberResponse[]> {
        return this.membersService.findAll(tenant.organizationId);
    }

    @Patch(':userId')
    @Role('owner')
    @HttpCode(204)
    @ApiNoContentResponse()
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
    @ApiNoContentResponse()
    async removeMember(
        @CurrentTenant() tenant: Tenant,
        @Param('userId', ParseUUIDPipe) userId: string,
    ): Promise<void> {
        return await this.membersService.removeMember(tenant, userId);
    }
}
