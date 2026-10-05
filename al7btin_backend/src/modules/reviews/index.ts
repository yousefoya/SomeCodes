import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { createOrderReview, getReviewByOrderId, getProviderReviews } from './reviews.controller.js';

const router = Router();

// Submit review for an order
router.post('/orders/:id/review', requireAuth, createOrderReview);
router.get('/orders/:id/review', requireAuth, getReviewByOrderId);

// Provider reviews
router.get('/providers/:providerId', getProviderReviews);

export const reviewRoutes = router;
