import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { auditLogs, AuditLog } from '../db/schema/audit-logs.js';
import { and, eq, sql, desc } from 'drizzle-orm';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto.js';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface.js';

export interface LogParams {
    organizationId: string;
    userId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
    constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

    async log(params: LogParams): Promise<void> {
        await this.db.insert(auditLogs).values({
            organizationId: params.organizationId,
            userId: params.userId ?? null,
            action: params.action,
            resourceType: params.resourceType,
            resourceId: params.resourceId,
            metadata: params.metadata ?? null,
        });
    }

    async findAll(orgId: string, query: GetAuditLogsQueryDto): Promise<PaginatedResponse<AuditLog>> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const offset = query.offset;

        const conditions = [eq(auditLogs.organizationId, orgId)];

        if (query.action) {
            conditions.push(eq(auditLogs.action, query.action));
        }
        if (query.resourceType) {
            conditions.push(eq(auditLogs.resourceType, query.resourceType));
        }

        const whereClause = and(...conditions);

        const [data, [{ count }]] = await Promise.all([
            this.db
                .select()
                .from(auditLogs)
                .where(whereClause)
                .orderBy(desc(auditLogs.createdAt))
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(auditLogs)
                .where(whereClause),
        ]);

        const total = Number(count) || 0;
        const totalPages = Math.ceil(total / limit) || 0;

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
}
