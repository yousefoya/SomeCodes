import { Router } from 'express';
import {
  getStaffList,
  createStaff,
  getStaffById,
  updateStaff,
  toggleStaffStatus,
  getStaffDashboardSummary,
} from './staff.controller.js';
import { requireAuth, requireStaff, requirePermission } from '../../middleware/auth.js';

const router = Router();

// All staff endpoints require authentication
router.use(requireAuth);

// Dashboard summary is role-tailored and available to all authenticated staff
router.get('/dashboard/summary', requireStaff, getStaffDashboardSummary);

// Staff management endpoints require 'manage_staff' permission (Super Admin / Admin)
router.get('/', requirePermission('manage_staff'), getStaffList);
router.post('/', requirePermission('manage_staff'), createStaff);
router.get('/:id', requireStaff, getStaffById);
router.patch('/:id', requirePermission('manage_staff'), updateStaff);
router.post('/:id/toggle-status', requirePermission('manage_staff'), toggleStaffStatus);

export const staffRoutes = router;
