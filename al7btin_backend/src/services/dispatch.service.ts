import { db } from '../db/index.js';
import { orders, orderItems, orderStatusHistory } from '../db/schema/orders.schema.js';
import { providers } from '../db/schema/providers.schema.js';
import { dispatchOffers, dispatchSettings } from '../db/schema/dispatch.schema.js';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { auditService } from './audit.service.js';
import { eventsService } from './events.service.js';
import { providerMatchingEngine, RankedProviderCandidate } from './provider-matching.engine.js';
import { AppError } from '../middleware/errorHandler.js';

export interface DispatchExecutionResult {
  success: boolean;
  orderId: string;
  offerId?: string;
  providerId?: string;
  providerName?: string;
  attemptNumber: number;
  status: 'offered' | 'escalated' | 'assigned';
  score?: number;
  scoreBreakdown?: any;
  expiresAt?: string;
  decisionReason: string;
  candidatesCount: number;
  candidates?: RankedProviderCandidate[];
}

/**
 * Authoritative Smart Provider Dispatch, Atomic Offer Lifecycle & Escalation Engine
 */
export class DispatchService {
  /**
   * Dispatch an order to the optimal provider candidate with retry and fallback awareness
   */
  async dispatchOrder(
    orderId: string,
    options: {
      forceRetry?: boolean;
      customTimeoutSeconds?: number;
    } = {}
  ): Promise<DispatchExecutionResult> {
    // 1. Fetch Order Details with items
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new AppError(`الطلب غير موجود: ${orderId}`, 404, 'ORDER_NOT_FOUND');
    }

    if (['completed', 'cancelled', 'rejected', 'failed'].includes(order.status)) {
      throw new AppError(`لا يمكن توزيع طلب في حالة نهائية (${order.status}).`, 400, 'ORDER_IN_TERMINAL_STATE');
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    // 2. Fetch existing offers for this order to find previously evaluated / rejected providers
    const existingOffers = await db
      .select()
      .from(dispatchOffers)
      .where(eq(dispatchOffers.orderId, orderId))
      .orderBy(desc(dispatchOffers.attemptNumber));

    const excludedProviderIds = new Set<string>();
    for (const off of existingOffers) {
      if (['rejected', 'expired'].includes(off.status)) {
        excludedProviderIds.add(off.providerId);
      }
    }
    if (order.rejectedDriverIds && Array.isArray(order.rejectedDriverIds)) {
      for (const pId of order.rejectedDriverIds) {
        excludedProviderIds.add(pId);
      }
    }

    const currentAttempt = (order.dispatchAttempt || 0) + 1;
    const settings = await providerMatchingEngine.getSettings();

    // 3. Check if max retry attempts reached
    if (currentAttempt > settings.maxRetryAttempts && !options.forceRetry) {
      return this.escalateOrder(
        orderId,
        `تم استنفاد الحد الأقصى لمحاولات التوزيع التلقائي (${settings.maxRetryAttempts} محاولات).`
      );
    }

    // 4. Run Smart Matching Engine
    const serviceIds = items.map((i) => i.serviceId);
    const dynamicAnswers = (order.configurationSnapshot?.answers || {}) as Record<string, any>;

    const matchingResult = await providerMatchingEngine.matchProviders({
      serviceCategoryId: order.serviceCategoryId,
      serviceIds,
      customerLocation: {
        area: order.deliveryArea,
        latitude: order.deliveryLatitude,
        longitude: order.deliveryLongitude,
        city: order.deliveryCity,
      },
      dynamicAnswers,
      excludedProviderIds: Array.from(excludedProviderIds),
    });

    // 5. If no candidates found, escalate
    if (!matchingResult.topCandidate) {
      return this.escalateOrder(
        orderId,
        matchingResult.rejectionOrEscalationReason || 'لا يوجد مزودي خدمة مؤهلين ومتاحين حالياً.'
      );
    }

    const selected = matchingResult.topCandidate;
    const timeoutSeconds = options.customTimeoutSeconds || settings.offerTimeoutSeconds || 90;
    const expiresAt = new Date(Date.now() + timeoutSeconds * 1000);

    // 6. Create Dispatch Offer in Database
    const [offer] = await db
      .insert(dispatchOffers)
      .values({
        orderId: order.id,
        providerId: selected.providerId,
        attemptNumber: currentAttempt,
        status: 'offered',
        score: selected.score,
        scoreBreakdown: selected.breakdown,
        offeredAt: new Date(),
        expiresAt,
      })
      .returning();

    // 7. Update Order state to offered
    await db
      .update(orders)
      .set({
        status: 'offered_to_driver',
        assignmentStatus: 'offered',
        offerExpiresAt: expiresAt,
        dispatchAttempt: currentAttempt,
        isEscalated: false,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // 8. Log Audit & History
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: 'offered_to_driver',
      notes: `تم توجيه عرض العمل للمزود (${selected.nameAr}) بنتيجة مطابقة (${selected.score}/100) - المحاولة ${currentAttempt}`,
    });

    await auditService.log({
      action: 'DISPATCH_OFFER_CREATED',
      entityType: 'order',
      entityId: order.id,
      metadata: {
        orderId: order.id,
        offerId: offer.id,
        providerId: selected.providerId,
        providerName: selected.nameAr,
        score: selected.score,
        attemptNumber: currentAttempt,
        expiresAt: expiresAt.toISOString(),
      },
    });

    // 9. Emit Real-time SSE Events
    eventsService.emit('DISPATCH_OFFER_CREATED', {
      orderId: order.id,
      offerId: offer.id,
      providerId: selected.providerId,
      score: selected.score,
      expiresAt: expiresAt.toISOString(),
      customerName: order.customerName,
      deliveryArea: order.deliveryArea,
      totalAmount: order.totalAmount,
    });

    return {
      success: true,
      orderId: order.id,
      offerId: offer.id,
      providerId: selected.providerId,
      providerName: selected.nameAr,
      attemptNumber: currentAttempt,
      status: 'offered',
      score: selected.score,
      scoreBreakdown: selected.breakdown,
      expiresAt: expiresAt.toISOString(),
      decisionReason: `تم اختيار المزود (${selected.nameAr}) بناءً على أعلى تقييم وقرب جغرافي (${selected.distanceKm} كم).`,
      candidatesCount: matchingResult.candidates.length,
      candidates: matchingResult.candidates,
    };
  }

