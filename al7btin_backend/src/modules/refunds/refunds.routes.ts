import { Router } from 'express';
import {
  getRefundRequests,
  createRefundRequest,
  getRefundById,
  reviewRefundRequest,
  approveRefundRequest,
  rejectRefundRequest,
  processRefundRequest,
} from './refunds.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

const router = Router();

// All refund endpoints require authentication
router.use(requireAuth);

router.get('/', requirePermission('view_refund_history'), getRefundRequests);
router.post('/request', requirePermission('request_refunds'), createRefundRequest);
router.get('/:id', requirePermission('view_refund_history'), getRefundById);
router.post('/:id/review', requirePermission('review_refunds'), reviewRefundRequest);
router.post('/:id/approve', requirePermission('approve_refunds'), approveRefundRequest);
router.post('/:id/reject', requirePermission('approve_refunds'), rejectRefundRequest);
router.post('/:id/process', requirePermission('execute_refunds'), processRefundRequest);

export const refundRoutes = router;
