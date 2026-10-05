import { Router } from 'express';
import {
  getSupportCases,
  createSupportCase,
  getSupportCaseById,
  updateSupportCase,
  addCaseNote,
} from './support-cases.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

const router = Router();

// All support case endpoints require authentication
router.use(requireAuth);

router.get('/', requirePermission('view_support_cases'), getSupportCases);
router.post('/', requirePermission('create_support_case'), createSupportCase);
router.get('/:id', requirePermission('view_support_cases'), getSupportCaseById);
router.patch('/:id', requirePermission('view_support_cases'), updateSupportCase);
router.post('/:id/notes', requirePermission('create_customer_notes'), addCaseNote);

export const supportCaseRoutes = router;
