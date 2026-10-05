import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { auditLogs } from '../../db/schema/staff.schema.js';
import { eq, ilike, or, and, desc, count, sql, SQL, gte, lte } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * List audit logs with pagination, search, actor, action, entity type, and date range filters
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();
    const action = (req.query.action as string)?.trim();
    const entityType = (req.query.entityType as string)?.trim();
    const actorUserId = (req.query.actorUserId as string)?.trim();
    const startDate = (req.query.startDate as string)?.trim();
    const endDate = (req.query.endDate as string)?.trim();

    const conditions: SQL[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(auditLogs.action, `%${search}%`),
          ilike(auditLogs.entityId, `%${search}%`),
          ilike(auditLogs.actorName, `%${search}%`),
          ilike(auditLogs.ipAddress, `%${search}%`)
        )!
      );
    }

    if (action && action !== 'all') {
      conditions.push(eq(auditLogs.action, action));
    }

    if (entityType && entityType !== 'all') {
      conditions.push(eq(auditLogs.entityType, entityType));
    }

    if (actorUserId && actorUserId !== 'all') {
      conditions.push(eq(auditLogs.actorUserId, actorUserId));
    }

    if (startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(whereClause);

    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    const logsList = await db.query.auditLogs.findMany({
      where: whereClause,
      with: {
        actor: true,
      },
      orderBy: [desc(auditLogs.createdAt)],
      limit,
      offset,
    });

    const formattedLogs = logsList.map((log) => ({
      id: log.id,
      actorUserId: log.actorUserId,
      actorName: log.actor?.name || log.actorName || 'النظام',
      actorRole: log.actor?.role || log.actorRole,
      actorPhone: log.actor?.phoneNumber || null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      previousState: log.previousState,
      newState: log.newState,
      createdAt: log.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        logs: formattedLogs,
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};
