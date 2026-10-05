import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../tenancy/guards/tenant.guard.js';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator.js';
import type { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { MemberResponse } from './dto/members.dto.js';
import { MembersService } from './members.service.js';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiOkResponse } from '@nestjs/swagger';

@ApiTags('members')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Organization ID' })
@Controller('members')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MembersController {
    constructor(private readonly membersService: MembersService) { }

    @Get()
    @ApiOkResponse({ type: [MemberResponse] })
    findAll(@CurrentTenant() tenant: Tenant): Promise<MemberResponse[]> {
        return this.membersService.findAll(tenant.organizationId);
    }
}
