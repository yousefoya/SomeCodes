import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateTokens } from '../auth/utils/jwt.js';
import { db } from '../../db/index.js';
import { users, User } from '../../db/schema/users.schema.js';
import { providers } from '../../db/schema/providers.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { refundRequests } from '../../db/schema/staff.schema.js';

const app = createApp();

describe('🔒 Phase 19 & 22: Realistic Security, RBAC & Failure Edge-Case Acceptance Suite', () => {
  let superAdminUser: User;
  let managerUser: User;
  let agentUser: User;
  let customer1User: User;
  let customer2User: User;
  let provider1User: User;
  let provider2User: User;

  let superAdminToken: string;
  let managerToken: string;
  let agentToken: string;
  let customer1Token: string;
  let customer2Token: string;
  let provider1Token: string;
  let provider2Token: string;

  let testOrderId: string;
  let testRefundId: string;

  before(async () => {
    // 1. Super Admin
    const [sa] = await db
      .insert(users)
      .values({
        phoneNumber: '0799880001',
        name: 'Sec Super Admin',
        role: 'super_admin',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'super_admin', isSuspended: false },
      })
      .returning();
    superAdminUser = sa;
    superAdminToken = generateTokens(sa).accessToken;

    // 2. CS Manager
    const [mgr] = await db
      .insert(users)
      .values({
        phoneNumber: '0799880002',
        name: 'Sec CS Manager',
        role: 'customer_service_manager',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer_service_manager', isSuspended: false },
      })
      .returning();
    managerUser = mgr;
    managerToken = generateTokens(mgr).accessToken;

    // 3. CS Agent
    const [agt] = await db
      .insert(users)
      .values({
        phoneNumber: '0799880003',
        name: 'Sec CS Agent',
        role: 'customer_service_agent',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer_service_agent', isSuspended: false },
      })
      .returning();
    agentUser = agt;
    agentToken = generateTokens(agt).accessToken;

    // 4. Customer 1
    const [c1] = await db
      .insert(users)
      .values({
        phoneNumber: '0799880004',
        name: 'Sec Customer 1',
        role: 'customer',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer', isSuspended: false },
      })
      .returning();
    customer1User = c1;
    customer1Token = generateTokens(c1).accessToken;

    // 5. Customer 2
    const [c2] = await db
      .insert(users)
      .values({
        phoneNumber: '0799880005',
        name: 'Sec Customer 2',
        role: 'customer',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer', isSuspended: false },
      })
      .returning();
    customer2User = c2;
    customer2Token = generateTokens(c2).accessToken;

    // 6. Provider 1
    const [p1] = await db
      .insert(users)
      .values({
        phoneNumber: '0799880006',
        name: 'Sec Provider 1',
        role: 'provider',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'provider', isSuspended: false },
      })
      .returning();
    provider1User = p1;
    provider1Token = generateTokens(p1).accessToken;

    // 7. Provider 2
    const [p2] = await db
      .insert(users)
      .values({
        phoneNumber: '0799880007',
        name: 'Sec Provider 2',
        role: 'provider',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'provider', isSuspended: false },
      })
      .returning();
    provider2User = p2;
    provider2Token = generateTokens(p2).accessToken;

    // Create a completed order owned by Customer 1
    testOrderId = `ORD-SEC-${Date.now()}`;
    await db.insert(orders).values({
      id: testOrderId,
      customerId: customer1User.id,
      customerName: customer1User.name || 'Customer 1',
      customerPhone: customer1User.phoneNumber,
      serviceCategoryId: 'cat_products',
      subtotal: '25.00',
      discountAmount: '0.00',
      deliveryFee: '0.00',
      totalAmount: '25.00',
      paymentMethod: 'cash_on_delivery',
      status: 'completed',
      deliveryArea: 'تلاع العلي',
      deliveryStreetAddress: 'شارع المدينة المنورة',
      deliveryLatitude: 31.98,
      deliveryLongitude: 35.88,
    });

    // Create a refund request for testOrderId
    const [refund] = await db.insert(refundRequests).values({
      refundNumber: `REF-SEC-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: testOrderId,
      customerId: customer1User.id,
      requestedByUserId: agentUser.id,
      amount: '10.00',
      maxRefundableAmount: '25.00',
      reason: 'Damaged item',
      status: 'requested',
    }).returning();
    testRefundId = refund.id;
  });

  describe('Section A: Specific Authorization & Security Rejections', () => {
    it('1. Agent attempts POST /refunds/:id/approve -> 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/refunds/${testRefundId}/approve`)
        .set('Authorization', `Bearer ${agentToken}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error?.code, 'FORBIDDEN_PERMISSION');
    });

    it('2. Agent attempts POST /staff -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ phoneNumber: '0799880091', name: 'Illegal Staff' });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error?.code, 'FORBIDDEN_PERMISSION');
    });

    it('3. Manager attempts POST /staff with super_admin role -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ phoneNumber: '0799880092', name: 'Illegal Admin', role: 'super_admin' });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    it('4. Customer attempts GET /admin/stats -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${customer1Token}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error?.code, 'FORBIDDEN_ROLE');
    });

    it('5. Customer attempts GET another customer order -> 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${customer2Token}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error?.code, 'FORBIDDEN_ORDER_ACCESS');
    });

    it('6. Agent attempts to modify system settings -> 403 Forbidden', async () => {
      const res = await request(app)
        .put('/api/v1/loyalty/admin/settings')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ requiredPoints: 300 });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error?.code, 'FORBIDDEN_ROLE');
    });

    it('7. Unauthenticated user attempts staff endpoints -> 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/staff');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error?.code, 'AUTH_REQUIRED');
    });
  });

  describe('Section B: Staff Self-Protection & System Lockout Guards', () => {
    it('8. Staff member CANNOT deactivate their own account (400 CANNOT_SUSPEND_SELF)', async () => {
      const res = await request(app)
        .post(`/api/v1/staff/${superAdminUser.id}/toggle-status`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.error?.code, 'CANNOT_SUSPEND_SELF');
    });

    it('9. Staff member CANNOT modify their own role to prevent self-lockout (400 CANNOT_MODIFY_OWN_ROLE)', async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/${superAdminUser.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'customer_service_agent' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error?.code, 'CANNOT_MODIFY_OWN_ROLE');
    });
  });

  describe('Section C: X-Request-ID & Standardized Error Matrix', () => {
    it('10. Every error response includes correlation ID and structured schema', async () => {
      const customReqId = 'custom-test-correlation-uuid-1234';
      const res = await request(app)
        .get('/api/v1/orders/non-existent-order-id-xyz')
        .set('X-Request-ID', customReqId);

      assert.equal(res.status, 401); // Requires auth
      assert.equal(res.body.success, false);
      assert.ok(res.body.error);
      assert.equal(res.body.error.code, 'AUTH_REQUIRED');
      assert.equal(res.body.error.requestId, customReqId);
      assert.equal(res.headers['x-request-id'], customReqId);
    });
  });
});
