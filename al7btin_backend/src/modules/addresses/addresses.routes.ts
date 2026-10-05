import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from './addresses.controller.js';

const router = Router();

router.get('/', requireAuth, getAddresses);
router.post('/', requireAuth, createAddress);
router.patch('/:id', requireAuth, updateAddress);
router.delete('/:id', requireAuth, deleteAddress);

export const addressRoutes = router;
