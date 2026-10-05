import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import type { OrgRole } from '../../db/schema/memberships.js';

export class CreateInvitationDto {
    @IsEmail()
    @Transform(({ value }) => value?.trim().toLowerCase())
    email: string;

    @IsOptional()
    @IsEnum(['admin', 'member'] as const)
    @Transform(({ value }) => value ?? 'member')
    role?: OrgRole;
}
