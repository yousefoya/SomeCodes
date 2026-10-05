import { Router } from 'express';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from './categories.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

// Public Customer Routes
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin Management Routes
router.post('/admin', requireAuth, requireRole('admin'), createCategory);
router.patch('/admin/:id', requireAuth, requireRole('admin'), updateCategory);
router.delete('/admin/:id', requireAuth, requireRole('admin'), deleteCategory);

export const categoryRoutes = router;
