import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { serviceCategories } from '../../db/schema/categories.schema.js';
import { asc, eq } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { cacheService } from '../../services/cache.service.js';

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const list = await cacheService.getOrSet(
      'categories:all',
      async () => {
        return await db
          .select()
          .from(serviceCategories)
          .where(eq(serviceCategories.isActive, true))
          .orderBy(asc(serviceCategories.sortOrder));
      },
      600 // 10 minutes TTL
    );

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const category = await cacheService.getOrSet(
      `categories:${id}`,
      async () => {
        const [cat] = await db
          .select()
          .from(serviceCategories)
          .where(eq(serviceCategories.id, id))
          .limit(1);
        return cat || null;
      },
      600
    );

    if (!category) {
      throw new AppError('فئة الخدمة المطلوبة غير موجودة.', 404, 'CATEGORY_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, nameAr, nameEn, descriptionAr, descriptionEn, iconName, sortOrder, isActive } = req.body;

    if (!nameAr || !nameEn) {
      throw new AppError('اسم الفئة بالعربية والإنجليزية مطلوب.', 400, 'FIELDS_REQUIRED');
    }

    const categoryId = id || `cat_${Date.now()}`;

    const [newCategory] = await db
      .insert(serviceCategories)
      .values({
        id: categoryId,
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        descriptionAr: descriptionAr?.trim(),
        descriptionEn: descriptionEn?.trim(),
        iconName: iconName || 'category_rounded',
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    await cacheService.invalidate('categories:');

    res.status(201).json({
      success: true,
      data: newCategory,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { nameAr, nameEn, descriptionAr, descriptionEn, iconName, sortOrder, isActive } = req.body;

    const [existing] = await db
      .select()
      .from(serviceCategories)
      .where(eq(serviceCategories.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('فئة الخدمة غير موجودة.', 404, 'CATEGORY_NOT_FOUND');
    }

    const [updated] = await db
      .update(serviceCategories)
      .set({
        ...(nameAr && { nameAr: nameAr.trim() }),
        ...(nameEn && { nameEn: nameEn.trim() }),
        ...(descriptionAr !== undefined && { descriptionAr: descriptionAr.trim() }),
        ...(descriptionEn !== undefined && { descriptionEn: descriptionEn.trim() }),
        ...(iconName && { iconName }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(serviceCategories.id, id))
      .returning();

    await cacheService.invalidate('categories:');

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [deleted] = await db
      .delete(serviceCategories)
      .where(eq(serviceCategories.id, id))
      .returning();

    if (!deleted) {
      throw new AppError('فئة الخدمة غير موجودة.', 404, 'CATEGORY_NOT_FOUND');
    }

    await cacheService.invalidate('categories:');

    res.status(200).json({
      success: true,
      data: { message: 'تم حذف الفئة بنجاح.', id },
    });
  } catch (err) {
    next(err);
  }
};
