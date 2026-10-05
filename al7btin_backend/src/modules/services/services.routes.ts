import { Router } from 'express';
import {
  getServices,
  getServiceById,
  getServiceConfiguration,
  calculateServicePrice,
  createService,
  updateService,
  deleteService,
  createServiceOption,
  updateServiceOption,
  deleteServiceOption,
  getServiceBuilderData,
  saveServiceDraft,
  publishServiceConfiguration,
  unpublishService,
  archiveService,
  duplicateService,
  getServiceVersions,
  getServiceVersionSnapshot,
} from './services.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

const router = Router();

// =============================================================
// Public / Customer Dynamic Catalog & Pricing Endpoints
// =============================================================

// List active/published catalog services
router.get('/', getServices);

// Get service details by ID
router.get('/:id', getServiceById);

// Get active dynamic form configuration & rules schema
router.get('/:id/configuration', getServiceConfiguration);

// Authoritative real-time price calculation quote
router.post('/:id/calculate-price', calculateServicePrice);

// =============================================================
// Admin Dynamic Service Builder & Lifecycle Endpoints
// Protected by 'manage_services' permission (Super Admin & Admin)
// =============================================================

// Basic Service CRUD
router.post('/admin', requireAuth, requirePermission('manage_services'), createService);
router.patch('/admin/:id', requireAuth, requirePermission('manage_services'), updateService);
router.delete('/admin/:id', requireAuth, requirePermission('manage_services'), deleteService);

// Visual Service Builder & Draft Schema
router.get('/admin/:id/builder', requireAuth, requirePermission('manage_services'), getServiceBuilderData);
router.put('/admin/:id/builder', requireAuth, requirePermission('manage_services'), saveServiceDraft);

// Service Lifecycle & Versioned Publishing
router.post('/admin/:id/publish', requireAuth, requirePermission('manage_services'), publishServiceConfiguration);
router.post('/admin/:id/unpublish', requireAuth, requirePermission('manage_services'), unpublishService);
router.post('/admin/:id/archive', requireAuth, requirePermission('manage_services'), archiveService);
router.post('/admin/:id/duplicate', requireAuth, requirePermission('manage_services'), duplicateService);

// Historical Versions & Snapshots
router.get('/admin/:id/versions', requireAuth, requirePermission('manage_services'), getServiceVersions);
router.get('/admin/:id/versions/:version', requireAuth, requirePermission('manage_services'), getServiceVersionSnapshot);

// Service Options / Variants Admin Handlers (Legacy + Variants)
router.post('/admin/:serviceId/options', requireAuth, requirePermission('manage_services'), createServiceOption);
router.patch('/admin/options/:optionId', requireAuth, requirePermission('manage_services'), updateServiceOption);
router.delete('/admin/options/:optionId', requireAuth, requirePermission('manage_services'), deleteServiceOption);

export const serviceRoutes = router;
