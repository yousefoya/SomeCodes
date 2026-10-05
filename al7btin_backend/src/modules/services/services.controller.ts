import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import {
  services,
  serviceOptions,
  serviceFields,
  serviceRules,
  servicePricingRules,
  serviceRequirements,
  serviceVersions,
} from '../../db/schema/services.schema.js';
import { coupons } from '../../db/schema/coupons.schema.js';
import { and, eq, or, ilike, asc, desc, SQL } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';
import { cacheService } from '../../services/cache.service.js';
import { pricingEngine } from '../../services/pricing.engine.js';
import { auditService } from '../../services/audit.service.js';

// -------------------------------------------------------------
// Public / Customer Service Catalog & Dynamic Configuration
// -------------------------------------------------------------

export const getServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { categoryId, providerId, search, active, status } = req.query;

    const conditions: SQL[] = [];

    // Filter by active status
    if (active === 'false') {
      conditions.push(eq(services.isActive, false));
    } else if (active === 'all') {
      // Do not filter by isActive (for admin)
    } else {
      conditions.push(eq(services.isActive, true));
    }

    // Filter by published / lifecycle status
    if (status && typeof status === 'string' && status !== 'all') {
      conditions.push(eq(services.status, status as any));
    } else if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      // Public customer query only sees published services
      conditions.push(eq(services.isPublished, true));
      conditions.push(eq(services.status, 'published'));
    }

    // Filter by category
    if (categoryId && typeof categoryId === 'string') {
      conditions.push(eq(services.categoryId, categoryId));
    }

    // Filter by provider
    if (providerId && typeof providerId === 'string') {
      conditions.push(eq(services.providerId, providerId));
    }

    // Search query in Arabic & English names and descriptions
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = `%${search.trim()}%`;
      const searchCond = or(
        ilike(services.nameAr, q),
        ilike(services.nameEn, q),
        ilike(services.descriptionAr, q),
        ilike(services.descriptionEn, q)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;

    const cacheKey = `services:list:${categoryId || ''}:${providerId || ''}:${search || ''}:${active || ''}:${status || ''}:${page}:${limit}`;

    const formatted = await cacheService.getOrSet(
      cacheKey,
      async () => {
        const list = await db.query.services.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
          with: {
            category: true,
            provider: true,
            options: {
              where: active === 'all' ? undefined : eq(serviceOptions.isActive, true),
              orderBy: [asc(serviceOptions.sortOrder), asc(serviceOptions.price)],
            },
            fields: {
              where: eq(serviceFields.isActive, true),
              orderBy: [asc(serviceFields.sortOrder)],
            },
          },
          limit,
          offset,
        });

        return list.map((s) => ({
          id: s.id,
          categoryId: s.categoryId,
          providerId: s.providerId,
          nameAr: s.nameAr,
          nameEn: s.nameEn,
          descriptionAr: s.descriptionAr,
          descriptionEn: s.descriptionEn,
          type: s.type,
          basePrice: s.basePrice,
          unitAr: s.unitAr,
          unitEn: s.unitEn,
          requiresQuotation: s.requiresQuotation,
          isAvailable: s.isAvailable,
          isActive: s.isActive,
          status: s.status,
          currentVersion: s.currentVersion,
          slaHours: s.slaHours,
          minOrderValue: s.minOrderValue ? parseFloat(s.minOrderValue) : null,
          maxOrderValue: s.maxOrderValue ? parseFloat(s.maxOrderValue) : null,
          gallery: s.gallery || [],
          coverageAreas: s.coverageAreas || [],
          isPublished: s.isPublished,
          startingPriceLabelAr: s.startingPriceLabelAr || 'يبدأ من',
          startingPriceLabelEn: s.startingPriceLabelEn || 'Starting from',
          disclaimerAr: s.disclaimerAr || '',
          disclaimerEn: s.disclaimerEn || '',
          isLaborOnly: s.isLaborOnly || false,
          serviceMode: s.serviceMode || 'dynamic_form',
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          providerName: s.provider ? s.provider.nameAr : null,
          options: (s.options || []).map((opt) => ({
            id: opt.id,
            serviceId: opt.serviceId,
            nameAr: opt.nameAr,
            nameEn: opt.nameEn,
            optionType: opt.optionType,
            size: opt.size,
            price: parseFloat(opt.price),
            unitAr: opt.unitAr,
            unitEn: opt.unitEn,
            sortOrder: opt.sortOrder,
            isAvailable: opt.isAvailable,
            isActive: opt.isActive,
            descriptionAr: opt.descriptionAr,
            descriptionEn: opt.descriptionEn,
            imageUrl: opt.imageUrl,
            gallery: opt.gallery || [],
            brand: opt.brand,
            color: opt.color,
            specifications: opt.specifications || {},
            installationPrice: opt.installationPrice ? parseFloat(opt.installationPrice) : 0.0,
            packageWorkerCount: opt.packageWorkerCount,
            packageDurationHours: opt.packageDurationHours ? parseFloat(opt.packageDurationHours) : null,
            metadata: opt.metadata || {},
          })),
          fieldsCount: (s.fields || []).length,
        }));
      },
      300 // 5 minutes TTL
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

