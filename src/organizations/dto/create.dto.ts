// src/organizations/dto/create-organization.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class CreateOrganizationDto {
    @ApiProperty({ example: 'Acme Corp' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @Length(2, 100)
    name: string;
}
