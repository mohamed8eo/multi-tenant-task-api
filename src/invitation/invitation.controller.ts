import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { InvitationService } from './invitation.service.js';
import { CreateInvitationDto } from './dto/CreateInvitation.dto.js';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator.js';
import type { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { Role } from '../tenancy/decorators/role.decorator.js';
import { RolesGuard } from '../tenancy/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../tenancy/guards/tenant.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { InvitationResponse, CreatedInvitationResponse } from './dto/invitation-response.dto.js';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse } from '@nestjs/swagger';
import type { User } from '../db/schema/users.js';
import { MembershipRes } from './interfaces/membership.interface.js';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationController {
    constructor(private readonly invitationService: InvitationService) { }

    @Post()
    @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
    @ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Organization ID' })
    @Role('owner', 'admin')
    @ApiCreatedResponse({ type: CreatedInvitationResponse })
    async createInvitation(
        @Body() dto: CreateInvitationDto,
        @CurrentTenant() tenant: Tenant,
        @CurrentUser('userId') userId: string,
    ) {
        return await this.invitationService.createInvitation(dto, tenant.organizationId, userId);
    }

    @Get()
    @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
    @ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Organization ID' })
    @Role('owner', 'admin')
    @ApiOkResponse({ type: [InvitationResponse] })
    async listPending(@CurrentTenant() tenant: Tenant): Promise<InvitationResponse[]> {
        return await this.invitationService.listPending(tenant.organizationId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
    @ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Organization ID' })
    @HttpCode(204)
    @Role('owner', 'admin')
    @ApiNoContentResponse()
    async revokeInvitation(
        @CurrentTenant() tenant: Tenant,
        @Param('id', ParseUUIDPipe) invId: string,
    ): Promise<void> {
        return await this.invitationService.revokeInvitation(tenant.organizationId, invId);
    }

    @Post(':token/accept')
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse()
    async acceptInvitation(
        @Param('token') token: string,
        @CurrentUser("userId") userId: string,
    ): Promise<MembershipRes> {
        return await this.invitationService.acceptInvitation(userId, token)
    }
}
