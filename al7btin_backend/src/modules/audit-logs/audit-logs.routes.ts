import { Router } from 'express';
import { getAuditLogs } from './audit-logs.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

const router = Router();

// All audit log endpoints require authentication & 'view_audit_logs' permission
router.use(requireAuth);

router.get('/', requirePermission('view_audit_logs'), getAuditLogs);

export const auditLogRoutes = router;
