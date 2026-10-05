import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { streamEvents } from './events.controller.js';

const router = Router();

// Authenticated SSE stream
router.get('/stream', requireAuth, streamEvents);

export const eventRoutes = router;
