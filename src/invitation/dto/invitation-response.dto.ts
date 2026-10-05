import { ApiProperty } from '@nestjs/swagger';
import type { OrgRole } from '../../db/schema/memberships.js';

export class InvitationResponse {
    @ApiProperty()
    id: string;

    @ApiProperty()
    email: string;

    @ApiProperty({ enum: ['owner', 'admin', 'member'] })
    role: OrgRole;

    @ApiProperty()
    expiresAt: Date;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty({ nullable: true })
    invitedBy: string | null;
}
