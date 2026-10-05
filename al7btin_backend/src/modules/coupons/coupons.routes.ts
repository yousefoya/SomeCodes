import { Router } from 'express';
import {
  getPublicCoupons,
  validateCoupon,
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
} from './coupons.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

// Public / Customer Endpoints
router.get('/', getPublicCoupons);
router.post('/validate', validateCoupon);

// Admin Management Endpoints
router.get('/admin', requireAuth, requireRole('admin'), getAdminCoupons);
router.post('/admin', requireAuth, requireRole('admin'), createAdminCoupon);
router.patch('/admin/:id', requireAuth, requireRole('admin'), updateAdminCoupon);
router.delete('/admin/:id', requireAuth, requireRole('admin'), deleteAdminCoupon);

export const couponRoutes = router;
