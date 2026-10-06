import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { OrgRole } from '../../db/schema/memberships.js';

export class UpdateRoleDto {
    @ApiProperty({ enum: ['admin', 'member'], example: 'admin' })
    @IsIn(['admin', 'member'])
    role: OrgRole;
}
