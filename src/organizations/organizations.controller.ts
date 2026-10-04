import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateOrganizationDto } from './dto/create.dto.js';
import { OrganizationsService } from './organizations.service.js';
import { OrganizationResponse } from './dto/organization-response.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
    constructor(
        private readonly organizationsService: OrganizationsService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new organization' })
    @ApiResponse({ status: 201, description: 'Organization successfully created.', type: OrganizationResponse })
    @ApiResponse({ status: 400, description: 'Bad request / validation error.' })
    @ApiResponse({ status: 401, description: 'Unauthorized / User no longer exists.' })
    async create(
        @Body() dto: CreateOrganizationDto,
        @CurrentUser() user: JwtUser,
    ): Promise<OrganizationResponse> {
        return await this.organizationsService.create(dto, user.userId)
    }

    @Get()
    @ApiOperation({ summary: 'Get all organizations for current user' })
    @ApiResponse({ status: 200, description: 'List of organizations retrieved successfully.', type: [OrganizationResponse] })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    async findAllForUser(@CurrentUser() user: JwtUser): Promise<OrganizationResponse[]> {
        return this.organizationsService.findAllForUser(user.userId)
    }
}
