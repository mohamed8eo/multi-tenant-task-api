import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { taskPriority, taskStatus, type TaskPriority, type TaskStatus } from '../../db/schema/tasks.js';

export class CreateTaskDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Project ID' })
    @IsUUID()
    projectId: string;

    @ApiProperty({ example: 'Fix authentication bug', maxLength: 255 })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @Length(1, 255)
    title: string;

    @ApiPropertyOptional({ example: 'Investigate and fix JWT refresh issue', nullable: true, maxLength: 2000 })
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ enum: taskStatus.enumValues, default: 'todo' })
    @IsOptional()
    @IsEnum(taskStatus.enumValues)
    status?: TaskStatus = 'todo';

    @ApiPropertyOptional({ enum: taskPriority.enumValues, default: 'medium' })
    @IsOptional()
    @IsEnum(taskPriority.enumValues)
    priority?: TaskPriority = 'medium';

    @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', nullable: true, description: 'Assignee User ID' })
    @IsOptional()
    @IsUUID()
    assigneeId?: string;

    @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', nullable: true, description: 'Due date' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    dueDate?: Date;
}
