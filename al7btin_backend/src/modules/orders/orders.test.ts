import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { users, authOtps } from '../../db/schema/users.schema.js';
import { providers, providerServices } from '../../db/schema/providers.schema.js';
import { services, serviceOptions } from '../../db/schema/services.schema.js';
import { coupons, couponUsages } from '../../db/schema/coupons.schema.js';
import { orders, orderItems } from '../../db/schema/orders.schema.js';
import { eq, like, inArray, or } from 'drizzle-orm';
import { sql } from '../../config/database.js';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('📦 Backend Orders Security & Data Immutability Test Suite', () => {
  let adminAccessToken = '';
  let customer1Token = '';
  let customer2Token = '';
  let provider1Token = '';
  let provider2Token = '';

  let provider1Id = '';
  let provider2Id = '';
  let serviceAId = '';
  let serviceBId = '';

  before(async () => {
    // Clean any previous test data safely
    const oldProvRows = await db
      .select({ id: providers.id })
      .from(providers)
      .where(or(like(providers.id, 'prov_test_orders_%'), inArray(providers.phoneNumber, ['0793003001', '0794004002'])));
    const oldProvIds = oldProvRows.map((r) => r.id);

    if (oldProvIds.length > 0) {
      const oldOrders = await db.select({ id: orders.id }).from(orders).where(inArray(orders.providerId, oldProvIds));
      const oldOrderIds = oldOrders.map((o) => o.id);
      if (oldOrderIds.length > 0) {
        await db.delete(orderItems).where(inArray(orderItems.orderId, oldOrderIds));
        await db.delete(orders).where(inArray(orders.id, oldOrderIds));
      }
      await db.delete(providerServices).where(inArray(providerServices.providerId, oldProvIds));
      await db.delete(providers).where(inArray(providers.id, oldProvIds));
    }

    await db.delete(orderItems).where(like(orderItems.serviceId, 'srv_test_ord_%'));
    await db.delete(providerServices).where(like(providerServices.serviceId, 'srv_test_ord_%'));
    await db.delete(services).where(like(services.id, 'srv_test_ord_%'));

    const hash = await bcrypt.hash('1234', 10);

    // 1. Admin User
    await db.insert(users).values({
      phoneNumber: '0799001122',
      name: 'مدير النظام التنفيذي',
      role: 'admin',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'admin' },
    });
    await db.insert(authOtps).values({
      phoneNumber: '0799001122',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    const adminRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0799001122', otp: '1234' });
    adminAccessToken = adminRes.body.data.accessToken;

    // 2. Customer 1
    await db.insert(users).values({
      phoneNumber: '0791001001',
      name: 'العميل الأول - أحمد',
      role: 'customer',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'customer' },
    });
    await db.insert(authOtps).values({
      phoneNumber: '0791001001',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    const c1Res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0791001001', otp: '1234' });
    customer1Token = c1Res.body.data.accessToken;

    // 3. Customer 2
    await db.insert(users).values({
      phoneNumber: '0792002002',
      name: 'العميل الثاني - سامي',
      role: 'customer',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'customer' },
    });
    await db.insert(authOtps).values({
      phoneNumber: '0792002002',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    const c2Res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0792002002', otp: '1234' });
    customer2Token = c2Res.body.data.accessToken;

    // 4. Provider 1 (Gas Center)
    const [p1User] = await db.insert(users).values({
      phoneNumber: '0793003001',
      name: 'وكالة الغاز الأولى',
      role: 'provider',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'provider' },
    }).returning();
    await db.insert(authOtps).values({
      phoneNumber: '0793003001',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    const p1Res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0793003001', otp: '1234' });
    provider1Token = p1Res.body.data.accessToken;

    // 5. Provider 2 (Water Center)
    const [p2User] = await db.insert(users).values({
      phoneNumber: '0794004002',
      name: 'محطة المياه النقية',
      role: 'provider',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'provider' },
    }).returning();
    await db.insert(authOtps).values({
      phoneNumber: '0794004002',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    const p2Res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0794004002', otp: '1234' });
    provider2Token = p2Res.body.data.accessToken;

    // Create Provider Records
    provider1Id = `prov_test_orders_1_${Date.now()}`;
    await db.insert(providers).values({
      id: provider1Id,
      userId: p1User.id,
      nameAr: 'وكالة الغاز الأولى',
      nameEn: 'First Gas Agency',
      phoneNumber: '0793003001',
      address: 'عمان - شارع وصفي التل',
      latitude: 31.9812,
      longitude: 35.8612,
      isActive: true,
      isAvailable: true,
    });

    provider2Id = `prov_test_orders_2_${Date.now()}`;
    await db.insert(providers).values({
      id: provider2Id,
      userId: p2User.id,
      nameAr: 'محطة المياه النقية',
      nameEn: 'Pure Water Hub',
      phoneNumber: '0794004002',
      address: 'عمان - شارع مكة',
      latitude: 31.9722,
      longitude: 35.8522,
      isActive: true,
      isAvailable: true,
    });

    // Create Test Services
    serviceAId = `srv_test_ord_a_${Date.now()}`;
    await db.insert(services).values({
      id: serviceAId,
      categoryId: 'cat_products',
      nameAr: 'أسطوانة اختبارية A',
      nameEn: 'Test Cylinder A',
      type: 'delivery_product',
      basePrice: '10.00',
      isActive: true,
      unitAr: 'أسطوانة',
      unitEn: 'Cylinder',
    });

    serviceBId = `srv_test_ord_b_${Date.now()}`;
    await db.insert(services).values({
      id: serviceBId,
      categoryId: 'cat_products',
      nameAr: 'خدمة اختبارية B',
      nameEn: 'Test Service B',
      type: 'delivery_product',
      basePrice: '20.00',
      isActive: true,
      unitAr: 'خدمة',
      unitEn: 'Service',
    });

    // Assign serviceA to provider1 only
    await db.insert(providerServices).values({
      providerId: provider1Id,
      serviceId: serviceAId,
      isAvailable: true,
    });

    // Assign serviceB to provider2 only
    await db.insert(providerServices).values({
      providerId: provider2Id,
      serviceId: serviceBId,
      isAvailable: true,
    });

    // Create test coupon
    await db.insert(coupons).values({
      id: 'CPN_TEST_ORDER_10',
      code: 'ORDERTEST10',
      type: 'fixed_amount',
      value: '2.00',
      minOrderValue: '5.00',
      usageLimit: 100,
      usageCount: 0,
      isActive: true,
    }).onConflictDoUpdate({
      target: coupons.code,
      set: { isActive: true, usageCount: 0 },
    });
  });

  after(async () => {
    await db.delete(orderItems).where(like(orderItems.serviceId, 'srv_test_ord_%'));
    await db.delete(providerServices).where(like(providerServices.serviceId, 'srv_test_ord_%'));
    await db.delete(services).where(like(services.id, 'srv_test_ord_%'));
    await db.delete(providers).where(like(providers.id, 'prov_test_orders_%'));
  });

  test('Case 1: Customer cannot modify service price (Authoritative backend price calculation)', async () => {
    // Customer attempts to send price: 1.00 instead of 10.00
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [
          {
            serviceId: serviceAId,
            quantity: 2,
            unitPrice: 1.00, // Attacker tries to pay 1 JOD instead of 10 JOD
            itemTotal: 2.00,
          },
        ],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل، بناية 50',
          latitude: 31.9812,
          longitude: 35.8612,
        },
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    // Backend must ignore 1.00 and compute: 10.00 * 2 = 20.00
    assert.equal(res.body.data.subtotal, '20.00');
    assert.equal(res.body.data.totalAmount, '20.00');
    assert.equal(res.body.data.items[0].unitPrice, 10);
    assert.equal(res.body.data.items[0].itemTotal, 20);
  });

  test('Case 2: Provider cannot access another provider\'s private data or orders', async () => {
    // 1. Create an order for provider 1
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceAId, quantity: 1 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    const p1OrderId = orderRes.body.data.id;

    // 2. Provider 2 attempts to fetch Provider 1's order details by ID -> 403 Forbidden
    const forbiddenRes = await request(app)
      .get(`/api/v1/orders/${p1OrderId}`)
      .set('Authorization', `Bearer ${provider2Token}`);

    assert.equal(forbiddenRes.status, 403);
    assert.equal(forbiddenRes.body.error.code, 'FORBIDDEN_ORDER_ACCESS');

    // 3. Provider 2 attempts to update status of Provider 1's order -> 403 Forbidden
    const updateRes = await request(app)
      .patch(`/api/v1/orders/${p1OrderId}/status`)
      .set('Authorization', `Bearer ${provider2Token}`)
      .send({ status: 'in_progress' });

    assert.equal(updateRes.status, 403);
    assert.equal(updateRes.body.error.code, 'FORBIDDEN_ORDER_MODIFICATION');
  });

  test('Case 3: Provider cannot create global service (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/services/admin')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({
        nameAr: 'خدمة مزورة من المزود',
        nameEn: 'Fake Global Service',
        categoryId: 'cat_products',
        basePrice: '50.00',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
  });

  test('Case 4: Customer cannot order from unavailable/offline provider (400 PROVIDER_UNAVAILABLE)', async () => {
    // Toggle provider 1 offline
    await request(app)
      .patch('/api/v1/provider/status')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({ isAvailable: false });

    // Attempt order
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceAId, quantity: 1 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(orderRes.status, 400);
    assert.equal(orderRes.body.error.code, 'PROVIDER_UNAVAILABLE');

    // Restore provider 1 online
    await request(app)
      .patch('/api/v1/provider/status')
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({ isAvailable: true });
  });

  test('Case 5: Customer cannot order unavailable service (400 PRODUCT_CURRENTLY_UNAVAILABLE)', async () => {
    // Provider 1 marks serviceA as unavailable
    await request(app)
      .patch(`/api/v1/provider/services/${serviceAId}/availability`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({ isAvailable: false });

    // Attempt order
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceAId, quantity: 1 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(orderRes.status, 400);
    assert.equal(orderRes.body.error.code, 'PRODUCT_CURRENTLY_UNAVAILABLE');

    // Restore service availability
    await request(app)
      .patch(`/api/v1/provider/services/${serviceAId}/availability`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({ isAvailable: true });
  });

  test('Case 6: Backend calculates authoritative order price and applies coupon discount correctly', async () => {
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        couponCode: 'ORDERTEST10',
        items: [{ serviceId: serviceAId, quantity: 2 }], // 2 * 10.00 = 20.00 JOD
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(orderRes.status, 201);
    assert.equal(orderRes.body.success, true);
    assert.equal(orderRes.body.data.subtotal, '20.00');
    assert.equal(orderRes.body.data.discountAmount, '2.00');
    assert.equal(orderRes.body.data.deliveryFee, '0.00');
    assert.equal(orderRes.body.data.totalAmount, '18.00');
    assert.equal(orderRes.body.data.couponId, 'CPN_TEST_ORDER_10');
  });

  test('Case 7: Provider assignment is validated (cannot order service not assigned to provider)', async () => {
    // Service B is assigned ONLY to provider 2. Attempting to order Service B from provider 1 must fail!
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceBId, quantity: 1 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(orderRes.status, 400);
    assert.equal(orderRes.body.error.code, 'SERVICE_NOT_OFFERED_BY_PROVIDER');
  });

  test('Case 8: Historical order price remains unchanged after catalog service price changes', async () => {
    // 1. Create an order when serviceA basePrice is 10.00 JOD
    const initialOrderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceAId, quantity: 3 }], // 3 * 10.00 = 30.00 JOD
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(initialOrderRes.status, 201);
    const orderId = initialOrderRes.body.data.id;
    assert.equal(initialOrderRes.body.data.totalAmount, '30.00');

    // 2. Admin increases catalog service price from 10.00 JOD to 50.00 JOD
    const priceChangeRes = await request(app)
      .patch(`/api/v1/services/admin/${serviceAId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ basePrice: '50.00' });

    assert.equal(priceChangeRes.status, 200);
    assert.equal(priceChangeRes.body.data.basePrice, '50.00');

    // 3. Fetch historical order - its snapshot price MUST remain 30.00 JOD!
    const historicalOrderRes = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${customer1Token}`);

    assert.equal(historicalOrderRes.status, 200);
    assert.equal(parseFloat(historicalOrderRes.body.data.subtotal), 30.00);
    assert.equal(parseFloat(historicalOrderRes.body.data.totalAmount), 30.00);
    assert.equal(parseFloat(historicalOrderRes.body.data.items[0].unitPrice), 10.00);
    assert.equal(parseFloat(historicalOrderRes.body.data.items[0].itemTotal), 30.00);
  });

  test('Case 9: Customer can cancel order early in confirmed status', async () => {
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceAId, quantity: 1 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(orderRes.status, 201);
    const orderId = orderRes.body.data.id;

    // Customer cancels order
    const cancelRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ status: 'cancelled', notes: 'إلغاء الطلب من قبل العميل' });

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'cancelled');
  });

  test('Case 10: Provider state machine transitions and terminal protection', async () => {
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceAId, quantity: 1 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(orderRes.status, 201);
    const orderId = orderRes.body.data.id;

    // 1. Invalid jump: confirmed -> picked_up (invalid transition)
    const invalidJumpRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({ status: 'picked_up' });

    assert.equal(invalidJumpRes.status, 400);
    assert.equal(invalidJumpRes.body.error.code, 'INVALID_ORDER_STATUS_TRANSITION');

    // 2. Valid transition: confirmed -> accepted
    const acceptRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({ status: 'accepted' });

    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.status, 'accepted');

    // 3. Valid transition: accepted -> going_to_customer
    const outRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({ status: 'going_to_customer' });

    assert.equal(outRes.status, 200);
    assert.equal(outRes.body.data.status, 'going_to_customer');

    // 4. Valid transition: going_to_customer -> completed (terminal)
    const completeRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({ status: 'completed' });

    assert.equal(completeRes.status, 200);
    assert.equal(completeRes.body.data.status, 'completed');

    // 5. Terminal protection: provider cannot re-open completed order
    const reopenRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({ status: 'accepted' });

    assert.equal(reopenRes.status, 400);
  });

  test('Case 11: Provider can accept own incoming order directly via /provider/orders/:id/accept', async () => {
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceAId, quantity: 1 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(orderRes.status, 201);
    const orderId = orderRes.body.data.id;

    // Provider 1 accepts order
    const acceptRes = await request(app)
      .patch(`/api/v1/provider/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${provider1Token}`);

    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.status, 'accepted');

    // Customer verifies updated status
    const customerCheck = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${customer1Token}`);

    assert.equal(customerCheck.status, 200);
    assert.equal(customerCheck.body.data.status, 'accepted');
  });

  test('Case 12: Provider can reject own incoming order directly via /provider/orders/:id/reject', async () => {
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceAId, quantity: 1 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(orderRes.status, 201);
    const orderId = orderRes.body.data.id;

    // Provider 1 rejects order
    const rejectRes = await request(app)
      .patch(`/api/v1/provider/orders/${orderId}/reject`)
      .set('Authorization', `Bearer ${provider1Token}`)
      .send({ notes: 'غير متوفر بالكمية المطلوبة حالياً' });

    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.data.status, 'rejected');

    // Customer verifies rejection
    const customerCheck = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${customer1Token}`);

    assert.equal(customerCheck.status, 200);
    assert.equal(customerCheck.body.data.status, 'rejected');
  });

  test('Case 13: Provider cannot accept or reject another provider\'s order', async () => {
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceAId, quantity: 1 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(orderRes.status, 201);
    const orderId = orderRes.body.data.id;

    // Provider 2 tries to accept Provider 1's order -> 403 Forbidden
    const p2Accept = await request(app)
      .patch(`/api/v1/provider/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${provider2Token}`);

    assert.equal(p2Accept.status, 403);
    assert.equal(p2Accept.body.error.code, 'FORBIDDEN_ORDER_MODIFICATION');

    // Provider 2 tries to reject Provider 1's order -> 403 Forbidden
    const p2Reject = await request(app)
      .patch(`/api/v1/provider/orders/${orderId}/reject`)
      .set('Authorization', `Bearer ${provider2Token}`);

    assert.equal(p2Reject.status, 403);
    assert.equal(p2Reject.body.error.code, 'FORBIDDEN_ORDER_MODIFICATION');
  });

  test('Case 14: Server-side idempotency prevents duplicate order submission with Idempotency-Key header', async () => {
    const idempotencyKey = `idemp-test-${Date.now()}`;

    // First request creates the order
    const order1Res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceAId, quantity: 2 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(order1Res.status, 201);
    assert.equal(order1Res.body.success, true);
    const orderId = order1Res.body.data.id;
    assert.ok(orderId);

    // Second request with exact same Idempotency-Key header returns the existing order safely
    const order2Res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer1Token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: provider1Id,
        items: [{ serviceId: serviceAId, quantity: 2 }],
        deliveryAddress: {
          city: 'عمان',
          area: 'خلدا',
          streetAddress: 'شارع وصفي التل',
        },
      });

    assert.equal(order2Res.status, 200);
    assert.equal(order2Res.body.success, true);
    assert.equal(order2Res.body.data.id, orderId);
  });

  test('Case 15: Customer orders endpoint supports limit & page pagination metadata', async () => {
    const listRes = await request(app)
      .get('/api/v1/orders/my?page=1&limit=5')
      .set('Authorization', `Bearer ${customer1Token}`);

    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.success, true);
    assert.ok(Array.isArray(listRes.body.data));
    assert.ok(listRes.body.pagination);
    assert.equal(listRes.body.pagination.page, 1);
    assert.equal(listRes.body.pagination.limit, 5);
  });
});
