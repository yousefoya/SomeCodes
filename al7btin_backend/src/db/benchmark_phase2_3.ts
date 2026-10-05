import request from 'supertest';
import { createApp } from '../app.js';
import { db } from './index.js';
import { users } from './schema/users.schema.js';
import { providers } from './schema/providers.schema.js';
import { services } from './schema/services.schema.js';
import { eq } from 'drizzle-orm';
import { generateTokens } from '../modules/auth/utils/jwt.js';
import { cacheService } from '../services/cache.service.js';

interface LatencyMetrics {
  name: string;
  category: string;
  totalRequests: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  throughputRps: number;
}

function calculatePercentiles(latencies: number[]): { p50: number; p95: number; p99: number; min: number; max: number; avg: number } {
  latencies.sort((a, b) => a - b);
  const len = latencies.length;
  const p50 = latencies[Math.floor(len * 0.50)] || 0;
  const p95 = latencies[Math.floor(len * 0.95)] || 0;
  const p99 = latencies[Math.floor(len * 0.99)] || 0;
  const min = latencies[0] || 0;
  const max = latencies[len - 1] || 0;
  const avg = latencies.reduce((a, b) => a + b, 0) / (len || 1);

  return {
    p50: Math.round(p50 * 100) / 100,
    p95: Math.round(p95 * 100) / 100,
    p99: Math.round(p99 * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    avg: Math.round(avg * 100) / 100,
  };
}

async function runBenchmarkSuite() {
  console.log('🚀 ================================================================');
  console.log('🚀 BTIN7AL PHASE 2 + PHASE 3 REAL PERFORMANCE & LATENCY BENCHMARK');
  console.log('🚀 ================================================================\n');

  const app = createApp();

  // 1. Setup Benchmark Super Admin
  const [adminUser] = await db
    .insert(users)
    .values({
      phoneNumber: '0799990002',
      name: 'Benchmark Super Admin',
      role: 'super_admin',
    })
    .onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'super_admin' },
    })
    .returning();

  const adminToken = generateTokens(adminUser).accessToken;

  // 2. Setup Benchmark Customer
  const [custUser] = await db
    .insert(users)
    .values({
      phoneNumber: '0799990001',
      name: 'Benchmark Customer',
      role: 'customer',
    })
    .onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'customer' },
    })
    .returning();

  const custToken = generateTokens(custUser).accessToken;

  // 3. Setup Benchmark Customer Service Agent
  const [agentUser] = await db
    .insert(users)
    .values({
      phoneNumber: '0799990003',
      name: 'Benchmark CS Agent',
      role: 'customer_service_agent',
    })
    .onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'customer_service_agent' },
    })
    .returning();

  const agentToken = generateTokens(agentUser).accessToken;

  const prov = await db.query.providers.findFirst({ where: eq(providers.isActive, true) });
  const srv = await db.query.services.findFirst({ where: eq(services.isActive, true) });

  const metricsReport: LatencyMetrics[] = [];

  async function benchmarkScenario(
    name: string,
    category: string,
    fn: () => Promise<any>,
    concurrency: number = 1,
    totalRequests: number = 30
  ) {
    const timings: number[] = [];
    // Warmup
    await fn();

    const overallStart = performance.now();

    const runBatch = async (batchSize: number) => {
      const promises: Promise<void>[] = [];
      for (let i = 0; i < batchSize; i++) {
        promises.push(
          (async () => {
            const start = performance.now();
            await fn();
            const end = performance.now();
            timings.push(end - start);
          })()
        );
      }
      await Promise.all(promises);
    };

    let remaining = totalRequests;
    while (remaining > 0) {
      const currentBatch = Math.min(remaining, concurrency);
      await runBatch(currentBatch);
      remaining -= currentBatch;
    }

    const overallEnd = performance.now();
    const totalDurationSeconds = (overallEnd - overallStart) / 1000;
    const throughputRps = Math.round((totalRequests / totalDurationSeconds) * 10) / 10;

    const stats = calculatePercentiles(timings);

    metricsReport.push({
      name,
      category,
      totalRequests,
      avgMs: stats.avg,
      p50Ms: stats.p50,
      p95Ms: stats.p95,
      p99Ms: stats.p99,
      minMs: stats.min,
      maxMs: stats.max,
      throughputRps,
    });

    console.log(
      `📊 [${category}] ${name}\n` +
      `   Avg: ${stats.avg}ms | p50: ${stats.p50}ms | p95: ${stats.p95}ms | p99: ${stats.p99}ms | Throughput: ${throughputRps} req/sec`
    );
  }

  // --- BENCHMARK SUITES ---

  // 1. Core Health & Diagnostics
  await benchmarkScenario('GET /health (Liveness Probe)', 'Reliability', async () => {
    return request(app).get('/health');
  }, 5, 50);

  await benchmarkScenario('GET /ready (Readiness Probe + DB Ping)', 'Reliability', async () => {
    return request(app).get('/ready');
  }, 5, 50);

  await benchmarkScenario('GET /api/v1/admin/diagnostics (System Metrics)', 'Observability', async () => {
    return request(app).get('/api/v1/admin/diagnostics').set('Authorization', `Bearer ${adminToken}`);
  }, 5, 30);

  // 2. Catalog & Caching Performance
  // Invalidate cache first to test cold hit
  await cacheService.flush();
  await benchmarkScenario('GET /api/v1/services (Cold Database Read)', 'Performance & Cache', async () => {
    await cacheService.flush();
    return request(app).get('/api/v1/services');
  }, 1, 10);

  // Warm cached reads
  await request(app).get('/api/v1/services');
  await benchmarkScenario('GET /api/v1/services (Warm Cache Hit - Sub-millisecond)', 'Performance & Cache', async () => {
    return request(app).get('/api/v1/services');
  }, 10, 100);

  // Indexed Provider Discovery
  if (srv) {
    await benchmarkScenario(`GET /api/v1/providers?serviceId=${srv.id} (Indexed Discovery)`, 'Performance & Cache', async () => {
      return request(app).get(`/api/v1/providers?serviceId=${srv.id}`);
    }, 5, 50);
  }

  // 3. Staff & Customer Service Operations
  await benchmarkScenario('GET /api/v1/customer-service/customers/search?q=079 (Search)', 'Staff & CS', async () => {
    return request(app).get('/api/v1/customer-service/customers/search?q=079').set('Authorization', `Bearer ${agentToken}`);
  }, 5, 30);

  await benchmarkScenario('GET /api/v1/support-cases (Paginated Case Roster)', 'Staff & CS', async () => {
    return request(app).get('/api/v1/support-cases?page=1&limit=20').set('Authorization', `Bearer ${agentToken}`);
  }, 5, 30);

  await benchmarkScenario('GET /api/v1/refunds (Paginated Refunds Ledger)', 'Staff & CS', async () => {
    return request(app).get('/api/v1/refunds?page=1&limit=20').set('Authorization', `Bearer ${agentToken}`);
  }, 5, 30);

  await benchmarkScenario('GET /api/v1/audit-logs (Security Audit Trail)', 'Audit & Security', async () => {
    return request(app).get('/api/v1/audit-logs?page=1&limit=25').set('Authorization', `Bearer ${adminToken}`);
  }, 5, 30);

  // 4. Atomic Order Creation & Deduplication
  if (srv && prov) {
    await benchmarkScenario('POST /api/v1/orders (Atomic PostgreSQL Transaction)', 'Order Engine', async () => {
      return request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${custToken}`)
        .send({
          serviceCategoryId: 'cat_products',
          providerId: prov.id,
          items: [{ serviceId: srv.id, quantity: 1 }],
          deliveryAddress: {
            city: 'عمان',
            area: 'خلدا',
            streetAddress: 'شارع وصفي التل',
          },
        });
    }, 1, 10);

    const testIdempKey = `bench-idemp-p23-${Date.now()}`;
    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${custToken}`)
      .set('Idempotency-Key', testIdempKey)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: prov.id,
        items: [{ serviceId: srv.id, quantity: 1 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    await benchmarkScenario('POST /api/v1/orders (Fast Deduplication Return via Key)', 'Order Engine', async () => {
      return request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${custToken}`)
        .set('Idempotency-Key', testIdempKey)
        .send({
          serviceCategoryId: 'cat_products',
          providerId: prov.id,
          items: [{ serviceId: srv.id, quantity: 1 }],
          deliveryAddress: {
            city: 'عمان',
            area: 'خلدا',
            streetAddress: 'شارع وصفي التل',
          },
        });
    }, 10, 50);
  }

  // 5. Concurrent Load Test (50 simultaneous requests)
  await benchmarkScenario('GET /api/v1/admin/stats (50 Concurrent Aggregation Requests)', 'Concurrency & Scale', async () => {
    return request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${adminToken}`);
  }, 25, 50);

  console.log('\n📈 ================================================================');
  console.log('📈 BENCHMARK RESULTS TABLE:');
  console.log('📈 ================================================================');
  console.table(metricsReport);

  await import('../config/database.js').then((m) => m.sql.end());
  process.exit(0);
}

runBenchmarkSuite().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