  /**
   * Atomic Offer Acceptance with Row-Level Locking (Race-Condition Protection)
   */
  async acceptOffer(
    offerId: string,
    providerId: string,
    userId?: string
  ): Promise<{ success: boolean; order: typeof orders.$inferSelect; message: string }> {
    return await db.transaction(async (tx) => {
      // 1. Fetch initial offer details without locking to resolve order ID
      const [offerInfo] = await tx
        .select()
        .from(dispatchOffers)
        .where(eq(dispatchOffers.id, offerId));

      if (!offerInfo) {
        throw new AppError('عرض العمل غير موجود.', 404, 'OFFER_NOT_FOUND');
      }

      if (offerInfo.providerId !== providerId) {
        throw new AppError('غير مصرح لك بقبول عرض عمل موجه لمزود آخر.', 403, 'FORBIDDEN_OFFER_ACCESS');
      }

      // 2. Strict Deterministic Lock Hierarchy: Lock Order Row FIRST with FOR UPDATE
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, offerInfo.orderId))
        .for('update');

      if (!order) {
        throw new AppError('الطلب المرتبط بالعرض غير موجود.', 404, 'ORDER_NOT_FOUND');
      }

      if (['accepted', 'assigned', 'going_to_customer', 'completed'].includes(order.status)) {
        throw new AppError('تم قبول وتعيين هذا الطلب مسبقاً لمزود خدمة آخر.', 409, 'ORDER_ALREADY_ASSIGNED');
      }

      // 3. Lock and verify offer row with FOR UPDATE
      const [offer] = await tx
        .select()
        .from(dispatchOffers)
        .where(eq(dispatchOffers.id, offerId))
        .for('update');

      if (!offer || offer.status !== 'offered') {
        throw new AppError(
          `لا يمكن قبول هذا العرض لأنه في حالة (${offer?.status || 'غير متاح'}).`,
          409,
          'OFFER_NO_LONGER_AVAILABLE'
        );
      }

      if (new Date() > new Date(offer.expiresAt)) {
        await tx
          .update(dispatchOffers)
          .set({ status: 'expired', respondedAt: new Date() })
          .where(eq(dispatchOffers.id, offerId));

        throw new AppError('انتهت المهلة المحددة لقبول عرض العمل.', 409, 'OFFER_EXPIRED');
      }

      // 4. Fetch Provider Details
      const [provider] = await tx
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);


