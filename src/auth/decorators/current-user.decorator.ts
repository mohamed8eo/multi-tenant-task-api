import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { JwtUser } from "../interfaces/jwt-user.interface.js";

export const CurrentUser = createParamDecorator(
    (field: keyof JwtUser | undefined, ctx: ExecutionContext) => {
        const user = ctx.switchToHttp().getRequest<Request & { user: JwtUser }>().user;
        return field ? user?.[field] : user;
    }

)
