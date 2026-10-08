import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { InvitationService } from './invitation.service.js';
import { CreateInvitationDto } from './dto/CreateInvitation.dto.js';
import { AcceptInvitationDto } from './dto/AcceptInvitation.dto.js';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator.js';
import type { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { Role } from '../tenancy/decorators/role.decorator.js';
import { RolesGuard } from '../tenancy/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../tenancy/guards/tenant.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { InvitationResponse, CreatedInvitationResponse, MembershipResponseDto } from './dto/invitation-response.dto.js';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
    @ApiOperation({ summary: 'Create a new invitation (Owner/Admin)' })
    @ApiCreatedResponse({ type: CreatedInvitationResponse })
    @ApiResponse({ status: 400, description: 'Bad request / validation error.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
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
    @ApiOperation({ summary: 'List pending invitations (Owner/Admin)' })
    @ApiOkResponse({ type: [InvitationResponse] })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    async listPending(@CurrentTenant() tenant: Tenant): Promise<InvitationResponse[]> {
        return await this.invitationService.listPending(tenant.organizationId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
    @ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Organization ID' })
    @HttpCode(204)
    @Role('owner', 'admin')
    @ApiOperation({ summary: 'Revoke an invitation (Owner/Admin)' })
    @ApiNoContentResponse({ description: 'Invitation revoked successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Invitation not found.' })
    async revokeInvitation(
        @CurrentTenant() tenant: Tenant,
        @Param('id', ParseUUIDPipe) invId: string,
    ): Promise<void> {
        return await this.invitationService.revokeInvitation(tenant.organizationId, invId);
    }

    @Post('accept')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Accept an invitation' })
    @ApiOkResponse({ type: MembershipResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Invitation belongs to a different email address.' })
    @ApiResponse({ status: 404, description: 'Invalid or expired token.' })
    @ApiResponse({ status: 409, description: 'User is already a member of this organization.' })
    async acceptInvitation(
        @Body() dto: AcceptInvitationDto,
        @CurrentUser("userId") userId: string,
    ): Promise<MembershipRes> {
        return await this.invitationService.acceptInvitation(userId, dto.token)
    }
}
