import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service.js';
import { TenantContextInterceptor } from './interceptors/tenant-context.interceptor.js';
import { TenantGuard } from './guards/tenant.guard.js';
import { TenantDbService } from './tenant-db.helper.js';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Global()
@Module({
    providers: [
        TenantContextService,
        TenantGuard,
        TenantDbService,
        {
            provide: APP_INTERCEPTOR,
            useClass: TenantContextInterceptor,
        },
    ],
    exports: [TenantContextService, TenantGuard, TenantDbService],
})
export class TenancyModule {}
