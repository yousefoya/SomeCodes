import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  getMyLoyalty,
  redeemLoyaltyReward,
  getLoyaltySettingsAdmin,
  updateLoyaltySettingsAdmin,
} from './loyalty.controller.js';

const router = Router();

// Customer loyalty points & redemption routes (Authenticated customer)
router.get('/my-points', requireAuth, getMyLoyalty);
router.post('/redeem', requireAuth, redeemLoyaltyReward);

// Admin loyalty reward settings routes (Admin only)
router.get('/admin/settings', requireAuth, requireRole('admin'), getLoyaltySettingsAdmin);
router.put('/admin/settings', requireAuth, requireRole('admin'), updateLoyaltySettingsAdmin);

export const loyaltyRoutes = router;
