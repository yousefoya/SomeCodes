import postgres from 'postgres';
import { env } from './env.js';

export interface DatabasePoolMetrics {
  maxConnections: number;
  idleTimeout: number;
  connectTimeout: number;
  isAlive: boolean;
  latencyMs?: number;
}

export const sql = postgres(env.DATABASE_URL, {
  max: env.DATABASE_POOL_MAX,
  idle_timeout: env.DATABASE_IDLE_TIMEOUT,
  connect_timeout: env.DATABASE_CONNECT_TIMEOUT,
  onnotice: () => {},
});

/**
 * Health check helper that performs a live ping and measures latency
 */
export const checkDatabaseHealth = async (): Promise<{ isConnected: boolean; latencyMs: number; error?: string }> => {
  const start = Date.now();
  try {
    const result = await sql`SELECT 1 as ping`;
    const latencyMs = Date.now() - start;
    const isConnected = Array.isArray(result) && result.length > 0;
    return { isConnected, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return {
      isConnected: false,
      latencyMs,
      error: (err as Error).message,
    };
  }
};

/**
 * Get pool configuration metrics for observability
 */
export const getDatabaseMetrics = (): DatabasePoolMetrics => {
  return {
    maxConnections: env.DATABASE_POOL_MAX,
    idleTimeout: env.DATABASE_IDLE_TIMEOUT,
    connectTimeout: env.DATABASE_CONNECT_TIMEOUT,
    isAlive: true,
  };
};
