import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request interface to include id and startTime
declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime?: number;
    }
  }
}

/**
 * Request Correlation ID Middleware
 * Validates incoming X-Request-ID or generates a cryptographically secure UUIDv4.
 * Attaches to req.id and sets X-Request-ID on the response.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incomingId = req.headers['x-request-id'];
  
  // Reuse valid client-provided ID (alphanumeric, dashes, underscores, max 100 chars) or generate UUID
  const requestId =
    typeof incomingId === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(incomingId.trim())
      ? incomingId.trim()
      : randomUUID();

  req.id = requestId;
  req.startTime = Date.now();

  res.setHeader('X-Request-ID', requestId);
  next();
};
