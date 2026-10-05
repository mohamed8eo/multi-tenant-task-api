import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Tenant } from "../interfaces/tenant.interface.js";
import { Request } from "express";

export const CurrentTenant = createParamDecorator(
    (field: keyof Tenant | undefined, ctx: ExecutionContext) => {
        const tenant = ctx.switchToHttp().getRequest<Request & { tenant: Tenant }>().tenant;
        return field ? tenant?.[field] : tenant;
    }
)
