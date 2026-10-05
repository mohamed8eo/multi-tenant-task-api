// guards/roles.guard.ts

import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole } from '../../db/schema/memberships.js';
import { ROLES_KEY } from './role.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // No @Roles() → allow the request
        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();

        const tenant = request.tenant;

        if (!tenant) {
            throw new ForbiddenException();
        }

        if (!requiredRoles.includes(tenant.role)) {
            throw new ForbiddenException(
                'You do not have permission to perform this action',
            );
        }

        return true;
    }
}
