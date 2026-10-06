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

    @Patch(':id')
    @Role('owner', 'admin')
    @HttpCode(204)
    @ApiNoContentResponse()
    async updateRole(
        @CurrentTenant() tenant: Tenant,
        @Body() dto: UpdateRoleDto,
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<void> {
        return await this.membersService.updateRole(tenant, dto, id)
    }

    @Delete(':id')
    @Role('owner', 'admin')
    @HttpCode(204)
    @ApiNoContentResponse()
    async removeMember(
        @CurrentTenant() tenant: Tenant,
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<void> {
        return await this.membersService.removeMember(tenant, id);
    }
}
