import { Request, Response } from 'express';
import { checkDatabaseHealth, getDatabaseMetrics } from '../../config/database.js';
import { cacheService } from '../../services/cache.service.js';
import { queueService } from '../../services/queue.service.js';

/**
 * Liveness Probe: GET /api/v1/health
 * Fast check indicating process is alive and responsive.
 * Preserves existing contract for Flutter mobile app ApiConfig.
 */
export const getHealth = async (req: Request, res: Response): Promise<void> => {
  const { isConnected } = await checkDatabaseHealth();
  const dbStatus = isConnected ? 'connected' : 'unreachable';
  const isHealthy = isConnected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'btin7al-api',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Readiness Probe: GET /api/v1/ready
 * Comprehensive dependency readiness check (PostgreSQL pool, memory, cache).
 */
export const getReady = async (req: Request, res: Response): Promise<void> => {
  const { isConnected, latencyMs, error } = await checkDatabaseHealth();
  const memoryUsage = process.memoryUsage();
  const isReady = isConnected;

  const responsePayload = {
    status: isReady ? 'ready' : 'not_ready',
    service: 'btin7al-api',
    checks: {
      database: {
        status: isConnected ? 'up' : 'down',
        latencyMs,
        ...(error && { error }),
      },
      memory: {
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      cache: cacheService.getMetrics(),
      queue: queueService.getMetrics(),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(isReady ? 200 : 503).json(responsePayload);
};
