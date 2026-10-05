import {
    BadRequestException, CanActivate, ExecutionContext,
    ForbiddenException, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { isUUID } from 'class-validator';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Request } from 'express';
import { JwtUser } from '../../auth/interfaces/jwt-user.interface.js';
import { Tenant } from '../interfaces/tenant.interface.js';
import { memberships } from '../../db/schema/memberships.js';

@Injectable()
export class TenantGuard implements CanActivate {
    constructor(@InjectDrizzle() private readonly db: NodePgDatabase) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request & { user?: JwtUser; tenant?: Tenant }>();

        if (!req.user) throw new UnauthorizedException();

        const orgId = req.headers['x-tenant-id'];
        if (typeof orgId !== 'string' || !isUUID(orgId)) {
            throw new BadRequestException('X-Tenant-Id header is required and must be a UUID');
        }

        const [membership] = await this.db
            .select({ role: memberships.role })
            .from(memberships)
            .where(and(
                eq(memberships.userId, req.user.userId),
                eq(memberships.organizationId, orgId),
            ));

        if (!membership) throw new ForbiddenException('Not a member of this organization');

        req.tenant = { organizationId: orgId, role: membership.role };
        return true;
    }
}
