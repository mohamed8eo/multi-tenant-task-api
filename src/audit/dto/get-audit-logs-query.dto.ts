import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class GetAuditLogsQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ example: 'project.created' })
    @IsOptional()
    @IsString()
    action?: string;

    @ApiPropertyOptional({ example: 'project' })
    @IsOptional()
    @IsString()
    resourceType?: string;
}
