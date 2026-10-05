import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { categoryRoutes } from './modules/categories/categories.routes.js';
import { serviceRoutes } from './modules/services/services.routes.js';
import { providerRoutes } from './modules/providers/providers.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { loyaltyRoutes } from './modules/loyalty/loyalty.routes.js';
import { addressRoutes } from './modules/addresses/addresses.routes.js';
import { orderRoutes } from './modules/orders/index.js';
import { couponRoutes } from './modules/coupons/index.js';
import { offerRoutes } from './modules/offers/offers.routes.js';
import { staffRoutes } from './modules/staff/index.js';
import { customerServiceRoutes } from './modules/customer-service/index.js';
import { supportCaseRoutes } from './modules/support-cases/index.js';
import { refundRoutes } from './modules/refunds/index.js';
import { auditLogRoutes } from './modules/audit-logs/index.js';
import { eventRoutes } from './modules/events/index.js';
import { quotationRoutes } from './modules/quotations/quotations.routes.js';
import { providerFinanceRoutes, adminFinanceRoutes, paymentRoutes } from './modules/finance/index.js';
import { reviewRoutes } from './modules/reviews/index.js';

export const createApp = (): Express => {
  const app = express();

  // 1. Request Correlation ID
  app.use(requestIdMiddleware);

  // 2. Core Security & CORS Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Idempotency-Key', 'X-Request-ID'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After', 'X-Request-ID'],
    })
  );

  // 3. Request Body Parsing Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Structured Request Logging
  app.use(requestLogger);

  // 5. REST & SSE API Routes
  app.use(`${env.API_PREFIX}/health`, healthRoutes);
  app.use(`${env.API_PREFIX}/auth`, authRoutes);
  app.use(`${env.API_PREFIX}/categories`, categoryRoutes);
  app.use(`${env.API_PREFIX}/services`, serviceRoutes);
  app.use(`${env.API_PREFIX}/providers/me`, providerFinanceRoutes);
  app.use(`${env.API_PREFIX}/providers`, providerRoutes);
  app.use(`${env.API_PREFIX}/provider`, providerRoutes);
  app.use(`${env.API_PREFIX}/provider`, providerFinanceRoutes);
  app.use(`${env.API_PREFIX}/orders`, orderRoutes);
  app.use(`${env.API_PREFIX}/admin/finance`, adminFinanceRoutes);
  app.use(`${env.API_PREFIX}/admin`, adminRoutes);
  app.use(`${env.API_PREFIX}/loyalty`, loyaltyRoutes);
  app.use(`${env.API_PREFIX}/addresses`, addressRoutes);
  app.use(`${env.API_PREFIX}/coupons`, couponRoutes);
  app.use(`${env.API_PREFIX}/offers`, offerRoutes);
  app.use(`${env.API_PREFIX}/staff`, staffRoutes);
  app.use(`${env.API_PREFIX}/customer-service`, customerServiceRoutes);
  app.use(`${env.API_PREFIX}/support-cases`, supportCaseRoutes);
  app.use(`${env.API_PREFIX}/refunds`, refundRoutes);
  app.use(`${env.API_PREFIX}/audit-logs`, auditLogRoutes);
  app.use(`${env.API_PREFIX}/events`, eventRoutes);
  app.use(`${env.API_PREFIX}/quotations`, quotationRoutes);
  app.use(`${env.API_PREFIX}/payments`, paymentRoutes);
  app.use(`${env.API_PREFIX}/reviews`, reviewRoutes);
  app.use(`${env.API_PREFIX}`, reviewRoutes);

  // 6. 404 Not Found Route Handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`المسار المطلوب غير متوفر: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
  });

  // 7. Centralized Error Handler
  app.use(errorHandler);

  return app;
};
