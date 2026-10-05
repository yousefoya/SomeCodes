import { Router } from 'express';
import {
  getProviders,
  getProviderById,
  getAllProvidersAdmin,
  createProvider,
  updateProvider,
  deleteProvider,
  getMyProviderProfile,
  getMyProviderServices,
  updateMyServiceAvailability,
  updateMyProviderStatus,
  updateMyProviderProfile,
  getMyProviderOrders,
  getMyDispatchOffers,
  acceptDispatchOffer,
  rejectDispatchOffer,
  getMyProviderJobs,
  providerMarkArriving,
  providerMarkArrived,
  providerStartService,
  providerCompleteService,
  providerReportIssue,
  providerCreateQuotation,
} from './providers.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { updateOrderStatus } from '../orders/index.js';

const router = Router();

// ==========================================
// Phase 5: Provider Smart Dispatch & Offers
// ==========================================
router.get('/me/offers', requireAuth, requireRole('provider', 'admin'), getMyDispatchOffers);
router.post('/me/offers/:offerId/accept', requireAuth, requireRole('provider', 'admin'), acceptDispatchOffer);
router.post('/me/offers/:offerId/reject', requireAuth, requireRole('provider', 'admin'), rejectDispatchOffer);

// ==========================================
// Phase 5: Provider Operational Job Lifecycle
// ==========================================
router.get('/me/jobs', requireAuth, requireRole('provider', 'admin'), getMyProviderJobs);
router.patch('/me/jobs/:orderId/arriving', requireAuth, requireRole('provider', 'admin'), providerMarkArriving);
router.patch('/me/jobs/:orderId/arrived', requireAuth, requireRole('provider', 'admin'), providerMarkArrived);
router.patch('/me/jobs/:orderId/start', requireAuth, requireRole('provider', 'admin'), providerStartService);
router.patch('/me/jobs/:orderId/complete', requireAuth, requireRole('provider', 'admin'), providerCompleteService);
router.post('/me/jobs/:orderId/report-issue', requireAuth, requireRole('provider', 'admin'), providerReportIssue);
router.post('/me/jobs/:orderId/quotation', requireAuth, requireRole('provider', 'admin'), providerCreateQuotation);

// Provider Self Profile, Status, Orders & Services
router.get('/me', requireAuth, getMyProviderProfile);
router.patch('/me/status', requireAuth, requireRole('provider', 'admin'), updateMyProviderStatus);
router.patch('/me/profile', requireAuth, requireRole('provider', 'admin'), updateMyProviderProfile);
router.get('/me/orders', requireAuth, requireRole('provider', 'admin'), getMyProviderOrders);
router.patch('/status', requireAuth, requireRole('provider', 'admin'), updateMyProviderStatus);
router.patch('/profile', requireAuth, requireRole('provider', 'admin'), updateMyProviderProfile);
router.get('/orders', requireAuth, requireRole('provider', 'admin'), getMyProviderOrders);
router.patch('/orders/:id/status', requireAuth, requireRole('provider', 'admin'), updateOrderStatus);
router.patch('/orders/:id/accept', requireAuth, requireRole('provider', 'admin'), (req, res, next) => {
  req.body.status = 'accepted';
  if (!req.body.notes) req.body.notes = 'تم قبول وتجهيز الطلب من قبل المزود';
  return updateOrderStatus(req, res, next);
});
router.patch('/orders/:id/reject', requireAuth, requireRole('provider', 'admin'), (req, res, next) => {
  req.body.status = 'rejected';
  if (!req.body.notes) req.body.notes = 'تم رفض الطلب من قبل المزود';
  return updateOrderStatus(req, res, next);
});
router.get('/services', requireAuth, requireRole('provider', 'admin'), getMyProviderServices);
router.patch('/services/:serviceId/availability', requireAuth, requireRole('provider', 'admin'), updateMyServiceAvailability);

// Public Customer Routes
router.get('/', getProviders);
router.get('/:id', getProviderById);

// Admin Management Routes
router.get('/admin/all', requireAuth, requireRole('admin'), getAllProvidersAdmin);
router.post('/admin', requireAuth, requireRole('admin'), createProvider);
router.patch('/admin/:id', requireAuth, requireRole('admin'), updateProvider);
router.delete('/admin/:id', requireAuth, requireRole('admin'), deleteProvider);

export const providerRoutes = router;
