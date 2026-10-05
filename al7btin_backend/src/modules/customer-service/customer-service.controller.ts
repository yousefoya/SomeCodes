import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/users.schema.js';
import { orders, orderItems } from '../../db/schema/orders.schema.js';
import { customerServiceNotes, supportCases, refundRequests, staffProfiles } from '../../db/schema/staff.schema.js';
import { eq, ilike, or, and, desc, sql, SQL, inArray } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { auditService } from '../../services/audit.service.js';

/**
 * Fast search for customers by phone number, name, email, or customer ID
 */
export const searchCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = (req.query.q as string || req.query.search as string)?.trim();

    if (!query || query.length < 2) {
      res.status(200).json({
        success: true,
        data: [],
      });
      return;
    }

    const conditions: SQL[] = [
      eq(users.role, 'customer'),
      or(
        ilike(users.phoneNumber, `%${query}%`),
        ilike(users.name, `%${query}%`),
        ilike(users.email, `%${query}%`),
        sql`CAST(${users.id} AS TEXT) ILIKE ${'%' + query + '%'}`
      )!,
    ];

    const customerList = await db
      .select({
        id: users.id,
        phoneNumber: users.phoneNumber,
        name: users.name,
        email: users.email,
        walletBalance: users.walletBalance,
        points: users.points,
        isSuspended: users.isSuspended,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(20);

    const formatted = customerList.map((c) => ({
      ...c,
      walletBalance: parseFloat(c.walletBalance),
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fast search for orders by Order ID, Customer Phone, or Delivery Area for Support Staff (GAP 5)
 */
export const searchOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = (req.query.q as string || req.query.search as string)?.trim();

    if (!query || query.length < 2) {
      res.status(200).json({
        success: true,
        data: [],
      });
      return;
    }

    const orderMatches = await db.query.orders.findMany({
      where: or(
        ilike(orders.id, `%${query}%`),
        ilike(orders.customerPhone, `%${query}%`),
        ilike(orders.customerName, `%${query}%`),
        ilike(orders.deliveryArea, `%${query}%`)
      ),
      with: {
        items: true,
      },
      orderBy: [desc(orders.createdAt)],
      limit: 15,
    });

    const orderIds = orderMatches.map((o) => o.id);
    let relatedCases: any[] = [];
    let relatedRefunds: any[] = [];

    if (orderIds.length > 0) {
      [relatedCases, relatedRefunds] = await Promise.all([
        db.select().from(supportCases).where(inArray(supportCases.orderId, orderIds)),
        db.select().from(refundRequests).where(inArray(refundRequests.orderId, orderIds)),
      ]);
    }

    const casesByOrder = new Map<string, any[]>();
    for (const c of relatedCases) {
      if (c.orderId) {
        if (!casesByOrder.has(c.orderId)) casesByOrder.set(c.orderId, []);
        casesByOrder.get(c.orderId)!.push(c);
      }
    }

    const refundsByOrder = new Map<string, any[]>();
    for (const r of relatedRefunds) {
      if (r.orderId) {
        if (!refundsByOrder.has(r.orderId)) refundsByOrder.set(r.orderId, []);
        refundsByOrder.get(r.orderId)!.push(r);
      }
    }

    const formatted = orderMatches.map((o) => ({
      ...o,
      subtotal: parseFloat(o.subtotal),
      discountAmount: parseFloat(o.discountAmount),
      deliveryFee: parseFloat(o.deliveryFee),
      totalAmount: parseFloat(o.totalAmount),
      items: o.items.map((i) => ({
        ...i,
        unitPrice: parseFloat(i.unitPrice),
        itemTotal: parseFloat(i.itemTotal),
      })),
      relatedCases: casesByOrder.get(o.id) || [],
      relatedRefunds: refundsByOrder.get(o.id) || [],
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 360-Degree Customer Summary for Call-Center & Support Staff
 */
export const getCustomerSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customerId = req.params.id as string;

    const [customer] = await db
      .select({
        id: users.id,
        phoneNumber: users.phoneNumber,
        name: users.name,
        email: users.email,
        walletBalance: users.walletBalance,
        points: users.points,
        referralCode: users.referralCode,
        isSuspended: users.isSuspended,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, customerId))
      .limit(1);

    if (!customer) {
      throw new AppError('حساب العميل غير موجود.', 404, 'CUSTOMER_NOT_FOUND');
    }

    // Fetch active orders
    const activeOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.customerId, customerId),
        inArray(orders.status, [
          'pending',
          'confirmed',
          'offered_to_driver',
          'awaiting_assignment',
          'assigned',
          'accepted',
          'going_to_pickup',
          'picked_up',
          'going_to_customer',
        ])
      ),
      with: {
        items: true,
      },
      orderBy: [desc(orders.createdAt)],
    });

    // Fetch previous orders
    const pastOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.customerId, customerId),
        inArray(orders.status, ['completed', 'cancelled', 'failed', 'rejected'])
      ),
      with: {
        items: true,
      },
      orderBy: [desc(orders.createdAt)],
      limit: 25,
    });

    // Fetch customer service notes
    const notes = await db
      .select()
      .from(customerServiceNotes)
      .where(eq(customerServiceNotes.customerId, customerId))
      .orderBy(desc(customerServiceNotes.createdAt));

    // Fetch support cases
    const cases = await db
      .select()
      .from(supportCases)
      .where(eq(supportCases.customerId, customerId))
      .orderBy(desc(supportCases.createdAt));

    // Fetch refund requests
    const refunds = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.customerId, customerId))
      .orderBy(desc(refundRequests.createdAt));

    const formattedActiveOrders = activeOrders.map((o) => ({
      ...o,
      subtotal: parseFloat(o.subtotal),
      discountAmount: parseFloat(o.discountAmount),
      deliveryFee: parseFloat(o.deliveryFee),
      totalAmount: parseFloat(o.totalAmount),
      items: o.items.map((i) => ({
        ...i,
        unitPrice: parseFloat(i.unitPrice),
        itemTotal: parseFloat(i.itemTotal),
      })),
    }));

    const formattedPastOrders = pastOrders.map((o) => ({
      ...o,
      subtotal: parseFloat(o.subtotal),
      discountAmount: parseFloat(o.discountAmount),
      deliveryFee: parseFloat(o.deliveryFee),
      totalAmount: parseFloat(o.totalAmount),
      items: o.items.map((i) => ({
        ...i,
        unitPrice: parseFloat(i.unitPrice),
        itemTotal: parseFloat(i.itemTotal),
      })),
    }));

    res.status(200).json({
      success: true,
      data: {
        customer: {
          ...customer,
          walletBalance: parseFloat(customer.walletBalance),
        },
        activeOrders: formattedActiveOrders,
        pastOrders: formattedPastOrders,
        notes,
        cases,
        refunds: refunds.map((r) => ({
          ...r,
          amount: parseFloat(r.amount),
          maxRefundableAmount: parseFloat(r.maxRefundableAmount),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get internal customer service notes for a customer or order
 */
export const getCustomerNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customerId = req.query.customerId as string;
    const orderId = req.query.orderId as string;

    const conditions: SQL[] = [];

    if (customerId) conditions.push(eq(customerServiceNotes.customerId, customerId));
    if (orderId) conditions.push(eq(customerServiceNotes.orderId, orderId));

    if (conditions.length === 0) {
      throw new AppError('يرجى تحديد رقم العميل أو رقم الطلب لعرض الملاحظات.', 400, 'PARAM_REQUIRED');
    }

    const notesList = await db
      .select()
      .from(customerServiceNotes)
      .where(and(...conditions))
      .orderBy(desc(customerServiceNotes.createdAt));

    res.status(200).json({
      success: true,
      data: notesList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add an immutable internal customer service note
 */
export const createCustomerNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerId, orderId, note } = req.body;
    const authorUser = req.user!;

    if (!customerId || !note || !note.trim()) {
      throw new AppError('رقم العميل ومحتوى الملاحظة مطلوبان.', 400, 'FIELDS_REQUIRED');
    }

    // Verify Customer Exists
    const [cust] = await db
      .select()
      .from(users)
      .where(eq(users.id, customerId))
      .limit(1);

    if (!cust) {
      throw new AppError('العميل المحدد غير موجود.', 404, 'CUSTOMER_NOT_FOUND');
    }

    // Verify Order Exists if orderId provided
    if (orderId) {
      const [ord] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!ord) {
        throw new AppError('الطلب المحدد غير موجود.', 404, 'ORDER_NOT_FOUND');
      }
    }

    const [newNote] = await db
      .insert(customerServiceNotes)
      .values({
        customerId,
        orderId: orderId || null,
        authorUserId: authorUser.id,
        authorRole: authorUser.role,
        authorName: authorUser.name || 'موظف خدمة العملاء',
        note: note.trim(),
      })
      .returning();

    // Increment handled counter for staff profile
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
      action: 'CUSTOMER_NOTE_CREATE',
      entityType: 'customer_service_note',
      entityId: newNote.id,
      metadata: {
        customerId,
        orderId: orderId || null,
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
