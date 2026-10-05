import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/users.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { supportCases, customerServiceNotes, staffProfiles } from '../../db/schema/staff.schema.js';
import { eq, ilike, or, and, desc, count, sql, SQL, inArray } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { auditService } from '../../services/audit.service.js';
import { hasPermission } from '../../middleware/auth.js';

export const VALID_CASE_CATEGORIES = [
  'order_delay',
  'damaged_item',
  'wrong_item',
  'driver_behavior',
  'payment_issue',
  'general_inquiry',
  'other',
  'general',
];

/**
 * List support cases with pagination, search, status, priority, category, and staff filters
 */
export const getSupportCases = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();
    const status = (req.query.status as string)?.trim();
    const priority = (req.query.priority as string)?.trim();
    const category = (req.query.category as string)?.trim();
    const assignedStaffId = (req.query.assignedStaffId as string)?.trim();
    const customerId = (req.query.customerId as string)?.trim();
    const orderId = (req.query.orderId as string)?.trim();

    const conditions: SQL[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(supportCases.caseNumber, `%${search}%`),
          ilike(supportCases.title, `%${search}%`),
          ilike(supportCases.description, `%${search}%`)
        )!
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(supportCases.status, status as any));
    }

    if (priority && priority !== 'all') {
      conditions.push(eq(supportCases.priority, priority as any));
    }

    if (category && category !== 'all') {
      conditions.push(eq(supportCases.category, category));
    }

    if (assignedStaffId && assignedStaffId !== 'all') {
      if (assignedStaffId === 'unassigned') {
        conditions.push(sql`${supportCases.assignedStaffId} IS NULL`);
      } else {
        conditions.push(eq(supportCases.assignedStaffId, assignedStaffId));
      }
    }

    if (customerId) conditions.push(eq(supportCases.customerId, customerId));
    if (orderId) conditions.push(eq(supportCases.orderId, orderId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ total: count() })
      .from(supportCases)
      .where(whereClause);

    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    const casesList = await db.query.supportCases.findMany({
      where: whereClause,
      with: {
        customer: true,
        assignedStaff: true,
        createdByStaff: true,
        order: true,
      },
      orderBy: [desc(supportCases.createdAt)],
      limit,
      offset,
    });

    const formattedCases = casesList.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      customerId: c.customerId,
      customerName: c.customer?.name || 'غير معروف',
      customerPhone: c.customer?.phoneNumber || '',
      orderId: c.orderId,
      assignedStaffId: c.assignedStaffId,
      assignedStaffName: c.assignedStaff?.name || null,
      createdByStaffId: c.createdByStaffId,
      createdByStaffName: c.createdByStaff?.name || 'النظام',
      title: c.title,
      description: c.description,
      category: c.category || 'general',
      status: c.status,
      priority: c.priority,
      resolutionNotes: c.resolutionNotes,
      resolvedAt: c.resolvedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        cases: formattedCases,
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

/**
 * Create a new support case
 */
