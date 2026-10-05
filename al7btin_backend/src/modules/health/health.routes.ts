import { Router } from 'express';
import { getHealth, getReady } from './health.controller.js';

const router = Router();

// Liveness probe (public)
router.get('/', getHealth);

// Readiness probe (public)
router.get('/ready', getReady);

export const healthRoutes = router;
