import { Request, Response, NextFunction } from 'express';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { offers, Offer } from '../../db/schema/coupons.schema.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * 1. Get Active Public Offers (Customer / Mobile client)
 */
export const getPublicOffers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const list = await db
      .select()
      .from(offers)
      .where(
        and(
          eq(offers.isActive, true),
          sql`(${offers.endDate} IS NULL OR ${offers.endDate} >= NOW())`
        )
      )
      .orderBy(desc(offers.createdAt));

    const formatted = list.map((o) => ({
      ...o,
      discountPercentage: parseFloat(o.discountPercentage),
    }));

    res.status(200).json({
      success: true,
      data: {
        offers: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get All Offers (Admin Portal)
 */
export const getAdminOffers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const list = await db
      .select()
      .from(offers)
      .orderBy(desc(offers.createdAt));

    const formatted = list.map((o) => ({
      ...o,
      discountPercentage: parseFloat(o.discountPercentage),
    }));

    res.status(200).json({
      success: true,
      data: {
        offers: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Create New Offer (Admin)
 */
export const createAdminOffer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { titleAr, titleEn, descriptionAr, descriptionEn, discountPercentage, promoCode, bannerColor, startDate, endDate, isActive } = req.body;

    if (!titleAr || !titleEn || discountPercentage === undefined) {
      throw new AppError('يرجى إدخال عنوان العرض باللغتين ونسبة الخصم.', 400, 'FIELDS_REQUIRED');
    }

    const id = `OFR-${Date.now()}`;
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [created] = await db
      .insert(offers)
      .values({
        id,
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim(),
        descriptionAr: descriptionAr ? descriptionAr.trim() : null,
        descriptionEn: descriptionEn ? descriptionEn.trim() : null,
        discountPercentage: String(discountPercentage),
        promoCode: promoCode ? promoCode.trim().toUpperCase() : null,
        bannerColor: bannerColor || '#C5A059',
        startDate: start,
        endDate: end,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: {
        offer: {
          ...created,
          discountPercentage: parseFloat(created.discountPercentage),
        },
        message: 'تم إنشاء العرض الترويجي بنجاح.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update Existing Offer (Admin)
 */
export const updateAdminOffer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { titleAr, titleEn, descriptionAr, descriptionEn, discountPercentage, promoCode, bannerColor, startDate, endDate, isActive } = req.body;

    const [existing] = await db
      .select()
      .from(offers)
      .where(eq(offers.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('العرض المطلوب غير موجود.', 404, 'OFFER_NOT_FOUND');
    }

    const updatePayload: Partial<Offer> = {
      updatedAt: new Date(),
    };

    if (titleAr !== undefined) updatePayload.titleAr = titleAr.trim();
    if (titleEn !== undefined) updatePayload.titleEn = titleEn.trim();
    if (descriptionAr !== undefined) updatePayload.descriptionAr = descriptionAr ? descriptionAr.trim() : null;
    if (descriptionEn !== undefined) updatePayload.descriptionEn = descriptionEn ? descriptionEn.trim() : null;
    if (discountPercentage !== undefined) updatePayload.discountPercentage = String(discountPercentage);
    if (promoCode !== undefined) updatePayload.promoCode = promoCode ? promoCode.trim().toUpperCase() : null;
    if (bannerColor !== undefined) updatePayload.bannerColor = bannerColor;
    if (startDate !== undefined) updatePayload.startDate = new Date(startDate);
    if (endDate !== undefined) updatePayload.endDate = new Date(endDate);
    if (isActive !== undefined) updatePayload.isActive = Boolean(isActive);

    const [updated] = await db
      .update(offers)
      .set(updatePayload)
      .where(eq(offers.id, id))
      .returning();

    res.status(200).json({
      success: true,
      data: {
        offer: {
          ...updated,
          discountPercentage: parseFloat(updated.discountPercentage),
        },
        message: 'تم تحديث العرض بنجاح.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Delete Offer (Admin)
 */
export const deleteAdminOffer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [deleted] = await db
      .delete(offers)
      .where(eq(offers.id, id))
      .returning();

    if (!deleted) {
      throw new AppError('العرض المطلوب غير موجود.', 404, 'OFFER_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'تم حذف العرض بنجاح.',
    });
  } catch (error) {
    next(error);
  }
};