export const getServiceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const cacheKey = `services:detail:${id}`;

    const formatted = await cacheService.getOrSet(
      cacheKey,
      async () => {
        const s = await db.query.services.findFirst({
          where: eq(services.id, id),
          with: {
            category: true,
            provider: true,
            options: {
              where: eq(serviceOptions.isActive, true),
              orderBy: [asc(serviceOptions.sortOrder), asc(serviceOptions.price)],
            },
            fields: {
              where: eq(serviceFields.isActive, true),
              orderBy: [asc(serviceFields.sortOrder)],
            },
          },
        });

        if (!s) return null;

        return {
          id: s.id,
          categoryId: s.categoryId,
          providerId: s.providerId,
          nameAr: s.nameAr,
          nameEn: s.nameEn,
          descriptionAr: s.descriptionAr,
          descriptionEn: s.descriptionEn,
          type: s.type,
          basePrice: s.basePrice,
          unitAr: s.unitAr,
          unitEn: s.unitEn,
          requiresQuotation: s.requiresQuotation,
          isAvailable: s.isAvailable,
          isActive: s.isActive,
          status: s.status,
          currentVersion: s.currentVersion,
          slaHours: s.slaHours,
          minOrderValue: s.minOrderValue ? parseFloat(s.minOrderValue) : null,
          maxOrderValue: s.maxOrderValue ? parseFloat(s.maxOrderValue) : null,
          gallery: s.gallery || [],
          coverageAreas: s.coverageAreas || [],
          isPublished: s.isPublished,
          startingPriceLabelAr: s.startingPriceLabelAr || 'يبدأ من',
          startingPriceLabelEn: s.startingPriceLabelEn || 'Starting from',
          disclaimerAr: s.disclaimerAr || '',
          disclaimerEn: s.disclaimerEn || '',
          isLaborOnly: s.isLaborOnly || false,
          serviceMode: s.serviceMode || 'dynamic_form',
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          providerName: s.provider ? s.provider.nameAr : null,
          options: (s.options || []).map((opt) => ({
            id: opt.id,
            serviceId: opt.serviceId,
            nameAr: opt.nameAr,
            nameEn: opt.nameEn,
            optionType: opt.optionType,
            size: opt.size,
            price: parseFloat(opt.price),
            unitAr: opt.unitAr,
            unitEn: opt.unitEn,
            sortOrder: opt.sortOrder,
            isAvailable: opt.isAvailable,
            isActive: opt.isActive,
            descriptionAr: opt.descriptionAr,
            descriptionEn: opt.descriptionEn,
            imageUrl: opt.imageUrl,
            gallery: opt.gallery || [],
            brand: opt.brand,
            color: opt.color,
            specifications: opt.specifications || {},
            installationPrice: opt.installationPrice ? parseFloat(opt.installationPrice) : 0.0,
            packageWorkerCount: opt.packageWorkerCount,
            packageDurationHours: opt.packageDurationHours ? parseFloat(opt.packageDurationHours) : null,
            metadata: opt.metadata || {},
          })),
          fieldsCount: (s.fields || []).length,
        };
      },
      300
    );

    if (!formatted) {
      throw new AppError('الخدمة المطلوبة غير موجودة.', 404, 'SERVICE_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/services/:id/configuration
 * Customer endpoint providing the full active dynamic schema for form rendering
 */
export const getServiceConfiguration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const cacheKey = `services:config:${id}`;

    const config = await cacheService.getOrSet(
      cacheKey,
      async () => {
        const s = await db.query.services.findFirst({
          where: eq(services.id, id),
          with: {
            category: true,
            options: {
              where: eq(serviceOptions.isActive, true),
              orderBy: [asc(serviceOptions.sortOrder), asc(serviceOptions.price)],
            },
            fields: {
              where: eq(serviceFields.isActive, true),
              orderBy: [asc(serviceFields.sortOrder)],
            },
            rules: {
              where: eq(serviceRules.isActive, true),
              orderBy: [asc(serviceRules.priority)],
            },
            pricingRules: {
              where: eq(servicePricingRules.isActive, true),
              orderBy: [asc(servicePricingRules.sortOrder)],
            },
            requirements: {
              where: eq(serviceRequirements.isRequired, true),
            },
          },
        });

        if (!s) return null;

        return {
          service: {
            id: s.id,
            categoryId: s.categoryId,
            nameAr: s.nameAr,
            nameEn: s.nameEn,
            descriptionAr: s.descriptionAr,
            descriptionEn: s.descriptionEn,
            type: s.type,
            basePrice: parseFloat(s.basePrice),
            unitAr: s.unitAr,
            unitEn: s.unitEn,
            requiresQuotation: s.requiresQuotation,
            isAvailable: s.isAvailable,
            isActive: s.isActive,
            status: s.status,
            currentVersion: s.currentVersion,
            slaHours: s.slaHours,
            minOrderValue: s.minOrderValue ? parseFloat(s.minOrderValue) : null,
            maxOrderValue: s.maxOrderValue ? parseFloat(s.maxOrderValue) : null,
            gallery: s.gallery || [],
            coverageAreas: s.coverageAreas || [],
            startingPriceLabelAr: s.startingPriceLabelAr || 'يبدأ من',
            startingPriceLabelEn: s.startingPriceLabelEn || 'Starting from',
            disclaimerAr: s.disclaimerAr || '',
            disclaimerEn: s.disclaimerEn || '',
            isLaborOnly: s.isLaborOnly || false,
            serviceMode: s.serviceMode || 'dynamic_form',
          },
          options: (s.options || []).map((o) => ({
            id: o.id,
            nameAr: o.nameAr,
            nameEn: o.nameEn,
            size: o.size,
            price: parseFloat(o.price),
            unitAr: o.unitAr,
            unitEn: o.unitEn,
            sortOrder: o.sortOrder,
            isAvailable: o.isAvailable,
            descriptionAr: o.descriptionAr,
            descriptionEn: o.descriptionEn,
            imageUrl: o.imageUrl,
            gallery: o.gallery || [],
            brand: o.brand,
            color: o.color,
            specifications: o.specifications || {},
            installationPrice: o.installationPrice ? parseFloat(o.installationPrice) : 0.0,
            packageWorkerCount: o.packageWorkerCount,
            packageDurationHours: o.packageDurationHours ? parseFloat(o.packageDurationHours) : null,
            metadata: o.metadata || {},
          })),
          fields: (s.fields || []).map((f) => ({
            id: f.id,
            key: f.key,
            labelAr: f.labelAr,
            labelEn: f.labelEn,
            fieldType: f.fieldType,
            descriptionAr: f.descriptionAr,
            descriptionEn: f.descriptionEn,
            placeholderAr: f.placeholderAr,
            placeholderEn: f.placeholderEn,
            helpTextAr: f.helpTextAr,
            helpTextEn: f.helpTextEn,
            defaultValue: f.defaultValue,
            min: f.min ? parseFloat(f.min) : null,
            max: f.max ? parseFloat(f.max) : null,
            step: f.step ? parseFloat(f.step) : null,
            unitAr: f.unitAr,
            unitEn: f.unitEn,
            options: f.options || [],
            validationRules: f.validationRules || {},
            sortOrder: f.sortOrder,
            isRequired: f.isRequired,
          })),
          rules: (s.rules || []).map((r) => ({
            id: r.id,
            ruleName: r.ruleName,
            condition: r.condition,
            actions: r.actions,
            priority: r.priority,
          })),
          pricingRules: (s.pricingRules || []).map((pr) => ({
            id: pr.id,
            ruleType: pr.ruleType,
            titleAr: pr.titleAr,
            titleEn: pr.titleEn,
            targetField: pr.targetField,
            calculationFormula: pr.calculationFormula,
            condition: pr.condition,
            sortOrder: pr.sortOrder,
          })),
          requirements: (s.requirements || []).map((req) => ({
            id: req.id,
            requirementType: req.requirementType,
            capabilityKey: req.capabilityKey,
            capabilityNameAr: req.capabilityNameAr,
            capabilityNameEn: req.capabilityNameEn,
            isRequired: req.isRequired,
          })),
        };
      },
      300
    );

    if (!config) {
      throw new AppError('الخدمة المطلوبة غير موجودة.', 404, 'SERVICE_NOT_FOUND');
    }

    // Non-admin can only see published service configurations
    if (
      (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) &&
      (config.service.status !== 'published' || !config.service.isActive)
    ) {
      throw new AppError('هذه الخدمة غير متاحة حالياً.', 404, 'SERVICE_UNAVAILABLE');
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/services/:id/calculate-price
 * Authoritative Server Price Quote Endpoint
 */
export const calculateServicePrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { answers = {}, selectedOptionId, optionId, couponCode, quantity = 1 } = req.body;
    const effectiveOptionId = selectedOptionId || optionId || null;

    const s = await db.query.services.findFirst({
      where: eq(services.id, id),
      with: {
        options: { where: eq(serviceOptions.isActive, true) },
        fields: { where: eq(serviceFields.isActive, true), orderBy: [asc(serviceFields.sortOrder)] },
        rules: { where: eq(serviceRules.isActive, true), orderBy: [asc(serviceRules.priority)] },
        pricingRules: {
          where: eq(servicePricingRules.isActive, true),
          orderBy: [asc(servicePricingRules.sortOrder)],
        },
      },
    });

    if (!s) {
      throw new AppError('الخدمة المطلوبة غير موجودة.', 404, 'SERVICE_NOT_FOUND');
    }

    if (!s.isActive) {
      throw new AppError('الخدمة غير مفعلة حالياً.', 400, 'SERVICE_INACTIVE');
    }

    // Look up coupon if provided
    let appliedCoupon: any = null;
    if (couponCode && typeof couponCode === 'string' && couponCode.trim().length > 0) {
      const cleanCode = couponCode.trim().toUpperCase();
      const [cpn] = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.isActive, true), or(eq(coupons.code, cleanCode), eq(coupons.id, couponCode.trim()))))
        .limit(1);

      if (cpn) {
        if (cpn.expiryDate && new Date(cpn.expiryDate) < new Date()) {
          throw new AppError('عذراً، كود الخصم منتهي الصلاحية.', 400, 'COUPON_EXPIRED');
        }
        if (cpn.usageCount >= cpn.usageLimit) {
          throw new AppError('تم استنفاد الحد الأقصى لاستخدام كود الخصم.', 400, 'COUPON_LIMIT_REACHED');
        }
        appliedCoupon = cpn;
      } else {
        throw new AppError('كود الخصم غير صحيح أو غير متوفر.', 404, 'COUPON_NOT_FOUND');
      }
    }

    const breakdown = pricingEngine.calculate({
      service: s,
      fields: s.fields,
      rules: s.rules,
      pricingRules: s.pricingRules,
      options: s.options,
      answers,
      selectedOptionId: effectiveOptionId,
      coupon: appliedCoupon,
      quantity: Number(quantity) || 1,
    });

    res.status(200).json({
      success: true,
      data: {
        ...breakdown,
        total: breakdown.totalAmount,
        breakdown: breakdown.lineItems,
        serviceVersion: s.currentVersion,
      },
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// Admin Service Management & CRUD Handlers
// -------------------------------------------------------------

export const createService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      id,
      categoryId,
      providerId,
      nameAr,
      nameEn,
      descriptionAr,
      descriptionEn,
      type,
      basePrice,
      unitAr,
      unitEn,
      requiresQuotation,
      isAvailable,
      isActive,
      status,
      slaHours,
      minOrderValue,
      maxOrderValue,
      gallery,
      coverageAreas,
      options,
    } = req.body;

    if (!categoryId || !nameAr || !nameEn || basePrice === undefined || !unitAr || !unitEn) {
      throw new AppError('يرجى ملء جميع الحقول الإلزامية للخدمة.', 400, 'FIELDS_REQUIRED');
    }

    const serviceId = (id as string) || `srv_${Date.now()}`;
    const priceStr = parseFloat(basePrice.toString()).toFixed(2);

    const [newService] = await db
      .insert(services)
      .values({
        id: serviceId,
        categoryId,
        providerId: providerId || null,
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        descriptionAr: descriptionAr?.trim(),
        descriptionEn: descriptionEn?.trim(),
        type: type === 'delivery_product' ? 'delivery_product' : 'home_service',
        basePrice: priceStr,
        unitAr: unitAr.trim(),
        unitEn: unitEn.trim(),
        requiresQuotation: requiresQuotation === true,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        isActive: isActive !== undefined ? isActive : true,
        status: status || 'published',
        currentVersion: 1,
        slaHours: Number(slaHours) || 24,
        minOrderValue: minOrderValue !== undefined && minOrderValue !== null ? parseFloat(minOrderValue.toString()).toFixed(2) : null,
        maxOrderValue: maxOrderValue !== undefined && maxOrderValue !== null ? parseFloat(maxOrderValue.toString()).toFixed(2) : null,
        gallery: Array.isArray(gallery) ? gallery : [],
        coverageAreas: Array.isArray(coverageAreas) ? coverageAreas : [],
        isPublished: status === 'published' || status === undefined,
      })
      .returning();

    // Insert initial options if provided
    if (options && Array.isArray(options) && options.length > 0) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.nameAr && opt.price !== undefined) {
          const optId = opt.id || `opt_${Date.now()}_${i}`;
          await db
            .insert(serviceOptions)
            .values({
              id: optId,
              serviceId: newService.id,
              nameAr: opt.nameAr.trim(),
              nameEn: opt.nameEn ? opt.nameEn.trim() : opt.nameAr.trim(),
              optionType: opt.optionType || 'variant',
              size: opt.size || null,
              price: parseFloat(opt.price.toString()).toFixed(2),
              unitAr: opt.unitAr || newService.unitAr,
              unitEn: opt.unitEn || newService.unitEn,
              sortOrder: opt.sortOrder ?? i,
              isAvailable: opt.isAvailable !== undefined ? opt.isAvailable : true,
              isActive: opt.isActive !== undefined ? opt.isActive : true,
            })
            .onConflictDoNothing();
        }
      }
    }

    await cacheService.invalidate('services:');

    // Audit Log
    await auditService.log({
      req,
      action: 'SERVICE_CREATE',
      entityType: 'service',
      entityId: newService.id,
      metadata: {
        nameAr: newService.nameAr,
        nameEn: newService.nameEn,
        type: newService.type,
        basePrice: newService.basePrice,
      },
    });

    res.status(201).json({
      success: true,
      data: newService,
    });
  } catch (err) {
    next(err);
  }
};

