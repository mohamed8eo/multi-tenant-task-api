import { ApiProperty } from '@nestjs/swagger';
import type { OrgRole } from '../../db/schema/memberships.js';

export class OrganizationResponse {
    @ApiProperty() id: string;
    @ApiProperty() name: string;
    @ApiProperty({ enum: ['owner', 'admin', 'member'] }) role: OrgRole;
    @ApiProperty() createdAt: Date;
}
