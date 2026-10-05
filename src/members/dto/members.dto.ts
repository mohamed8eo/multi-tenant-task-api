import { ApiProperty } from '@nestjs/swagger';
import type { OrgRole } from '../../db/schema/memberships.js';

export class MemberResponse {
    @ApiProperty()
    userId: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    username: string;

    @ApiProperty()
    email: string;

    @ApiProperty({ enum: ['owner', 'admin', 'member'] })
    role: OrgRole;

    @ApiProperty()
    joinedAt: Date;
}
