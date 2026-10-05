import { Router } from 'express';
import {
  getDeliveryEmployees,
  createDeliveryEmployee,
  updateDeliveryEmployee,
  deleteDeliveryEmployee,
  getDeliveryCapabilities,
  updateDeliveryCapabilities,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  suspendUser,
  activateUser,
  getAdminDashboardStats,
  getAdminOrders,
  getAdminDiagnostics,
} from './admin.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

import { dispatchAdminRoutes } from './dispatch.routes.js';

const router = Router();

// All admin routes require ADMIN authorization
router.use(requireAuth, requireRole('admin'));

// Smart Dispatch Operations Center
router.use('/dispatch', dispatchAdminRoutes);

// System Diagnostics (Super Admin / Admin)
router.get('/diagnostics', getAdminDiagnostics);

// Orders Management
router.get('/orders', getAdminOrders);

// Delivery Employees Management
router.get('/delivery-employees', getDeliveryEmployees);
router.post('/delivery-employees', createDeliveryEmployee);
router.patch('/delivery-employees/:id', updateDeliveryEmployee);
router.delete('/delivery-employees/:id', deleteDeliveryEmployee);
router.get('/delivery-employees/:id/capabilities', getDeliveryCapabilities);
router.put('/delivery-employees/:id/capabilities', updateDeliveryCapabilities);

// Users Management
router.get('/users', getUsers);
router.post('/users', createUser);
router.get('/users/:id', getUserById);
router.patch('/users/:id', updateUser);
router.post('/users/:id/suspend', suspendUser);
router.post('/users/:id/activate', activateUser);

// Dashboard Live Stats
router.get('/stats', getAdminDashboardStats);

export const adminRoutes = router;