export const createSupportCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerId, orderId, assignedStaffId, title, description, priority, category } = req.body;
    const authorUser = req.user!;

    if (!customerId || !title || !description) {
      throw new AppError('رقم العميل، العنوان، وتفاصيل المشكلة مطلوبة لفتح تذكرة دعم.', 400, 'FIELDS_REQUIRED');
    }

    // Verify Customer Exists
    const [cust] = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
    if (!cust) {
      throw new AppError('العميل المحدد غير موجود.', 404, 'CUSTOMER_NOT_FOUND');
    }

    if (orderId) {
      const [ord] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!ord) {
        throw new AppError('الطلب المحدد غير موجود.', 404, 'ORDER_NOT_FOUND');
      }
    }

    const caseNumber = `CASE-${Math.floor(1000 + Math.random() * 9000)}`;
    const targetCategory = category && VALID_CASE_CATEGORIES.includes(category) ? category : 'general';

    const [newCase] = await db
      .insert(supportCases)
      .values({
        caseNumber,
        customerId,
        orderId: orderId || null,
        assignedStaffId: assignedStaffId || null,
        createdByStaffId: authorUser.id,
        title: title.trim(),
        description: description.trim(),
        category: targetCategory,
        priority: priority && ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal',
        status: 'open',
      })
      .returning();

    // Increment staff profile counter
    await db
      .update(staffProfiles)
      .set({
        casesHandledCount: sql`${staffProfiles.casesHandledCount} + 1`,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(staffProfiles.userId, authorUser.id));

    // Audit Log
    await auditService.log({
      req,
      action: 'SUPPORT_CASE_CREATE',
      entityType: 'support_case',
      entityId: newCase.id,
      metadata: {
        caseNumber: newCase.caseNumber,
        customerId,
        orderId: orderId || null,
        title: newCase.title,
        category: newCase.category,
        priority: newCase.priority,
      },
    });

    res.status(201).json({
      success: true,
      data: newCase,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed support case by ID
 */
export const getSupportCaseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const caseItem = await db.query.supportCases.findFirst({
      where: eq(supportCases.id, id),
      with: {
        customer: true,
        order: {
          with: {
            items: true,
          },
        },
        assignedStaff: true,
        createdByStaff: true,
      },
    });

    if (!caseItem) {
      throw new AppError('تذكرة الدعم غير موجودة.', 404, 'CASE_NOT_FOUND');
    }

    // Fetch related customer service notes
    const relatedNotes = await db
      .select()
      .from(customerServiceNotes)
      .where(
        caseItem.orderId
          ? or(eq(customerServiceNotes.customerId, caseItem.customerId), eq(customerServiceNotes.orderId, caseItem.orderId))
          : eq(customerServiceNotes.customerId, caseItem.customerId)
      )
      .orderBy(desc(customerServiceNotes.createdAt));

    res.status(200).json({
      success: true,
      data: {
        ...caseItem,
        customerName: caseItem.customer?.name || 'غير معروف',
        customerPhone: caseItem.customer?.phoneNumber || '',
        assignedStaffName: caseItem.assignedStaff?.name || null,
        createdByStaffName: caseItem.createdByStaff?.name || 'النظام',
        category: caseItem.category || 'general',
        notes: relatedNotes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update support case (status, priority, category, assigned agent, resolution notes)
 */
export const updateSupportCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, priority, category, assignedStaffId, resolutionNotes } = req.body;
    const user = req.user!;

    const [existing] = await db
      .select()
      .from(supportCases)
      .where(eq(supportCases.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('تذكرة الدعم غير موجودة.', 404, 'CASE_NOT_FOUND');
    }

    // GAP 3: Enforce Case Reassignment RBAC Server-Side
    if (assignedStaffId !== undefined && assignedStaffId !== existing.assignedStaffId) {
      if (!hasPermission(user.role, 'manage_support_cases')) {
        throw new AppError(
          'ليس لديك الصلاحيات الكافية لتعيين أو إعادة تعيين تذاكر الدعم لموظفين آخرين. الصلاحيات المطلوبة: manage_support_cases',
          403,
          'FORBIDDEN_PERMISSION'
        );
      }
    }

    const payload: Record<string, any> = { updatedAt: new Date() };

    if (status) {
      if (!['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'].includes(status)) {
        throw new AppError('حالة التذكرة المحددة غير صالحة.', 400, 'INVALID_STATUS');
      }
      payload.status = status;
      if (status === 'resolved' || status === 'closed') {
        payload.resolvedAt = new Date();
      }
    }

    if (priority) {
      if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
        throw new AppError('أولوية التذكرة المحددة غير صالحة.', 400, 'INVALID_PRIORITY');
      }
      payload.priority = priority;
    }

    if (category) {
      if (!VALID_CASE_CATEGORIES.includes(category)) {
        throw new AppError('تصنيف التذكرة المحدد غير صالح.', 400, 'INVALID_CATEGORY');
      }
      payload.category = category;
    }

    if (assignedStaffId !== undefined) {
      payload.assignedStaffId = assignedStaffId ? assignedStaffId : null;
    }

    if (resolutionNotes !== undefined) {
      payload.resolutionNotes = resolutionNotes ? resolutionNotes.trim() : null;
    }

    const [updatedCase] = await db
      .update(supportCases)
      .set(payload)
      .where(eq(supportCases.id, id))
      .returning();

    // Audit Log
    await auditService.log({
      req,
      action: 'SUPPORT_CASE_UPDATE',
      entityType: 'support_case',
      entityId: id,
      previousState: existing,
      newState: updatedCase,
    });

    res.status(200).json({
      success: true,
      data: updatedCase,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add an immutable internal note attached directly to a support case (GAP 4)
 */
export const addCaseNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { note } = req.body;
    const authorUser = req.user!;

    if (!note || !note.trim()) {
      throw new AppError('محتوى الملاحظة مطلوب.', 400, 'FIELDS_REQUIRED');
    }

    // 1. Verify Case Exists
    const [caseItem] = await db
      .select()
      .from(supportCases)
      .where(eq(supportCases.id, id))
      .limit(1);

    if (!caseItem) {
      throw new AppError('تذكرة الدعم غير موجودة.', 404, 'CASE_NOT_FOUND');
    }

    // 2. Insert note into customerServiceNotes
    const [newNote] = await db
      .insert(customerServiceNotes)
      .values({
        customerId: caseItem.customerId,
        orderId: caseItem.orderId || null,
        authorUserId: authorUser.id,
        authorRole: authorUser.role,
        authorName: authorUser.name || 'موظف خدمة العملاء',
        note: `[تذكرة ${caseItem.caseNumber}] ${note.trim()}`,
      })
      .returning();

    // 3. Update staff activity counter
    await db
      .update(staffProfiles)
      .set({
        casesHandledCount: sql`${staffProfiles.casesHandledCount} + 1`,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(staffProfiles.userId, authorUser.id));

    // 4. Audit Log
    await auditService.log({
      req,
      action: 'SUPPORT_CASE_NOTE_CREATE',
      entityType: 'support_case',
      entityId: id,
      metadata: {
        caseNumber: caseItem.caseNumber,
        noteId: newNote.id,
        authorName: authorUser.name,
      },
    });

    res.status(201).json({
      success: true,
      data: newNote,
    });
  } catch (error) {
    next(error);
  }
};
