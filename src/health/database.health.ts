import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

@Injectable()
export class DatabaseHealthIndicator {
    constructor(
        private readonly healthIndicatorService: HealthIndicatorService,
        @InjectDrizzle() private readonly db: NodePgDatabase,
    ) {}

    async isHealthy(key: string) {
        try {
            await this.db.execute(sql`SELECT 1`);
            return this.healthIndicatorService.check(key).up();
        } catch {
            return this.healthIndicatorService.check(key).down({ message: 'Database is down' });
        }
    }
}