export const updateService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      categoryId,
      providerId,
      nameAr,
      nameEn,
      descriptionAr,
      descriptionEn,
      type,
      basePrice,
      unitAr,
      unitEn,
      requiresQuotation,
      isAvailable,
      isActive,
      status,
      slaHours,
      minOrderValue,
      maxOrderValue,
      gallery,
      coverageAreas,
    } = req.body;

    const [existing] = await db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('الخدمة غير موجودة.', 404, 'SERVICE_NOT_FOUND');
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (categoryId) updatePayload.categoryId = categoryId;
    if (providerId !== undefined) updatePayload.providerId = providerId || null;
    if (nameAr) updatePayload.nameAr = nameAr.trim();
    if (nameEn) updatePayload.nameEn = nameEn.trim();
    if (descriptionAr !== undefined) updatePayload.descriptionAr = descriptionAr?.trim();
    if (descriptionEn !== undefined) updatePayload.descriptionEn = descriptionEn?.trim();
    if (type) updatePayload.type = type;
    if (basePrice !== undefined) updatePayload.basePrice = parseFloat(basePrice.toString()).toFixed(2);
    if (unitAr) updatePayload.unitAr = unitAr.trim();
    if (unitEn) updatePayload.unitEn = unitEn.trim();
    if (requiresQuotation !== undefined) updatePayload.requiresQuotation = requiresQuotation;
    if (isAvailable !== undefined) updatePayload.isAvailable = isAvailable;
    if (isActive !== undefined) updatePayload.isActive = isActive;
    if (status !== undefined) {
      updatePayload.status = status;
      updatePayload.isPublished = status === 'published';
    }
    if (slaHours !== undefined) updatePayload.slaHours = Number(slaHours) || 24;
    if (minOrderValue !== undefined) updatePayload.minOrderValue = minOrderValue ? parseFloat(minOrderValue.toString()).toFixed(2) : null;
    if (maxOrderValue !== undefined) updatePayload.maxOrderValue = maxOrderValue ? parseFloat(maxOrderValue.toString()).toFixed(2) : null;
    if (gallery !== undefined) updatePayload.gallery = Array.isArray(gallery) ? gallery : [];
    if (coverageAreas !== undefined) updatePayload.coverageAreas = Array.isArray(coverageAreas) ? coverageAreas : [];
    if (req.body.startingPriceLabelAr !== undefined) updatePayload.startingPriceLabelAr = req.body.startingPriceLabelAr;
    if (req.body.startingPriceLabelEn !== undefined) updatePayload.startingPriceLabelEn = req.body.startingPriceLabelEn;
    if (req.body.disclaimerAr !== undefined) updatePayload.disclaimerAr = req.body.disclaimerAr;
    if (req.body.disclaimerEn !== undefined) updatePayload.disclaimerEn = req.body.disclaimerEn;
    if (req.body.isLaborOnly !== undefined) updatePayload.isLaborOnly = req.body.isLaborOnly;
    if (req.body.serviceMode !== undefined) updatePayload.serviceMode = req.body.serviceMode;
    if (req.body.laborStartingPrice !== undefined) updatePayload.basePrice = parseFloat(req.body.laborStartingPrice.toString()).toFixed(2);

    const [updated] = await db
      .update(services)
      .set(updatePayload)
      .where(eq(services.id, id))
      .returning();

    await cacheService.invalidate('services:');

    // Audit Log
    await auditService.log({
      req,
      action: 'SERVICE_UPDATE',
      entityType: 'service',
      entityId: updated.id,
      previousState: existing,
      newState: updated,
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [existing] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (!existing) {
      throw new AppError('الخدمة غير موجودة.', 404, 'SERVICE_NOT_FOUND');
    }

    const [deleted] = await db
      .delete(services)
      .where(eq(services.id, id))
      .returning();

    await cacheService.invalidate('services:');

    // Audit Log
    await auditService.log({
      req,
      action: 'SERVICE_DELETE',
      entityType: 'service',
      entityId: id,
      previousState: existing,
    });

    res.status(200).json({
      success: true,
      data: { message: 'تم حذف الخدمة بنجاح.', id },
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// Admin Visual Service Builder & Versioning Handlers
// -------------------------------------------------------------

/**
 * GET /api/v1/admin/services/:id/builder
 * Returns full builder model (current published state + active draft)
 */
export const getServiceBuilderData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const s = await db.query.services.findFirst({
      where: eq(services.id, id),
      with: {
        category: true,
        options: { orderBy: [asc(serviceOptions.sortOrder)] },
        fields: { orderBy: [asc(serviceFields.sortOrder)] },
        rules: { orderBy: [asc(serviceRules.priority)] },
        pricingRules: { orderBy: [asc(servicePricingRules.sortOrder)] },
        requirements: true,
        versions: { orderBy: [desc(serviceVersions.version)] },
      },
    });

    if (!s) {
      throw new AppError('الخدمة المطلوبة غير موجودة.', 404, 'SERVICE_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: {
        service: s,
        draftSchema: s.draftSchema || null,
        fields: s.fields || [],
        options: s.options || [],
        rules: s.rules || [],
        pricingRules: s.pricingRules || [],
        requirements: s.requirements || [],
        versions: s.versions || [],
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/admin/services/:id/builder
 * Saves uncommitted draft schema in services.draftSchema
 */
export const saveServiceDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const draftPayload = req.body.draftSchema !== undefined ? req.body.draftSchema : req.body;

    const [existing] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (!existing) {
      throw new AppError('الخدمة غير موجودة.', 404, 'SERVICE_NOT_FOUND');
    }

    const [updated] = await db
      .update(services)
      .set({
        draftSchema: draftPayload || {},
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    await cacheService.invalidate('services:');

    // Audit Log
    await auditService.log({
      req,
      action: 'SERVICE_DRAFT_SAVE',
      entityType: 'service',
      entityId: id,
      metadata: { currentVersion: existing.currentVersion },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم حفظ مسودة التعديلات بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/services/:id/publish
 * Publishes draft schema:
 * - Increments current_version
 * - Sets status = 'published', is_published = true
 * - Atomically synchronizes fields, rules, pricing rules, requirements, options
 * - Creates immutable snapshot in service_versions
 */
export const publishServiceConfiguration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { changelog } = req.body;
    const currentUser = req.user!;

    const publishResult = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(services).where(eq(services.id, id)).limit(1);
      if (!existing) {
        throw new AppError('الخدمة غير موجودة.', 404, 'SERVICE_NOT_FOUND');
      }

      const draft = (existing.draftSchema as any) || {};
      const fieldsToApply = Array.isArray(req.body.fields) && req.body.fields.length > 0
        ? req.body.fields
        : (Array.isArray(draft.fields) && draft.fields.length > 0 ? draft.fields : null);

      const rulesToApply = Array.isArray(req.body.rules) && req.body.rules.length > 0
        ? req.body.rules
        : (Array.isArray(draft.rules) && draft.rules.length > 0 ? draft.rules : null);

      const pricingRulesToApply = Array.isArray(req.body.pricingRules) && req.body.pricingRules.length > 0
        ? req.body.pricingRules
        : (Array.isArray(draft.pricingRules) && draft.pricingRules.length > 0 ? draft.pricingRules : null);

      const requirementsToApply = Array.isArray(req.body.requirements) && req.body.requirements.length > 0
        ? req.body.requirements
        : (Array.isArray(draft.requirements) && draft.requirements.length > 0 ? draft.requirements : null);

      const optionsToApply = Array.isArray(req.body.options) && req.body.options.length > 0
        ? req.body.options
        : (Array.isArray(draft.options) && draft.options.length > 0 ? draft.options : null);

      const nextVersion = existing.currentVersion + 1;

      // 1. Update services table
      const basicInfo = req.body.service || draft.service || {};
      const updateData: any = {
        status: 'published',
        isPublished: true,
        currentVersion: nextVersion,
        draftSchema: null,
        updatedAt: new Date(),
      };
      if (basicInfo.nameAr) updateData.nameAr = basicInfo.nameAr.trim();
      if (basicInfo.nameEn) updateData.nameEn = basicInfo.nameEn.trim();
      if (basicInfo.descriptionAr !== undefined) updateData.descriptionAr = basicInfo.descriptionAr;
      if (basicInfo.descriptionEn !== undefined) updateData.descriptionEn = basicInfo.descriptionEn;
      if (basicInfo.basePrice !== undefined) updateData.basePrice = parseFloat(basicInfo.basePrice.toString()).toFixed(2);
      if (basicInfo.disclaimerAr !== undefined) updateData.disclaimerAr = basicInfo.disclaimerAr;
      if (basicInfo.disclaimerEn !== undefined) updateData.disclaimerEn = basicInfo.disclaimerEn;
      if (basicInfo.startingPriceLabelAr !== undefined) updateData.startingPriceLabelAr = basicInfo.startingPriceLabelAr;
      if (basicInfo.startingPriceLabelEn !== undefined) updateData.startingPriceLabelEn = basicInfo.startingPriceLabelEn;
      if (basicInfo.isLaborOnly !== undefined) updateData.isLaborOnly = basicInfo.isLaborOnly;
      if (basicInfo.serviceMode !== undefined) updateData.serviceMode = basicInfo.serviceMode;
      if (basicInfo.requiresQuotation !== undefined) updateData.requiresQuotation = basicInfo.requiresQuotation;
      if (basicInfo.gallery && Array.isArray(basicInfo.gallery)) updateData.gallery = basicInfo.gallery;

      const [publishedService] = await tx
        .update(services)
        .set(updateData)
        .where(eq(services.id, id))
        .returning();

      // 2. Replace / Synchronize dynamic fields if provided
      if (fieldsToApply !== null) {
        await tx.delete(serviceFields).where(eq(serviceFields.serviceId, id));
        for (let i = 0; i < fieldsToApply.length; i++) {
          const f = fieldsToApply[i];
          const fldId = f.id || `fld_${Date.now()}_${i}`;
          await tx.insert(serviceFields).values({
            id: fldId,
            serviceId: id,
            key: (f.key || `field_${i}`).trim(),
            labelAr: f.labelAr?.trim() || `حقل ${i + 1}`,
            labelEn: f.labelEn?.trim() || `Field ${i + 1}`,
            fieldType: f.fieldType || 'text',
            descriptionAr: f.descriptionAr?.trim() || null,
            descriptionEn: f.descriptionEn?.trim() || null,
            placeholderAr: f.placeholderAr?.trim() || null,
            placeholderEn: f.placeholderEn?.trim() || null,
            helpTextAr: f.helpTextAr?.trim() || null,
            helpTextEn: f.helpTextEn?.trim() || null,
            defaultValue: f.defaultValue ?? null,
            min: f.min !== undefined && f.min !== null ? parseFloat(f.min.toString()).toFixed(2) : null,
            max: f.max !== undefined && f.max !== null ? parseFloat(f.max.toString()).toFixed(2) : null,
            step: f.step !== undefined && f.step !== null ? parseFloat(f.step.toString()).toFixed(2) : null,
            unitAr: f.unitAr?.trim() || null,
            unitEn: f.unitEn?.trim() || null,
            options: Array.isArray(f.options) ? f.options : [],
            validationRules: f.validationRules || {},
            sortOrder: f.sortOrder ?? i,
            isRequired: f.isRequired === true,
            isActive: f.isActive !== undefined ? f.isActive : true,
            isSearchable: f.isSearchable === true,
            isFilterable: f.isFilterable === true,
            metadata: f.metadata || {},
          });
        }
      }

      // 3. Replace / Synchronize dynamic rules if provided
      if (rulesToApply !== null) {
        await tx.delete(serviceRules).where(eq(serviceRules.serviceId, id));
        for (let i = 0; i < rulesToApply.length; i++) {
          const r = rulesToApply[i];
          const rulId = r.id || `rul_${Date.now()}_${i}`;
          await tx.insert(serviceRules).values({
            id: rulId,
            serviceId: id,
            ruleName: r.ruleName?.trim() || `قاعدة ${i + 1}`,
            description: r.description?.trim() || null,
            condition: r.condition || { operator: 'AND', expressions: [] },
            actions: Array.isArray(r.actions) ? r.actions : [],
            priority: r.priority ?? i,
            isActive: r.isActive !== undefined ? r.isActive : true,
          });
        }
      }

      // 4. Replace / Synchronize dynamic pricing rules if provided
      if (pricingRulesToApply !== null) {
        await tx.delete(servicePricingRules).where(eq(servicePricingRules.serviceId, id));
        for (let i = 0; i < pricingRulesToApply.length; i++) {
          const pr = pricingRulesToApply[i];
          const prcId = pr.id || `prc_${Date.now()}_${i}`;
          await tx.insert(servicePricingRules).values({
            id: prcId,
            serviceId: id,
            ruleType: pr.ruleType || 'field_addon',
            titleAr: pr.titleAr?.trim() || `تسعير ${i + 1}`,
            titleEn: pr.titleEn?.trim() || `Pricing ${i + 1}`,
            targetField: pr.targetField?.trim() || null,
            calculationFormula: pr.calculationFormula || {},
            condition: pr.condition || null,
            sortOrder: pr.sortOrder ?? i,
            isActive: pr.isActive !== undefined ? pr.isActive : true,
          });
        }
      }

      // 5. Replace / Synchronize dynamic requirements if provided
      if (requirementsToApply !== null) {
        await tx.delete(serviceRequirements).where(eq(serviceRequirements.serviceId, id));
        for (let i = 0; i < requirementsToApply.length; i++) {
          const rq = requirementsToApply[i];
          const rqId = rq.id || `req_${Date.now()}_${i}`;
          await tx.insert(serviceRequirements).values({
            id: rqId,
            serviceId: id,
            requirementType: rq.requirementType || 'provider_capability',
            capabilityKey: rq.capabilityKey?.trim() || `cap_${i}`,
            capabilityNameAr: rq.capabilityNameAr?.trim() || `متطلب ${i + 1}`,
            capabilityNameEn: rq.capabilityNameEn?.trim() || `Requirement ${i + 1}`,
            isRequired: rq.isRequired !== undefined ? rq.isRequired : true,
            condition: rq.condition || null,
          });
        }
      }

      // 6. Replace / Synchronize options if provided
      if (optionsToApply !== null) {
        await tx.delete(serviceOptions).where(eq(serviceOptions.serviceId, id));
        for (let i = 0; i < optionsToApply.length; i++) {
          const opt = optionsToApply[i];
          const optId = opt.id || `opt_${Date.now()}_${i}`;
          await tx.insert(serviceOptions).values({
            id: optId,
            serviceId: id,
            nameAr: opt.nameAr.trim(),
            nameEn: opt.nameEn ? opt.nameEn.trim() : opt.nameAr.trim(),
            optionType: opt.optionType || 'variant',
            size: opt.size || null,
            price: parseFloat(opt.price.toString()).toFixed(2),
            unitAr: opt.unitAr || publishedService.unitAr,
            unitEn: opt.unitEn || publishedService.unitEn,
            sortOrder: opt.sortOrder ?? i,
            isAvailable: opt.isAvailable !== undefined ? opt.isAvailable : true,
            isActive: opt.isActive !== undefined ? opt.isActive : true,
            descriptionAr: opt.descriptionAr || null,
            descriptionEn: opt.descriptionEn || null,
            imageUrl: opt.imageUrl || null,
            gallery: Array.isArray(opt.gallery) ? opt.gallery : [],
            brand: opt.brand || null,
            color: opt.color || null,
            specifications: opt.specifications || {},
            installationPrice: opt.installationPrice !== undefined ? parseFloat(opt.installationPrice.toString()).toFixed(2) : '0.00',
            packageWorkerCount: opt.packageWorkerCount ? Number(opt.packageWorkerCount) : null,
            packageDurationHours: opt.packageDurationHours ? parseFloat(opt.packageDurationHours.toString()).toFixed(2) : null,
            metadata: opt.metadata || {},
          });
        }
      }

      // Query current state for snapshot
      const currentFields = await tx.select().from(serviceFields).where(eq(serviceFields.serviceId, id));
      const currentRules = await tx.select().from(serviceRules).where(eq(serviceRules.serviceId, id));
      const currentPricingRules = await tx.select().from(servicePricingRules).where(eq(servicePricingRules.serviceId, id));
      const currentRequirements = await tx.select().from(serviceRequirements).where(eq(serviceRequirements.serviceId, id));
      const currentOptions = await tx.select().from(serviceOptions).where(eq(serviceOptions.serviceId, id));

      // 7. Create immutable Schema Snapshot in service_versions
      const schemaSnapshot = {
        service: publishedService,
        fields: currentFields,
        rules: currentRules,
        pricingRules: currentPricingRules,
        requirements: currentRequirements,
        options: currentOptions,
      };

      const [newVersion] = await tx
        .insert(serviceVersions)
        .values({
          id: `ver_${Date.now()}_${nextVersion}`,
          serviceId: id,
          version: nextVersion,
          schemaSnapshot,
          publishedByUserId: currentUser.id,
          publishedByName: currentUser.name || 'مدير النظام',
          changelog: changelog?.trim() || `إصدار جديد رقم ${nextVersion}`,
        })
        .returning();

      return {
        service: publishedService,
        version: newVersion,
      };
    });

    await cacheService.invalidate('services:');

    // Audit Log
    await auditService.log({
      req,
      action: 'SERVICE_PUBLISH',
      entityType: 'service',
      entityId: id,
      metadata: {
        version: publishResult.version.version,
        changelog: publishResult.version.changelog,
      },
    });

    res.status(200).json({
      success: true,
      data: publishResult,
      message: `تم نشر الإصدار رقم ${publishResult.version.version} من الخدمة بنجاح.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/services/:id/unpublish
 * Unpublishes service (sets status = 'in_review', isPublished = false)
 */
export const unpublishService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [existing] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (!existing) {
      throw new AppError('الخدمة غير موجودة.', 404, 'SERVICE_NOT_FOUND');
    }

    const [updated] = await db
      .update(services)
      .set({
        status: 'in_review',
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    await cacheService.invalidate('services:');

    // Audit Log
    await auditService.log({
      req,
      action: 'SERVICE_UNPUBLISH',
      entityType: 'service',
      entityId: id,
      metadata: { previousStatus: existing.status },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تم إلغاء نشر الخدمة وإعادتها لحالة قيد المراجعة.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/services/:id/archive
 * Soft-archives a service
 */
export const archiveService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [existing] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (!existing) {
      throw new AppError('الخدمة غير موجودة.', 404, 'SERVICE_NOT_FOUND');
    }

    const [updated] = await db
      .update(services)
      .set({
        status: 'archived',
        isActive: false,
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    await cacheService.invalidate('services:');

    // Audit Log
    await auditService.log({
      req,
      action: 'SERVICE_ARCHIVE',
      entityType: 'service',
      entityId: id,
      metadata: { previousStatus: existing.status },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'تمت أرشفة الخدمة بنجاح.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/services/:id/duplicate
 * Clones a service and all its child fields/rules/pricing into a new draft service
 */
export const duplicateService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const s = await db.query.services.findFirst({
      where: eq(services.id, id),
      with: {
        options: true,
        fields: true,
        rules: true,
        pricingRules: true,
        requirements: true,
      },
    });

    if (!s) {
      throw new AppError('الخدمة الأصلية المراد نسخها غير موجودة.', 404, 'SERVICE_NOT_FOUND');
    }

    const newServiceId = `srv_${Date.now()}_copy`;

    const duplicated = await db.transaction(async (tx) => {
      // 1. Insert new service
      const [newSrv] = await tx
        .insert(services)
        .values({
          id: newServiceId,
          categoryId: s.categoryId,
          providerId: s.providerId,
          nameAr: `${s.nameAr} (نسخة)`,
          nameEn: `${s.nameEn} (Copy)`,
          descriptionAr: s.descriptionAr,
          descriptionEn: s.descriptionEn,
          type: s.type,
          basePrice: s.basePrice,
          unitAr: s.unitAr,
          unitEn: s.unitEn,
          requiresQuotation: s.requiresQuotation,
          isAvailable: false,
          isActive: true,
          status: 'draft',
          currentVersion: 1,
          slaHours: s.slaHours,
          minOrderValue: s.minOrderValue,
          maxOrderValue: s.maxOrderValue,
          gallery: s.gallery || [],
          coverageAreas: s.coverageAreas || [],
          isPublished: false,
        })
        .returning();

      // 2. Clone options
      for (let i = 0; i < (s.options || []).length; i++) {
        const opt = (s.options || [])[i];
        await tx.insert(serviceOptions).values({
          id: `opt_${Date.now()}_${i}`,
          serviceId: newServiceId,
          nameAr: opt.nameAr,
          nameEn: opt.nameEn,
          optionType: opt.optionType,
          size: opt.size,
          price: opt.price,
          unitAr: opt.unitAr,
          unitEn: opt.unitEn,
          sortOrder: opt.sortOrder,
          isAvailable: opt.isAvailable,
          isActive: opt.isActive,
        });
      }

      // 3. Clone fields
      for (let i = 0; i < (s.fields || []).length; i++) {
        const f = (s.fields || [])[i];
        await tx.insert(serviceFields).values({
          id: `fld_${Date.now()}_${i}`,
          serviceId: newServiceId,
          key: f.key,
          labelAr: f.labelAr,
          labelEn: f.labelEn,
          fieldType: f.fieldType,
          descriptionAr: f.descriptionAr,
          descriptionEn: f.descriptionEn,
          placeholderAr: f.placeholderAr,
          placeholderEn: f.placeholderEn,
          helpTextAr: f.helpTextAr,
          helpTextEn: f.helpTextEn,
          defaultValue: f.defaultValue,
          min: f.min,
          max: f.max,
          step: f.step,
          unitAr: f.unitAr,
          unitEn: f.unitEn,
          options: f.options,
          validationRules: f.validationRules,
          sortOrder: f.sortOrder,
          isRequired: f.isRequired,
          isActive: f.isActive,
          isSearchable: f.isSearchable,
          isFilterable: f.isFilterable,
          metadata: f.metadata,
        });
      }

      // 4. Clone rules
      for (let i = 0; i < (s.rules || []).length; i++) {
        const r = (s.rules || [])[i];
        await tx.insert(serviceRules).values({
          id: `rul_${Date.now()}_${i}`,
          serviceId: newServiceId,
          ruleName: r.ruleName,
          description: r.description,
          condition: r.condition,
          actions: r.actions,
          priority: r.priority,
          isActive: r.isActive,
        });
      }

      // 5. Clone pricing rules
      for (let i = 0; i < (s.pricingRules || []).length; i++) {
        const pr = (s.pricingRules || [])[i];
        await tx.insert(servicePricingRules).values({
          id: `prc_${Date.now()}_${i}`,
          serviceId: newServiceId,
          ruleType: pr.ruleType,
          titleAr: pr.titleAr,
          titleEn: pr.titleEn,
          targetField: pr.targetField,
          calculationFormula: pr.calculationFormula,
          condition: pr.condition,
          sortOrder: pr.sortOrder,
          isActive: pr.isActive,
        });
      }

      // 6. Clone requirements
      for (let i = 0; i < (s.requirements || []).length; i++) {
        const rq = (s.requirements || [])[i];
        await tx.insert(serviceRequirements).values({
          id: `req_${Date.now()}_${i}`,
          serviceId: newServiceId,
          requirementType: rq.requirementType,
          capabilityKey: rq.capabilityKey,
          capabilityNameAr: rq.capabilityNameAr,
          capabilityNameEn: rq.capabilityNameEn,
          isRequired: rq.isRequired,
          condition: rq.condition,
        });
      }

      return newSrv;
    });

    await cacheService.invalidate('services:');

    // Audit Log
    await auditService.log({
      req,
      action: 'SERVICE_DUPLICATE',
      entityType: 'service',
      entityId: duplicated.id,
      metadata: { originalServiceId: id },
    });

    res.status(201).json({
      success: true,
      data: duplicated,
      message: 'تم نسخ الخدمة بجميع حقولها وقواعدها بنجاح كمسودة جديدة.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/services/:id/versions
 * Lists published version history
 */
export const getServiceVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const list = await db
      .select({
        id: serviceVersions.id,
        serviceId: serviceVersions.serviceId,
        version: serviceVersions.version,
        publishedByName: serviceVersions.publishedByName,
        changelog: serviceVersions.changelog,
        createdAt: serviceVersions.createdAt,
      })
      .from(serviceVersions)
      .where(eq(serviceVersions.serviceId, id))
      .orderBy(desc(serviceVersions.version));

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/services/:id/versions/:version
 * Fetches exact historical snapshot
 */
export const getServiceVersionSnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const versionNum = parseInt(req.params.version as string, 10);

    if (isNaN(versionNum)) {
      throw new AppError('رقم الإصدار غير صحيح.', 400, 'INVALID_VERSION');
    }

    const [snapshot] = await db
      .select()
      .from(serviceVersions)
      .where(and(eq(serviceVersions.serviceId, id), eq(serviceVersions.version, versionNum)))
      .limit(1);

    if (!snapshot) {
      throw new AppError('الإصدار المطلوب غير موجود في سجل الإصدارات.', 404, 'VERSION_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: snapshot,
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// Service Options / Variants Admin Handlers (Legacy + Variants)
// -------------------------------------------------------------

export const createServiceOption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const serviceId = req.params.serviceId as string;
    const { id, nameAr, nameEn, optionType, size, price, unitAr, unitEn, sortOrder, isAvailable, isActive } = req.body;

    if (!nameAr || price === undefined) {
      throw new AppError('اسم الخيار والسعر مطلوبان.', 400, 'FIELDS_REQUIRED');
    }

    const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!service) {
      throw new AppError('الخدمة الأصلية غير موجودة.', 404, 'SERVICE_NOT_FOUND');
    }

    const optionId = id || `opt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const priceStr = parseFloat(price.toString()).toFixed(2);

    const [newOption] = await db
      .insert(serviceOptions)
      .values({
        id: optionId,
        serviceId,
        nameAr: nameAr.trim(),
        nameEn: nameEn ? nameEn.trim() : nameAr.trim(),
        optionType: optionType || 'variant',
        size: size ? size.trim() : null,
        price: priceStr,
        unitAr: unitAr ? unitAr.trim() : service.unitAr,
        unitEn: unitEn ? unitEn.trim() : service.unitEn,
        sortOrder: sortOrder !== undefined ? sortOrder : 0,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    await cacheService.invalidate('services:');

    // Audit Log
    await auditService.log({
      req,
      action: 'SERVICE_OPTION_CREATE',
      entityType: 'service_option',
      entityId: newOption.id,
      metadata: {
        serviceId,
        nameAr: newOption.nameAr,
        price: newOption.price,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...newOption,
        price: parseFloat(newOption.price),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateServiceOption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const optionId = req.params.optionId as string;
    const { nameAr, nameEn, optionType, size, price, unitAr, unitEn, sortOrder, isAvailable, isActive } = req.body;

    const [existing] = await db.select().from(serviceOptions).where(eq(serviceOptions.id, optionId)).limit(1);
    if (!existing) {
      throw new AppError('الخيار غير موجود.', 404, 'OPTION_NOT_FOUND');
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (nameAr) updatePayload.nameAr = nameAr.trim();
    if (nameEn) updatePayload.nameEn = nameEn.trim();
    if (optionType) updatePayload.optionType = optionType.trim();
    if (size !== undefined) updatePayload.size = size ? size.trim() : null;
    if (price !== undefined) updatePayload.price = parseFloat(price.toString()).toFixed(2);
    if (unitAr) updatePayload.unitAr = unitAr.trim();
    if (unitEn) updatePayload.unitEn = unitEn.trim();
    if (sortOrder !== undefined) updatePayload.sortOrder = sortOrder;
    if (isAvailable !== undefined) updatePayload.isAvailable = isAvailable;
    if (isActive !== undefined) updatePayload.isActive = isActive;
    if (req.body.installationPrice !== undefined) updatePayload.installationPrice = parseFloat(req.body.installationPrice.toString()).toFixed(2);
    if (req.body.descriptionAr !== undefined) updatePayload.descriptionAr = req.body.descriptionAr;
    if (req.body.descriptionEn !== undefined) updatePayload.descriptionEn = req.body.descriptionEn;
    if (req.body.imageUrl !== undefined) updatePayload.imageUrl = req.body.imageUrl;
    if (req.body.brand !== undefined) updatePayload.brand = req.body.brand;
    if (req.body.color !== undefined) updatePayload.color = req.body.color;
    if (req.body.specifications !== undefined) updatePayload.specifications = req.body.specifications;
    if (req.body.packageWorkerCount !== undefined) updatePayload.packageWorkerCount = req.body.packageWorkerCount;
    if (req.body.packageDurationHours !== undefined) updatePayload.packageDurationHours = req.body.packageDurationHours ? parseFloat(req.body.packageDurationHours.toString()).toFixed(2) : null;
    if (req.body.metadata !== undefined) updatePayload.metadata = req.body.metadata;

    const [updated] = await db
      .update(serviceOptions)
      .set(updatePayload)
      .where(eq(serviceOptions.id, optionId))
      .returning();

    await cacheService.invalidate('services:');

    // Audit Log
    await auditService.log({
      req,
      action: 'SERVICE_OPTION_UPDATE',
      entityType: 'service_option',
      entityId: optionId,
      previousState: existing,
      newState: updated,
    });

    res.status(200).json({
      success: true,
      data: {
        ...updated,
        price: parseFloat(updated.price),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteServiceOption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const optionId = req.params.optionId as string;

    const [deleted] = await db
      .delete(serviceOptions)
      .where(eq(serviceOptions.id, optionId))
      .returning();

    if (!deleted) {
      throw new AppError('الخيار غير موجود.', 404, 'OPTION_NOT_FOUND');
    }

    await cacheService.invalidate('services:');

    // Audit Log
    await auditService.log({
      req,
      action: 'SERVICE_OPTION_DELETE',
      entityType: 'service_option',
      entityId: optionId,
      previousState: deleted,
    });

    res.status(200).json({
      success: true,
      data: { message: 'تم حذف الخيار بنجاح.', id: optionId },
    });
  } catch (err) {
    next(err);
  }
};
