import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { addresses } from '../../db/schema/addresses.schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * Validates if the given city/governorate is within the supported Amman service area for Phase 1
 */
export const isSupportedAmmanServiceArea = (city?: string): boolean => {
  if (!city) return true; // Default is Amman
  const normalized = city.trim().toLowerCase();
  
  // Supported Amman representations
  const ammanMatches = ['عمان', 'محافظة عمان', 'العاصمة', 'عمان، الأردن', 'amman', 'amman, jordan', 'capital'];
  return ammanMatches.some((match) => normalized.includes(match) || match.includes(normalized));
};

export const getAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    const list = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

export const createAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    const {
      title,
      city,
      area,
      streetAddress,
      buildingNumber,
      floor,
      apartmentNumber,
      deliveryInstructions,
      latitude,
      longitude,
      isDefault,
    } = req.body;

    if (!title || !area || !streetAddress || latitude === undefined || longitude === undefined) {
      throw new AppError('يرجى ملء جميع الحقول الإلزامية للعنوان.', 400, 'FIELDS_REQUIRED');
    }

    // Strict Amman-only service area validation
    if (city && !isSupportedAmmanServiceArea(city)) {
      throw new AppError('خدمة بتنحل متوفرة حالياً داخل محافظة العاصمة عمان فقط.', 400, 'SERVICE_AREA_NOT_SUPPORTED');
    }

    const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude.toString());
    const lng = typeof longitude === 'number' ? longitude : parseFloat(longitude.toString());

    // If marked as default, unset other defaults
    if (isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, userId));
    }

    const [newAddress] = await db
      .insert(addresses)
      .values({
        userId,
        title: title.trim(),
        city: city?.trim() || 'عمان',
        area: area.trim(),
        streetAddress: streetAddress.trim(),
        buildingNumber: buildingNumber?.trim() || null,
        floor: floor?.trim() || null,
        apartmentNumber: apartmentNumber?.trim() || null,
        deliveryInstructions: deliveryInstructions?.trim() || null,
        latitude: lat,
        longitude: lng,
        isDefault: isDefault === true,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newAddress,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const id = req.params.id as string;

    const {
      title,
      city,
      area,
      streetAddress,
      buildingNumber,
      floor,
      apartmentNumber,
      deliveryInstructions,
      latitude,
      longitude,
      isDefault,
    } = req.body;

    const [existing] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .limit(1);

    if (!existing) {
      throw new AppError('العنوان غير موجود.', 404, 'ADDRESS_NOT_FOUND');
    }

    // Strict Amman-only service area validation
    if (city && !isSupportedAmmanServiceArea(city)) {
      throw new AppError('خدمة بتنحل متوفرة حالياً داخل محافظة العاصمة عمان فقط.', 400, 'SERVICE_AREA_NOT_SUPPORTED');
    }

    if (isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, userId));
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (title) updatePayload.title = title.trim();
    if (city) updatePayload.city = city.trim();
    if (area) updatePayload.area = area.trim();
    if (streetAddress) updatePayload.streetAddress = streetAddress.trim();
    if (buildingNumber !== undefined) updatePayload.buildingNumber = buildingNumber?.trim() || null;
    if (floor !== undefined) updatePayload.floor = floor?.trim() || null;
    if (apartmentNumber !== undefined) updatePayload.apartmentNumber = apartmentNumber?.trim() || null;
    if (deliveryInstructions !== undefined) updatePayload.deliveryInstructions = deliveryInstructions?.trim() || null;
    if (latitude !== undefined) updatePayload.latitude = typeof latitude === 'number' ? latitude : parseFloat(latitude.toString());
    if (longitude !== undefined) updatePayload.longitude = typeof longitude === 'number' ? longitude : parseFloat(longitude.toString());
    if (isDefault !== undefined) updatePayload.isDefault = isDefault;

    const [updated] = await db
      .update(addresses)
      .set(updatePayload)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const id = req.params.id as string;

    const [deleted] = await db
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();

    if (!deleted) {
      throw new AppError('العنوان غير موجود.', 404, 'ADDRESS_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: { message: 'تم حذف العنوان بنجاح.', id },
    });
  } catch (error) {
    next(error);
  }
};
