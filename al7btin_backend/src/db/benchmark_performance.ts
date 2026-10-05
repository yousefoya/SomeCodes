import request from 'supertest';
import { createApp } from '../app.js';
import { db } from './index.js';
import { users } from './schema/users.schema.js';
import { providers } from './schema/providers.schema.js';
import { services } from './schema/services.schema.js';
import { eq } from 'drizzle-orm';
import { generateTokens } from '../modules/auth/utils/jwt.js';

async function runBenchmark() {
  console.log('⚡ ========================================================');
  console.log('⚡ BTIN7AL PHASE 1 BACKEND REAL PERFORMANCE BENCHMARK');
  console.log('⚡ ========================================================\n');

  const app = createApp();

  // Setup test customer & admin
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

  const token = generateTokens(custUser).accessToken;

  // Setup admin
  const [adminUser] = await db.insert(users).values({
    phoneNumber: '0799990002',
    name: 'Benchmark Admin',
    role: 'admin',
  }).onConflictDoUpdate({
    target: users.phoneNumber,
    set: { role: 'admin' },
  }).returning();

  const adminToken = generateTokens(adminUser).accessToken;

  // Find a real provider and service
  const prov = await db.query.providers.findFirst({
    where: eq(providers.isActive, true),
  });
  const srv = await db.query.services.findFirst({
    where: eq(services.isActive, true),
  });

  const results: Array<{ name: string; avgMs: number; minMs: number; maxMs: number; iterations: number }> = [];

  async function benchmarkEndpoint(name: string, fn: () => Promise<any>, iterations = 10) {
    const timings: number[] = [];
    // Warmup
    await fn();

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      timings.push(end - start);
    }

    const min = Math.min(...timings);
    const max = Math.max(...timings);
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;

    results.push({
      name,
      avgMs: Math.round(avg * 100) / 100,
      minMs: Math.round(min * 100) / 100,
      maxMs: Math.round(max * 100) / 100,
      iterations,
    });

    console.log(`⏱️  [${name}] Avg: ${avg.toFixed(2)}ms | Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms (${iterations} runs)`);
  }

  // 1. GET /api/v1/services
  await benchmarkEndpoint('GET /api/v1/services (Catalog)', async () => {
    return request(app).get('/api/v1/services');
  });

  // 2. GET /api/v1/providers?serviceId=...
  if (srv) {
    await benchmarkEndpoint(`GET /api/v1/providers?serviceId=${srv.id} (Indexed Discovery)`, async () => {
      return request(app).get(`/api/v1/providers?serviceId=${srv.id}`);
    });
  }

  // 3. GET /api/v1/admin/stats
  await benchmarkEndpoint('GET /api/v1/admin/stats (Parallel Aggregations)', async () => {
    return request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${adminToken}`);
  });

  // 4. POST /api/v1/orders (Atomic Transactional Creation)
  if (srv && prov) {
    await benchmarkEndpoint('POST /api/v1/orders (Transactional Atomic Order Creation)', async () => {
      return request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
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
    }, 5);
  }

  // 5. Idempotent Repeated Order Request
  if (srv && prov) {
    const fixedIdempKey = `bench-idemp-${Date.now()}`;
    // First creation
    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', fixedIdempKey)
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

    await benchmarkEndpoint('POST /api/v1/orders with Idempotency-Key (Fast Dedup Return)', async () => {
      return request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', fixedIdempKey)
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
    }, 10);
  }

  // 6. GET /api/v1/orders/my (Indexed Customer Order History)
  await benchmarkEndpoint('GET /api/v1/orders/my (Indexed Customer History with Pagination)', async () => {
    return request(app).get('/api/v1/orders/my?page=1&limit=20').set('Authorization', `Bearer ${token}`);
  });

  console.log('\n📊 Summary Results:');
  console.table(results);
  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
