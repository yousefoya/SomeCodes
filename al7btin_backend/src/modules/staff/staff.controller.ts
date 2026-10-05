import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import { users, refreshTokens, User } from '../../db/schema/users.schema.js';
import { staffProfiles, supportCases, refundRequests, auditLogs, customerServiceNotes } from '../../db/schema/staff.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { eq, inArray, ilike, or, and, count, desc, sql, SQL } from 'drizzle-orm';
import { normalizeJordanianPhone } from '../auth/utils/phone.js';
import { AppError } from '../../middleware/errorHandler.js';
import { auditService } from '../../services/audit.service.js';
import { StaffRole } from '../../middleware/auth.js';

const VALID_STAFF_ROLES: StaffRole[] = [
  'super_admin',
  'admin',
  'customer_service_manager',
  'customer_service_agent',
];

/**
 * List all staff members with profiles, pagination, search, role and status filters
 */
export const getStaffList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();
    const role = (req.query.role as string)?.trim();
    const status = (req.query.status as string)?.trim();

    const conditions: SQL[] = [inArray(users.role, VALID_STAFF_ROLES)];

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.phoneNumber, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )!
      );
    }

    if (role && role !== 'all' && VALID_STAFF_ROLES.includes(role as any)) {
      conditions.push(eq(users.role, role as any));
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        conditions.push(eq(users.isSuspended, false));
      } else if (status === 'suspended') {
        conditions.push(eq(users.isSuspended, true));
      }
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    const staffUsers = await db
      .select({
        id: users.id,
        phoneNumber: users.phoneNumber,
        name: users.name,
        email: users.email,
        role: users.role,
        isSuspended: users.isSuspended,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        profileId: staffProfiles.id,
        employeeCode: staffProfiles.employeeCode,
        department: staffProfiles.department,
        casesHandledCount: staffProfiles.casesHandledCount,
        ordersHandledCount: staffProfiles.ordersHandledCount,
        lastActiveAt: staffProfiles.lastActiveAt,
        notes: staffProfiles.notes,
      })
      .from(users)
      .leftJoin(staffProfiles, eq(users.id, staffProfiles.userId))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    res.status(200).json({
      success: true,
      data: {
        staff: staffUsers,
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
 * Create a new staff account (Super Admin only)
 */
export const createStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber, name, email, role, department, employeeCode, notes } = req.body;

    if (!phoneNumber || !name) {
      throw new AppError('رقم الهاتف والاسم الكامل مطلوبان لإنشاء حساب موظف.', 400, 'FIELDS_REQUIRED');
    }

    const targetRole = role && VALID_STAFF_ROLES.includes(role) ? role : 'customer_service_agent';

    if (targetRole === 'super_admin' && req.user?.role !== 'super_admin') {
      throw new AppError('فقط المشرف العام يملك صلاحية تعيين وتوليد حسابات برتبة مشرف عام.', 403, 'FORBIDDEN_SUPER_ADMIN_CREATION');
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

    const generatedCode = employeeCode?.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const [newUser] = await db
      .insert(users)
      .values({
        phoneNumber: normalizedPhone,
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : null,
        role: targetRole,
      })
      .returning();

    const [newProfile] = await db
      .insert(staffProfiles)
      .values({
        userId: newUser.id,
        employeeCode: generatedCode,
        department: department?.trim() || 'خدمة العملاء',
        notes: notes?.trim() || null,
      })
      .returning();

    // Record Audit Log
    await auditService.log({
      req,
      action: 'STAFF_CREATE',
      entityType: 'staff',
      entityId: newUser.id,
      metadata: {
        name: newUser.name,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        department: newProfile.department,
        employeeCode: newProfile.employeeCode,
      },
      newState: {
        user: newUser,
        profile: newProfile,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        phoneNumber: newUser.phoneNumber,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isSuspended: newUser.isSuspended,
        employeeCode: newProfile.employeeCode,
        department: newProfile.department,
        casesHandledCount: newProfile.casesHandledCount,
        ordersHandledCount: newProfile.ordersHandledCount,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed staff profile by ID with activity counters and recent actions
 */
export const getStaffById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [staffUser] = await db
      .select({
        id: users.id,
        phoneNumber: users.phoneNumber,
        name: users.name,
        email: users.email,
        role: users.role,
        isSuspended: users.isSuspended,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        profileId: staffProfiles.id,
        employeeCode: staffProfiles.employeeCode,
        department: staffProfiles.department,
        casesHandledCount: staffProfiles.casesHandledCount,
        ordersHandledCount: staffProfiles.ordersHandledCount,
        lastActiveAt: staffProfiles.lastActiveAt,
        notes: staffProfiles.notes,
      })
      .from(users)
      .leftJoin(staffProfiles, eq(users.id, staffProfiles.userId))
      .where(and(eq(users.id, id), inArray(users.role, VALID_STAFF_ROLES)))
      .limit(1);

    if (!staffUser) {
      throw new AppError('حساب الموظف غير موجود.', 404, 'STAFF_NOT_FOUND');
    }

    // Fetch recent handled support cases
    const recentCases = await db
      .select({
        id: supportCases.id,
        caseNumber: supportCases.caseNumber,
        title: supportCases.title,
        status: supportCases.status,
        priority: supportCases.priority,
        createdAt: supportCases.createdAt,
      })
      .from(supportCases)
      .where(or(eq(supportCases.assignedStaffId, id), eq(supportCases.createdByStaffId, id)))
      .orderBy(desc(supportCases.createdAt))
      .limit(10);

    // Fetch recent audit logs where this staff was the actor
    const recentLogs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.actorUserId, id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(15);

    res.status(200).json({
      success: true,
      data: {
        staff: staffUser,
        recentCases,
        recentLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update staff details (role, department, employee code, name, email, suspension)
 */
export const updateStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, email, role, department, employeeCode, notes, isSuspended } = req.body;

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), inArray(users.role, VALID_STAFF_ROLES)))
      .limit(1);

    if (!existing) {
      throw new AppError('حساب الموظف غير موجود.', 404, 'STAFF_NOT_FOUND');
    }

    if (req.user?.id === id && role !== undefined && role !== existing.role) {
      throw new AppError('لا يمكن تعديل رتبتك الإدارية من خلال حسابك الحالي منعاً لفقدان الصلاحيات.', 400, 'CANNOT_MODIFY_OWN_ROLE');
    }

    if (role === 'super_admin' && req.user?.role !== 'super_admin') {
      throw new AppError('فقط المشرف العام يملك صلاحية ترقية حساب إلى رتبة مشرف عام.', 403, 'FORBIDDEN_SUPER_ADMIN_ELEVATION');
    }

    if ((existing.role === 'super_admin' || existing.role === 'admin') && (isSuspended || (role && role !== 'super_admin' && role !== 'admin'))) {
      const [activeAdmins] = await db
        .select({ total: count() })
        .from(users)
        .where(and(inArray(users.role, ['super_admin', 'admin']), eq(users.isSuspended, false)));
      if (Number(activeAdmins?.total || 0) <= 1) {
        throw new AppError('لا يمكن تعطيل أو خفض رتبة المشرف العام النشط الوحيد في النظام لمنع إغلاق المنظومة.', 400, 'CANNOT_DISABLE_LAST_SUPER_ADMIN');
      }
    }

    const userPayload: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) userPayload.name = name ? name.trim() : null;
    if (email !== undefined) userPayload.email = email ? email.trim().toLowerCase() : null;
    if (role !== undefined) {
      if (!VALID_STAFF_ROLES.includes(role)) {
        throw new AppError('الدور الإداري المحدد غير صالح.', 400, 'INVALID_STAFF_ROLE');
      }
      userPayload.role = role;
    }
    if (isSuspended !== undefined) {
      userPayload.isSuspended = Boolean(isSuspended);
      if (userPayload.isSuspended) {
        // Revoke active sessions for suspended staff member
        await db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.userId, id));
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set(userPayload)
      .where(eq(users.id, id))
      .returning();

    // Ensure staff profile exists or update it
    let [profile] = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, id))
      .limit(1);

    const profilePayload: Record<string, any> = { updatedAt: new Date() };
    if (department !== undefined) profilePayload.department = department ? department.trim() : 'Customer Support';
    if (employeeCode !== undefined) profilePayload.employeeCode = employeeCode ? employeeCode.trim() : null;
    if (notes !== undefined) profilePayload.notes = notes ? notes.trim() : null;

    if (profile) {
      const [updatedProfile] = await db
        .update(staffProfiles)
        .set(profilePayload)
        .where(eq(staffProfiles.userId, id))
        .returning();
      profile = updatedProfile;
    } else {
      const [newProfile] = await db
        .insert(staffProfiles)
        .values({
          userId: id,
          department: department?.trim() || 'خدمة العملاء',
          employeeCode: employeeCode?.trim() || null,
          notes: notes?.trim() || null,
        })
        .returning();
      profile = newProfile;
    }

    // Record Audit Log
    await auditService.log({
      req,
      action: 'STAFF_UPDATE',
      entityType: 'staff',
      entityId: id,
      previousState: { user: existing },
      newState: { user: updatedUser, profile },
    });

    res.status(200).json({
      success: true,
      data: {
        id: updatedUser.id,
        phoneNumber: updatedUser.phoneNumber,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isSuspended: updatedUser.isSuspended,
        employeeCode: profile?.employeeCode,
        department: profile?.department,
        casesHandledCount: profile?.casesHandledCount || 0,
        ordersHandledCount: profile?.ordersHandledCount || 0,
        notes: profile?.notes,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Quick toggle staff active/suspended status
 */
export const toggleStaffStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), inArray(users.role, VALID_STAFF_ROLES)))
      .limit(1);

    if (!existing) {
      throw new AppError('حساب الموظف غير موجود.', 404, 'STAFF_NOT_FOUND');
    }

    if (req.user?.id === id) {
      throw new AppError('لا يمكنك تعطيل حسابك الشخصي الحالي.', 400, 'CANNOT_SUSPEND_SELF');
    }

    const newSuspendedState = !existing.isSuspended;

    if (newSuspendedState && (existing.role === 'super_admin' || existing.role === 'admin')) {
      const [activeAdmins] = await db
        .select({ total: count() })
        .from(users)
        .where(and(inArray(users.role, ['super_admin', 'admin']), eq(users.isSuspended, false)));
      if (Number(activeAdmins?.total || 0) <= 1) {
        throw new AppError('لا يمكن تعطيل المشرف العام النشط الوحيد في النظام لمنع إغلاق المنظومة.', 400, 'CANNOT_DISABLE_LAST_SUPER_ADMIN');
      }
    }

    await db
      .update(users)
      .set({ isSuspended: newSuspendedState, updatedAt: new Date() })
      .where(eq(users.id, id));

    if (newSuspendedState) {
      await db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.userId, id));
    }

    await auditService.log({
      req,
      action: newSuspendedState ? 'STAFF_DEACTIVATE' : 'STAFF_ACTIVATE',
      entityType: 'staff',
      entityId: id,
      metadata: { previousSuspended: existing.isSuspended, isSuspended: newSuspendedState },
    });

    res.status(200).json({
      success: true,
      data: {
        id,
        isSuspended: newSuspendedState,
        message: newSuspendedState ? 'تم تعطيل حساب الموظف بنجاح.' : 'تم تنشيط حساب الموظف بنجاح.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Role-tailored Dashboard Metrics Summary (Agent / Manager / Super Admin)
 */
export const getStaffDashboardSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const role = user.role;

    // 1. Agent-specific metrics
    if (role === 'customer_service_agent') {
      const [
        [myOpenCases],
        [myInProgressCases],
        [myWaitingCases],
        [urgentCases],
        [handledToday],
        recentCases,
        recentlyUpdatedCases,
      ] = await Promise.all([
        db.select({ total: count() }).from(supportCases).where(and(eq(supportCases.assignedStaffId, user.id), eq(supportCases.status, 'open'))),
        db.select({ total: count() }).from(supportCases).where(and(eq(supportCases.assignedStaffId, user.id), eq(supportCases.status, 'in_progress'))),
        db.select({ total: count() }).from(supportCases).where(and(eq(supportCases.assignedStaffId, user.id), eq(supportCases.status, 'waiting_for_customer'))),
        db.select({ total: count() }).from(supportCases).where(and(or(eq(supportCases.assignedStaffId, user.id), sql`${supportCases.assignedStaffId} IS NULL`), eq(supportCases.priority, 'urgent'), inArray(supportCases.status, ['open', 'in_progress']))),
        db.select({ total: count() }).from(customerServiceNotes).where(and(eq(customerServiceNotes.authorUserId, user.id), sql`created_at >= CURRENT_DATE`)),
        db.select().from(supportCases).where(eq(supportCases.assignedStaffId, user.id)).orderBy(desc(supportCases.createdAt)).limit(5),
        db.select().from(supportCases).where(eq(supportCases.assignedStaffId, user.id)).orderBy(desc(supportCases.updatedAt)).limit(5),
      ]);

      const myOpen = Number(myOpenCases?.total || 0);
      const myInProgress = Number(myInProgressCases?.total || 0);
      const myWaiting = Number(myWaitingCases?.total || 0);
      const urgent = Number(urgentCases?.total || 0);
      const handledCount = Number(handledToday?.total || 0);

      res.status(200).json({
        success: true,
        data: {
          role,
          myOpenCasesCount: myOpen,
          myInProgressCasesCount: myInProgress,
          myWaitingCasesCount: myWaiting,
          urgentCasesCount: urgent,
          handledInteractionsToday: handledCount,
          handledTodayCount: handledCount,
          recentCases,
          recentlyUpdatedCases,
        },
      });
      return;
    }

    // 2. Manager-specific metrics
    if (role === 'customer_service_manager') {
      const [
        [openCases],
        [unassignedCases],
        [urgentCases],
        [pendingRefunds],
        [activeStaffCount],
        allStatusCounts,
        agentsList,
        recentlyEscalatedCases,
        recentRefunds,
        recentCases,
      ] = await Promise.all([
        db.select({ total: count() }).from(supportCases).where(inArray(supportCases.status, ['open', 'in_progress', 'waiting_for_customer'])),
        db.select({ total: count() }).from(supportCases).where(and(inArray(supportCases.status, ['open', 'in_progress']), sql`assigned_staff_id IS NULL`)),
        db.select({ total: count() }).from(supportCases).where(and(inArray(supportCases.status, ['open', 'in_progress']), eq(supportCases.priority, 'urgent'))),
        db.select({ total: count() }).from(refundRequests).where(inArray(refundRequests.status, ['requested', 'under_review'])),
        db.select({ total: count() }).from(users).where(and(inArray(users.role, VALID_STAFF_ROLES), eq(users.isSuspended, false))),
        db.select({ status: supportCases.status, count: count() }).from(supportCases).groupBy(supportCases.status),
        db.select({ id: users.id, name: users.name, role: users.role, phoneNumber: users.phoneNumber }).from(users).where(and(inArray(users.role, ['customer_service_agent', 'customer_service_manager']), eq(users.isSuspended, false))),
        db.select().from(supportCases).where(and(inArray(supportCases.status, ['open', 'in_progress']), inArray(supportCases.priority, ['urgent', 'high']))).orderBy(desc(supportCases.updatedAt)).limit(5),
        db.select().from(refundRequests).where(inArray(refundRequests.status, ['requested', 'under_review'])).orderBy(desc(refundRequests.createdAt)).limit(5),
        db.select().from(supportCases).orderBy(desc(supportCases.createdAt)).limit(5),
      ]);

      // Calculate cases by status map
      const casesByStatus: Record<string, number> = {
        open: 0,
        in_progress: 0,
        waiting_for_customer: 0,
        resolved: 0,
        closed: 0,
      };
      for (const row of allStatusCounts) {
        if (row.status && casesByStatus[row.status] !== undefined) {
          casesByStatus[row.status] = Number(row.count || 0);
        }
      }

      // Calculate workload by agent
      const agentIds = agentsList.map((a) => a.id);
      let agentWorkloads: Array<{ agentId: string; agentName: string; activeCasesCount: number }> = [];

      if (agentIds.length > 0) {
        const workloadRows = await db
          .select({
            assignedStaffId: supportCases.assignedStaffId,
            activeCount: count(),
          })
          .from(supportCases)
          .where(and(inArray(supportCases.assignedStaffId, agentIds), inArray(supportCases.status, ['open', 'in_progress'])))
          .groupBy(supportCases.assignedStaffId);

        const workloadMap = new Map<string, number>();
        for (const w of workloadRows) {
          if (w.assignedStaffId) {
            workloadMap.set(w.assignedStaffId, Number(w.activeCount || 0));
          }
        }

        agentWorkloads = agentsList.map((a) => ({
          agentId: a.id,
          agentName: a.name || a.phoneNumber,
          activeCasesCount: workloadMap.get(a.id) || 0,
        }));
      }

      const totalOpen = Number(openCases?.total || 0);
      const activeAgents = agentsList.length;
      const averageWorkload = activeAgents > 0 ? parseFloat((totalOpen / activeAgents).toFixed(1)) : 0;

      res.status(200).json({
        success: true,
        data: {
          role,
          openCasesCount: totalOpen,
          totalOpenCasesCount: totalOpen,
          unassignedCasesCount: Number(unassignedCases?.total || 0),
          urgentCasesCount: Number(urgentCases?.total || 0),
          pendingRefundsCount: Number(pendingRefunds?.total || 0),
          activeStaffCount: Number(activeStaffCount?.total || 0),
          casesByStatus,
          casesByAgent: agentWorkloads,
          averageWorkload,
          recentlyEscalatedCases,
          recentRefunds,
          recentCases,
        },
      });
      return;
    }

    // 3. Super Admin / Admin comprehensive platform metrics
    const [
      [totalStaffResult],
      [activeStaffResult],
      [openCasesResult],
      [pendingRefundsResult],
      [totalOrdersResult],
      [activeOrdersResult],
      [totalCustomersResult],
      [revenueResult],
      recentAuditLogs,
    ] = await Promise.all([
      db.select({ total: count() }).from(users).where(inArray(users.role, VALID_STAFF_ROLES)),
      db.select({ total: count() }).from(users).where(and(inArray(users.role, VALID_STAFF_ROLES), eq(users.isSuspended, false))),
      db.select({ total: count() }).from(supportCases).where(inArray(supportCases.status, ['open', 'in_progress', 'waiting_for_customer'])),
      db.select({ total: count() }).from(refundRequests).where(inArray(refundRequests.status, ['requested', 'under_review'])),
      db.select({ total: count() }).from(orders),
      db.select({ total: count() }).from(orders).where(inArray(orders.status, ['pending', 'confirmed', 'offered_to_driver', 'awaiting_assignment', 'assigned', 'accepted', 'going_to_pickup', 'picked_up', 'going_to_customer'])),
      db.select({ total: count() }).from(users).where(eq(users.role, 'customer')),
      db.select({ totalRevenue: sql<string>`COALESCE(SUM(total_amount), 0)` }).from(orders).where(sql`status NOT IN ('failed', 'cancelled', 'rejected')`),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(10),
    ]);

    res.status(200).json({
      success: true,
      data: {
        role,
        totalStaff: Number(totalStaffResult?.total || 0),
        activeStaff: Number(activeStaffResult?.total || 0),
        openCases: Number(openCasesResult?.total || 0),
        pendingRefunds: Number(pendingRefundsResult?.total || 0),
        totalOrders: Number(totalOrdersResult?.total || 0),
        activeOrders: Number(activeOrdersResult?.total || 0),
        totalCustomers: Number(totalCustomersResult?.total || 0),
        totalRevenue: parseFloat(revenueResult?.totalRevenue || '0'),
        recentAuditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};
