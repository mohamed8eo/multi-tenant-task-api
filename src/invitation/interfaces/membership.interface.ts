import type { OrgRole } from "../../db/schema/memberships.js"

export interface MembershipRes {
    id: string;
    role: OrgRole;
    createdAt: Date;
    organizationId: string;
    userId: string;

}
