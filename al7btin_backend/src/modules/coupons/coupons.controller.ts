import { Request, Response, NextFunction } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { coupons, Coupon } from '../../db/schema/coupons.schema.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * 1. Get Active Public Coupons (Customer / Public)
 * Returns active, unexpired coupons that have not reached their usage limit.
 */
export const getPublicCoupons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeCoupons = await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.isActive, true),
          sql`(${coupons.expiryDate} IS NULL OR ${coupons.expiryDate} > NOW())`,
          sql`${coupons.usageCount} < ${coupons.usageLimit}`
        )
      )
      .orderBy(desc(coupons.createdAt));

    res.status(200).json({
      success: true,
      data: {
        coupons: activeCoupons,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Validate Coupon Code (Customer Checkout)
 * Validates code, expiration, usage limit, minimum order value, and computes exact discount.
 */
export const validateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, subtotal } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      throw new AppError('يرجى إدخال رمز كود الخصم.', 400, 'COUPON_CODE_REQUIRED');
    }

    const orderSubtotal = typeof subtotal === 'number' ? subtotal : parseFloat(subtotal || '0');
    if (isNaN(orderSubtotal) || orderSubtotal < 0) {
      throw new AppError('قيمة المجموع غير صالحة.', 400, 'INVALID_SUBTOTAL');
    }

    const cleanCode = code.trim().toUpperCase();

    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, cleanCode))
      .limit(1);

    if (!coupon || !coupon.isActive) {
      throw new AppError('كود الخصم غير موجود أو غير مفعّل حالياً.', 404, 'COUPON_NOT_FOUND');
    }

    // Check expiration
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      throw new AppError('عذراً، كود الخصم منتهي الصلاحية.', 400, 'COUPON_EXPIRED');
    }

    // Check usage limit
    if (coupon.usageCount >= coupon.usageLimit) {
      throw new AppError('تم استنفاد الحد الأقصى لاستخدام هذا الكود.', 400, 'COUPON_LIMIT_REACHED');
    }

    // Check minimum order value
    const minOrder = parseFloat(coupon.minOrderValue);
    if (orderSubtotal < minOrder) {
      throw new AppError(
        `الحد الأدنى لقيمة الطلب لتطبيق هذا الكود هو ${minOrder.toFixed(2)} د.أ`,
        400,
        'COUPON_MIN_ORDER_NOT_MET'
      );
    }

    // Calculate discount
    const couponVal = parseFloat(coupon.value);
    let discount = 0;

    if (coupon.type === 'percentage') {
      discount = (orderSubtotal * couponVal) / 100.0;
    } else {
      discount = couponVal;
    }

    // Discount cannot exceed subtotal
    if (discount > orderSubtotal) {
      discount = orderSubtotal;
    }

    const discountAmount = Math.round(discount * 100) / 100;
    const finalTotal = Math.max(0, Math.round((orderSubtotal - discountAmount) * 100) / 100);

    res.status(200).json({
      success: true,
      data: {
        isValid: true,
        coupon,
        discountAmount,
        finalTotal,
        message: 'تم تفعيل كود الخصم بنجاح.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get All Coupons (Admin Management)
 */
export const getAdminCoupons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const allCoupons = await db
      .select()
      .from(coupons)
      .orderBy(desc(coupons.createdAt));

    res.status(200).json({
      success: true,
      data: {
        coupons: allCoupons,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Create New Coupon (Admin)
 */
export const createAdminCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, type, value, minOrderValue, expiryDate, usageLimit, isActive } = req.body;

    if (!code || !type || value === undefined) {
      throw new AppError('يرجى تقديم بيانات الكوبون الأساسية (الكود، النوع، القيمة).', 400, 'MISSING_COUPON_DATA');
    }

    const cleanCode = String(code).trim().toUpperCase();

    // Check duplicate code
    const [existing] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, cleanCode))
      .limit(1);

    if (existing) {
      throw new AppError(`كود الخصم (${cleanCode}) مستخدم مسبقاً. يرجى اختيار كود آخر.`, 409, 'COUPON_CODE_EXISTS');
    }

    const id = `CPN-${Date.now()}`;
    const [createdCoupon] = await db
      .insert(coupons)
      .values({
        id,
        code: cleanCode,
        type: type === 'fixed_amount' ? 'fixed_amount' : 'percentage',
        value: String(value),
        minOrderValue: minOrderValue !== undefined ? String(minOrderValue) : '0.00',
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        usageLimit: usageLimit !== undefined ? parseInt(usageLimit, 10) : 1000,
        usageCount: 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: {
        coupon: createdCoupon,
        message: 'تم إنشاء الكوبون بنجاح.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Update Existing Coupon (Admin)
 */
export const updateAdminCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { code, type, value, minOrderValue, expiryDate, usageLimit, isActive } = req.body;

    const [existing] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('الكوبون المطلوب غير موجود.', 404, 'COUPON_NOT_FOUND');
    }

    const updatePayload: Partial<Coupon> = {
      updatedAt: new Date(),
    };

    if (code !== undefined) {
      updatePayload.code = String(code).trim().toUpperCase();
    }
    if (type !== undefined) {
      updatePayload.type = type === 'fixed_amount' ? 'fixed_amount' : 'percentage';
    }
    if (value !== undefined) {
      updatePayload.value = String(value);
    }
    if (minOrderValue !== undefined) {
      updatePayload.minOrderValue = String(minOrderValue);
    }
    if (expiryDate !== undefined) {
      updatePayload.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }
    if (usageLimit !== undefined) {
      updatePayload.usageLimit = parseInt(usageLimit, 10);
    }
    if (isActive !== undefined) {
      updatePayload.isActive = Boolean(isActive);
    }

    const [updated] = await db
      .update(coupons)
      .set(updatePayload)
      .where(eq(coupons.id, id))
      .returning();

    res.status(200).json({
      success: true,
      data: {
        coupon: updated,
        message: 'تم تحديث الكوبون بنجاح.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Delete Coupon (Admin)
 */
export const deleteAdminCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [deleted] = await db
      .delete(coupons)
      .where(eq(coupons.id, id))
      .returning();

    if (!deleted) {
      throw new AppError('الكوبون المطلوب غير موجود.', 404, 'COUPON_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'تم حذف الكوبون بنجاح.',
    });
  } catch (error) {
    next(error);
  }
};
