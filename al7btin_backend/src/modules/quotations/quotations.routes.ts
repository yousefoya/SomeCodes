import { Router } from 'express';
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  sendQuotation,
  approveQuotation,
  rejectQuotation,
} from './quotations.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// All quotation endpoints require authentication
router.use(requireAuth);

router.post('/', createQuotation);
router.get('/', getQuotations);
router.get('/order/:orderId', (req, res, next) => {
  req.query.orderId = req.params.orderId;
  return getQuotations(req, res, next);
});
router.get('/:id', getQuotationById);
router.patch('/:id', updateQuotation);
router.post('/:id/send', sendQuotation);
router.post('/:id/approve', approveQuotation);
router.post('/:id/reject', rejectQuotation);

export const quotationRoutes = router;
