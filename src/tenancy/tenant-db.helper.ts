import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { TenantContextService } from './tenant-context.service.js';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TenantDbService {
    constructor(
        @InjectDrizzle() private readonly db: NodePgDatabase,
        private readonly tenantContext: TenantContextService,
        private readonly configService: ConfigService,
    ) {}

    getOrgId(): string {
        const orgId = this.tenantContext.getOrganizationId();
        if (!orgId) {
            throw new BadRequestException('Tenant context is missing');
        }
        return orgId;
    }

    async withTenantTransaction<T>(callback: (tx: any, orgId: string) => Promise<T>): Promise<T> {
        const orgId = this.getOrgId();
        const enableRls = this.configService.get<string>('ENABLE_POSTGRES_RLS') === 'true';

        return await this.db.transaction(async (tx) => {
            if (enableRls) {
                await tx.execute(sql`SELECT set_config('app.current_tenant', ${orgId}, true)`);
            }
            return await callback(tx, orgId);
        });
    }

    async executeWithTenant<T>(callback: (db: NodePgDatabase, orgId: string) => Promise<T>): Promise<T> {
        const orgId = this.getOrgId();
        const enableRls = this.configService.get<string>('ENABLE_POSTGRES_RLS') === 'true';

        if (enableRls) {
            await this.db.execute(sql`SELECT set_config('app.current_tenant', ${orgId}, true)`);
        }
        return await callback(this.db, orgId);
    }

    scopeCondition(table: { organizationId: any }, orgId?: string) {
        const tenantId = orgId || this.getOrgId();
        return eq(table.organizationId, tenantId);
    }
}
