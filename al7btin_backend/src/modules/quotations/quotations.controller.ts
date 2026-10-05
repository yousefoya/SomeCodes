import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { quotations, QuotationLineItem } from '../../db/schema/quotations.schema.js';
import { orders, orderItems } from '../../db/schema/orders.schema.js';
import { services } from '../../db/schema/services.schema.js';
import { providers } from '../../db/schema/providers.schema.js';
import { eq, desc, and, or, SQL } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { logAudit } from '../../services/audit.service.js';

/**
 * Helper to compute quotation totals reliably
 */
function computeTotals(params: {
  items?: QuotationLineItem[];
  laborAmount?: number | string;
  materialsAmount?: number | string;
  sparePartsAmount?: number | string;
  equipmentAmount?: number | string;
  serviceFees?: number | string;
  discountAmount?: number | string;
}) {
  const items = params.items || [];
  let labor = Number(params.laborAmount || 0);
  let materials = Number(params.materialsAmount || 0);
  let spareParts = Number(params.sparePartsAmount || 0);
  let equipment = Number(params.equipmentAmount || 0);

  // If item list is provided, sum up by type if category amounts were not explicitly given
  if (items.length > 0 && !params.laborAmount && !params.materialsAmount) {
    labor = 0;
    materials = 0;
    spareParts = 0;
    equipment = 0;
    for (const it of items) {
      const lineTotal = Number(it.total || (it.unitPrice * it.quantity) || 0);
      if (it.type === 'labor' || it.type === 'additional_work') {
        labor += lineTotal;
      } else if (it.type === 'materials') {
        materials += lineTotal;
      } else if (it.type === 'spare_parts') {
        spareParts += lineTotal;
      } else if (it.type === 'equipment') {
        equipment += lineTotal;
      }
    }
  }

  const serviceFees = Number(params.serviceFees || 0);
  const discountAmount = Number(params.discountAmount || 0);
  const subtotal = Math.round((labor + materials + spareParts + equipment + serviceFees) * 100) / 100;
  const deliveryFee = 0.0; // Strict 0.00 JOD Delivery Fee
  const totalAmount = Math.max(0, Math.round((subtotal - discountAmount + deliveryFee) * 100) / 100);

  return {
    labor: labor.toFixed(2),
    materials: materials.toFixed(2),
    spareParts: spareParts.toFixed(2),
    equipment: equipment.toFixed(2),
    serviceFees: serviceFees.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    subtotal: subtotal.toFixed(2),
    deliveryFee: deliveryFee.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
  };
}

/**
 * Create a new quotation draft for an order
 */
