import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = 'statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : 500;
  const errorCode = 'code' in err && typeof err.code === 'string' ? err.code : 'INTERNAL_SERVER_ERROR';
  const details = 'details' in err && err.details ? err.details : undefined;
  const requestId = req.id || (req.headers['x-request-id'] as string) || undefined;

  console.error(`💥 Error [${errorCode}] on ${req.method} ${req.originalUrl} [ReqID: ${requestId || 'N/A'}]:`, err.message);
  if (env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message:
        statusCode === 500 && env.NODE_ENV === 'production'
          ? 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة لاحقاً.'
          : err.message || 'Internal Server Error',
      ...(details && { details }),
      ...(requestId && { requestId }),
    },
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
