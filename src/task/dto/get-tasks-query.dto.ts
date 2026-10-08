import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { taskStatus, type TaskStatus } from '../../db/schema/tasks.js';

export class GetTasksQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Filter by Project ID' })
    @IsOptional()
    @IsUUID()
    projectId?: string;

    @ApiPropertyOptional({ enum: taskStatus.enumValues, description: 'Filter by task status' })
    @IsOptional()
    @IsEnum(taskStatus.enumValues)
    status?: TaskStatus;

    @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Filter by Assignee User ID' })
    @IsOptional()
    @IsUUID()
    assigneeId?: string;

    @ApiPropertyOptional({ example: 'auth bug', description: 'Search query in title or description' })
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    search?: string;

    @ApiPropertyOptional({ example: 'dueDate:asc', description: 'Sort by field and direction (field:asc|desc)' })
    @IsOptional()
    @IsString()
    sort?: string;
}