      // 4. Update Offer to Accepted
      await tx
        .update(dispatchOffers)
        .set({
          status: 'accepted',
          respondedAt: new Date(),
        })
        .where(eq(dispatchOffers.id, offerId));

      // 5. Cancel any other pending offers for this order
      await tx
        .update(dispatchOffers)
        .set({ status: 'cancelled' })
        .where(
          and(
            eq(dispatchOffers.orderId, order.id),
            eq(dispatchOffers.status, 'offered'),
            sql`${dispatchOffers.id} != ${offerId}::uuid`
          )
        );

      // 6. Update Order with Assigned Provider
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: 'accepted',
          assignmentStatus: 'accepted',
          providerId: providerId,
          providerName: provider?.nameAr || order.providerName,
          providerPhone: provider?.phoneNumber || order.providerPhone,
          pickupAddress: provider?.address || order.pickupAddress,
          pickupLatitude: provider?.latitude || order.pickupLatitude,
          pickupLongitude: provider?.longitude || order.pickupLongitude,
          isEscalated: false,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id))
        .returning();

      // 7. Audit & History
      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        status: 'accepted',
        changedByUserId: userId || null,
        notes: `تم قبول الطلب بنجاح وتثبيته للمزود (${provider?.nameAr || providerId}).`,
      });

      await auditService.log({
        action: 'DISPATCH_OFFER_ACCEPTED',
        entityType: 'order',
        entityId: order.id,
        metadata: {
          orderId: order.id,
          offerId,
          providerId,
          providerName: provider?.nameAr,
        },
      });

      // 8. Real-time Event
      eventsService.emit('DISPATCH_OFFER_ACCEPTED', {
        orderId: order.id,
        offerId,
        providerId,
        providerName: provider?.nameAr,
      });

      return {
        success: true,
        order: updatedOrder,
        message: 'تم قبول الطلب وتعيينك بنجاح.',
      };
    });
  }

  /**
   * Reject Dispatch Offer and Trigger Immediate Fallback Retry
   */
  async rejectOffer(
    offerId: string,
    providerId: string,
    rejectionReason?: string
  ): Promise<DispatchExecutionResult> {
    const [offer] = await db
      .select()
      .from(dispatchOffers)
      .where(eq(dispatchOffers.id, offerId))
      .limit(1);

    if (!offer) {
      throw new AppError('عرض العمل غير موجود.', 404, 'OFFER_NOT_FOUND');
    }

    if (offer.providerId !== providerId) {
      throw new AppError('غير مصرح لك برفض عرض عمل موجه لمزود آخر.', 403, 'FORBIDDEN_OFFER_ACCESS');
    }

    // Mark offer as rejected
    await db
      .update(dispatchOffers)
      .set({
        status: 'rejected',
        rejectionReason: rejectionReason || 'رفض المزود الطلب',
        respondedAt: new Date(),
      })
      .where(eq(dispatchOffers.id, offerId));

    // Update order rejected list
    await db
      .update(orders)
      .set({
        rejectedDriverIds: sql`COALESCE(${orders.rejectedDriverIds}, '{}'::text[]) || ARRAY[${providerId}]::text[]`,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, offer.orderId));

    await auditService.log({
      action: 'DISPATCH_OFFER_REJECTED',
      entityType: 'order',
      entityId: offer.orderId,
      metadata: {
        orderId: offer.orderId,
        offerId,
        providerId,
        rejectionReason,
      },
    });

    eventsService.emit('DISPATCH_OFFER_REJECTED', {
      orderId: offer.orderId,
      offerId,
      providerId,
      rejectionReason,
    });

    // Immediately trigger fallback to next best candidate
    return this.dispatchOrder(offer.orderId);
  }

  /**
   * Handle Expired Offer Timeout and Cascade to Next Candidate
   */
  async handleOfferTimeout(offerId: string): Promise<DispatchExecutionResult | null> {
    const offer = await db.query.dispatchOffers.findFirst({
      where: eq(dispatchOffers.id, offerId),
    });

    if (!offer || offer.status !== 'offered') {
      return null;
    }

    await db
      .update(dispatchOffers)
      .set({
        status: 'expired',
        respondedAt: new Date(),
      })
      .where(eq(dispatchOffers.id, offerId));

    await auditService.log({
      action: 'DISPATCH_OFFER_EXPIRED',
      entityType: 'order',
      entityId: offer.orderId,
      metadata: {
        orderId: offer.orderId,
        offerId,
        providerId: offer.providerId,
      },
    });

    eventsService.emit('DISPATCH_OFFER_EXPIRED', {
      orderId: offer.orderId,
      offerId,
      providerId: offer.providerId,
    });

    // Cascade to next candidate
    return this.dispatchOrder(offer.orderId);
  }

  /**
   * Escalate Unassigned Order to Admin & Customer Service
   */
  async escalateOrder(orderId: string, reason: string): Promise<DispatchExecutionResult> {
    const currentOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!currentOrder || !['pending', 'confirmed', 'offered_to_driver', 'awaiting_assignment'].includes(currentOrder.status)) {
      return {
        success: false,
        orderId,
        attemptNumber: currentOrder?.dispatchAttempt || 0,
        status: 'escalated',
        decisionReason: `الطلب ليس في حالة انتظار توزيع (${currentOrder?.status || 'unknown'}).`,
        candidatesCount: 0,
      };
    }

    const [updated] = await db
      .update(orders)
      .set({
        status: 'awaiting_assignment',
        assignmentStatus: 'unassigned',
        isEscalated: true,
        escalationReason: reason,
        escalatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId,
      status: 'awaiting_assignment',
      notes: `⚠️ تم تصعيد الطلب لغرفة العمليات المركزية: ${reason}`,
    });

    await auditService.log({
      action: 'ORDER_DISPATCH_ESCALATED',
      entityType: 'order',
      entityId: orderId,
      metadata: {
        orderId,
        reason,
        escalatedAt: new Date().toISOString(),
      },
    });

    eventsService.emit('ORDER_DISPATCH_ESCALATED', {
      orderId,
      reason,
      customerName: updated.customerName,
      deliveryArea: updated.deliveryArea,
    });

    return {
      success: false,
      orderId,
      attemptNumber: updated.dispatchAttempt || 1,
      status: 'escalated',
      decisionReason: reason,
      candidatesCount: 0,
    };
  }

  /**
   * Manual Force Assignment by Admin with Server-Side Validation
   */
  async manualAssignProvider(
    orderId: string,
    providerId: string,
    adminUserId?: string,
    notes?: string
  ): Promise<{ success: boolean; order: typeof orders.$inferSelect; message: string }> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new AppError('الطلب غير موجود.', 404, 'ORDER_NOT_FOUND');
    }

    const [provider] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, providerId))
      .limit(1);

    if (!provider) {
      throw new AppError('المزود المحدد غير موجود.', 404, 'PROVIDER_NOT_FOUND');
    }

    // Cancel existing pending offers
    await db
      .update(dispatchOffers)
      .set({ status: 'cancelled' })
      .where(and(eq(dispatchOffers.orderId, orderId), eq(dispatchOffers.status, 'offered')));

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: 'assigned',
        assignmentStatus: 'accepted',
        providerId: provider.id,
        providerName: provider.nameAr,
        providerPhone: provider.phoneNumber,
        pickupAddress: provider.address,
        pickupLatitude: provider.latitude,
        pickupLongitude: provider.longitude,
        isEscalated: false,
        escalationReason: null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId,
      status: 'assigned',
      changedByUserId: adminUserId || null,
      notes: notes || `تم التعيين اليدوي للمزود (${provider.nameAr}) من قبل إدارة العمليات.`,
    });

    await auditService.log({
      action: 'DISPATCH_MANUAL_ASSIGNMENT',
      entityType: 'order',
      entityId: orderId,
      actorUserId: adminUserId,
      metadata: {
        orderId,
        providerId: provider.id,
        providerName: provider.nameAr,
        adminUserId,
      },
    });

    eventsService.emit('ORDER_ASSIGNED', {
      orderId,
      providerId: provider.id,
      providerName: provider.nameAr,
      assignedBy: 'ADMIN_MANUAL',
    });

    return {
      success: true,
      order: updatedOrder,
      message: `تم تعيين المزود (${provider.nameAr}) للطلب بنجاح.`,
    };
  }
}

export const dispatchService = new DispatchService();
