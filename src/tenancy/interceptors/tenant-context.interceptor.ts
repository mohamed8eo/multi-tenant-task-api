import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from '../tenant-context.service.js';
import { Tenant } from '../interfaces/tenant.interface.js';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
    constructor(private readonly tenantContextService: TenantContextService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest<any>();
        const tenant: Tenant | undefined = req.tenant;

        if (tenant) {
            return new Observable((observer) => {
                this.tenantContextService.runWithTenant(tenant, () => {
                    next.handle().subscribe({
                        next: (res) => observer.next(res),
                        error: (err) => observer.error(err),
                        complete: () => observer.complete(),
                    });
                });
            });
        }

        return next.handle();
    }
}
