import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { orders, orderItems, orderStatusHistory } from '../../db/schema/orders.schema.js';
import { providers, providerServices } from '../../db/schema/providers.schema.js';
import {
  services,
  serviceOptions,
  serviceFields,
  serviceRules,
  servicePricingRules,
  serviceRequirements,
} from '../../db/schema/services.schema.js';
import { coupons, couponUsages } from '../../db/schema/coupons.schema.js';
import { eq, and, desc, or, sql, inArray, asc } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { pricingEngine } from '../../services/pricing.engine.js';
import { auditService } from '../../services/audit.service.js';
import { dispatchService } from '../../services/dispatch.service.js';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }
    const currentUser = req.user;

    const idempotencyKey = (
      req.headers['idempotency-key'] ||
      req.headers['x-idempotency-key'] ||
      req.body.idempotencyKey
    ) as string | undefined;

    // Fast return if order was already created with this idempotency key
    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim().length > 0) {
      const existing = await db.query.orders.findFirst({
        where: and(
          eq(orders.customerId, currentUser.id),
          eq(orders.idempotencyKey, idempotencyKey.trim())
        ),
        with: {
          items: true,
        },
      });

      if (existing) {
        res.status(200).json({
          success: true,
          data: existing,
          message: 'تم استرجاع الطلب السابق بنجاح (طلب مكرر معالج).',
        });
        return;
      }
    }

    const {
      serviceCategoryId,
      providerId,
      items,
      deliveryAddress,
      notes,
      paymentMethod = 'cash_on_delivery',
      couponId,
      couponCode,
      code,
      answers: rootAnswers,
      customerImages,
    } = req.body;

    if (!serviceCategoryId) {
      throw new AppError('يرجى تحديد تصنيف الخدمة.', 400, 'CATEGORY_REQUIRED');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('سلة الطلب فارغة.', 400, 'EMPTY_CART');
    }

    if (!deliveryAddress || !deliveryAddress.area || !deliveryAddress.streetAddress) {
      throw new AppError('يرجى إدخال عنوان التوصيل كاملاً.', 400, 'ADDRESS_REQUIRED');
    }

    const deliveryLat = typeof deliveryAddress.latitude === 'number' ? deliveryAddress.latitude : 31.9539;
    const deliveryLng = typeof deliveryAddress.longitude === 'number' ? deliveryAddress.longitude : 35.9106;

    // Run order creation and validation inside an atomic database transaction
    const orderResult = await db.transaction(async (tx) => {
      let selectedProviderId = providerId as string | undefined;
      let selectedProvider: typeof providers.$inferSelect | undefined;
      const providerAssignmentsMap = new Map<string, typeof providerServices.$inferSelect>();

      const itemServiceIds = Array.from(new Set(items.map((i: any) => i.serviceId as string)));
      const itemOptionIds = Array.from(
        new Set(items.map((i: any) => (i.serviceOptionId || i.optionId) as string | undefined).filter(Boolean) as string[])
      );

      if (selectedProviderId) {
        const [p] = await tx
          .select()
          .from(providers)
          .where(eq(providers.id, selectedProviderId))
          .limit(1);

        if (!p) {
          throw new AppError('المزود المحدد غير موجود.', 404, 'PROVIDER_NOT_FOUND');
        }

        if (!p.isActive || !p.isAvailable) {
          throw new AppError('المزود المحدد غير متاح حالياً لاستقبال الطلبات (مغلق أو خارج الخدمة).', 400, 'PROVIDER_UNAVAILABLE');
        }

        // Batch fetch provider service assignments
        const assignments = await tx
          .select()
          .from(providerServices)
          .where(
            and(
              eq(providerServices.providerId, selectedProviderId),
              inArray(providerServices.serviceId, itemServiceIds)
            )
          );

        for (const a of assignments) {
          providerAssignmentsMap.set(a.serviceId, a);
        }

        for (const item of items) {
          const srvId = item.serviceId;
          const assignment = providerAssignmentsMap.get(srvId);

          if (!assignment) {
            throw new AppError('الخدمة أو المنتج غير معتمد لدى هذا المزود.', 400, 'SERVICE_NOT_OFFERED_BY_PROVIDER');
          }

          if (!assignment.isAvailable) {
            throw new AppError('المنتج أو الخدمة المطلوبة غير متوفرة حالياً لدى هذا المزود.', 400, 'PRODUCT_CURRENTLY_UNAVAILABLE');
          }
        }

        selectedProvider = p;
      } else {
        const activeProviders = await tx.query.providers.findMany({
          where: and(eq(providers.isActive, true), eq(providers.isAvailable, true)),
          with: {
            services: true,
          },
        });

        const eligible = activeProviders.filter((p) => {
          return itemServiceIds.every((sId: string) => {
            const match = p.services.find((ps) => ps.serviceId === sId);
            return match && match.isAvailable;
          });
        });

        if (eligible.length > 0) {
          eligible.sort((a, b) => {
            const distA = calculateDistanceKm(a.latitude, a.longitude, deliveryLat, deliveryLng);
            const distB = calculateDistanceKm(b.latitude, b.longitude, deliveryLat, deliveryLng);
            return distA - distB;
          });
          const chosen = eligible[0];
          selectedProvider = chosen;
          selectedProviderId = chosen.id;

          for (const ps of (chosen as any).services) {
            providerAssignmentsMap.set(ps.serviceId, ps);
          }
        } else {
          throw new AppError(
            'عذراً، لا يوجد مزود خدمة متاح حالياً بإمكانه تلبية جميع المنتجات المطلوبة في طلبك.',
            400,
            'NO_PROVIDER_CAN_FULFILL_ORDER'
          );
        }
      }

      // Batch fetch services and options with full dynamic schema
      const fetchedServices = await tx.query.services.findMany({
        where: inArray(services.id, itemServiceIds),
        with: {
          options: { where: eq(serviceOptions.isActive, true) },
          fields: { where: eq(serviceFields.isActive, true), orderBy: [asc(serviceFields.sortOrder)] },
          rules: { where: eq(serviceRules.isActive, true), orderBy: [asc(serviceRules.priority)] },
          pricingRules: { where: eq(servicePricingRules.isActive, true), orderBy: [asc(servicePricingRules.sortOrder)] },
          requirements: { where: eq(serviceRequirements.isRequired, true) },
        },
      });

      const servicesMap = new Map(fetchedServices.map((s) => [s.id, s]));

      // Lookup Coupon if provided
      let appliedCoupon: typeof coupons.$inferSelect | null = null;
      const couponLookup = (couponCode || code || couponId) as string | undefined;

      if (couponLookup && typeof couponLookup === 'string' && couponLookup.trim().length > 0) {
        const cleanInput = couponLookup.trim().toUpperCase();
        const [cpn] = await tx
          .select()
          .from(coupons)
          .where(
            and(
              eq(coupons.isActive, true),
              or(eq(coupons.code, cleanInput), eq(coupons.id, couponLookup.trim()))
            )
          )
          .limit(1);

        if (!cpn) {
          throw new AppError('كود الخصم المدخل غير صالح أو غير موجود.', 404, 'COUPON_NOT_FOUND');
        }

        if (cpn.expiryDate && new Date(cpn.expiryDate) < new Date()) {
          throw new AppError('عذراً، كود الخصم منتهي الصلاحية.', 400, 'COUPON_EXPIRED');
        }

        if (cpn.usageCount >= cpn.usageLimit) {
          throw new AppError('تم استنفاد الحد الأقصى لاستخدام كود الخصم هذا.', 400, 'COUPON_LIMIT_REACHED');
        }

        appliedCoupon = cpn;
      }

      let orderSubtotal = 0;
      let orderDiscount = 0;
      let orderTotal = 0;

      const validatedItems: Array<{
        serviceId: string;
        serviceOptionId?: string | null;
        variantNameAr?: string | null;
        variantNameEn?: string | null;
        titleAr: string;
        titleEn: string;
        unitPrice: number;
        quantity: number;
        itemTotal: number;
        unitAr?: string;
        unitEn?: string;
        isHomeService: boolean;
      }> = [];

      let primaryConfigurationSnapshot: any = null;
      let primaryPriceBreakdown: any = null;
      let primaryServiceVersion = 1;

      for (const item of items) {
        const srv = servicesMap.get(item.serviceId);

        if (!srv) {
          throw new AppError(`الخدمة المطلوبة غير موجودة في الكتالوج: ${item.serviceId}`, 404, 'SERVICE_NOT_FOUND');
        }

        if (!srv.isActive) {
          throw new AppError(`الخدمة المطلوبة غير مفعّلة حالياً في النظام: ${srv.nameAr}`, 400, 'SERVICE_INACTIVE');
        }

        // Require published status for customer orders
        if (srv.status !== 'published') {
          throw new AppError(`الخدمة المطلوبة ليست في حالة النشر المعتمد: ${srv.nameAr}`, 400, 'SERVICE_UNPUBLISHED');
        }

        primaryServiceVersion = srv.currentVersion;

        const itemAnswers = item.answers || rootAnswers || {};
        const requestedOptionId = item.serviceOptionId || item.optionId;
        const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;

        // Run Authoritative Pricing Engine calculation
        const pricingResult = pricingEngine.calculate({
          service: srv,
          fields: srv.fields,
          rules: srv.rules,
          pricingRules: srv.pricingRules,
          options: srv.options,
          answers: itemAnswers,
          selectedOptionId: requestedOptionId,
          coupon: appliedCoupon,
          quantity: qty,
        });

        orderSubtotal += pricingResult.subtotal;
        orderDiscount += pricingResult.discountAmount;
        orderTotal += pricingResult.totalAmount;

        const selectedOpt = requestedOptionId
          ? srv.options.find((o) => o.id === requestedOptionId)
          : undefined;

        // Build item title and entry
        let titleAr = srv.nameAr;
        let titleEn = srv.nameEn;
        if (selectedOpt) {
          titleAr = `${srv.nameAr} - ${selectedOpt.nameAr}`;
          titleEn = `${srv.nameEn} - ${selectedOpt.nameEn}`;
        }

        validatedItems.push({
          serviceId: srv.id,
          serviceOptionId: selectedOpt?.id || null,
          variantNameAr: selectedOpt?.nameAr || null,
          variantNameEn: selectedOpt?.nameEn || null,
          titleAr,
          titleEn,
          unitPrice: pricingResult.basePrice,
          quantity: qty,
          itemTotal: pricingResult.subtotal,
          unitAr: selectedOpt?.unitAr || srv.unitAr,
          unitEn: selectedOpt?.unitEn || srv.unitEn,
          isHomeService: srv.type === 'home_service' || srv.categoryId === 'cat_home_services',
        });

        // Store primary snapshot and breakdown
        if (!primaryConfigurationSnapshot) {
          primaryConfigurationSnapshot = {
            serviceId: srv.id,
            serviceVersion: srv.currentVersion,
            serviceNameAr: srv.nameAr,
            serviceNameEn: srv.nameEn,
            answers: pricingResult.evaluatedAnswers,
            ...pricingResult.evaluatedAnswers,
            selectedOption: selectedOpt
              ? { id: selectedOpt.id, nameAr: selectedOpt.nameAr, nameEn: selectedOpt.nameEn, price: selectedOpt.price }
              : null,
            evaluatedFields: pricingResult.evaluatedFields,
            activeAlerts: pricingResult.activeAlerts,
            customerNotes: notes || deliveryAddress.deliveryInstructions || null,
            customerImages: Array.isArray(customerImages) ? customerImages : [],
            createdAt: new Date().toISOString(),
          };

          primaryPriceBreakdown = {
            basePrice: pricingResult.basePrice,
            subtotal: pricingResult.subtotal,
            lineItems: pricingResult.lineItems,
            fieldAddons: pricingResult.fieldAddons,
            optionSurcharges: pricingResult.optionSurcharges,
            discounts: pricingResult.discounts,
            discountAmount: pricingResult.discountAmount,
            deliveryFee: 0.0,
            totalAmount: pricingResult.totalAmount,
          };
        }
      }

      const deliveryFeeNum = 0.0;
      const finalTotalAmountNum = Math.max(0, Math.round((orderSubtotal - orderDiscount + deliveryFeeNum) * 100) / 100);
      const orderId = `ORD-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

      // Extract Vehicle / Location Trip coordinates if present in answers or body
      let destinationAddr: string | null = null;
      let destinationLat: number | null = null;
      let destinationLng: number | null = null;
      let calculatedTripDistanceKm: string | null = null;

      const dynamicAnswers = primaryConfigurationSnapshot?.answers || rootAnswers || {};
      const pickupAns = dynamicAnswers['pickup_location'];
      const destAns = dynamicAnswers['destination_location'];

      if (destAns) {
        if (typeof destAns === 'string') {
          destinationAddr = destAns;
        } else if (typeof destAns === 'object') {
          destinationAddr = destAns.address || destAns.streetAddress || destAns.area || 'وجهة نقل المركبة';
          destinationLat = typeof destAns.latitude === 'number' ? destAns.latitude : null;
          destinationLng = typeof destAns.longitude === 'number' ? destAns.longitude : null;
        }
      } else if (req.body.destinationAddress) {
        const dAddr = req.body.destinationAddress;
        destinationAddr = typeof dAddr === 'string' ? dAddr : (dAddr.streetAddress || dAddr.area || 'وجهة محددة');
        destinationLat = typeof dAddr.latitude === 'number' ? dAddr.latitude : null;
        destinationLng = typeof dAddr.longitude === 'number' ? dAddr.longitude : null;
      }

      if (dynamicAnswers['trip_distance_km'] !== undefined) {
        calculatedTripDistanceKm = Number(dynamicAnswers['trip_distance_km']).toFixed(2);
      } else if (pickupAns && typeof pickupAns === 'object' && destinationLat && destinationLng && typeof pickupAns.latitude === 'number') {
        const straight = calculateDistanceKm(pickupAns.latitude, pickupAns.longitude, destinationLat, destinationLng);
        calculatedTripDistanceKm = Math.max(1.0, Math.round(straight * 1.25 * 10) / 10).toFixed(2);
      }

      const [newOrder] = await tx
        .insert(orders)
        .values({
          id: orderId,
          customerId: currentUser.id,
          customerName: currentUser.name || 'عميل بتنحل',
          customerPhone: currentUser.phoneNumber,
          serviceCategoryId,
          providerId: selectedProvider?.id || null,
          providerName: selectedProvider?.nameAr || null,
          providerPhone: selectedProvider?.phoneNumber || null,
          pickupAddress: selectedProvider?.address || null,
          pickupLatitude: selectedProvider?.latitude || null,
          pickupLongitude: selectedProvider?.longitude || null,
          deliveryCity: deliveryAddress.city || 'عمان',
          deliveryArea: deliveryAddress.area,
          deliveryStreetAddress: deliveryAddress.streetAddress,
          deliveryBuilding: deliveryAddress.buildingNumber || deliveryAddress.building || null,
          deliveryFloor: deliveryAddress.floor || null,
          deliveryApartment: deliveryAddress.apartmentNumber || deliveryAddress.apartment || null,
          deliveryInstructions: deliveryAddress.deliveryInstructions || deliveryAddress.instructions || null,
          deliveryLatitude: deliveryLat,
          deliveryLongitude: deliveryLng,
          destinationAddress: destinationAddr,
          destinationLatitude: destinationLat,
          destinationLongitude: destinationLng,
          tripDistanceKm: calculatedTripDistanceKm,
          subtotal: orderSubtotal.toFixed(2),
          discountAmount: orderDiscount.toFixed(2),
          deliveryFee: deliveryFeeNum.toFixed(2),
          totalAmount: finalTotalAmountNum.toFixed(2),
          couponId: appliedCoupon?.id || null,
          paymentMethod,
          status: 'confirmed',
          idempotencyKey: idempotencyKey && typeof idempotencyKey === 'string' ? idempotencyKey.trim() : null,
          configurationSnapshot: primaryConfigurationSnapshot,
          priceBreakdown: primaryPriceBreakdown,
          serviceVersion: primaryServiceVersion,
          notes: notes || null,
        })
        .returning();

      const itemsToInsert = validatedItems.map((vItem) => ({
        orderId: newOrder.id,
        serviceId: vItem.serviceId,
        serviceOptionId: vItem.serviceOptionId || null,
        variantNameAr: vItem.variantNameAr || null,
        variantNameEn: vItem.variantNameEn || null,
        titleAr: vItem.titleAr,
        titleEn: vItem.titleEn,
        unitPrice: vItem.unitPrice.toFixed(2),
        quantity: vItem.quantity,
        itemTotal: vItem.itemTotal.toFixed(2),
        unitAr: vItem.unitAr,
        unitEn: vItem.unitEn,
        isHomeService: vItem.isHomeService,
      }));

      await tx.insert(orderItems).values(itemsToInsert);

      if (appliedCoupon && orderDiscount > 0) {
        await tx
          .update(coupons)
          .set({
            usageCount: sql`${coupons.usageCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(coupons.id, appliedCoupon.id));

        await tx.insert(couponUsages).values({
          couponId: appliedCoupon.id,
          userId: currentUser.id,
          orderId: newOrder.id,
          discountAmount: orderDiscount.toFixed(2),
        });
      }

      await tx.insert(orderStatusHistory).values({
        orderId: newOrder.id,
        status: 'confirmed',
        changedByUserId: currentUser.id,
        notes: 'تم إنشاء وتأكيد الطلب بنجاح وتوثيق تفاصيل التكوين والسعر.',
      });

      return {
        ...newOrder,
        items: validatedItems,
      };
    });

    // Asynchronously initiate intelligent smart dispatch for unassigned orders
    if (!orderResult.providerId) {
      dispatchService.dispatchOrder(orderResult.id).catch((err) => {
        console.warn(`[AutoDispatch] Background dispatch notice for order ${orderResult.id}:`, err?.message || err);
      });
    }

    res.status(201).json({
      success: true,
      data: orderResult,
      message: 'تم إرسال وتأكيد الطلب بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

export const getMyOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }
    const currentUser = req.user;

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;

    let list;
    if (currentUser.role === 'provider') {
      let [p] = await db.select().from(providers).where(eq(providers.userId, currentUser.id)).limit(1);
      if (!p) {
        [p] = await db.select().from(providers).where(eq(providers.phoneNumber, currentUser.phoneNumber)).limit(1);
      }
      const providerId = p?.id;
      list = await db.query.orders.findMany({
        where: providerId ? eq(orders.providerId, providerId) : undefined,
        with: {
          items: true,
        },
        orderBy: [desc(orders.createdAt)],
        limit,
        offset,
      });
    } else {
      list = await db.query.orders.findMany({
        where: eq(orders.customerId, currentUser.id),
        with: {
          items: true,
        },
        orderBy: [desc(orders.createdAt)],
        limit,
        offset,
      });
    }

    res.status(200).json({
      success: true,
      data: list,
      pagination: {
        page,
        limit,
        count: list.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const id = req.params.id as string;
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: true,
        statusHistory: true,
      },
    });

    if (!order) {
      throw new AppError('الطلب غير موجود.', 404, 'ORDER_NOT_FOUND');
    }

    // Role-based access control
    if (req.user.role === 'customer' && order.customerId !== req.user.id) {
      throw new AppError('غير مصرح لك بالاطلاع على تفاصيل هذا الطلب.', 403, 'FORBIDDEN_ORDER_ACCESS');
    } else if (req.user.role === 'provider') {
      let [prov] = await db
        .select()
        .from(providers)
        .where(eq(providers.userId, req.user.id))
        .limit(1);

      if (!prov) {
        [prov] = await db
          .select()
          .from(providers)
          .where(eq(providers.phoneNumber, req.user.phoneNumber))
          .limit(1);
      }

      if (!prov || prov.id !== order.providerId) {
        throw new AppError('غير مصرح لك بالاطلاع على تفاصيل هذا الطلب.', 403, 'FORBIDDEN_ORDER_ACCESS');
      }
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const id = req.params.id as string;
    const { status, notes } = req.body;

    if (!status) {
      throw new AppError('يرجى تحديد حالة الطلب الجديدة.', 400, 'STATUS_REQUIRED');
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      throw new AppError('الطلب غير موجود.', 404, 'ORDER_NOT_FOUND');
    }

    // Order State Machine Validation
    const currentStatus = order.status;
    const targetStatus = status as string;

    const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
      pending: ['confirmed', 'accepted', 'rejected', 'cancelled'],
      confirmed: ['offered_to_driver', 'awaiting_assignment', 'assigned', 'accepted', 'rejected', 'cancelled', 'going_to_customer', 'completed'],
      offered_to_driver: ['accepted', 'awaiting_assignment', 'assigned', 'cancelled', 'rejected'],
      awaiting_assignment: ['offered_to_driver', 'assigned', 'accepted', 'rejected', 'cancelled'],
      assigned: ['accepted', 'going_to_pickup', 'going_to_customer', 'cancelled', 'rejected'],
      accepted: ['going_to_pickup', 'picked_up', 'going_to_customer', 'completed', 'cancelled', 'rejected'],
      going_to_pickup: ['picked_up', 'going_to_customer', 'cancelled', 'failed'],
      picked_up: ['going_to_customer', 'completed', 'failed', 'cancelled'],
      going_to_customer: ['completed', 'failed', 'cancelled'],
      completed: [],
      cancelled: [],
      failed: [],
      rejected: ['offered_to_driver', 'awaiting_assignment', 'cancelled'],
    };

    // Role verification: Admin, Assigned Provider, Delivery, or Customer early cancellation
    if (req.user.role === 'customer') {
      if (order.customerId !== req.user.id) {
        throw new AppError('غير مصرح لك بتعديل حالة هذا الطلب.', 403, 'FORBIDDEN_ORDER_MODIFICATION');
      }
      if (targetStatus !== 'cancelled') {
        throw new AppError('العميل يمكنه فقط إلغاء الطلب.', 403, 'CUSTOMER_CAN_ONLY_CANCEL');
      }
      if (!['pending', 'confirmed', 'awaiting_assignment'].includes(currentStatus)) {
        throw new AppError('لا يمكن إلغاء الطلب بعد قبوله أو خروجه للتوصيل.', 400, 'ORDER_CANNOT_BE_CANCELLED');
      }
    } else if (req.user.role === 'provider') {
      let [prov] = await db
        .select()
        .from(providers)
        .where(eq(providers.userId, req.user.id))
        .limit(1);

      if (!prov) {
        [prov] = await db
          .select()
          .from(providers)
          .where(eq(providers.phoneNumber, req.user.phoneNumber))
          .limit(1);
      }

      if (!prov || prov.id !== order.providerId) {
        throw new AppError('غير مصرح لك بتعديل حالة هذا الطلب.', 403, 'FORBIDDEN_ORDER_MODIFICATION');
      }

      const allowed = VALID_ORDER_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(targetStatus)) {
        throw new AppError(
          `لا يمكن تحويل حالة الطلب من (${currentStatus}) إلى (${targetStatus}) مباشرة.`,
          400,
          'INVALID_ORDER_STATUS_TRANSITION'
        );
      }
    } else if (req.user.role === 'delivery') {
      if (order.assignedDeliveryId !== req.user.id) {
        throw new AppError('غير مصرح لك بتحديث طلب غير مخصص لك.', 403, 'FORBIDDEN_ORDER_MODIFICATION');
      }
      const allowed = VALID_ORDER_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(targetStatus)) {
        throw new AppError(
          `لا يمكن تحويل حالة الطلب من (${currentStatus}) إلى (${targetStatus}) مباشرة.`,
          400,
          'INVALID_ORDER_STATUS_TRANSITION'
        );
      }
    } else if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      throw new AppError('غير مصرح لك بتعديل حالة الطلب.', 403, 'FORBIDDEN_ROLE');
    }

    if (['completed', 'cancelled', 'rejected'].includes(currentStatus) && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      throw new AppError('لا يمكن تعديل طلب مكتمل أو ملغي أو مرفوض.', 400, 'ORDER_ALREADY_TERMINATED');
    }

    const [updated] = await db
      .update(orders)
      .set({
        status: status as any,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId: id,
      status: status as any,
      changedByUserId: req.user.id,
      notes: notes || `تم تحديث حالة الطلب إلى ${status}`,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم تحديث حالة الطلب بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const id = req.params.id as string;
    const { reason } = req.body;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      throw new AppError('الطلب غير موجود.', 404, 'ORDER_NOT_FOUND');
    }

    if (['completed', 'cancelled', 'failed'].includes(order.status)) {
      throw new AppError('لا يمكن إلغاء طلب منتهي أو ملغي مسبقاً.', 400, 'ORDER_ALREADY_TERMINATED');
    }

    // Role-based cancellation check
    if (req.user.role === 'customer') {
      if (order.customerId !== req.user.id) {
        throw new AppError('غير مصرح لك بإلغاء هذا الطلب.', 403, 'FORBIDDEN_ORDER_ACCESS');
      }
      if (!['pending', 'confirmed', 'awaiting_assignment', 'offered_to_driver'].includes(order.status)) {
        throw new AppError('لا يمكن إلغاء الطلب بعد خروج المزود أو بدء التنفيذ. يرجى التواصل مع خدمة العملاء.', 400, 'ORDER_CANNOT_BE_CANCELLED');
      }
    } else if (req.user.role === 'provider') {
      let [prov] = await db.select().from(providers).where(eq(providers.userId, req.user.id)).limit(1);
      if (!prov) {
        [prov] = await db.select().from(providers).where(eq(providers.phoneNumber, req.user.phoneNumber)).limit(1);
      }
      if (!prov || prov.id !== order.providerId) {
        throw new AppError('غير مصرح لك بإلغاء هذا الطلب.', 403, 'FORBIDDEN_ORDER_ACCESS');
      }
    } else if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'customer_service_agent' && req.user.role !== 'customer_service_manager') {
      throw new AppError('غير مصرح لك بإلغاء الطلب.', 403, 'FORBIDDEN_ROLE');
    }

    const cancellationNotes = reason ? String(reason).trim() : 'تم إلغاء الطلب بناءً على طلب المستخدم.';

    const [updated] = await db
      .update(orders)
      .set({
        status: 'cancelled',
        cancellationReason: cancellationNotes,
        cancelledByUserId: req.user.id,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId: id,
      status: 'cancelled',
      changedByUserId: req.user.id,
      notes: cancellationNotes,
    });

    await auditService.log({
      req,
      action: 'ORDER_CANCELLED',
      entityType: 'orders',
      entityId: id,
      metadata: {
        previousStatus: order.status,
        reason: cancellationNotes,
      },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم إلغاء الطلب بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

import { orderRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();
router.post('/', requireAuth, orderRateLimiter, createOrder);
router.get('/my', requireAuth, getMyOrders);
router.get('/:id', requireAuth, getOrderById);
router.patch('/:id/status', requireAuth, updateOrderStatus);
router.post('/:id/cancel', requireAuth, cancelOrder);

export const orderRoutes = router;

