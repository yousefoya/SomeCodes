import { Router } from 'express';
import {
  searchCustomers,
  searchOrders,
  getCustomerSummary,
  getCustomerNotes,
  createCustomerNote,
} from './customer-service.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

const router = Router();

// All customer service routes require authentication
router.use(requireAuth);

router.get('/customers/search', requirePermission('view_customers'), searchCustomers);
router.get('/orders/search', requirePermission('view_orders'), searchOrders);
router.get('/customers/:id/summary', requirePermission('view_customer_history'), getCustomerSummary);
router.get('/notes', requirePermission('view_customer_history'), getCustomerNotes);
router.post('/notes', requirePermission('create_customer_notes'), createCustomerNote);

export const customerServiceRoutes = router;
