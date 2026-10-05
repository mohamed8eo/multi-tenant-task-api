import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { InvitationService } from './invitation.service.js';
import { CreateInvitationDto } from './dto/CreateInvitation.dto.js';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator.js';
import type { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { Role } from '../tenancy/decorators/role.decorator.js';
import { RolesGuard } from '../tenancy/decorators/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../tenancy/guards/tenant.guard.js';
import { TenantScoped } from '../tenancy/decorators/tenant-scoped.decorator.js';
import { InvitationResponse } from './dto/invitation-response.dto.js';

@Controller('invitations')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class InvitationController {
    constructor(private readonly invitationService: InvitationService) { }


    @Post()
    @TenantScoped()
    @Role("owner", "admin")
    async createInvitation(
        @Body() dto: CreateInvitationDto,
        @CurrentTenant() tenant: Tenant,
    ) {

        return await this.invitationService.createInvitation(dto, tenant.organizationId)

    }

    @Get()
    @TenantScoped()
    @Role("owner", "admin")
    async listpendingInvitation(@CurrentTenant() tenant: Tenant): Promise<InvitationResponse[]> {
        return await this.invitationService.listpendingInvitation(tenant.organizationId)
    }

    @Delete("/:id")
    @TenantScoped()
    @Role("owner", "admin")
    async revokeInvitation(@CurrentTenant() tenant: Tenant, @Param("id", ParseUUIDPipe) invId: string): Promise<void> {
        return await this.invitationService.revokeInvitation(tenant.organizationId, invId)
    }


}
