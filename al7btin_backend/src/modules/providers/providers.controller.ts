import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { providers, providerServices, providerServiceCategories, providerCoverageAreas } from '../../db/schema/providers.schema.js';
import { users } from '../../db/schema/users.schema.js';
import { deliveryEmployees } from '../../db/schema/delivery.schema.js';
import { services, serviceOptions } from '../../db/schema/services.schema.js';
import { orders, orderItems, orderStatusHistory } from '../../db/schema/orders.schema.js';
import { dispatchOffers } from '../../db/schema/dispatch.schema.js';
import { quotations, QuotationLineItem } from '../../db/schema/quotations.schema.js';
import { supportCases } from '../../db/schema/staff.schema.js';
import { eq, and, desc, inArray, gt } from 'drizzle-orm';
import { normalizeJordanianPhone } from '../auth/utils/phone.js';
import { AppError } from '../../middleware/errorHandler.js';
import { cacheService } from '../../services/cache.service.js';
import { dispatchService } from '../../services/dispatch.service.js';
import { eventsService } from '../../services/events.service.js';
import { auditService } from '../../services/audit.service.js';

export const getProviders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { serviceId, categoryId, includeUnavailable } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;

    let targetProviderIds: string[] | null = null;

    if (serviceId && typeof serviceId === 'string' && serviceId.trim().length > 0) {
      const psRows = await db
        .select({ providerId: providerServices.providerId })
        .from(providerServices)
        .where(
          and(
            eq(providerServices.serviceId, serviceId.trim()),
            includeUnavailable === 'true' ? undefined : eq(providerServices.isAvailable, true)
          )
        );
      targetProviderIds = psRows.map((r) => r.providerId);
      if (targetProviderIds.length === 0) {
        res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, count: 0 },
        });
        return;
      }
    }

    if (categoryId && typeof categoryId === 'string' && categoryId.trim().length > 0) {
      const catRows = await db
        .select({ providerId: providerServiceCategories.providerId })
        .from(providerServiceCategories)
        .where(eq(providerServiceCategories.categoryId, categoryId.trim()));
      const catProviderIds = catRows.map((r) => r.providerId);
      if (targetProviderIds !== null) {
        targetProviderIds = targetProviderIds.filter((id) => catProviderIds.includes(id));
      } else {
        targetProviderIds = catProviderIds;
      }
      if (targetProviderIds.length === 0) {
        res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, count: 0 },
        });
        return;
      }
    }

    let whereClause = includeUnavailable === 'true'
      ? eq(providers.isActive, true)
      : and(eq(providers.isActive, true), eq(providers.isAvailable, true));

    if (targetProviderIds !== null) {
      whereClause = and(whereClause, inArray(providers.id, targetProviderIds)) as any;
    }

    const cacheKey = `providers:list:${serviceId || ''}:${categoryId || ''}:${includeUnavailable || ''}:${page}:${limit}`;

    const formatted = await cacheService.getOrSet(
      cacheKey,
      async () => {
        const list = await db.query.providers.findMany({
          where: whereClause,
          with: {
            services: {
              with: {
                service: {
                  with: {
                    options: true,
                  },
                },
              },
            },
            categories: {
              with: {
                category: true,
              },
            },
            coverageAreas: true,
          },
          orderBy: [desc(providers.createdAt)],
          limit,
          offset,
        });

        return list.map((p) => {
          const srvList = p.services.map((s) => ({
            id: s.service.id,
            nameAr: s.service.nameAr,
            nameEn: s.service.nameEn,
            categoryId: s.service.categoryId,
            basePrice: parseFloat(s.service.basePrice),
            unitAr: s.service.unitAr,
            unitEn: s.service.unitEn,
            descriptionAr: s.service.descriptionAr,
            descriptionEn: s.service.descriptionEn,
            iconName: (s.service as any).iconName,
            isAvailable: s.isAvailable,
            isActive: s.service.isActive,
            options: (s.service.options || []).filter((opt) => opt.isActive).map((opt) => ({
              id: opt.id,
              nameAr: opt.nameAr,
              nameEn: opt.nameEn,
              size: opt.size,
              price: parseFloat(opt.price),
              unitAr: opt.unitAr,
              unitEn: opt.unitEn,
              isAvailable: opt.isAvailable,
              isActive: opt.isActive,
            })),
          }));
          const serviceIds = p.services.map((s) => s.serviceId);
          const availableServiceIds = p.services.filter((s) => s.isAvailable).map((s) => s.serviceId);
          const categoryIds = Array.from(new Set([
            ...p.categories.map((c) => c.categoryId),
            ...srvList.map((s) => s.categoryId),
          ]));

          return {
            id: p.id,
            nameAr: p.nameAr,
            nameEn: p.nameEn,
            descriptionAr: p.descriptionAr || '',
            descriptionEn: p.descriptionEn || '',
            logo: p.logo || '',
            phoneNumber: p.phoneNumber,
            address: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
            operatingHours: p.operatingHours,
            isActive: p.isActive,
            isAvailable: p.isAvailable,
            rating: p.rating,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            serviceIds,
            availableServiceIds,
            services: srvList,
            serviceCategoryIds: categoryIds,
            coverageAreas: p.coverageAreas.map((a) => a.areaName),
          };
        });
      },
      120 // 2 minutes TTL
    );

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

