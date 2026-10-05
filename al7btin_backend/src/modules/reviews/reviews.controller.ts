import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { orderReviews } from '../../db/schema/reviews.schema.js';
import { orders, orderItems } from '../../db/schema/orders.schema.js';
import { providers } from '../../db/schema/providers.schema.js';
import { users } from '../../db/schema/users.schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { auditService } from '../../services/audit.service.js';

/**
 * Submit Customer Review & Star Rating for a Completed Order
 */
export const createOrderReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const orderId = (req.params.orderId || req.params.id || req.body.orderId) as string;
    const { rating, comment } = req.body;

    if (!orderId) {
      throw new AppError('يرجى تحديد رقم الطلب.', 400, 'ORDER_ID_REQUIRED');
    }

    const ratingNum = parseInt(String(rating), 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      throw new AppError('يجب أن يكون التقييم رقماً بين 1 و 5 نجوم.', 400, 'INVALID_RATING_VALUE');
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new AppError('الطلب غير موجود.', 404, 'ORDER_NOT_FOUND');
    }

    // Role and ownership check
    if (req.user.role === 'customer' && order.customerId !== req.user.id) {
      throw new AppError('غير مصرح لك بتقييم هذا الطلب (خاص بعميل آخر).', 403, 'FORBIDDEN_ORDER_ACCESS');
    }

    if (order.status !== 'completed') {
      throw new AppError('لا يمكن تقييم الطلب إلا بعد اكتماله بنجاح.', 400, 'ORDER_NOT_COMPLETED');
    }

    if (!order.providerId) {
      throw new AppError('هذا الطلب غير مرتبط بمزود خدمة.', 400, 'NO_PROVIDER_ASSIGNED');
    }

    // Check if order was already reviewed
    const existingReview = await db.query.orderReviews.findFirst({
      where: eq(orderReviews.orderId, orderId),
    });

    if (existingReview) {
      throw new AppError('تم تقييم هذا الطلب مسبقاً ولا يمكن تكرار التقييم.', 400, 'ORDER_ALREADY_REVIEWED');
    }

    const firstItem = await db.query.orderItems.findFirst({
      where: eq(orderItems.orderId, orderId),
    });
    const targetServiceId = firstItem?.serviceId || null;

    const providerId = order.providerId;

    // Run review submission and provider score aggregation atomically
    const reviewResult = await db.transaction(async (tx) => {
      const [newReview] = await tx
        .insert(orderReviews)
        .values({
          orderId,
          customerId: order.customerId,
          providerId,
          serviceId: targetServiceId,
          rating: ratingNum,
          comment: comment ? String(comment).trim() : null,
          isVerifiedPurchase: true,
        })
        .returning();

      // Recalculate average rating for provider across all reviews
      const [agg] = await tx
        .select({
          avgRating: sql<number>`COALESCE(AVG(${orderReviews.rating}), 5.0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(orderReviews)
        .where(eq(orderReviews.providerId, providerId));

      const updatedRating = Math.round(Number(agg.avgRating) * 10) / 10;

      await tx
        .update(providers)
        .set({
          rating: updatedRating,
          updatedAt: new Date(),
        })
        .where(eq(providers.id, providerId));

      return {
        review: newReview,
        newProviderRating: updatedRating,
        totalReviews: Number(agg.count),
      };
    });

    // Write audit log
    await auditService.log({
      req,
      action: 'ORDER_REVIEW_SUBMITTED',
      entityType: 'order_reviews',
      entityId: reviewResult.review.id,
      metadata: {
        orderId,
        providerId,
        rating: ratingNum,
        comment: comment ? String(comment).slice(0, 100) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: reviewResult.review,
      providerRating: reviewResult.newProviderRating,
      message: 'شكراً لك! تم تسجيل تقييمك للمزود بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Review for a Specific Order
 */
export const getReviewByOrderId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orderId = (req.params.orderId || req.params.id) as string;
    const review = await db.query.orderReviews.findFirst({
      where: eq(orderReviews.orderId, orderId),
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: review || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Public Reviews for a Provider
 */
export const getProviderReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const providerId = req.params.providerId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = (page - 1) * limit;

    const list = await db.query.orderReviews.findMany({
      where: eq(orderReviews.providerId, providerId),
      orderBy: [desc(orderReviews.createdAt)],
      limit,
      offset,
      with: {
        customer: {
          columns: {
            name: true,
          },
        },
      },
    });

    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orderReviews)
      .where(eq(orderReviews.providerId, providerId));

    res.status(200).json({
      success: true,
      data: list,
      pagination: {
        page,
        limit,
        total: Number(countResult?.count || 0),
      },
    });
  } catch (err) {
    next(err);
  }
};
