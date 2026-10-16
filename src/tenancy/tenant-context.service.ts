import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Tenant } from './interfaces/tenant.interface.js';

@Injectable()
export class TenantContextService {
    private readonly als = new AsyncLocalStorage<Tenant>();

    runWithTenant<T>(tenant: Tenant, callback: () => T): T {
        return this.als.run(tenant, callback);
    }

    getCurrentTenant(): Tenant | undefined {
        return this.als.getStore();
    }

    getOrganizationId(): string | undefined {
        return this.als.getStore()?.organizationId;
    }

    getRole(): string | undefined {
        return this.als.getStore()?.role;
    }
}
