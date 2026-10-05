import { Router } from 'express';
import {
  getDispatchQueue,
  getOrderDispatchDetail,
  manualAssignProvider,
  retryAutoDispatch,
  getDispatchAnalytics,
  getDispatchSettings,
  updateDispatchSettings,
} from './dispatch.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

// All dispatch routes require ADMIN authorization
router.use(requireAuth, requireRole('admin'));

// Dispatch Analytics & Settings
router.get('/analytics', getDispatchAnalytics);
router.get('/settings', getDispatchSettings);
router.put('/settings', updateDispatchSettings);

// Dispatch Queue & Order Details
router.get('/', getDispatchQueue);
router.get('/:orderId', getOrderDispatchDetail);

// Operational Dispatch Actions
router.post('/:orderId/assign', manualAssignProvider);
router.post('/:orderId/retry', retryAutoDispatch);

export const dispatchAdminRoutes = router;
