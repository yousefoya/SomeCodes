import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/users.schema.js';
import { providers, providerServices, providerCoverageAreas } from '../../db/schema/providers.schema.js';
import { orders, orderItems } from '../../db/schema/orders.schema.js';
import { dispatchOffers, providerCapabilities } from '../../db/schema/dispatch.schema.js';
import { eq, inArray } from 'drizzle-orm';
import { generateTokens } from '../auth/utils/jwt.js';

const app = createApp();

function generateAuthToken(user: { id: string; role: string; phoneNumber: string; name: string }) {
  return generateTokens(user as any).accessToken;
}

describe('🚀 Phase 5: Provider Dispatch, Smart Matching, Concurrency & Operations Test Suite', () => {
  let adminToken: string;
  let customerToken: string;
  let provider1Token: string;
  let provider2Token: string;
  let testOrderId: string;
  let provider1Id: string;
  let provider2Id: string;
  let customerId: string;

  before(async () => {
    // 1. Fetch or create Admin user
    let [admin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    if (!admin) {
      [admin] = await db
        .insert(users)
        .values({
          phoneNumber: '0799990001',
          name: 'Test Admin',
          role: 'admin',
        })
        .returning();
    }
    adminToken = generateAuthToken(admin);

    // 2. Fetch or create Customer user
    let [customer] = await db.select().from(users).where(eq(users.role, 'customer')).limit(1);
    if (!customer) {
      [customer] = await db
        .insert(users)
        .values({
          phoneNumber: '0788880002',
          name: 'Test Customer Phase 5',
          role: 'customer',
        })
        .returning();
    }
    customerId = customer.id;
    customerToken = generateAuthToken(customer);

    // 3. Ensure at least two active providers with services & capabilities
    const existingProviders = await db.query.providers.findMany({
      where: eq(providers.isActive, true),
      limit: 2,
    });

    if (existingProviders.length >= 2) {
      provider1Id = existingProviders[0].id;
      provider2Id = existingProviders[1].id;

      // Ensure user for provider 1
      let u1 = existingProviders[0].userId
        ? await db.query.users.findFirst({ where: eq(users.id, existingProviders[0].userId) })
        : null;
      if (!u1) {
        [u1] = await db
          .insert(users)
          .values({
            phoneNumber: existingProviders[0].phoneNumber,
            name: existingProviders[0].nameAr,
            role: 'provider',
          })
          .returning();
        await db.update(providers).set({ userId: u1.id }).where(eq(providers.id, provider1Id));
      }
      provider1Token = generateAuthToken(u1);

      // Ensure user for provider 2
      let u2 = existingProviders[1].userId
        ? await db.query.users.findFirst({ where: eq(users.id, existingProviders[1].userId) })
        : null;
      if (!u2) {
        [u2] = await db
          .insert(users)
          .values({
            phoneNumber: existingProviders[1].phoneNumber,
            name: existingProviders[1].nameAr,
            role: 'provider',
          })
          .returning();
        await db.update(providers).set({ userId: u2.id }).where(eq(providers.id, provider2Id));
      }
      provider2Token = generateAuthToken(u2);

      // Ensure service assignment for provider 1 and 2
      await db
        .insert(providerServices)
        .values([
          { providerId: provider1Id, serviceId: 'srv_home_cleaning', isAvailable: true },
          { providerId: provider2Id, serviceId: 'srv_home_cleaning', isAvailable: true },
        ])
        .onConflictDoNothing();

      await db
        .insert(providerCoverageAreas)
        .values([
          { providerId: provider1Id, areaName: 'خلدا' },
          { providerId: provider2Id, areaName: 'خلدا' },
        ])
        .onConflictDoNothing();
    }
  });

  it('1. Customer creates an order that triggers automatic smart dispatch', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceCategoryId: 'cat_home_services',
        items: [
          {
            serviceId: 'srv_home_cleaning',
            quantity: 1,
            answers: {
              building_type: 'apartment',
              area_sqm: 120,
              furnished: 'furnished',
              window_cleaning: true,
            },
          },
        ],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل، عمارة 12',
          latitude: 31.9800,
          longitude: 35.8450,
        },
        paymentMethod: 'cash_on_delivery',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.id.startsWith('ORD-'));
    testOrderId = res.body.data.id;
  });

  it('2. Admin can query the Dispatch Queue and inspect candidate scoring breakdown', async () => {
    const queueRes = await request(app)
      .get('/api/v1/admin/dispatch')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(queueRes.status, 200);
    assert.strictEqual(queueRes.body.success, true);
    assert(Array.isArray(queueRes.body.data));

    const detailRes = await request(app)
      .get(`/api/v1/admin/dispatch/${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.body.success, true);
    assert.strictEqual(detailRes.body.data.order.id, testOrderId);
    assert(Array.isArray(detailRes.body.data.liveCandidates));
    assert(detailRes.body.data.totalEligibleCandidates >= 0);
  });

  it('3. Provider can view their active dispatch offers with SLA countdown', async () => {
    const res = await request(app)
      .get('/api/v1/providers/me/offers')
      .set('Authorization', `Bearer ${provider1Token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
  });

  it('4. ATOMIC CONCURRENCY TEST: Exactly ONE provider wins an offer in simultaneous race condition', async () => {
    // Manually create a test offer for provider1 and provider2 on testOrderId
    const expiresAt = new Date(Date.now() + 120 * 1000);
    const [offer1] = await db
      .insert(dispatchOffers)
      .values({
        orderId: testOrderId,
        providerId: provider1Id,
        attemptNumber: 1,
        status: 'offered',
        score: 95.0,
        scoreBreakdown: {
          distanceKm: 2.5,
          distanceScore: 90,
          ratingScore: 100,
          workloadScore: 100,
          capabilityScore: 100,
          acceptanceRateScore: 95,
          totalScore: 95.0,
          weights: { distance: 0.3, rating: 0.25, workload: 0.2, capability: 0.15, acceptanceRate: 0.1 },
          matchedCapabilities: [],
          missingCapabilities: [],
          eligibilityReasons: [],
        },
        offeredAt: new Date(),
        expiresAt,
      })
      .returning();

    const [offer2] = await db
      .insert(dispatchOffers)
      .values({
        orderId: testOrderId,
        providerId: provider2Id,
        attemptNumber: 1,
        status: 'offered',
        score: 90.0,
        scoreBreakdown: {
          distanceKm: 4.5,
          distanceScore: 80,
          ratingScore: 100,
          workloadScore: 100,
          capabilityScore: 100,
          acceptanceRateScore: 95,
          totalScore: 90.0,
          weights: { distance: 0.3, rating: 0.25, workload: 0.2, capability: 0.15, acceptanceRate: 0.1 },
          matchedCapabilities: [],
          missingCapabilities: [],
          eligibilityReasons: [],
        },
        offeredAt: new Date(),
        expiresAt,
      })
      .returning();

    // Fire 2 concurrent acceptance requests simultaneously
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/v1/providers/me/offers/${offer1.id}/accept`)
        .set('Authorization', `Bearer ${provider1Token}`),
      request(app)
        .post(`/api/v1/providers/me/offers/${offer2.id}/accept`)
        .set('Authorization', `Bearer ${provider2Token}`),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepStrictEqual(statuses, [200, 409], 'Exactly one winner (200) and one loser (409 Conflict) must result');

    const winningRes = res1.status === 200 ? res1 : res2;
    const losingRes = res1.status === 409 ? res1 : res2;

    assert.strictEqual(winningRes.body.success, true);
    const errMessage = losingRes.body.message || losingRes.body.error?.message || '';
    assert(errMessage.includes('مسبقاً') || errMessage.includes('العرض') || losingRes.status === 409);
  });

  it('5. Provider executes job lifecycle: on-the-way -> arrived -> start -> complete', async () => {
    // Provider 1 is the assigned provider for testOrderId
    await db.update(orders).set({ providerId: provider1Id, status: 'accepted' }).where(eq(orders.id, testOrderId));

    // 1. Mark Arriving
    const arrivingRes = await request(app)
      .patch(`/api/v1/providers/me/jobs/${testOrderId}/arriving`)
      .set('Authorization', `Bearer ${provider1Token}`);

    assert.strictEqual(arrivingRes.status, 200);
    assert.strictEqual(arrivingRes.body.data.status, 'going_to_customer');

    // 2. Mark Arrived
    const arrivedRes = await request(app)
      .patch(`/api/v1/providers/me/jobs/${testOrderId}/arrived`)
      .set('Authorization', `Bearer ${provider1Token}`);

    assert.strictEqual(arrivedRes.status, 200);
    assert(arrivedRes.body.data.arrivedAt !== null);

    // 3. Start Service
    const startRes = await request(app)
      .patch(`/api/v1/providers/me/jobs/${testOrderId}/start`)
      .set('Authorization', `Bearer ${provider1Token}`);

    assert.strictEqual(startRes.status, 200);
    assert(startRes.body.data.serviceStartedAt !== null);

    // 4. Complete Service
    const completeRes = await request(app)
      .patch(`/api/v1/providers/me/jobs/${testOrderId}/complete`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({ completionNotes: 'تم تنظيف الشقة بالكامل وفحص النوافذ بنجاح.' });

    assert.strictEqual(completeRes.status, 200);
    assert.strictEqual(completeRes.body.data.status, 'completed');
    assert(completeRes.body.data.serviceCompletedAt !== null);
  });

  it('6. Provider can report an operational issue for customer service escalation', async () => {
    const res = await request(app)
      .post(`/api/v1/providers/me/jobs/${testOrderId}/report-issue`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        issueType: 'عائق مروري وتأخير',
        description: 'إغلاق طريق رئيسي بسبب أعمال الصيانة وتأخير متوقع 20 دقيقة.',
        priority: 'medium',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.category, 'operations_delay');
  });

  it('7. Provider can create an on-site quotation for additional work', async () => {
    const res = await request(app)
      .post(`/api/v1/providers/me/jobs/${testOrderId}/quotation`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        serviceId: 'srv_home_cleaning',
        laborAmount: 15.0,
        materialsAmount: 10.0,
        items: [
          {
            id: 'item_1',
            titleAr: 'تنظيف وتلميع إضافي للواجهات الزجاجية الخارجية',
            titleEn: 'Exterior Glass Polishing',
            type: 'additional_work',
            unitPrice: 25.0,
            quantity: 1,
            total: 25.0,
          },
        ],
        notes: 'بناءً على طلب العميل في الموقع.',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(parseFloat(res.body.data.totalAmount), 25.0);
    assert.strictEqual(parseFloat(res.body.data.deliveryFee), 0.0); // Strict invariant
  });

  it('8. Admin can fetch Dispatch Analytics and modify operational settings', async () => {
    const analyticsRes = await request(app)
      .get('/api/v1/admin/dispatch/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(analyticsRes.status, 200);
    assert(typeof analyticsRes.body.data.overview.totalOrders === 'number');
    assert(typeof analyticsRes.body.data.offers.acceptanceRate === 'number');

    const updateSettingsRes = await request(app)
      .put('/api/v1/admin/dispatch/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        offerTimeoutSeconds: 120,
        maxRetryAttempts: 4,
        distanceWeight: 0.35,
        ratingWeight: 0.25,
      });

    assert.strictEqual(updateSettingsRes.status, 200);
    assert.strictEqual(updateSettingsRes.body.data.offerTimeoutSeconds, 120);
    assert.strictEqual(updateSettingsRes.body.data.maxRetryAttempts, 4);
    assert.strictEqual(updateSettingsRes.body.data.distanceWeight, 0.35);
  });
});
