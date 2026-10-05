import { OrgRole } from "../../db/schema/memberships.js"

export interface Tenant {
    organizationId: string

    role: OrgRole
}
