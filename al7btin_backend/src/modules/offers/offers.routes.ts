import { Router } from 'express';
import {
  getPublicOffers,
  getAdminOffers,
  createAdminOffer,
  updateAdminOffer,
  deleteAdminOffer,
} from './offers.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

// Public / Customer Endpoints
router.get('/', getPublicOffers);

// Admin Management Endpoints
router.get('/admin', requireAuth, requireRole('admin'), getAdminOffers);
router.post('/admin', requireAuth, requireRole('admin'), createAdminOffer);
router.patch('/admin/:id', requireAuth, requireRole('admin'), updateAdminOffer);
router.delete('/admin/:id', requireAuth, requireRole('admin'), deleteAdminOffer);

export const offerRoutes = router;
