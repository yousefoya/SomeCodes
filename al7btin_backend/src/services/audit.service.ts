import { db } from '../db/index.js';
import { auditLogs } from '../db/schema/staff.schema.js';

export interface RecordAuditParams {
  req?: any;
  actorUserId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any>;
}

export async function logAudit(params: RecordAuditParams): Promise<void> {
  try {
    const actorUserId = params.actorUserId || params.req?.user?.id || null;
    const actorName = params.actorName || params.req?.user?.name || null;
    const actorRole = params.actorRole || params.req?.user?.role || 'system';
    const ipAddress = params.ipAddress || params.req?.ip || params.req?.headers?.['x-forwarded-for'] || null;
    const userAgent = params.userAgent || params.req?.headers?.['user-agent'] || null;

    await db.insert(auditLogs).values({
      actorUserId,
      actorName,
      actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      previousState: params.previousState ? JSON.parse(JSON.stringify(params.previousState)) : null,
      newState: params.newState ? JSON.parse(JSON.stringify(params.newState)) : null,
      ipAddress,
      userAgent,
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error('⚠️ [AUDIT LOGGING ERROR] Failed to record audit log:', error);
  }
}

export const auditService = {
  log: logAudit,
  record: logAudit,
  logAudit,
};


