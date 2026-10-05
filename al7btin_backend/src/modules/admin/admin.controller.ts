import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { users, refreshTokens, userRoleEnum } from '../../db/schema/users.schema.js';
import { deliveryEmployees, deliveryCategoryCapabilities, deliveryServiceCapabilities } from '../../db/schema/delivery.schema.js';
import { providers, providerServices } from '../../db/schema/providers.schema.js';
import { services } from '../../db/schema/services.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { eq, inArray, ilike, or, and, count, desc, sql, SQL } from 'drizzle-orm';
import { normalizeJordanianPhone } from '../auth/utils/phone.js';
import { AppError } from '../../middleware/errorHandler.js';
import { cacheService } from '../../services/cache.service.js';

export const getDeliveryEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const list = await db.query.deliveryEmployees.findMany({
      with: {
        provider: true,
        categoryCapabilities: true,
        serviceCapabilities: true,
      },
    });

    const formatted = list.map((d) => ({
      id: d.id,
      userId: d.userId,
      name: d.name,
      phoneNumber: d.phoneNumber,
      vehicleType: d.vehicleType,
      vehiclePlateNumber: d.vehiclePlateNumber,
      latitude: d.latitude,
      longitude: d.longitude,
      isOnline: d.isOnline,
      isActive: d.isActive,
      activeOrdersCount: d.activeOrdersCount,
      completedOrdersCount: d.completedOrdersCount,
      rating: parseFloat(d.rating),
      providerId: d.providerId,
      providerName: d.provider ? d.provider.nameAr : 'غير محدد',
      categoryCapabilities: d.categoryCapabilities.map((c) => c.categoryId),
      serviceCapabilities: d.serviceCapabilities.filter((s) => s.isAuthorized).map((s) => s.serviceId),
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const createDeliveryEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber, name, vehicleType, vehiclePlateNumber, providerId, categoryIds, serviceIds } = req.body;

    if (!phoneNumber || !name) {
      throw new AppError('رقم الهاتف والاسم مطلوبان لإنشاء حساب مندوب.', 400, 'FIELDS_REQUIRED');
    }

    if (!providerId) {
      throw new AppError('يجب تحديد المزود / المحل التابع له المندوب.', 400, 'PROVIDER_REQUIRED');
    }

    // 1. Verify Provider Exists
    const [prov] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, providerId))
      .limit(1);

    if (!prov) {
      throw new AppError('المزود المحدد غير موجود في النظام.', 404, 'PROVIDER_NOT_FOUND');
    }

    // 2. Fetch Provider's Allowed Services from PostgreSQL
    const provServices = await db
      .select()
      .from(providerServices)
      .where(eq(providerServices.providerId, providerId));

    const provServiceIdSet = new Set(provServices.map((s) => s.serviceId));

    // 3. Determine and Validate Service Capabilities
    const requestedServices: string[] = serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0
      ? serviceIds
      : Array.from(provServiceIdSet);

    for (const srvId of requestedServices) {
      if (!provServiceIdSet.has(srvId)) {
        throw new AppError(
          `لا يمكن تعيين الخدمة (${srvId}) للمندوب لأن المزود التابع له (${prov.nameAr}) لا يقدم هذه الخدمة.`,
          400,
          'INVALID_DRIVER_SERVICE_CAPABILITY'
        );
      }
    }

    const normalizedPhone = normalizeJordanianPhone(phoneNumber);

    // 4. Check or Create User with 'delivery' role
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
          name: name.trim(),
          role: 'delivery',
        })
        .returning();
      user = newUser;
    } else {
      const [updatedUser] = await db
        .update(users)
        .set({ role: 'delivery', name: name.trim(), updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      user = updatedUser;
    }

    // 5. Create or Update Delivery Employee record
    let [driver] = await db
      .select()
      .from(deliveryEmployees)
      .where(eq(deliveryEmployees.userId, user.id))
      .limit(1);

    const driverId = driver ? driver.id : `DRV-${Math.floor(100 + Math.random() * 900)}`;

    if (!driver) {
      const [newDriver] = await db
        .insert(deliveryEmployees)
        .values({
          id: driverId,
          userId: user.id,
          providerId: prov.id,
          name: name.trim(),
          phoneNumber: normalizedPhone,
          vehicleType: vehicleType || 'مركبة توزيع',
          vehiclePlateNumber: vehiclePlateNumber || 'عمومي',
          isOnline: true,
          isActive: true,
        })
        .returning();
      driver = newDriver;
    } else {
      const [updatedDriver] = await db
        .update(deliveryEmployees)
        .set({
          providerId: prov.id,
          name: name.trim(),
          phoneNumber: normalizedPhone,
          vehicleType: vehicleType || driver.vehicleType,
          vehiclePlateNumber: vehiclePlateNumber || driver.vehiclePlateNumber,
          updatedAt: new Date(),
        })
        .where(eq(deliveryEmployees.id, driver.id))
        .returning();
      driver = updatedDriver;
    }

    // 6. Assign Service Capabilities
    await db
      .delete(deliveryServiceCapabilities)
      .where(eq(deliveryServiceCapabilities.deliveryEmployeeId, driver.id));

    for (const srvId of requestedServices) {
      await db
        .insert(deliveryServiceCapabilities)
        .values({
          deliveryEmployeeId: driver.id,
          serviceId: srvId,
          isAuthorized: true,
        })
        .onConflictDoNothing();
    }

    // 7. Assign Category Capabilities
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      await db
        .delete(deliveryCategoryCapabilities)
        .where(eq(deliveryCategoryCapabilities.deliveryEmployeeId, driver.id));

      for (const catId of categoryIds) {
        await db
          .insert(deliveryCategoryCapabilities)
          .values({
            deliveryEmployeeId: driver.id,
            categoryId: catId,
          })
          .onConflictDoNothing();
      }
    }

    res.status(201).json({
      success: true,
      data: {
        driver: {
          ...driver,
          providerId: prov.id,
          providerName: prov.nameAr,
          serviceCapabilities: requestedServices,
        },
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDeliveryCapabilities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [driver] = await db
      .select()
      .from(deliveryEmployees)
      .where(eq(deliveryEmployees.id, id))
      .limit(1);

    if (!driver) {
      throw new AppError('مندوب التوصيل غير موجود.', 404, 'DRIVER_NOT_FOUND');
    }

    const categories = await db
      .select()
      .from(deliveryCategoryCapabilities)
      .where(eq(deliveryCategoryCapabilities.deliveryEmployeeId, id));

    const servicesList = await db
      .select()
      .from(deliveryServiceCapabilities)
      .where(eq(deliveryServiceCapabilities.deliveryEmployeeId, id));

    res.status(200).json({
      success: true,
      data: {
        driverId: id,
        providerId: driver.providerId,
        categoryCapabilities: categories.map((c) => c.categoryId),
        serviceCapabilities: servicesList.filter((s) => s.isAuthorized).map((s) => s.serviceId),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateDeliveryCapabilities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { categoryIds, serviceIds } = req.body;

    const [driver] = await db
      .select()
      .from(deliveryEmployees)
      .where(eq(deliveryEmployees.id, id))
      .limit(1);

    if (!driver) {
      throw new AppError('مندوب التوصيل غير موجود.', 404, 'DRIVER_NOT_FOUND');
    }

    if (!driver.providerId) {
      throw new AppError('مندوب التوصيل غير مرتبط بمزود.', 400, 'DRIVER_HAS_NO_PROVIDER');
    }

    // Validate that all serviceIds belong to driver's provider
    if (serviceIds && Array.isArray(serviceIds)) {
      const provServices = await db
        .select()
        .from(providerServices)
        .where(eq(providerServices.providerId, driver.providerId));

      const provServiceIdSet = new Set(provServices.map((s) => s.serviceId));

      for (const srvId of serviceIds) {
        if (!provServiceIdSet.has(srvId)) {
          throw new AppError(
            `لا يمكن تعيين الخدمة (${srvId}) للمندوب لأن المزود التابع له لا يقدم هذه الخدمة.`,
            400,
            'INVALID_DRIVER_SERVICE_CAPABILITY'
          );
        }
      }

      await db
        .delete(deliveryServiceCapabilities)
        .where(eq(deliveryServiceCapabilities.deliveryEmployeeId, id));

      for (const srvId of serviceIds) {
        await db
          .insert(deliveryServiceCapabilities)
          .values({
            deliveryEmployeeId: id,
            serviceId: srvId,
            isAuthorized: true,
          })
          .onConflictDoNothing();
      }
    }

    // Update Category Capabilities
    if (categoryIds && Array.isArray(categoryIds)) {
      await db
        .delete(deliveryCategoryCapabilities)
        .where(eq(deliveryCategoryCapabilities.deliveryEmployeeId, id));

      for (const catId of categoryIds) {
        await db
          .insert(deliveryCategoryCapabilities)
          .values({
            deliveryEmployeeId: id,
            categoryId: catId,
          })
          .onConflictDoNothing();
      }
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'تم تحديث تصاريح وقدرات التوصيل للمندوب بنجاح.',
        driverId: id,
        categoryCapabilities: categoryIds || [],
        serviceCapabilities: serviceIds || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateDeliveryEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, phoneNumber, vehicleType, vehiclePlateNumber, isActive, providerId } = req.body;

    const [existing] = await db
      .select()
      .from(deliveryEmployees)
      .where(eq(deliveryEmployees.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('مندوب التوصيل غير موجود.', 404, 'DRIVER_NOT_FOUND');
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name) updatePayload.name = name.trim();
    if (phoneNumber) updatePayload.phoneNumber = normalizeJordanianPhone(phoneNumber);
    if (vehicleType) updatePayload.vehicleType = vehicleType.trim();
    if (vehiclePlateNumber) updatePayload.vehiclePlateNumber = vehiclePlateNumber.trim();
    if (isActive !== undefined) updatePayload.isActive = isActive;
    if (providerId) {
      const [prov] = await db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
      if (!prov) throw new AppError('المزود المحدد غير موجود.', 404, 'PROVIDER_NOT_FOUND');
      updatePayload.providerId = providerId;
    }

    const [updated] = await db
      .update(deliveryEmployees)
      .set(updatePayload)
      .where(eq(deliveryEmployees.id, id))
      .returning();

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDeliveryEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [deleted] = await db
      .delete(deliveryEmployees)
      .where(eq(deliveryEmployees.id, id))
      .returning();

    if (!deleted) {
      throw new AppError('مندوب التوصيل غير موجود.', 404, 'DRIVER_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: { message: 'تم حذف حساب المندوب بنجاح.', id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all users with pagination, search, role filtering, and status filtering
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();
    const role = (req.query.role as string)?.trim();
    const status = (req.query.status as string)?.trim();

    const conditions: SQL[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.phoneNumber, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )!
      );
    }

    if (role && role !== 'all' && ['customer', 'admin', 'provider', 'delivery'].includes(role)) {
      conditions.push(eq(users.role, role as any));
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        conditions.push(eq(users.isSuspended, false));
      } else if (status === 'suspended') {
        conditions.push(eq(users.isSuspended, true));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count query
    const [countResult] = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    // Fetch users with pagination
    const usersList = await db
      .select({
        id: users.id,
        phoneNumber: users.phoneNumber,
        name: users.name,
        email: users.email,
        role: users.role,
        walletBalance: users.walletBalance,
        points: users.points,
        referralCode: users.referralCode,
        isSuspended: users.isSuspended,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const formattedUsers = usersList.map((u) => ({
      ...u,
      walletBalance: parseFloat(u.walletBalance),
    }));

    res.status(200).json({
      success: true,
      data: {
        users: formattedUsers,
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new user account directly from Admin panel
 */
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber, name, email, role } = req.body;

    if (!phoneNumber) {
      throw new AppError('رقم الهاتف مطلوب لإنشاء المستخدم.', 400, 'PHONE_REQUIRED');
    }

    const normalizedPhone = normalizeJordanianPhone(phoneNumber);

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, normalizedPhone))
      .limit(1);

    if (existing) {
      throw new AppError('رقم الهاتف مسجل مسبقاً في النظام.', 409, 'ACCOUNT_ALREADY_EXISTS');
    }

    const userRole = role && ['customer', 'admin', 'provider', 'delivery'].includes(role) ? role : 'customer';

    const [newUser] = await db
      .insert(users)
      .values({
        phoneNumber: normalizedPhone,
        name: name ? name.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        role: userRole as any,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        phoneNumber: newUser.phoneNumber,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        walletBalance: parseFloat(newUser.walletBalance),
        points: newUser.points,
        referralCode: newUser.referralCode,
        isSuspended: newUser.isSuspended,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user by ID
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const [user] = await db
      .select({
        id: users.id,
        phoneNumber: users.phoneNumber,
        name: users.name,
        email: users.email,
        role: users.role,
        walletBalance: users.walletBalance,
        points: users.points,
        referralCode: users.referralCode,
        isSuspended: users.isSuspended,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new AppError('المستخدم غير موجود.', 404, 'USER_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: {
        ...user,
        walletBalance: parseFloat(user.walletBalance),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user details (name, email, role, isSuspended)
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, email, role, isSuspended } = req.body;

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('المستخدم غير موجود.', 404, 'USER_NOT_FOUND');
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updatePayload.name = name ? name.trim() : null;
    if (email !== undefined) updatePayload.email = email ? email.trim().toLowerCase() : null;
    if (role !== undefined) {
      if (!['customer', 'admin', 'provider', 'delivery'].includes(role)) {
        throw new AppError('الدور المحدد غير صالح.', 400, 'INVALID_ROLE');
      }
      updatePayload.role = role;
    }
    if (isSuspended !== undefined) {
      updatePayload.isSuspended = Boolean(isSuspended);
      if (updatePayload.isSuspended) {
        // Revoke active sessions for suspended user
        await db
          .update(refreshTokens)
          .set({ isRevoked: true })
          .where(eq(refreshTokens.userId, id));
      }
    }

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, id))
      .returning();

    res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        phoneNumber: updated.phoneNumber,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        walletBalance: parseFloat(updated.walletBalance),
        points: updated.points,
        referralCode: updated.referralCode,
        isSuspended: updated.isSuspended,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend user and revoke refresh tokens
 */
export const suspendUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('المستخدم غير موجود.', 404, 'USER_NOT_FOUND');
    }

    await db
      .update(users)
      .set({ isSuspended: true, updatedAt: new Date() })
      .where(eq(users.id, id));

    // Revoke refresh tokens
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, id));

    res.status(200).json({
      success: true,
      data: { message: 'تم إيقاف حساب المستخدم بنجاح.', id, isSuspended: true },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate user
 */
export const activateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('المستخدم غير موجود.', 404, 'USER_NOT_FOUND');
    }

    await db
      .update(users)
      .set({ isSuspended: false, updatedAt: new Date() })
      .where(eq(users.id, id));

    res.status(200).json({
      success: true,
      data: { message: 'تم تنشيط حساب المستخدم بنجاح.', id, isSuspended: false },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggregated live dashboard statistics from PostgreSQL (Optimized Single-Pass Aggregations)
 */
export const getAdminDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const statsData = await cacheService.getOrSet(
      'admin:dashboard:stats',
      async () => {
        const [
          [userMetrics],
          [orderMetrics],
          [providerMetrics],
          [driverMetrics],
          recentUsersList,
          recentOrdersList,
        ] = await Promise.all([
          db
            .select({
              totalUsers: count(),
              activeUsers: sql<number>`count(*) FILTER (WHERE ${users.isSuspended} = false)::int`,
              suspendedUsers: sql<number>`count(*) FILTER (WHERE ${users.isSuspended} = true)::int`,
              customerCount: sql<number>`count(*) FILTER (WHERE ${users.role} = 'customer')::int`,
              adminCount: sql<number>`count(*) FILTER (WHERE ${users.role} IN ('admin', 'super_admin'))::int`,
              providerCount: sql<number>`count(*) FILTER (WHERE ${users.role} = 'provider')::int`,
              deliveryCount: sql<number>`count(*) FILTER (WHERE ${users.role} = 'delivery')::int`,
            })
            .from(users),
          db
            .select({
              totalOrders: count(),
              completedOrders: sql<number>`count(*) FILTER (WHERE ${orders.status} = 'completed')::int`,
              activeOrders: sql<number>`count(*) FILTER (WHERE ${orders.status} IN ('pending', 'confirmed', 'offered_to_driver', 'awaiting_assignment', 'assigned', 'accepted', 'going_to_pickup', 'picked_up', 'going_to_customer'))::int`,
              cancelledOrders: sql<number>`count(*) FILTER (WHERE ${orders.status} IN ('failed', 'cancelled', 'rejected'))::int`,
              totalRevenue: sql<string>`COALESCE(SUM(${orders.totalAmount}) FILTER (WHERE ${orders.status} NOT IN ('failed', 'cancelled', 'rejected')), 0)`,
            })
            .from(orders),
          db
            .select({
              totalProviders: count(),
              activeProviders: sql<number>`count(*) FILTER (WHERE ${providers.isActive} = true)::int`,
            })
            .from(providers),
          db
            .select({
              totalDrivers: count(),
              activeDrivers: sql<number>`count(*) FILTER (WHERE ${deliveryEmployees.isActive} = true)::int`,
              onlineDrivers: sql<number>`count(*) FILTER (WHERE ${deliveryEmployees.isOnline} = true)::int`,
            })
            .from(deliveryEmployees),
          db
            .select({
              id: users.id,
              phoneNumber: users.phoneNumber,
              name: users.name,
              role: users.role,
              isSuspended: users.isSuspended,
              createdAt: users.createdAt,
            })
            .from(users)
            .orderBy(desc(users.createdAt))
            .limit(5),
          db
            .select({
              id: orders.id,
              customerName: orders.customerName,
              customerPhone: orders.customerPhone,
              deliveryArea: orders.deliveryArea,
              status: orders.status,
              totalAmount: orders.totalAmount,
              createdAt: orders.createdAt,
            })
            .from(orders)
            .orderBy(desc(orders.createdAt))
            .limit(5),
        ]);

        return {
          totalUsers: Number(userMetrics?.totalUsers || 0),
          activeUsers: Number(userMetrics?.activeUsers || 0),
          suspendedUsers: Number(userMetrics?.suspendedUsers || 0),
          usersByRole: {
            customer: Number(userMetrics?.customerCount || 0),
            admin: Number(userMetrics?.adminCount || 0),
            provider: Number(userMetrics?.providerCount || 0),
            delivery: Number(userMetrics?.deliveryCount || 0),
          },
          totalOrders: Number(orderMetrics?.totalOrders || 0),
          completedOrders: Number(orderMetrics?.completedOrders || 0),
          activeOrders: Number(orderMetrics?.activeOrders || 0),
          cancelledOrders: Number(orderMetrics?.cancelledOrders || 0),
          totalRevenue: parseFloat(orderMetrics?.totalRevenue || '0'),
          totalProviders: Number(providerMetrics?.totalProviders || 0),
          activeProviders: Number(providerMetrics?.activeProviders || 0),
          totalDrivers: Number(driverMetrics?.totalDrivers || 0),
          activeDrivers: Number(driverMetrics?.activeDrivers || 0),
          onlineDrivers: Number(driverMetrics?.onlineDrivers || 0),
          recentUsers: recentUsersList,
          recentOrders: recentOrdersList.map((o) => ({
            ...o,
            totalAmount: parseFloat(o.totalAmount),
          })),
        };
      },
      10
    );

    res.status(200).json({
      success: true,
      data: statsData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all orders across the entire platform for Admin with pagination, search, and status filter
 */
export const getAdminOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();
    const status = (req.query.status as string)?.trim();
    const providerId = (req.query.providerId as string)?.trim();

    const conditions: SQL[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(orders.id, `%${search}%`),
          ilike(orders.customerName, `%${search}%`),
          ilike(orders.customerPhone, `%${search}%`),
          ilike(orders.providerName, `%${search}%`),
          ilike(orders.deliveryArea, `%${search}%`)
        )!
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(orders.status, status as any));
    }

    if (providerId && providerId !== 'all') {
      conditions.push(eq(orders.providerId, providerId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count query
    const [countResult] = await db
      .select({ total: count() })
      .from(orders)
      .where(whereClause);

    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    const ordersList = await db.query.orders.findMany({
      where: whereClause,
      with: {
        items: true,
        statusHistory: true,
      },
      orderBy: [desc(orders.createdAt)],
      limit,
      offset,
    });

    const formattedOrders = ordersList.map((o) => ({
      ...o,
      subtotal: parseFloat(o.subtotal),
      discountAmount: parseFloat(o.discountAmount),
      deliveryFee: parseFloat(o.deliveryFee),
      totalAmount: parseFloat(o.totalAmount),
      items: o.items.map((i) => ({
        ...i,
        unitPrice: parseFloat(i.unitPrice),
        itemTotal: parseFloat(i.itemTotal),
      })),
    }));

    res.status(200).json({
      success: true,
      data: {
        orders: formattedOrders,
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin System Diagnostics
 * GET /api/v1/admin/diagnostics
 */
export const getAdminDiagnostics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const memory = process.memoryUsage();
    const dbHealth = await import('../../config/database.js').then((m) => m.checkDatabaseHealth());
    const dbMetrics = await import('../../config/database.js').then((m) => m.getDatabaseMetrics());
    const cacheMetrics = await import('../../services/cache.service.js').then((m) => m.cacheService.getMetrics());
    const queueMetrics = await import('../../services/queue.service.js').then((m) => m.queueService.getMetrics());
    const activeSSE = await import('../../services/events.service.js').then((m) => m.eventsService.getActiveConnectionsCount());

    res.status(200).json({
      success: true,
      data: {
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          uptimeSeconds: Math.floor(process.uptime()),
          memory: {
            heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
            rssMb: Math.round(memory.rss / 1024 / 1024),
          },
        },
        database: {
          ...dbMetrics,
          latencyMs: dbHealth.latencyMs,
          isConnected: dbHealth.isConnected,
        },
        cache: cacheMetrics,
        queue: queueMetrics,
        realTime: {
          activeSSEConnections: activeSSE,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};


