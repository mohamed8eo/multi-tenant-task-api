import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiForbiddenResponse } from "@nestjs/swagger";
import { TenantGuard } from "../guards/tenant.guard.js";

export const TenantScoped = () =>
    applyDecorators(
        UseGuards(TenantGuard),
        ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Organization ID' }),
        ApiForbiddenResponse({ description: 'Not a member of this organization.' }),
    );
