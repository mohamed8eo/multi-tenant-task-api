import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../tenancy/guards/tenant.guard.js';
import { RolesGuard } from '../tenancy/guards/roles.guard.js';
import { Role } from '../tenancy/decorators/role.decorator.js';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator.js';
import type { Tenant } from '../tenancy/interfaces/tenant.interface.js';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto.js';
import { AuditLog } from '../db/schema/audit-logs.js';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface.js';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('audit-logs')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Organization ID' })
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    @Get()
    @Role('admin', 'owner')
    @ApiOperation({ summary: 'Get paginated audit logs (Admin/Owner only)' })
    @ApiOkResponse({ description: 'Audit logs retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    async findAll(
        @CurrentTenant() tenant: Tenant,
        @Query() query: GetAuditLogsQueryDto,
    ): Promise<PaginatedResponse<AuditLog>> {
        return await this.auditService.findAll(tenant.organizationId, query);
    }
}
