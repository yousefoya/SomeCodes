import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/utils/jwt.js';
import { db } from '../db/index.js';
import { users, User } from '../db/schema/users.schema.js';
import { eq } from 'drizzle-orm';
import { AppError } from './errorHandler.js';

// Extend Express Request interface with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

export type StaffRole = 'super_admin' | 'admin' | 'customer_service_manager' | 'customer_service_agent';
export type UserRole = StaffRole | 'customer' | 'delivery' | 'provider';

export type Permission =
  | 'view_dashboard'
  | 'view_orders'
  | 'manage_orders'
  | 'view_customers'
  | 'manage_customers'
  | 'view_customer_history'
  | 'manage_customer_service'
  | 'create_customer_notes'
  | 'create_support_case'
  | 'view_support_cases'
  | 'manage_support_cases'
  | 'contact_customer'
  | 'update_order_support_status'
  | 'request_refunds'
  | 'review_refunds'
  | 'approve_refunds'
  | 'execute_refunds'
  | 'view_refund_history'
  | 'view_staff_activity'
  | 'view_customer_service_analytics'
  | 'manage_staff'
  | 'manage_roles'
  | 'manage_permissions'
  | 'view_audit_logs'
  | 'view_analytics'
  | 'view_providers'
  | 'manage_providers'
  | 'view_delivery'
  | 'manage_delivery'
  | 'manage_services'
  | 'manage_coupons'
  | 'manage_offers'
  | 'manage_settings'
  | 'view_finance'
  | 'manage_finance'
  | 'manage_commissions'
  | 'manage_withdrawals';

/**
 * Authoritative Server-Side Role Permissions Matrix
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'view_dashboard',
    'view_orders',
    'manage_orders',
    'view_customers',
    'manage_customers',
    'view_customer_history',
    'manage_customer_service',
    'create_customer_notes',
    'create_support_case',
    'view_support_cases',
    'manage_support_cases',
    'contact_customer',
    'update_order_support_status',
    'request_refunds',
    'review_refunds',
    'approve_refunds',
    'execute_refunds',
    'view_refund_history',
    'view_staff_activity',
    'view_customer_service_analytics',
    'manage_staff',
    'manage_roles',
    'manage_permissions',
    'view_audit_logs',
    'view_analytics',
    'view_providers',
    'manage_providers',
    'view_delivery',
    'manage_delivery',
    'manage_services',
    'manage_coupons',
    'manage_offers',
    'manage_settings',
    'view_finance',
    'manage_finance',
    'manage_commissions',
    'manage_withdrawals',
  ],
  // 'admin' role has identical permissions to 'super_admin' to guarantee legacy compatibility
  admin: [
    'view_dashboard',
    'view_orders',
    'manage_orders',
    'view_customers',
    'manage_customers',
    'view_customer_history',
    'manage_customer_service',
    'create_customer_notes',
    'create_support_case',
    'view_support_cases',
    'manage_support_cases',
    'contact_customer',
    'update_order_support_status',
    'request_refunds',
    'review_refunds',
    'approve_refunds',
    'execute_refunds',
    'view_refund_history',
    'view_staff_activity',
    'view_customer_service_analytics',
    'manage_staff',
    'manage_roles',
    'manage_permissions',
    'view_audit_logs',
    'view_analytics',
    'view_providers',
    'manage_providers',
    'view_delivery',
    'manage_delivery',
    'manage_services',
    'manage_coupons',
    'manage_offers',
    'manage_settings',
    'view_finance',
    'manage_finance',
    'manage_commissions',
    'manage_withdrawals',
  ],
  customer_service_manager: [
    'view_dashboard',
    'view_orders',
    'manage_orders',
    'view_customers',
    'view_customer_history',
    'manage_customer_service',
    'create_customer_notes',
    'create_support_case',
    'view_support_cases',
    'manage_support_cases',
    'contact_customer',
    'update_order_support_status',
    'request_refunds',
    'review_refunds',
    'approve_refunds',
    'view_refund_history',
    'view_staff_activity',
    'view_customer_service_analytics',
    'view_audit_logs',
    'view_providers',
    'view_delivery',
  ],
  customer_service_agent: [
    'view_dashboard',
    'view_orders',
    'view_customers',
    'view_customer_history',
    'create_customer_notes',
    'create_support_case',
    'view_support_cases',
    'contact_customer',
    'update_order_support_status',
    'request_refunds',
    'view_refund_history',
  ],
  customer: [],
  delivery: [],
  provider: [],
};

/**
 * Check if a role has a given permission
 */
export const hasPermission = (role: string, permission: Permission): boolean => {
  const allowed = ROLE_PERMISSIONS[role as UserRole];
  return allowed ? allowed.includes(permission) : false;
};

/**
 * Check if a role is a staff/operations role
 */
export const isStaffRole = (role: string): boolean => {
  return ['super_admin', 'admin', 'customer_service_manager', 'customer_service_agent'].includes(role);
};

/**
 * Authentication Middleware: Validates JWT Bearer token and verifies active account status
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('يرجى تسجيل الدخول للمتابعة.', 401, 'AUTH_REQUIRED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    // Fetch user from DB to verify current state & suspension status
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      return next(new AppError('حساب المستخدم غير موجود.', 401, 'USER_NOT_FOUND'));
    }

    if (user.isSuspended) {
      return next(
        new AppError(
          'تم إيقاف هذا الحساب من قبل الإدارة. يرجى التواصل مع الدعم الفني.',
          403,
          'ACCOUNT_SUSPENDED'
        )
      );
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new AppError((error as Error).message, 401, 'INVALID_TOKEN'));
  }
};

/**
 * Role Authorization Middleware: Checks if authenticated user has one of required roles
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('يرجى تسجيل الدخول أولاً.', 401, 'AUTH_REQUIRED'));
    }

    const hasAccess =
      allowedRoles.includes(req.user.role as any) ||
      (req.user.role === 'super_admin' && allowedRoles.includes('admin'));

    if (!hasAccess) {
      return next(
        new AppError('غير مصرح لك بتنفيذ هذه العملية.', 403, 'FORBIDDEN_ROLE')
      );
    }

    next();
  };
};

/**
 * Staff Authorization Middleware: Checks if authenticated user is any staff role
 */
export const requireStaff = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new AppError('يرجى تسجيل الدخول أولاً.', 401, 'AUTH_REQUIRED'));
  }

  if (!isStaffRole(req.user.role)) {
    return next(
      new AppError('هذا المسار مخصص لموظفي وإدارة النظام فقط.', 403, 'FORBIDDEN_STAFF_ONLY')
    );
  }

  next();
};

/**
 * Permission Authorization Middleware: Checks if authenticated user has ALL of required permissions
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('يرجى تسجيل الدخول أولاً.', 401, 'AUTH_REQUIRED'));
    }

    const userRole = req.user.role as UserRole;
    const hasAll = requiredPermissions.every((perm) => hasPermission(userRole, perm));

    if (!hasAll) {
      const errorCode = isStaffRole(userRole) ? 'FORBIDDEN_PERMISSION' : 'FORBIDDEN_ROLE';
      return next(
        new AppError(
          `ليس لديك الصلاحيات الكافية لتنفيذ هذه العملية. الصلاحيات المطلوبة: ${requiredPermissions.join(', ')}`,
          403,
          errorCode
        )
      );
    }

    next();
  };
};
