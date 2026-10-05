import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/users.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { refundRequests, RefundRequest } from '../../db/schema/staff.schema.js';
import { eq, and, desc, count, sql, SQL, inArray, ilike, or } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { auditService } from '../../services/audit.service.js';

/**
 * List refund requests with pagination, search, and status filter
 */
export const getRefundRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();
    const status = (req.query.status as string)?.trim();
    const customerId = (req.query.customerId as string)?.trim();
    const orderId = (req.query.orderId as string)?.trim();

    const conditions: SQL[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(refundRequests.refundNumber, `%${search}%`),
          ilike(refundRequests.orderId, `%${search}%`),
          ilike(refundRequests.reason, `%${search}%`)
        )!
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(refundRequests.status, status as any));
    }

    if (customerId) conditions.push(eq(refundRequests.customerId, customerId));
    if (orderId) conditions.push(eq(refundRequests.orderId, orderId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ total: count() })
      .from(refundRequests)
      .where(whereClause);

    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    const refundsList = await db.query.refundRequests.findMany({
      where: whereClause,
      with: {
        customer: true,
        order: true,
        requestedBy: true,
        reviewedBy: true,
        approvedBy: true,
        processedBy: true,
      },
      orderBy: [desc(refundRequests.createdAt)],
      limit,
      offset,
    });

    const formattedRefunds = refundsList.map((r) => ({
      id: r.id,
      refundNumber: r.refundNumber,
      orderId: r.orderId,
      customerId: r.customerId,
      customerName: r.customer?.name || 'غير معروف',
      customerPhone: r.customer?.phoneNumber || '',
      amount: parseFloat(r.amount),
      maxRefundableAmount: parseFloat(r.maxRefundableAmount),
      reason: r.reason,
      status: r.status,
      requestedByUserId: r.requestedByUserId,
      requestedByName: r.requestedBy?.name || 'موظف خدمة العملاء',
      reviewedByUserId: r.reviewedByUserId,
      reviewedByName: r.reviewedBy?.name || null,
      approvedByUserId: r.approvedByUserId,
      approvedByName: r.approvedBy?.name || null,
      processedByUserId: r.processedByUserId,
      processedByName: r.processedBy?.name || null,
      rejectionReason: r.rejectionReason,
      gatewayReference: r.gatewayReference,
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      processedAt: r.processedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        refunds: formattedRefunds,
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
 * Submit a safe refund request (Customer Service Agent / Staff)
 */
export const createRefundRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId, amount, reason, notes } = req.body;
    const authorUser = req.user!;

    if (!orderId || !amount || !reason || !reason.trim()) {
      throw new AppError('رقم الطلب، المبلغ المسترجع، وسبب الإرجاع مطلوبة.', 400, 'FIELDS_REQUIRED');
    }

    const requestedAmount = parseFloat(amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      throw new AppError('المبلغ المطلوب استرجاعه يجب أن يكون رقماً موجباً أكبر من الصفر.', 400, 'INVALID_REFUND_AMOUNT');
    }

    // 1. Fetch Order from Database
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new AppError('الطلب المحدد غير موجود في النظام.', 404, 'ORDER_NOT_FOUND');
    }

    if (!['completed', 'cancelled', 'rejected', 'failed'].includes(order.status)) {
      throw new AppError(
        'لا يمكن تقديم طلب استرجاع مالي لطلب ما زال قيد التجهيز أو التوصيل.',
        400,
        'ORDER_NOT_REFUNDABLE'
      );
    }

    const orderTotal = parseFloat(order.totalAmount);

    // 2. Prevent Duplicate Open Refund Requests
    const existingOpenRefunds = await db
      .select()
      .from(refundRequests)
      .where(
        and(
          eq(refundRequests.orderId, orderId),
          inArray(refundRequests.status, ['requested', 'under_review'])
        )
      );

    if (existingOpenRefunds.length > 0) {
      throw new AppError(
        `يوجد طلب استرجاع مفتوح بالفعل لهذا الطلب (${existingOpenRefunds[0].refundNumber}) قيد المراجعة.`,
        409,
        'DUPLICATE_OPEN_REFUND_REQUEST'
      );
    }

    // 3. Calculate Previously Approved/Processed Refunds for this order
    const previousApprovedRefunds = await db
      .select({ totalRefunded: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(refundRequests)
      .where(
        and(
          eq(refundRequests.orderId, orderId),
          inArray(refundRequests.status, ['approved', 'processed'])
        )
      );

    const alreadyRefunded = parseFloat(previousApprovedRefunds[0]?.totalRefunded || '0');
    const maxRefundable = Math.max(0, orderTotal - alreadyRefunded);

    if (requestedAmount > maxRefundable) {
      throw new AppError(
        `المبلغ المطلوب (${requestedAmount.toFixed(2)} د.أ) يتجاوز الحد الأقصى القابل للاسترجاع لهذا الطلب (${maxRefundable.toFixed(2)} د.أ).`,
        400,
        'REFUND_AMOUNT_EXCEEDS_LIMIT'
      );
    }

    const refundNumber = `REF-${Math.floor(1000 + Math.random() * 9000)}`;

    const [newRefund] = await db
      .insert(refundRequests)
      .values({
        refundNumber,
        orderId,
        customerId: order.customerId,
        amount: requestedAmount.toFixed(2),
        maxRefundableAmount: maxRefundable.toFixed(2),
        reason: reason.trim(),
        notes: notes ? notes.trim() : null,
        status: 'requested',
        requestedByUserId: authorUser.id,
      })
      .returning();

    // Audit Log
    await auditService.log({
      req,
      action: 'REFUND_REQUEST',
      entityType: 'refund_request',
      entityId: newRefund.id,
      metadata: {
        refundNumber: newRefund.refundNumber,
        orderId,
        amount: requestedAmount,
        reason: newRefund.reason,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...newRefund,
        amount: parseFloat(newRefund.amount),
        maxRefundableAmount: parseFloat(newRefund.maxRefundableAmount),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single refund request by ID
 */
export const getRefundById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const refund = await db.query.refundRequests.findFirst({
      where: eq(refundRequests.id, id),
      with: {
        customer: true,
        order: {
          with: {
            items: true,
          },
        },
        requestedBy: true,
        reviewedBy: true,
        approvedBy: true,
        processedBy: true,
      },
    });

    if (!refund) {
      throw new AppError('طلب الاسترجاع غير موجود.', 404, 'REFUND_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: {
        ...refund,
        amount: parseFloat(refund.amount),
        maxRefundableAmount: parseFloat(refund.maxRefundableAmount),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move refund request to UNDER_REVIEW (Customer Service Manager / Admin)
 */
export const reviewRefundRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { notes } = req.body;
    const reviewer = req.user!;

    const [existing] = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('طلب الاسترجاع غير موجود.', 404, 'REFUND_NOT_FOUND');
    }

    if (existing.status !== 'requested') {
      throw new AppError(`لا يمكن نقل طلب الاسترجاع للمراجعة لأنه في حالة (${existing.status}).`, 400, 'INVALID_STATUS_TRANSITION');
    }

    const [updated] = await db
      .update(refundRequests)
      .set({
        status: 'under_review',
        reviewedByUserId: reviewer.id,
        notes: notes ? notes.trim() : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(refundRequests.id, id))
      .returning();

    await auditService.log({
      req,
      action: 'REFUND_REVIEW',
      entityType: 'refund_request',
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    res.status(200).json({
      success: true,
      data: {
        ...updated,
        amount: parseFloat(updated.amount),
        maxRefundableAmount: parseFloat(updated.maxRefundableAmount),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve refund request (Customer Service Manager / Super Admin)
 */
export const approveRefundRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { notes } = req.body;
    const approver = req.user!;

    const [existing] = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('طلب الاسترجاع غير موجود.', 404, 'REFUND_NOT_FOUND');
    }

    if (!['requested', 'under_review'].includes(existing.status)) {
      throw new AppError(`لا يمكن الموافقة على طلب الاسترجاع لأنه في حالة (${existing.status}).`, 400, 'INVALID_STATUS_TRANSITION');
    }

    const [updated] = await db
      .update(refundRequests)
      .set({
        status: 'approved',
        approvedByUserId: approver.id,
        notes: notes ? notes.trim() : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(refundRequests.id, id))
      .returning();

    await auditService.log({
      req,
      action: 'REFUND_APPROVE',
      entityType: 'refund_request',
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    res.status(200).json({
      success: true,
      data: {
        ...updated,
        amount: parseFloat(updated.amount),
        maxRefundableAmount: parseFloat(updated.maxRefundableAmount),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject refund request with mandatory reason (Customer Service Manager / Super Admin)
 */
export const rejectRefundRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { rejectionReason, notes } = req.body;
    const reviewer = req.user!;

    if (!rejectionReason || !rejectionReason.trim()) {
      throw new AppError('سبب الرفض إلزامي عند رفض طلب الاسترجاع.', 400, 'REJECTION_REASON_REQUIRED');
    }

    const [existing] = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('طلب الاسترجاع غير موجود.', 404, 'REFUND_NOT_FOUND');
    }

    if (!['requested', 'under_review'].includes(existing.status)) {
      throw new AppError(`لا يمكن رفض طلب الاسترجاع لأنه في حالة (${existing.status}).`, 400, 'INVALID_STATUS_TRANSITION');
    }

    const [updated] = await db
      .update(refundRequests)
      .set({
        status: 'rejected',
        reviewedByUserId: reviewer.id,
        rejectionReason: rejectionReason.trim(),
        notes: notes ? notes.trim() : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(refundRequests.id, id))
      .returning();

    await auditService.log({
      req,
      action: 'REFUND_REJECT',
      entityType: 'refund_request',
      entityId: id,
      metadata: { rejectionReason: rejectionReason.trim() },
      previousState: existing,
      newState: updated,
    });

    res.status(200).json({
      success: true,
      data: {
        ...updated,
        amount: parseFloat(updated.amount),
        maxRefundableAmount: parseFloat(updated.maxRefundableAmount),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark refund processed / executed (Super Admin / Admin only)
 */
export const processRefundRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { gatewayReference, notes } = req.body;
    const processor = req.user!;

    const [existing] = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('طلب الاسترجاع غير موجود.', 404, 'REFUND_NOT_FOUND');
    }

    if (existing.status !== 'approved') {
      throw new AppError('يمكن تنفيذ وتأكيد الاسترجاع للطلبات الموافق عليها فقط (APPROVED).', 400, 'MUST_BE_APPROVED');
    }

    const [updated] = await db
      .update(refundRequests)
      .set({
        status: 'processed',
        processedByUserId: processor.id,
        gatewayReference: gatewayReference ? gatewayReference.trim() : 'MANUAL_CASH_REFUND',
        notes: notes ? notes.trim() : existing.notes,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refundRequests.id, id))
      .returning();

    await auditService.log({
      req,
      action: 'REFUND_PROCESS',
      entityType: 'refund_request',
      entityId: id,
      metadata: { gatewayReference: updated.gatewayReference },
      previousState: existing,
      newState: updated,
    });

    res.status(200).json({
      success: true,
      data: {
        ...updated,
        amount: parseFloat(updated.amount),
        maxRefundableAmount: parseFloat(updated.maxRefundableAmount),
      },
    });
  } catch (error) {
    next(error);
  }
};