export const createQuotation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const {
      orderId,
      items = [],
      laborAmount,
      materialsAmount,
      sparePartsAmount,
      equipmentAmount,
      serviceFees,
      discountAmount,
      notes,
      attachments = [],
      expiresInHours = 48,
    } = req.body;

    if (!orderId) {
      throw new AppError('معرف الطلب مطلوب لإنشاء عرض السعر.', 400, 'ORDER_ID_REQUIRED');
    }

    // Verify order exists
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      throw new AppError('الطلب غير موجود.', 404, 'ORDER_NOT_FOUND');
    }

    // If provider, check if assigned to this order or provider matches
    if (user.role === 'provider') {
      const [prov] = await db.select().from(providers).where(eq(providers.userId, user.id)).limit(1);
      if (order.providerId && prov && order.providerId !== prov.id) {
        throw new AppError('غير مصرح لك بإنشاء عرض سعر لطلب لا يتبع لك.', 403, 'FORBIDDEN_PROVIDER');
      }
    }

    // Determine service ID from order
    let serviceId = '';
    const [orderItem] = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).limit(1);
    if (orderItem) {
      serviceId = orderItem.serviceId;
    } else {
      // Find default service or category
      const [srv] = await db.select().from(services).limit(1);
      serviceId = srv?.id || 'srv_general_maintenance';
    }

    const calculated = computeTotals({
      items,
      laborAmount,
      materialsAmount,
      sparePartsAmount,
      equipmentAmount,
      serviceFees,
      discountAmount,
    });

    const quotationId = `QT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

    const [createdQuotation] = await db
      .insert(quotations)
      .values({
        id: quotationId,
        orderId,
        serviceId,
        providerId: order.providerId || null,
        createdByUserId: user.id,
        createdByName: user.name,
        status: 'draft',
        laborAmount: calculated.labor,
        materialsAmount: calculated.materials,
        sparePartsAmount: calculated.spareParts,
        equipmentAmount: calculated.equipment,
        serviceFees: calculated.serviceFees,
        discountAmount: calculated.discountAmount,
        subtotal: calculated.subtotal,
        deliveryFee: calculated.deliveryFee,
        totalAmount: calculated.totalAmount,
        items,
        notes: notes || null,
        attachments,
        expiresAt,
      })
      .returning();

    await logAudit({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'QUOTATION_CREATE',
      entityType: 'quotation',
      entityId: quotationId,
      newState: createdQuotation,
      metadata: { orderId, totalAmount: calculated.totalAmount },
    });

    res.status(201).json({
      success: true,
      data: createdQuotation,
      message: 'تم إنشاء مسودة عرض السعر بنجاح.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List quotations with filters
 */
export const getQuotations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const { orderId, status, providerId } = req.query;

    const conditions: SQL[] = [];

    // Customers can only see quotations for their own orders
    if (user.role === 'customer') {
      const customerOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.customerId, user.id));
      const orderIds = customerOrders.map((o) => o.id);
      if (orderIds.length === 0) {
        res.status(200).json({ success: true, data: [] });
        return;
      }
      conditions.push(or(...orderIds.map((oid) => eq(quotations.orderId, oid)))!);
    }

    if (orderId) {
      conditions.push(eq(quotations.orderId, orderId as string));
    }

    if (status && status !== 'all') {
      conditions.push(eq(quotations.status, status as any));
    }

    if (providerId) {
      conditions.push(eq(quotations.providerId, providerId as string));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db.query.quotations.findMany({
      where: whereClause,
      with: {
        order: true,
        service: true,
        provider: true,
      },
      orderBy: [desc(quotations.createdAt)],
    });

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get quotation by ID
 */
export const getQuotationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const quotation = await db.query.quotations.findFirst({
      where: eq(quotations.id, id),
      with: {
        order: true,
        service: true,
        provider: true,
      },
    });

    if (!quotation) {
      throw new AppError('عرض السعر غير موجود.', 404, 'QUOTATION_NOT_FOUND');
    }

    // Access check for customers
    if (user.role === 'customer' && quotation.order?.customerId !== user.id) {
      throw new AppError('غير مصرح لك بعرض هذا المستند.', 403, 'FORBIDDEN_QUOTATION');
    }

    res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update quotation (Only draft status)
 */
export const updateQuotation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const [existing] = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
    if (!existing) {
      throw new AppError('عرض السعر غير موجود.', 404, 'QUOTATION_NOT_FOUND');
    }

    if (existing.status !== 'draft') {
      throw new AppError('لا يمكن تعديل عرض السعر بعد إرساله للعميل.', 400, 'CANNOT_EDIT_SENT_QUOTATION');
    }

    const {
      items,
      laborAmount,
      materialsAmount,
      sparePartsAmount,
      equipmentAmount,
      serviceFees,
      discountAmount,
      notes,
      attachments,
    } = req.body;

    const calculated = computeTotals({
      items: items ?? existing.items,
      laborAmount: laborAmount ?? existing.laborAmount,
      materialsAmount: materialsAmount ?? existing.materialsAmount,
      sparePartsAmount: sparePartsAmount ?? existing.sparePartsAmount,
      equipmentAmount: equipmentAmount ?? existing.equipmentAmount,
      serviceFees: serviceFees ?? existing.serviceFees,
      discountAmount: discountAmount ?? existing.discountAmount,
    });

    const [updated] = await db
      .update(quotations)
      .set({
        laborAmount: calculated.labor,
        materialsAmount: calculated.materials,
        sparePartsAmount: calculated.spareParts,
        equipmentAmount: calculated.equipment,
        serviceFees: calculated.serviceFees,
        discountAmount: calculated.discountAmount,
        subtotal: calculated.subtotal,
        deliveryFee: calculated.deliveryFee,
        totalAmount: calculated.totalAmount,
        items: items ?? existing.items,
        notes: notes !== undefined ? notes : existing.notes,
        attachments: attachments ?? existing.attachments,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id))
      .returning();

    await logAudit({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'QUOTATION_UPDATE',
      entityType: 'quotation',
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم تحديث عرض السعر بنجاح.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send quotation to customer
 */
export const sendQuotation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const [existing] = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
    if (!existing) {
      throw new AppError('عرض السعر غير موجود.', 404, 'QUOTATION_NOT_FOUND');
    }

    if (existing.status !== 'draft') {
      throw new AppError('تم إرسال عرض السعر مسبقاً.', 400, 'QUOTATION_ALREADY_SENT');
    }

    const [updated] = await db
      .update(quotations)
      .set({
        status: 'sent',
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id))
      .returning();

    await logAudit({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'QUOTATION_SENT',
      entityType: 'quotation',
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم إرسال عرض السعر للعميل بنجاح.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Customer approves quotation
 */
export const approveQuotation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { customerNotes } = req.body;

    const [existing] = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
    if (!existing) {
      throw new AppError('عرض السعر غير موجود.', 404, 'QUOTATION_NOT_FOUND');
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, existing.orderId)).limit(1);
    if (!order) {
      throw new AppError('الطلب غير موجود.', 404, 'ORDER_NOT_FOUND');
    }

    // Only the customer or staff acting on customer's behalf can approve
    if (user.role === 'customer' && order.customerId !== user.id) {
      throw new AppError('غير مصرح لك بالموافقة على عرض سعر لطلب آخر.', 403, 'FORBIDDEN_QUOTATION');
    }

    if (existing.status !== 'sent') {
      throw new AppError('عرض السعر ليس في حالة جاهزة للموافقة.', 400, 'QUOTATION_NOT_READY_FOR_APPROVAL');
    }

    const [updated] = await db
      .update(quotations)
      .set({
        status: 'customer_approved',
        approvedAt: new Date(),
        customerNotes: customerNotes || existing.customerNotes,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id))
      .returning();

    // Update parent order totals to incorporate the approved quotation
    const quotationTotal = Number(existing.totalAmount || 0);
    const newOrderSubtotal = (Number(order.subtotal || 0) + quotationTotal).toFixed(2);
    const newOrderTotal = (Number(order.totalAmount || 0) + quotationTotal).toFixed(2);

    await db
      .update(orders)
      .set({
        subtotal: newOrderSubtotal,
        totalAmount: newOrderTotal,
        notes: order.notes
          ? `${order.notes} | [تم اعتماد عرض السعر #${id} بقيمة ${quotationTotal.toFixed(2)} د.أ]`
          : `[تم اعتماد عرض السعر #${id} بقيمة ${quotationTotal.toFixed(2)} د.أ]`,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await logAudit({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'QUOTATION_APPROVE',
      entityType: 'quotation',
      entityId: id,
      previousState: existing,
      newState: updated,
      metadata: { orderId: order.id, quotationTotal, newOrderTotal },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تمت الموافقة على عرض السعر وتحديث الطلب بنجاح.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Customer rejects quotation
 */
export const rejectQuotation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { customerNotes } = req.body;
    const reasonText = (req.body.rejectionReason || req.body.reason || '').trim();

    if (!reasonText) {
      throw new AppError('يرجى تحديد سبب رفض عرض السعر.', 400, 'REJECTION_REASON_REQUIRED');
    }

    const [existing] = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
    if (!existing) {
      throw new AppError('عرض السعر غير موجود.', 404, 'QUOTATION_NOT_FOUND');
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, existing.orderId)).limit(1);
    if (!order) {
      throw new AppError('الطلب غير موجود.', 404, 'ORDER_NOT_FOUND');
    }

    // Only customer or staff can reject
    if (user.role === 'customer' && order.customerId !== user.id) {
      throw new AppError('غير مصرح لك برفض عرض سعر لطلب آخر.', 403, 'FORBIDDEN_QUOTATION');
    }

    if (existing.status !== 'sent') {
      throw new AppError('عرض السعر ليس في حالة معلقة للموافقة/الرفض.', 400, 'QUOTATION_NOT_PENDING');
    }

    const [updated] = await db
      .update(quotations)
      .set({
        status: 'customer_rejected',
        rejectedAt: new Date(),
        rejectionReason: reasonText,
        customerNotes: customerNotes || existing.customerNotes,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id))
      .returning();

    await logAudit({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'QUOTATION_REJECT',
      entityType: 'quotation',
      entityId: id,
      previousState: existing,
      newState: updated,
      metadata: { orderId: order.id, rejectionReason: reasonText },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم تسجيل رفض عرض السعر بنجاح.',
    });
  } catch (error) {
    next(error);
  }
};
