import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { orders, orderItems, orderStatusHistory } from '../../db/schema/orders.schema.js';
import { providers } from '../../db/schema/providers.schema.js';
import { dispatchOffers, dispatchSettings } from '../../db/schema/dispatch.schema.js';
import { eq, and, desc, sql, inArray, or, ilike } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { dispatchService } from '../../services/dispatch.service.js';
import { providerMatchingEngine } from '../../services/provider-matching.engine.js';
import { auditService } from '../../services/audit.service.js';

/**
 * Get paginated Dispatch Queue with real-time operational filters
 */
export const getDispatchQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;

    const { status, filter, categoryId, search } = req.query;

    const conditions: any[] = [];

    // Filter by operational status
    if (filter === 'unassigned' || status === 'unassigned') {
      conditions.push(or(eq(orders.status, 'awaiting_assignment'), eq(orders.assignmentStatus, 'unassigned')));
    } else if (filter === 'escalated' || status === 'escalated') {
      conditions.push(eq(orders.isEscalated, true));
    } else if (filter === 'offered' || status === 'offered') {
      conditions.push(eq(orders.status, 'offered_to_driver'));
    } else if (filter === 'in_progress' || status === 'in_progress') {
      conditions.push(inArray(orders.status, ['assigned', 'accepted', 'going_to_customer', 'going_to_pickup', 'picked_up']));
    } else if (filter === 'completed' || status === 'completed') {
      conditions.push(eq(orders.status, 'completed'));
    }

    if (categoryId && typeof categoryId === 'string' && categoryId.trim().length > 0) {
      conditions.push(eq(orders.serviceCategoryId, categoryId.trim()));
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(orders.id, q),
          ilike(orders.customerName, q),
          ilike(orders.customerPhone, q),
          ilike(orders.deliveryArea, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db.query.orders.findMany({
      where: whereClause,
      with: {
        items: true,
        category: true,
      },
      orderBy: [desc(orders.createdAt)],
      limit,
      offset,
    });

    // Fetch latest offer for each order
    const orderIds = list.map((o) => o.id);
    const latestOffers = orderIds.length > 0
      ? await db.query.dispatchOffers.findMany({
          where: inArray(dispatchOffers.orderId, orderIds),
          orderBy: [desc(dispatchOffers.attemptNumber), desc(dispatchOffers.offeredAt)],
        })
      : [];

    const offersByOrder = new Map<string, typeof latestOffers[0]>();
    for (const off of latestOffers) {
      if (!offersByOrder.has(off.orderId)) {
        offersByOrder.set(off.orderId, off);
      }
    }

    const formatted = list.map((o) => {
      const activeOffer = offersByOrder.get(o.id);
      return {
        id: o.id,
        customerId: o.customerId,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        serviceCategoryId: o.serviceCategoryId,
        categoryNameAr: o.category?.nameAr || o.serviceCategoryId,
        providerId: o.providerId,
        providerName: o.providerName,
        providerPhone: o.providerPhone,
        deliveryCity: o.deliveryCity,
        deliveryArea: o.deliveryArea,
        deliveryStreetAddress: o.deliveryStreetAddress,
        deliveryLatitude: o.deliveryLatitude,
        deliveryLongitude: o.deliveryLongitude,
        subtotal: parseFloat(o.subtotal),
        discountAmount: parseFloat(o.discountAmount),
        deliveryFee: parseFloat(o.deliveryFee),
        totalAmount: parseFloat(o.totalAmount),
        paymentMethod: o.paymentMethod,
        status: o.status,
        assignmentStatus: o.assignmentStatus,
        isEscalated: o.isEscalated,
        escalationReason: o.escalationReason,
        escalatedAt: o.escalatedAt,
        dispatchAttempt: o.dispatchAttempt,
        arrivedAt: o.arrivedAt,
        serviceStartedAt: o.serviceStartedAt,
        serviceCompletedAt: o.serviceCompletedAt,
        configurationSnapshot: o.configurationSnapshot,
        notes: o.notes,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        itemsCount: o.items.length,
        items: o.items.map((i) => ({
          id: i.id,
          titleAr: i.titleAr,
          titleEn: i.titleEn,
          variantNameAr: i.variantNameAr,
          unitPrice: parseFloat(i.unitPrice),
          quantity: i.quantity,
          itemTotal: parseFloat(i.itemTotal),
        })),
        latestOffer: activeOffer
          ? {
              id: activeOffer.id,
              providerId: activeOffer.providerId,
              attemptNumber: activeOffer.attemptNumber,
              status: activeOffer.status,
              score: activeOffer.score,
              scoreBreakdown: activeOffer.scoreBreakdown,
              offeredAt: activeOffer.offeredAt,
              expiresAt: activeOffer.expiresAt,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        count: formatted.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get detailed Order Dispatch View with full candidate scoring analysis & attempts history
 */
export const getOrderDispatchDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orderId = req.params.orderId as string;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true,
        category: true,
        statusHistory: {
          orderBy: [desc(orderStatusHistory.createdAt)],
        },
      },
    });

    if (!order) {
      throw new AppError('الطلب غير موجود.', 404, 'ORDER_NOT_FOUND');
    }

    // Fetch all offers for this order
    const offers = await db.query.dispatchOffers.findMany({
      where: eq(dispatchOffers.orderId, orderId),
      with: {
        provider: true,
      },
      orderBy: [desc(dispatchOffers.attemptNumber), desc(dispatchOffers.offeredAt)],
    });

    // Run real-time candidate matching simulation for this order
    const serviceIds = order.items.map((i) => i.serviceId);
    const dynamicAnswers = (order.configurationSnapshot?.answers || {}) as Record<string, any>;

    const liveMatch = await providerMatchingEngine.matchProviders({
      serviceCategoryId: order.serviceCategoryId,
      serviceIds,
      customerLocation: {
        area: order.deliveryArea,
        latitude: order.deliveryLatitude,
        longitude: order.deliveryLongitude,
        city: order.deliveryCity,
      },
      dynamicAnswers,
    });

    res.status(200).json({
      success: true,
      data: {
        order: {
          id: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          serviceCategoryId: order.serviceCategoryId,
          categoryNameAr: order.category?.nameAr || order.serviceCategoryId,
          providerId: order.providerId,
          providerName: order.providerName,
          providerPhone: order.providerPhone,
          deliveryCity: order.deliveryCity,
          deliveryArea: order.deliveryArea,
          deliveryStreetAddress: order.deliveryStreetAddress,
          deliveryLatitude: order.deliveryLatitude,
          deliveryLongitude: order.deliveryLongitude,
          subtotal: parseFloat(order.subtotal),
          discountAmount: parseFloat(order.discountAmount),
          deliveryFee: parseFloat(order.deliveryFee),
          totalAmount: parseFloat(order.totalAmount),
          paymentMethod: order.paymentMethod,
          status: order.status,
          assignmentStatus: order.assignmentStatus,
          isEscalated: order.isEscalated,
          escalationReason: order.escalationReason,
          escalatedAt: order.escalatedAt,
          dispatchAttempt: order.dispatchAttempt,
          arrivedAt: order.arrivedAt,
          serviceStartedAt: order.serviceStartedAt,
          serviceCompletedAt: order.serviceCompletedAt,
          configurationSnapshot: order.configurationSnapshot,
          priceBreakdown: order.priceBreakdown,
          notes: order.notes,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: order.items.map((i) => ({
            id: i.id,
            serviceId: i.serviceId,
            titleAr: i.titleAr,
            titleEn: i.titleEn,
            variantNameAr: i.variantNameAr,
            unitPrice: parseFloat(i.unitPrice),
            quantity: i.quantity,
            itemTotal: parseFloat(i.itemTotal),
            isHomeService: i.isHomeService,
          })),
        },
        offers: offers.map((off) => ({
          id: off.id,
          attemptNumber: off.attemptNumber,
          providerId: off.providerId,
          providerName: off.provider?.nameAr || off.providerId,
          providerPhone: off.provider?.phoneNumber,
          status: off.status,
          score: off.score,
          scoreBreakdown: off.scoreBreakdown,
          offeredAt: off.offeredAt,
          expiresAt: off.expiresAt,
          respondedAt: off.respondedAt,
          rejectionReason: off.rejectionReason,
        })),
        liveCandidates: liveMatch.candidates,
        totalEligibleCandidates: liveMatch.totalEligibleCount,
        history: order.statusHistory,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin manual assignment of provider to order with backend validation
 */
export const manualAssignProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orderId = req.params.orderId as string;
    const { providerId, notes } = req.body;

    if (!providerId) {
      throw new AppError('يرجى تحديد مزود الخدمة للتعيين.', 400, 'PROVIDER_REQUIRED');
    }

    const result = await dispatchService.manualAssignProvider(orderId, providerId, req.user?.id, notes);

    res.status(200).json({
      success: true,
      data: result.order,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin triggers manual retry of auto-dispatch
 */
export const retryAutoDispatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orderId = req.params.orderId as string;
    const result = await dispatchService.dispatchOrder(orderId, { forceRetry: true });

    res.status(200).json({
      success: true,
      data: result,
      message: result.success ? 'تم بدء جولة توزيع جديدة بنجاح.' : result.decisionReason,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Dispatch Operational Analytics & SLA KPIs
 */
export const getDispatchAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const allOrders = await db.query.orders.findMany();
    const allOffers = await db.query.dispatchOffers.findMany();

    const totalOrders = allOrders.length;
    const unassignedCount = allOrders.filter((o) => ['awaiting_assignment'].includes(o.status) || o.assignmentStatus === 'unassigned').length;
    const offeredCount = allOrders.filter((o) => o.status === 'offered_to_driver').length;
    const assignedCount = allOrders.filter((o) => ['assigned', 'accepted', 'going_to_customer', 'going_to_pickup', 'picked_up'].includes(o.status)).length;
    const completedCount = allOrders.filter((o) => o.status === 'completed').length;
    const escalatedCount = allOrders.filter((o) => o.isEscalated).length;

    const totalOffers = allOffers.length;
    const acceptedOffers = allOffers.filter((o) => o.status === 'accepted').length;
    const rejectedOffers = allOffers.filter((o) => o.status === 'rejected').length;
    const expiredOffers = allOffers.filter((o) => o.status === 'expired').length;

    const acceptanceRate = totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 100;

    // Average response time in seconds
    const respondedOffers = allOffers.filter((o) => o.respondedAt && o.offeredAt);
    let avgResponseTimeSeconds = 0;
    if (respondedOffers.length > 0) {
      const totalSeconds = respondedOffers.reduce((acc, cur) => {
        const diff = (new Date(cur.respondedAt!).getTime() - new Date(cur.offeredAt).getTime()) / 1000;
        return acc + Math.max(0, diff);
      }, 0);
      avgResponseTimeSeconds = Math.round(totalSeconds / respondedOffers.length);
    }

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalOrders,
          unassignedCount,
          offeredCount,
          assignedCount,
          completedCount,
          escalatedCount,
        },
        offers: {
          totalOffers,
          acceptedOffers,
          rejectedOffers,
          expiredOffers,
          acceptanceRate,
          avgResponseTimeSeconds,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current Dispatch Settings
 */
export const getDispatchSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await providerMatchingEngine.getSettings();
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Dispatch Operational Settings
 */
export const updateDispatchSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      offerTimeoutSeconds,
      maxRetryAttempts,
      autoDispatchEnabled,
      distanceWeight,
      ratingWeight,
      workloadWeight,
      capabilityWeight,
      acceptanceRateWeight,
      maxServiceRadiusKm,
    } = req.body;

    const payload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (typeof offerTimeoutSeconds === 'number') payload.offerTimeoutSeconds = offerTimeoutSeconds;
    if (typeof maxRetryAttempts === 'number') payload.maxRetryAttempts = maxRetryAttempts;
    if (typeof autoDispatchEnabled === 'boolean') payload.autoDispatchEnabled = autoDispatchEnabled;
    if (typeof distanceWeight === 'number') payload.distanceWeight = distanceWeight;
    if (typeof ratingWeight === 'number') payload.ratingWeight = ratingWeight;
    if (typeof workloadWeight === 'number') payload.workloadWeight = workloadWeight;
    if (typeof capabilityWeight === 'number') payload.capabilityWeight = capabilityWeight;
    if (typeof acceptanceRateWeight === 'number') payload.acceptanceRateWeight = acceptanceRateWeight;
    if (typeof maxServiceRadiusKm === 'number') payload.maxServiceRadiusKm = maxServiceRadiusKm;

    const [updated] = await db
      .update(dispatchSettings)
      .set(payload)
      .where(eq(dispatchSettings.id, 'default'))
      .returning();

    await auditService.log({
      action: 'DISPATCH_SETTINGS_UPDATED',
      entityType: 'dispatch_settings',
      entityId: 'default',
      actorUserId: req.user?.id,
      metadata: payload,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم حفظ وتحديث إعدادات التوزيع بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};
