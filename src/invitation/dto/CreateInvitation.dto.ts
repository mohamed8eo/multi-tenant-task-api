import { IsEmail, IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import type { OrgRole } from '../../db/schema/memberships.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
    @ApiProperty()
    @IsEmail()
    @Transform(({ value }) => value?.trim().toLowerCase())
    email: string;

    @ApiPropertyOptional({ enum: ['admin', 'member'], default: 'member' })
    @IsOptional()
    @IsIn(['admin', 'member'])
    role: Exclude<OrgRole, 'owner'> = 'member';
}
