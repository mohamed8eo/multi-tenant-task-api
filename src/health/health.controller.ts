import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health.js';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: DatabaseHealthIndicator,
    ) {}

    @Get()
    @HealthCheck()
    @ApiOperation({ summary: 'Check application and database health' })
    check() {
        return this.health.check([
            () => this.db.isHealthy('database'),
        ]);
    }
}
