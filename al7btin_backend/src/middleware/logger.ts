import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export interface StructuredLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  ip?: string;
  userId?: string;
  userRole?: string;
  userAgent?: string;
  contentLength?: string;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = req.startTime || Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const requestId = req.id || (req.headers['x-request-id'] as string) || 'N/A';
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userAgent = req.headers['user-agent'];
    const contentLength = res.getHeader('content-length') as string;

    const level: 'INFO' | 'WARN' | 'ERROR' =
      statusCode >= 500 ? 'ERROR' : statusCode >= 400 || duration >= 500 ? 'WARN' : 'INFO';

    if (env.NODE_ENV === 'production') {
      const logEntry: StructuredLogEntry = {
        timestamp: new Date().toISOString(),
        level,
        requestId,
        method,
        url: originalUrl,
        statusCode,
        durationMs: duration,
        ip,
        ...(userId && { userId }),
        ...(userRole && { userRole }),
        ...(userAgent && { userAgent }),
        ...(contentLength && { contentLength }),
      };
      console.log(JSON.stringify(logEntry));
    } else {
      const logMessage = `[${new Date().toISOString()}] [Req: ${requestId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms - ${ip}${userId ? ` (User: ${userId}/${userRole})` : ''}`;

      if (duration >= 500) {
        console.warn(`🐢 [SLOW REQUEST] ${logMessage} (Duration > 500ms)`);
      } else if (statusCode >= 400) {
        console.warn(`⚠️  ${logMessage}`);
      } else {
        console.log(`ℹ️  ${logMessage}`);
      }
    }
  });

  next();
};
