import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator.js';
import type { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { MemberResponse } from './dto/members.dto.js';
import { MembersService } from './members.service.js';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
    constructor(private readonly membersService: MembersService) { }
    async findAll(@CurrentTenant() tenant: Tenant): Promise<MemberResponse[]> {
        return await this.membersService.findAll(tenant.organizationId)
    }
}
