import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { eventsService } from '../../services/events.service.js';

/**
 * Real-Time Server-Sent Events (SSE) Stream
 * GET /api/v1/events/stream
 */
export const streamEvents = (req: Request, res: Response): void => {
  const user = req.user!;
  const clientId = `sse_${user.id.slice(0, 8)}_${randomUUID().slice(0, 6)}`;

  // Set SSE mandatory headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx)
  res.flushHeaders?.();

  // Register client
  eventsService.addClient(clientId, user.id, user.role, res);

  // Clean up when client disconnects
  req.on('close', () => {
    eventsService.removeClient(clientId);
  });
};
