import { SetMetadata } from "@nestjs/common";
import { OrgRole } from "../../db/schema/memberships.js";

export const ROLES_KEY = 'roles';

export const Role = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles)