export const getProviderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const p = await db.query.providers.findFirst({
      where: eq(providers.id, id),
      with: {
        services: {
          with: {
            service: {
              with: {
                options: true,
              },
            },
          },
        },
        categories: {
          with: {
            category: true,
          },
        },
        coverageAreas: true,
      },
    });

    if (!p) {
      throw new AppError('مركز التوزيع / المزود غير موجود.', 404, 'PROVIDER_NOT_FOUND');
    }

    const srvList = p.services.map((s) => ({
      id: s.service.id,
      nameAr: s.service.nameAr,
      nameEn: s.service.nameEn,
      categoryId: s.service.categoryId,
      basePrice: parseFloat(s.service.basePrice),
      unitAr: s.service.unitAr,
      unitEn: s.service.unitEn,
      descriptionAr: s.service.descriptionAr,
      descriptionEn: s.service.descriptionEn,
      iconName: (s.service as any).iconName,
      isAvailable: s.isAvailable,
      isActive: s.service.isActive,
      options: (s.service.options || []).filter((opt) => opt.isActive).map((opt) => ({
        id: opt.id,
        nameAr: opt.nameAr,
        nameEn: opt.nameEn,
        size: opt.size,
        price: parseFloat(opt.price),
        unitAr: opt.unitAr,
        unitEn: opt.unitEn,
        isAvailable: opt.isAvailable,
        isActive: opt.isActive,
      })),
    }));
    const serviceIds = p.services.map((s) => s.serviceId);
    const availableServiceIds = p.services.filter((s) => s.isAvailable).map((s) => s.serviceId);
    const categoryIds = Array.from(new Set([
      ...p.categories.map((c) => c.categoryId),
      ...srvList.map((s) => s.categoryId),
    ]));

    res.status(200).json({
      success: true,
      data: {
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        descriptionAr: p.descriptionAr || '',
        descriptionEn: p.descriptionEn || '',
        logo: p.logo || '',
        phoneNumber: p.phoneNumber,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        operatingHours: p.operatingHours,
        isActive: p.isActive,
        isAvailable: p.isAvailable,
        rating: p.rating,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        serviceIds,
        availableServiceIds,
        services: srvList,
        serviceCategoryIds: categoryIds,
        coverageAreas: p.coverageAreas.map((a) => a.areaName),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAllProvidersAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const list = await db.query.providers.findMany({
      with: {
        services: {
          with: {
            service: {
              with: {
                options: true,
              },
            },
          },
        },
        categories: true,
        coverageAreas: true,
      },
      orderBy: [desc(providers.createdAt)],
    });

    const formatted = list.map((p) => {
      const srvList = p.services.map((s) => ({
        id: s.service.id,
        nameAr: s.service.nameAr,
        nameEn: s.service.nameEn,
        categoryId: s.service.categoryId,
        basePrice: parseFloat(s.service.basePrice),
        unitAr: s.service.unitAr,
        unitEn: s.service.unitEn,
        descriptionAr: s.service.descriptionAr,
        descriptionEn: s.service.descriptionEn,
        iconName: (s.service as any).iconName,
        isAvailable: s.isAvailable,
        isActive: s.service.isActive,
        options: (s.service.options || []).map((opt) => ({
          id: opt.id,
          nameAr: opt.nameAr,
          nameEn: opt.nameEn,
          size: opt.size,
          price: parseFloat(opt.price),
          unitAr: opt.unitAr,
          unitEn: opt.unitEn,
          isAvailable: opt.isAvailable,
          isActive: opt.isActive,
        })),
      }));
      const serviceIds = p.services.map((s) => s.serviceId);
      const availableServiceIds = p.services.filter((s) => s.isAvailable).map((s) => s.serviceId);
      const categoryIds = Array.from(new Set([
        ...p.categories.map((c) => c.categoryId),
        ...srvList.map((s) => s.categoryId),
      ]));

      return {
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        descriptionAr: p.descriptionAr || '',
        descriptionEn: p.descriptionEn || '',
        logo: p.logo || '',
        phoneNumber: p.phoneNumber,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        operatingHours: p.operatingHours,
        isActive: p.isActive,
        isAvailable: p.isAvailable,
        rating: p.rating,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        serviceIds,
        availableServiceIds,
        services: srvList,
        serviceCategoryIds: categoryIds,
        coverageAreas: p.coverageAreas.map((a) => a.areaName),
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

export const createProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, nameAr, nameEn, descriptionAr, descriptionEn, logo, rating, phoneNumber, address, latitude, longitude, operatingHours, isActive, isAvailable, serviceIds, serviceCategoryIds, categoryIds, coverageAreas } = req.body;

    if (!nameAr || !nameEn || !phoneNumber || !address) {
      throw new AppError('يرجى ملء جميع الحقول الإلزامية للمزود.', 400, 'FIELDS_REQUIRED');
    }

    const providerId = (id as string) || `prov_${Date.now()}`;
    const lat = typeof latitude === 'number' ? latitude : 31.9539;
    const lng = typeof longitude === 'number' ? longitude : 35.9106;
    const normalizedPhone = normalizeJordanianPhone(phoneNumber);

    // Link or Create User with 'provider' role
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, normalizedPhone))
      .limit(1);

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          phoneNumber: normalizedPhone,
          name: nameAr.trim(),
          role: 'provider',
        })
        .returning();
      user = newUser;
    } else if (user.role !== 'admin' && user.role !== 'provider') {
      const [updatedUser] = await db
        .update(users)
        .set({ role: 'provider', name: nameAr.trim(), updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      user = updatedUser;
    }

    const [newProvider] = await db
      .insert(providers)
      .values({
        id: providerId,
        userId: user.id,
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        descriptionAr: descriptionAr ? descriptionAr.trim() : null,
        descriptionEn: descriptionEn ? descriptionEn.trim() : null,
        logo: logo ? logo.trim() : null,
        rating: typeof rating === 'number' ? rating : 5.0,
        phoneNumber: normalizedPhone,
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        operatingHours: operatingHours || '08:00 AM - 10:00 PM',
        isActive: isActive !== undefined ? isActive : true,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
      })
      .returning();

    // 1. Map Provider Services (Authoritative)
    const effectiveServiceIds: string[] = [];
    if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
      for (const srvId of serviceIds) {
        if (typeof srvId === 'string' && srvId.trim().length > 0) {
          await db
            .insert(providerServices)
            .values({
              providerId: newProvider.id,
              serviceId: srvId.trim(),
            })
            .onConflictDoNothing();
          effectiveServiceIds.push(srvId.trim());
        }
      }
    }

    // 2. Map Category IDs
    const rawCatIds = categoryIds || serviceCategoryIds || [];
    if (rawCatIds && Array.isArray(rawCatIds)) {
      for (const catId of rawCatIds) {
        if (typeof catId === 'string' && catId.trim().length > 0) {
          await db
            .insert(providerServiceCategories)
            .values({
              providerId: newProvider.id,
              categoryId: catId.trim(),
            })
            .onConflictDoNothing();
        }
      }
    }

    // 3. Map Coverage Areas
    const effectiveAreas: string[] = [];
    if (coverageAreas && Array.isArray(coverageAreas)) {
      for (const area of coverageAreas) {
        if (typeof area === 'string' && area.trim().length > 0) {
          await db.insert(providerCoverageAreas).values({
            providerId: newProvider.id,
            areaName: area.trim(),
          });
          effectiveAreas.push(area.trim());
        }
      }
    }

    cacheService.invalidatePrefix('providers:');

    res.status(201).json({
      success: true,
      data: {
        ...newProvider,
        serviceIds: effectiveServiceIds,
        coverageAreas: effectiveAreas,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { nameAr, nameEn, descriptionAr, descriptionEn, logo, rating, phoneNumber, address, latitude, longitude, operatingHours, isActive, isAvailable, serviceIds, serviceCategoryIds, categoryIds, coverageAreas } = req.body;

    const [existing] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('المزود غير موجود.', 404, 'PROVIDER_NOT_FOUND');
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (nameAr !== undefined) updatePayload.nameAr = nameAr.trim();
    if (nameEn !== undefined) updatePayload.nameEn = nameEn.trim();
    if (descriptionAr !== undefined) updatePayload.descriptionAr = descriptionAr ? descriptionAr.trim() : null;
    if (descriptionEn !== undefined) updatePayload.descriptionEn = descriptionEn ? descriptionEn.trim() : null;
    if (logo !== undefined) updatePayload.logo = logo ? logo.trim() : null;
    if (rating !== undefined) updatePayload.rating = typeof rating === 'number' ? rating : existing.rating;
    if (phoneNumber !== undefined) updatePayload.phoneNumber = phoneNumber.trim();
    if (address !== undefined) updatePayload.address = address.trim();
    if (latitude !== undefined) updatePayload.latitude = typeof latitude === 'number' ? latitude : existing.latitude;
    if (longitude !== undefined) updatePayload.longitude = typeof longitude === 'number' ? longitude : existing.longitude;
    if (operatingHours !== undefined) updatePayload.operatingHours = operatingHours;
    if (isActive !== undefined) updatePayload.isActive = isActive;
    if (isAvailable !== undefined) updatePayload.isAvailable = isAvailable;

    const [updated] = await db
      .update(providers)
      .set(updatePayload)
      .where(eq(providers.id, id))
      .returning();

    // Update Services if provided
    if (serviceIds && Array.isArray(serviceIds)) {
      await db.delete(providerServices).where(eq(providerServices.providerId, id));
      for (const srvId of serviceIds) {
        if (typeof srvId === 'string' && srvId.trim().length > 0) {
          await db
            .insert(providerServices)
            .values({
              providerId: id,
              serviceId: srvId.trim(),
            })
            .onConflictDoNothing();
        }
      }
    }

    // Update Categories if provided
    const rawCatIds = categoryIds || serviceCategoryIds;
    if (rawCatIds && Array.isArray(rawCatIds)) {
      await db.delete(providerServiceCategories).where(eq(providerServiceCategories.providerId, id));
      for (const catId of rawCatIds) {
        if (typeof catId === 'string' && catId.trim().length > 0) {
          await db
            .insert(providerServiceCategories)
            .values({
              providerId: id,
              categoryId: catId.trim(),
            })
            .onConflictDoNothing();
        }
      }
    }

    // Update coverage areas if provided
    if (coverageAreas && Array.isArray(coverageAreas)) {
      await db.delete(providerCoverageAreas).where(eq(providerCoverageAreas.providerId, id));
      for (const area of coverageAreas) {
        if (typeof area === 'string' && area.trim().length > 0) {
          await db.insert(providerCoverageAreas).values({
            providerId: id,
            areaName: area.trim(),
          });
        }
      }
    }

    cacheService.invalidatePrefix('providers:');

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [deleted] = await db
      .delete(providers)
      .where(eq(providers.id, id))
      .returning();

    if (!deleted) {
      throw new AppError('المزود غير موجود.', 404, 'PROVIDER_NOT_FOUND');
    }

    cacheService.invalidatePrefix('providers:');

    res.status(200).json({
      success: true,
      data: { message: 'تم حذف المزود بنجاح.', id },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider fetches their own profile with assigned services and operational KPI statistics
 */
export const getMyProviderProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    // Find provider record associated with this user
    let p = await db.query.providers.findFirst({
      where: eq(providers.userId, req.user.id),
      with: {
        services: {
          with: {
            service: {
              with: {
                options: true,
              },
            },
          },
        },
        categories: {
          with: {
            category: true,
          },
        },
        coverageAreas: true,
      },
    });

    if (!p) {
      // Fallback by phone number
      p = await db.query.providers.findFirst({
        where: eq(providers.phoneNumber, req.user.phoneNumber),
        with: {
          services: {
            with: {
              service: {
                with: {
                  options: true,
                },
              },
            },
          },
          categories: {
            with: {
              category: true,
            },
          },
          coverageAreas: true,
        },
      });
    }

    if (!p) {
      throw new AppError('لم يتم العثور على بيانات المتجر أو المزود المرتبط بهذا الحساب.', 404, 'PROVIDER_NOT_FOUND');
    }

    // Fetch provider's active and completed orders count
    const providerOrders = await db.query.orders.findMany({
      where: eq(orders.providerId, p.id),
    });

    const activeOrdersCount = providerOrders.filter((o) => !['completed', 'cancelled', 'rejected', 'failed'].includes(o.status)).length;
    const completedOrdersCount = providerOrders.filter((o) => o.status === 'completed').length;

    // Fetch delivery staff belonging to this provider
    const staff = await db.query.deliveryEmployees.findMany({
      where: eq(deliveryEmployees.providerId, p.id),
      with: {
        serviceCapabilities: true,
        categoryCapabilities: true,
      },
    });

    const srvList = p.services.map((s) => ({
      id: s.service.id,
      nameAr: s.service.nameAr,
      nameEn: s.service.nameEn,
      categoryId: s.service.categoryId,
      basePrice: parseFloat(s.service.basePrice),
      descriptionAr: s.service.descriptionAr,
      descriptionEn: s.service.descriptionEn,
      iconName: (s.service as any).iconName,
      unitAr: s.service.unitAr,
      unitEn: s.service.unitEn,
      isAvailable: s.isAvailable,
      isActive: s.service.isActive,
      options: (s.service.options || []).filter((opt) => opt.isActive).map((opt) => ({
        id: opt.id,
        nameAr: opt.nameAr,
        nameEn: opt.nameEn,
        size: opt.size,
        price: parseFloat(opt.price),
        unitAr: opt.unitAr,
        unitEn: opt.unitEn,
        isAvailable: opt.isAvailable,
        isActive: opt.isActive,
      })),
    }));
    const serviceIds = p.services.map((s) => s.serviceId);
    const availableServiceIds = p.services.filter((s) => s.isAvailable).map((s) => s.serviceId);
    const categoryIds = Array.from(new Set([
      ...p.categories.map((c) => c.categoryId),
      ...srvList.map((s) => s.categoryId),
    ]));

    const deliveryStaff = staff.map((d) => ({
      id: d.id,
      name: d.name,
      phoneNumber: d.phoneNumber,
      vehicleType: d.vehicleType,
      vehiclePlateNumber: d.vehiclePlateNumber,
      isOnline: d.isOnline,
      isActive: d.isActive,
      activeOrdersCount: d.activeOrdersCount,
      completedOrdersCount: d.completedOrdersCount,
      rating: parseFloat(d.rating),
      serviceCapabilities: d.serviceCapabilities.filter((s) => s.isAuthorized).map((s) => s.serviceId),
      categoryCapabilities: d.categoryCapabilities.map((c) => c.categoryId),
    }));

    res.status(200).json({
      success: true,
      data: {
        id: p.id,
        userId: p.userId,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        descriptionAr: p.descriptionAr || '',
        descriptionEn: p.descriptionEn || '',
        logo: p.logo || '',
        phoneNumber: p.phoneNumber,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        operatingHours: p.operatingHours,
        isActive: p.isActive,
        isAvailable: p.isAvailable,
        rating: p.rating,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        serviceIds,
        availableServiceIds,
        services: srvList,
        serviceCategoryIds: categoryIds,
        coverageAreas: p.coverageAreas.map((a) => a.areaName),
        deliveryStaff,
        stats: {
          totalServices: srvList.length,
          availableServices: availableServiceIds.length,
          activeOrdersCount,
          completedOrdersCount,
          totalOrdersCount: providerOrders.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider toggles their general Online / Offline availability status
 */
export const updateMyProviderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }
    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      throw new AppError('غير مصرح لك بتعديل حالة المزود.', 403, 'FORBIDDEN_ROLE');
    }

    const { isAvailable } = req.body;
    if (typeof isAvailable !== 'boolean') {
      throw new AppError('يرجى تحديد حالة التوفر (isAvailable: true/false).', 400, 'INVALID_STATUS_VALUE');
    }

    let p = await db.query.providers.findFirst({
      where: eq(providers.userId, req.user.id),
      orderBy: [desc(providers.createdAt)],
    });

    if (!p) {
      p = await db.query.providers.findFirst({
        where: eq(providers.phoneNumber, req.user.phoneNumber),
        orderBy: [desc(providers.createdAt)],
      });
    }

    if (!p) {
      throw new AppError('لم يتم العثور على متجر أو مزود مرتبط بهذا الحساب.', 404, 'PROVIDER_NOT_FOUND');
    }

    const [updated] = await db
      .update(providers)
      .set({
        isAvailable,
        updatedAt: new Date(),
      })
      .where(eq(providers.id, p.id))
      .returning();

    cacheService.invalidatePrefix('providers:');

    res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        isAvailable: updated.isAvailable,
        updatedAt: updated.updatedAt,
      },
      message: isAvailable ? 'تم تفعيل استقبال الطلبات (أونلاين) بنجاح.' : 'تم إيقاف استقبال الطلبات (أوفلاين) بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider edits permitted profile information
 */
export const updateMyProviderProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }
    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      throw new AppError('غير مصرح لك بتعديل بيانات المتجر.', 403, 'FORBIDDEN_ROLE');
    }

    const { nameAr, nameEn, descriptionAr, descriptionEn, phoneNumber, address, operatingHours, logo } = req.body;

    let p = await db.query.providers.findFirst({
      where: eq(providers.userId, req.user.id),
      orderBy: [desc(providers.createdAt)],
    });

    if (!p) {
      p = await db.query.providers.findFirst({
        where: eq(providers.phoneNumber, req.user.phoneNumber),
        orderBy: [desc(providers.createdAt)],
      });
    }

    if (!p) {
      throw new AppError('لم يتم العثور على متجر أو مزود مرتبط بهذا الحساب.', 404, 'PROVIDER_NOT_FOUND');
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (nameAr) updatePayload.nameAr = nameAr.trim();
    if (nameEn) updatePayload.nameEn = nameEn.trim();
    if (descriptionAr !== undefined) updatePayload.descriptionAr = descriptionAr ? descriptionAr.trim() : null;
    if (descriptionEn !== undefined) updatePayload.descriptionEn = descriptionEn ? descriptionEn.trim() : null;
    if (phoneNumber) updatePayload.phoneNumber = phoneNumber.trim();
    if (address) updatePayload.address = address.trim();
    if (operatingHours) updatePayload.operatingHours = operatingHours.trim();
    if (logo !== undefined) updatePayload.logo = logo ? logo.trim() : null;

    const [updated] = await db
      .update(providers)
      .set(updatePayload)
      .where(eq(providers.id, p.id))
      .returning();

    cacheService.invalidatePrefix('providers:');

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم تحديث بيانات المتجر بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider fetches incoming and historical orders assigned to their facility
 */
export const getMyProviderOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }
    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      throw new AppError('غير مصرح لك بالوصول لطلبات المزود.', 403, 'FORBIDDEN_ROLE');
    }

    let p = await db.query.providers.findFirst({
      where: eq(providers.userId, req.user.id),
      orderBy: [desc(providers.createdAt)],
    });

    if (!p) {
      p = await db.query.providers.findFirst({
        where: eq(providers.phoneNumber, req.user.phoneNumber),
        orderBy: [desc(providers.createdAt)],
      });
    }

    if (!p) {
      throw new AppError('لم يتم العثور على متجر أو مزود مرتبط بهذا الحساب.', 404, 'PROVIDER_NOT_FOUND');
    }

    const providerOrders = await db.query.orders.findMany({
      where: eq(orders.providerId, p.id),
      with: {
        items: true,
      },
      orderBy: [desc(orders.createdAt)],
    });

    const formattedOrders = providerOrders.map((o) => ({
      id: o.id,
      customerId: o.customerId,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      serviceCategoryId: o.serviceCategoryId,
      providerId: o.providerId,
      providerName: o.providerName,
      providerPhone: o.providerPhone,
      pickupAddress: o.pickupAddress,
      deliveryCity: o.deliveryCity,
      deliveryArea: o.deliveryArea,
      deliveryStreetAddress: o.deliveryStreetAddress,
      deliveryBuilding: o.deliveryBuilding,
      deliveryFloor: o.deliveryFloor,
      deliveryApartment: o.deliveryApartment,
      deliveryInstructions: o.deliveryInstructions,
      deliveryLatitude: o.deliveryLatitude,
      deliveryLongitude: o.deliveryLongitude,
      subtotal: parseFloat(o.subtotal),
      discountAmount: parseFloat(o.discountAmount),
      deliveryFee: parseFloat(o.deliveryFee),
      totalAmount: parseFloat(o.totalAmount),
      paymentMethod: o.paymentMethod,
      status: o.status,
      assignmentStatus: o.assignmentStatus,
      assignedDeliveryId: o.assignedDeliveryId,
      assignedDeliveryName: o.assignedDeliveryName,
      notes: o.notes,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      items: o.items.map((i) => ({
        id: i.id,
        serviceId: i.serviceId,
        serviceNameAr: i.titleAr,
        serviceNameEn: i.titleEn,
        serviceOptionId: i.serviceOptionId,
        variantNameAr: i.variantNameAr,
        variantNameEn: i.variantNameEn,
        unitPrice: parseFloat(i.unitPrice),
        quantity: i.quantity,
        totalPrice: parseFloat(i.itemTotal),
      })),
    }));

    res.status(200).json({
      success: true,
      data: formattedOrders,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Returns products/services assigned to the authenticated Provider with current availability status
 */
export const getMyProviderServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }
    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      throw new AppError('غير مصرح لك بالوصول لخدمات المزود.', 403, 'FORBIDDEN_ROLE');
    }

    let p = await db.query.providers.findFirst({
      where: eq(providers.userId, req.user.id),
      orderBy: [desc(providers.createdAt)],
      with: {
        services: {
          with: {
            service: {
              with: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!p) {
      p = await db.query.providers.findFirst({
        where: eq(providers.phoneNumber, req.user.phoneNumber),
        orderBy: [desc(providers.createdAt)],
        with: {
          services: {
            with: {
              service: {
                with: {
                  options: true,
                },
              },
            },
          },
        },
      });
    }

    if (!p) {
      throw new AppError('لم يتم العثور على متجر أو مزود مرتبط بهذا الحساب.', 404, 'PROVIDER_NOT_FOUND');
    }

    const assignedServices = p.services.map((ps) => ({
      id: ps.service.id,
      nameAr: ps.service.nameAr,
      nameEn: ps.service.nameEn,
      categoryId: ps.service.categoryId,
      basePrice: parseFloat(ps.service.basePrice),
      isAvailable: ps.isAvailable,
      unitAr: ps.service.unitAr,
      unitEn: ps.service.unitEn,
      descriptionAr: ps.service.descriptionAr,
      descriptionEn: ps.service.descriptionEn,
      iconName: (ps.service as any).iconName,
      createdAt: ps.createdAt,
      updatedAt: ps.updatedAt,
      options: (ps.service.options || []).filter((opt) => opt.isActive).map((opt) => ({
        id: opt.id,
        nameAr: opt.nameAr,
        nameEn: opt.nameEn,
        size: opt.size,
        price: parseFloat(opt.price),
        unitAr: opt.unitAr,
        unitEn: opt.unitEn,
        isAvailable: opt.isAvailable,
        isActive: opt.isActive,
      })),
    }));

    res.status(200).json({
      success: true,
      data: assignedServices,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider updates the real-time availability of their assigned product/service
 */
export const updateMyServiceAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }
    if (req.user.role !== 'provider' && req.user.role !== 'admin') {
      throw new AppError('غير مصرح لك بتعديل توفر الخدمات.', 403, 'FORBIDDEN_ROLE');
    }

    const serviceId = req.params.serviceId as string;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      throw new AppError('يرجى تحديد حالة التوفر (isAvailable: true/false).', 400, 'INVALID_AVAILABILITY_VALUE');
    }

    let p = await db.query.providers.findFirst({
      where: eq(providers.userId, req.user.id),
      orderBy: [desc(providers.createdAt)],
    });

    if (!p) {
      p = await db.query.providers.findFirst({
        where: eq(providers.phoneNumber, req.user.phoneNumber),
        orderBy: [desc(providers.createdAt)],
      });
    }

    if (!p) {
      throw new AppError('لم يتم العثور على متجر أو مزود مرتبط بهذا الحساب.', 404, 'PROVIDER_NOT_FOUND');
    }

    // Verify that the service is actually assigned to this provider by Admin
    const [existingAssignment] = await db
      .select()
      .from(providerServices)
      .where(and(eq(providerServices.providerId, p.id), eq(providerServices.serviceId, serviceId)))
      .limit(1);

    if (!existingAssignment) {
      throw new AppError('هذه الخدمة غير معينة لهذا المزود من قبل الإدارة.', 404, 'SERVICE_NOT_ASSIGNED_TO_PROVIDER');
    }

    const [updated] = await db
      .update(providerServices)
      .set({
        isAvailable,
        updatedAt: new Date(),
      })
      .where(and(eq(providerServices.providerId, p.id), eq(providerServices.serviceId, serviceId)))
      .returning();

    cacheService.invalidatePrefix('providers:');

    res.status(200).json({
      success: true,
      data: {
        providerId: p.id,
        serviceId: updated.serviceId,
        isAvailable: updated.isAvailable,
        updatedAt: updated.updatedAt,
      },
      message: isAvailable ? 'تم تفعيل توفر المنتج/الخدمة للعملاء بنجاح.' : 'تم تعطيل توفر المنتج/الخدمة للعملاء بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to resolve provider record for the authenticated user
 */
export async function resolveProviderForUser(userId: string, phoneNumber?: string) {
  let p = await db.query.providers.findFirst({
    where: eq(providers.userId, userId),
    orderBy: [desc(providers.createdAt)],
  });

  if (!p && phoneNumber) {
    p = await db.query.providers.findFirst({
      where: eq(providers.phoneNumber, phoneNumber),
      orderBy: [desc(providers.createdAt)],
    });
  }

  return p;
}

/**
 * Provider fetches their active dispatch offers with SLA countdown
 */
export const getMyDispatchOffers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const p = await resolveProviderForUser(req.user.id, req.user.phoneNumber);
    if (!p) {
      throw new AppError('لم يتم العثور على متجر أو مزود مرتبط بهذا الحساب.', 404, 'PROVIDER_NOT_FOUND');
    }

    const offers = await db.query.dispatchOffers.findMany({
      where: and(
        eq(dispatchOffers.providerId, p.id),
        eq(dispatchOffers.status, 'offered'),
        gt(dispatchOffers.expiresAt, new Date())
      ),
      with: {
        order: {
          with: {
            items: true,
          },
        },
      },
      orderBy: [desc(dispatchOffers.offeredAt)],
    });

    const formatted = offers.map((off) => ({
      id: off.id,
      orderId: off.orderId,
      attemptNumber: off.attemptNumber,
      status: off.status,
      score: off.score,
      scoreBreakdown: off.scoreBreakdown,
      offeredAt: off.offeredAt,
      expiresAt: off.expiresAt,
      order: off.order
        ? {
            id: off.order.id,
            customerId: off.order.customerId,
            customerName: off.order.customerName,
            customerPhone: off.order.customerPhone,
            serviceCategoryId: off.order.serviceCategoryId,
            deliveryCity: off.order.deliveryCity,
            deliveryArea: off.order.deliveryArea,
            deliveryStreetAddress: off.order.deliveryStreetAddress,
            deliveryLatitude: off.order.deliveryLatitude,
            deliveryLongitude: off.order.deliveryLongitude,
            subtotal: parseFloat(off.order.subtotal),
            discountAmount: parseFloat(off.order.discountAmount),
            deliveryFee: parseFloat(off.order.deliveryFee),
            totalAmount: parseFloat(off.order.totalAmount),
            paymentMethod: off.order.paymentMethod,
            configurationSnapshot: off.order.configurationSnapshot,
            priceBreakdown: off.order.priceBreakdown,
            notes: off.order.notes,
            createdAt: off.order.createdAt,
            items: off.order.items.map((i) => ({
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
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      count: formatted.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider accepts a dispatch offer with atomic win verification
 */
export const acceptDispatchOffer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const p = await resolveProviderForUser(req.user.id, req.user.phoneNumber);
    if (!p) {
      throw new AppError('لم يتم العثور على متجر أو مزود مرتبط بهذا الحساب.', 404, 'PROVIDER_NOT_FOUND');
    }

    const offerId = req.params.offerId as string;
    const result = await dispatchService.acceptOffer(offerId, p.id, req.user.id);

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
 * Provider rejects a dispatch offer with reason and triggers fallback retry
 */
export const rejectDispatchOffer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const p = await resolveProviderForUser(req.user.id, req.user.phoneNumber);
    if (!p) {
      throw new AppError('لم يتم العثور على متجر أو مزود مرتبط بهذا الحساب.', 404, 'PROVIDER_NOT_FOUND');
    }

    const offerId = req.params.offerId as string;
    const { reason } = req.body;

    const result = await dispatchService.rejectOffer(offerId, p.id, reason);

    res.status(200).json({
      success: true,
      data: result,
      message: 'تم تسجيل رفض العرض وتحويل الطلب للمزود التالي.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider fetches active and historical assigned jobs
 */
export const getMyProviderJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const p = await resolveProviderForUser(req.user.id, req.user.phoneNumber);
    if (!p) {
      throw new AppError('لم يتم العثور على متجر أو مزود مرتبط بهذا الحساب.', 404, 'PROVIDER_NOT_FOUND');
    }

    const statusFilter = req.query.status as string | undefined;

    let whereClause = eq(orders.providerId, p.id);

    if (statusFilter === 'active') {
      whereClause = and(
        eq(orders.providerId, p.id),
        inArray(orders.status, ['assigned', 'accepted', 'going_to_customer', 'going_to_pickup', 'picked_up'])
      ) as any;
    } else if (statusFilter === 'completed') {
      whereClause = and(eq(orders.providerId, p.id), eq(orders.status, 'completed')) as any;
    }

    const providerOrders = await db.query.orders.findMany({
      where: whereClause,
      with: {
        items: true,
        statusHistory: {
          orderBy: [desc(orderStatusHistory.createdAt)],
        },
      },
      orderBy: [desc(orders.createdAt)],
    });

    const formatted = providerOrders.map((o) => ({
      id: o.id,
      customerId: o.customerId,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      serviceCategoryId: o.serviceCategoryId,
      providerId: o.providerId,
      providerName: o.providerName,
      deliveryCity: o.deliveryCity,
      deliveryArea: o.deliveryArea,
      deliveryStreetAddress: o.deliveryStreetAddress,
      deliveryBuilding: o.deliveryBuilding,
      deliveryFloor: o.deliveryFloor,
      deliveryApartment: o.deliveryApartment,
      deliveryInstructions: o.deliveryInstructions,
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
      arrivedAt: o.arrivedAt,
      serviceStartedAt: o.serviceStartedAt,
      serviceCompletedAt: o.serviceCompletedAt,
      configurationSnapshot: o.configurationSnapshot,
      priceBreakdown: o.priceBreakdown,
      notes: o.notes,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      items: o.items.map((i) => ({
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
      history: o.statusHistory,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      count: formatted.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider signals they are on the way to customer location
 */
export const providerMarkArriving = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const p = await resolveProviderForUser(req.user.id, req.user.phoneNumber);
    if (!p) {
      throw new AppError('المزود غير موجود.', 404, 'PROVIDER_NOT_FOUND');
    }

    const orderId = req.params.orderId as string;
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });

    if (!order || order.providerId !== p.id) {
      throw new AppError('الطلب غير مخصص لهذا المزود.', 403, 'FORBIDDEN_ORDER_ACCESS');
    }

    const [updated] = await db
      .update(orders)
      .set({
        status: 'going_to_customer',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId,
      status: 'going_to_customer',
      changedByUserId: req.user.id,
      notes: 'الفني/المزود في الطريق إلى موقع العميل.',
    });

    eventsService.emit('ORDER_STATUS_CHANGED', {
      orderId,
      status: 'going_to_customer',
      providerName: p.nameAr,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم تحديث حالة الطلب: في الطريق إلى العميل.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider signals arrival at customer location
 */
export const providerMarkArrived = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const p = await resolveProviderForUser(req.user.id, req.user.phoneNumber);
    if (!p) {
      throw new AppError('المزود غير موجود.', 404, 'PROVIDER_NOT_FOUND');
    }

    const orderId = req.params.orderId as string;
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });

    if (!order || order.providerId !== p.id) {
      throw new AppError('الطلب غير مخصص لهذا المزود.', 403, 'FORBIDDEN_ORDER_ACCESS');
    }

    const [updated] = await db
      .update(orders)
      .set({
        arrivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId,
      status: order.status,
      changedByUserId: req.user.id,
      notes: 'وصل المزود/الفني إلى موقع العميل.',
    });

    eventsService.emit('ORDER_STATUS_CHANGED', {
      orderId,
      status: order.status,
      arrivedAt: updated.arrivedAt,
      providerName: p.nameAr,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم تأكيد الوصول إلى موقع العميل بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider signals start of service execution
 */
export const providerStartService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const p = await resolveProviderForUser(req.user.id, req.user.phoneNumber);
    if (!p) {
      throw new AppError('المزود غير موجود.', 404, 'PROVIDER_NOT_FOUND');
    }

    const orderId = req.params.orderId as string;
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });

    if (!order || order.providerId !== p.id) {
      throw new AppError('الطلب غير مخصص لهذا المزود.', 403, 'FORBIDDEN_ORDER_ACCESS');
    }

    const [updated] = await db
      .update(orders)
      .set({
        serviceStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId,
      status: order.status,
      changedByUserId: req.user.id,
      notes: 'بدء تنفيذ الخدمة لدى العميل.',
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم تسجيل بدء العمل على الخدمة بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider marks service as completed
 */
export const providerCompleteService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const p = await resolveProviderForUser(req.user.id, req.user.phoneNumber);
    if (!p) {
      throw new AppError('المزود غير موجود.', 404, 'PROVIDER_NOT_FOUND');
    }

    const orderId = req.params.orderId as string;
    const { completionNotes } = req.body;
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });

    if (!order || order.providerId !== p.id) {
      throw new AppError('الطلب غير مخصص لهذا المزود.', 403, 'FORBIDDEN_ORDER_ACCESS');
    }

    const [updated] = await db
      .update(orders)
      .set({
        status: 'completed',
        serviceCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId,
      status: 'completed',
      changedByUserId: req.user.id,
      notes: completionNotes || 'تم إنجاز وتسليم الخدمة بنجاح.',
    });

    eventsService.emit('ORDER_STATUS_CHANGED', {
      orderId,
      status: 'completed',
      providerName: p.nameAr,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم تأكيد إنجاز واكتمال الطلب بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider reports an operational issue / delay
 */
export const providerReportIssue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const p = await resolveProviderForUser(req.user.id, req.user.phoneNumber);
    if (!p) {
      throw new AppError('المزود غير موجود.', 404, 'PROVIDER_NOT_FOUND');
    }

    const orderId = req.params.orderId as string;
    const { issueType, description, priority = 'high' } = req.body;

    if (!description) {
      throw new AppError('يرجى تقديم وصف للمشكلة التشغيلية.', 400, 'DESCRIPTION_REQUIRED');
    }

    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order || order.providerId !== p.id) {
      throw new AppError('الطلب غير مخصص لهذا المزود.', 403, 'FORBIDDEN_ORDER_ACCESS');
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    const effectivePriority = validPriorities.includes(priority) ? priority : 'high';

    const caseNumber = `CAS-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    const [supportCase] = await db
      .insert(supportCases)
      .values({
        caseNumber,
        customerId: order.customerId,
        orderId: order.id,
        createdByStaffId: req.user.id,
        title: `بلاغ فني من المزود (${p.nameAr}): ${issueType || 'تأخير/عائق تشغيلي'}`,
        category: 'operations_delay',
        priority: effectivePriority as any,
        status: 'open',
        description,
      })
      .returning();

    await auditService.log({
      action: 'PROVIDER_ISSUE_REPORTED',
      entityType: 'order',
      entityId: orderId,
      actorUserId: req.user.id,
      metadata: {
        providerId: p.id,
        issueType,
        description,
        supportCaseId: supportCase.id,
      },
    });

    res.status(201).json({
      success: true,
      data: supportCase,
      message: 'تم استلام بلاغ المشكلة التشغيلية وإحالته إلى فريق العمليات والدعم.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Provider creates an on-site quotation for additional labor or spare parts
 */
export const providerCreateQuotation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED');
    }

    const p = await resolveProviderForUser(req.user.id, req.user.phoneNumber);
    if (!p) {
      throw new AppError('المزود غير موجود.', 404, 'PROVIDER_NOT_FOUND');
    }

    const orderId = req.params.orderId as string;
    const {
      serviceId,
      items,
      laborAmount = 0,
      materialsAmount = 0,
      sparePartsAmount = 0,
      equipmentAmount = 0,
      notes,
      attachments = [],
    } = req.body;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true },
    });

    if (!order || order.providerId !== p.id) {
      throw new AppError('الطلب غير مخصص لهذا المزود.', 403, 'FORBIDDEN_ORDER_ACCESS');
    }

    const primaryServiceId = serviceId || order.items[0]?.serviceId;
    if (!primaryServiceId) {
      throw new AppError('يرجى تحديد الخدمة المرتبطة بعرض السعر.', 400, 'SERVICE_REQUIRED');
    }

    const labor = parseFloat(laborAmount) || 0;
    const materials = parseFloat(materialsAmount) || 0;
    const spareParts = parseFloat(sparePartsAmount) || 0;
    const equipment = parseFloat(equipmentAmount) || 0;
    const subtotal = labor + materials + spareParts + equipment;
    const deliveryFee = 0.0; // Invariant
    const totalAmount = subtotal;

    const quotationId = `QT-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    const [quotation] = await db
      .insert(quotations)
      .values({
        id: quotationId,
        orderId: order.id,
        serviceId: primaryServiceId,
        providerId: p.id,
        createdByUserId: req.user.id,
        createdByName: p.nameAr,
        status: 'sent',
        laborAmount: labor.toFixed(2),
        materialsAmount: materials.toFixed(2),
        sparePartsAmount: spareParts.toFixed(2),
        equipmentAmount: equipment.toFixed(2),
        serviceFees: '0.00',
        discountAmount: '0.00',
        subtotal: subtotal.toFixed(2),
        deliveryFee: '0.00',
        totalAmount: totalAmount.toFixed(2),
        items: Array.isArray(items) ? (items as QuotationLineItem[]) : [],
        notes: notes || null,
        attachments: Array.isArray(attachments) ? attachments : [],
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000), // 48 hours validity
      })
      .returning();

    await auditService.log({
      action: 'PROVIDER_QUOTATION_CREATED',
      entityType: 'quotation',
      entityId: quotation.id,
      actorUserId: req.user.id,
      metadata: {
        orderId: order.id,
        quotationId: quotation.id,
        totalAmount,
      },
    });

    eventsService.emit('QUOTATION_CREATED', {
      quotationId: quotation.id,
      orderId: order.id,
      totalAmount,
      customerPhone: order.customerPhone,
    });

    res.status(201).json({
      success: true,
      data: quotation,
      message: 'تم إنشاء وإرسال عرض السعر الإضافي للعميل بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};
