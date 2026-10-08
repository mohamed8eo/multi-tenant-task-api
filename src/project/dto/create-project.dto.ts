import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length, IsOptional, MaxLength, IsEnum } from "class-validator";
import type { ProjectStatus } from "../../db/schema/projects.js";

export class CreateProjectDto {
    @ApiProperty({ example: 'Website Redesign', maxLength: 200 })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @Length(1, 200)
    name: string;

    @ApiPropertyOptional({ example: 'Marketing site refresh', nullable: true, maxLength: 2000 })
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @MaxLength(2000)
    description?: string;



    @ApiProperty({
        enum: ['active', 'archived'],
    })
    @IsEnum(['active', 'archived'],)
    status: ProjectStatus;
}
