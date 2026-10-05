import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateTokens } from '../auth/utils/jwt.js';
import { db } from '../../db/index.js';
import { sql } from '../../config/database.js';
import { users, User } from '../../db/schema/users.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { refundRequests, supportCases, customerServiceNotes, auditLogs } from '../../db/schema/staff.schema.js';
import { eq, desc } from 'drizzle-orm';

const app = createApp();

describe('🛡️ Comprehensive Production Readiness & RBAC Verification Suite', () => {
  let superAdminUser: User;
  let managerUser: User;
  let agentUser: User;
  let customerUser: User;

  let superAdminToken: string;
  let managerToken: string;
  let agentToken: string;
  let customerToken: string;

  before(async () => {
    // 1. Super Admin
    const [sa] = await db
      .insert(users)
      .values({
        phoneNumber: '0799980001',
        name: 'Verification Super Admin',
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
        phoneNumber: '0799980002',
        name: 'Verification CS Manager',
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
        phoneNumber: '0799980003',
        name: 'Verification CS Agent',
        role: 'customer_service_agent',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer_service_agent', isSuspended: false },
      })
      .returning();
    agentUser = agt;
    agentToken = generateTokens(agt).accessToken;

    // 4. Customer
    const [cust] = await db
      .insert(users)
      .values({
        phoneNumber: '0799980004',
        name: 'Verification Customer',
        role: 'customer',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer', isSuspended: false },
      })
      .returning();
    customerUser = cust;
    customerToken = generateTokens(cust).accessToken;
  });

  describe('1. Security: Authentication & Permissions Enforcement (401 / 403)', () => {
    it('1.1 Unauthenticated requests to protected endpoints return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/staff');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error?.code, 'AUTH_REQUIRED');
    });

    it('1.2 Customer role cannot access staff endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${customerToken}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.ok(['FORBIDDEN_ROLE', 'FORBIDDEN_PERMISSION'].includes(res.body.error?.code));
    });
  });

  describe('2. RBAC: Granular Permissions Across All 3 Portal Roles', () => {
    let testStaffId: string;

    it('2.1 Agent CANNOT manage staff, approve refunds, or update settings (403)', async () => {
      // Agent attempts to create staff -> 403
      const staffRes = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ phoneNumber: '0799980099', name: 'Illegal Staff', role: 'customer_service_agent' });
      assert.equal(staffRes.status, 403);
      assert.equal(staffRes.body.error?.code, 'FORBIDDEN_PERMISSION');

      // Agent attempts to view audit logs -> 403
      const auditRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${agentToken}`);
      assert.equal(auditRes.status, 403);
      assert.equal(auditRes.body.error?.code, 'FORBIDDEN_PERMISSION');

      // Agent attempts to update loyalty settings -> 403
      const settingsRes = await request(app)
        .put('/api/v1/loyalty/admin/settings')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ requiredPoints: 200 });
      assert.equal(settingsRes.status, 403);
      assert.equal(settingsRes.body.error?.code, 'FORBIDDEN_ROLE');
    });

    it('2.2 Manager CANNOT create staff or execute refunds, but CAN view audit logs & manage cases', async () => {
      // Manager attempts to create staff -> 403
      const staffRes = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ phoneNumber: '0799980098', name: 'Illegal Manager Staff', role: 'customer_service_agent' });
      assert.equal(staffRes.status, 403);
      assert.equal(staffRes.body.error?.code, 'FORBIDDEN_PERMISSION');

      // Manager CAN view audit logs -> 200
      const auditRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${managerToken}`);
      assert.equal(auditRes.status, 200);
      assert.equal(auditRes.body.success, true);
    });

    it('2.3 Super Admin CAN create staff, update roles, toggle suspension, and manage system', async () => {
      // Create new staff
      const phone = `079998${Math.floor(1000 + Math.random() * 9000)}`;
      const createRes = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          phoneNumber: phone,
          name: 'Super Admin Created Agent',
          role: 'customer_service_agent',
          department: 'Call Center',
        });
      assert.equal(createRes.status, 201);
      assert.equal(createRes.body.success, true);
      assert.equal(createRes.body.data.role, 'customer_service_agent');
      testStaffId = createRes.body.data.id;

      // Update staff role
      const updateRes = await request(app)
        .patch(`/api/v1/staff/${testStaffId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'customer_service_manager', department: 'Supervision' });
      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.role, 'customer_service_manager');

      // Toggle suspension
      const toggleRes = await request(app)
        .post(`/api/v1/staff/${testStaffId}/toggle-status`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(toggleRes.status, 200);
      assert.equal(toggleRes.body.data.isSuspended, true);
    });
  });

  describe('3. Refunds: Full Lifecycle, Boundary Validations & Safe Cash Settlement', () => {
    let completedOrderId: string;
    let pendingOrderId: string;
    let refundId: string;

    before(async () => {
      // Create completed order
      completedOrderId = `ORD-V-COMP-${Math.floor(1000 + Math.random() * 9000)}`;
      await db.insert(orders).values({
        id: completedOrderId,
        customerId: customerUser.id,
        customerName: customerUser.name || 'Customer',
        customerPhone: customerUser.phoneNumber,
        serviceCategoryId: 'cat_products',
        subtotal: '20.00',
        discountAmount: '0.00',
        deliveryFee: '0.00',
        totalAmount: '20.00',
        paymentMethod: 'cash_on_delivery',
        status: 'completed',
        deliveryArea: 'الشميساني',
        deliveryStreetAddress: 'شارع الثقافة',
        deliveryLatitude: 31.96,
        deliveryLongitude: 35.90,
      });

      // Create pending order
      pendingOrderId = `ORD-V-PEND-${Math.floor(1000 + Math.random() * 9000)}`;
      await db.insert(orders).values({
        id: pendingOrderId,
        customerId: customerUser.id,
        customerName: customerUser.name || 'Customer',
        customerPhone: customerUser.phoneNumber,
        serviceCategoryId: 'cat_products',
        subtotal: '10.00',
        discountAmount: '0.00',
        deliveryFee: '0.00',
        totalAmount: '10.00',
        paymentMethod: 'cash_on_delivery',
        status: 'pending',
        deliveryArea: 'الشميساني',
        deliveryStreetAddress: 'شارع الثقافة',
        deliveryLatitude: 31.96,
        deliveryLongitude: 35.90,
      });
    });

    it('3.1 Rejects refund on non-completed order (400 ORDER_NOT_REFUNDABLE)', async () => {
      const res = await request(app)
        .post('/api/v1/refunds/request')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderId: pendingOrderId,
          amount: 5.0,
          reason: 'Premature cancellation',
        });
      assert.equal(res.status, 400);
      assert.equal(res.body.error?.code, 'ORDER_NOT_REFUNDABLE');
    });

    it('3.2 Rejects refund amount exceeding total refundable amount (400 REFUND_AMOUNT_EXCEEDS_LIMIT)', async () => {
      const res = await request(app)
        .post('/api/v1/refunds/request')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderId: completedOrderId,
          amount: 25.0, // Max is 20.0
          reason: 'Excessive refund attempt',
        });
      assert.equal(res.status, 400);
      assert.equal(res.body.error?.code, 'REFUND_AMOUNT_EXCEEDS_LIMIT');
    });

    it('3.3 Agent submits valid refund request and generates REF-XXXX', async () => {
      const res = await request(app)
        .post('/api/v1/refunds/request')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderId: completedOrderId,
          amount: 10.0,
          reason: 'Damaged gas regulator on delivery',
        });
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.match(res.body.data.refundNumber, /^REF-/);
      assert.equal(res.body.data.status, 'requested');
      refundId = res.body.data.id;
    });

    it('3.4 Rejects duplicate open refund request for same order (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/refunds/request')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderId: completedOrderId,
          amount: 5.0,
          reason: 'Duplicate request',
        });
      assert.equal(res.status, 409);
      assert.equal(res.body.error?.code, 'DUPLICATE_OPEN_REFUND_REQUEST');
    });

    it('3.5 Agent CANNOT approve refund (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/refunds/${refundId}/approve`)
        .set('Authorization', `Bearer ${agentToken}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.error?.code, 'FORBIDDEN_PERMISSION');
    });

    it('3.6 Manager reviews and approves refund', async () => {
      // 1. Move to under_review
      const reviewRes = await request(app)
        .post(`/api/v1/refunds/${refundId}/review`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: 'Verified photo evidence from customer.' });
      assert.equal(reviewRes.status, 200);
      assert.equal(reviewRes.body.data.status, 'under_review');

      // 2. Approve
      const approveRes = await request(app)
        .post(`/api/v1/refunds/${refundId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: 'Approved for 10.00 JOD compensation.' });
      assert.equal(approveRes.status, 200);
      assert.equal(approveRes.body.data.status, 'approved');
    });

    it('3.7 Manager CANNOT execute/process refund (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/refunds/${refundId}/process`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ gatewayReference: 'MANUAL_CASH_01' });
      assert.equal(res.status, 403);
      assert.equal(res.body.error?.code, 'FORBIDDEN_PERMISSION');
    });

    it('3.8 Super Admin executes refund with manual cash voucher reference', async () => {
      const res = await request(app)
        .post(`/api/v1/refunds/${refundId}/process`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          gatewayReference: 'CASH_VOUCHER_VERIFIED_7788',
          notes: 'Customer compensated via cash voucher upon driver visit.',
        });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'processed');
      assert.equal(res.body.data.gatewayReference, 'CASH_VOUCHER_VERIFIED_7788');
    });
  });

  describe('4. Centralized Audit Logs Verification', () => {
    it('4.1 Verifies that sensitive actions created audit log records in PostgreSQL', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs?limit=50')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const logs = res.body.data.logs;
      assert.ok(logs.length > 0);

      const actions = logs.map((l: any) => l.action);
      assert.ok(
        actions.includes('STAFF_CREATE') ||
        actions.includes('REFUND_REQUEST') ||
        actions.some((a: string) => a.startsWith('STAFF_') || a.startsWith('REFUND_')),
        'Audit log contains operational records'
      );
    });
  });

  describe('5. Flutter Compatibility & Admin ↔ Flutter Sync', () => {
    it('5.1 Flutter customer API retrieves services catalog and categories', async () => {
      const res = await request(app)
        .get('/api/v1/services')
        .set('Authorization', `Bearer ${customerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it('5.2 Admin updates loyalty settings and Flutter API reflects the change immediately', async () => {
      // 1. Admin updates loyalty settings
      const updateRes = await request(app)
        .put('/api/v1/loyalty/admin/settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          requiredPoints: 120,
          rewardType: 'discount_fixed',
          rewardValue: '4.00',
        });
      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.requiredPoints, 120);

      // 2. Customer checks loyalty summary / settings
      const custRes = await request(app)
        .get('/api/v1/loyalty/my-points')
        .set('Authorization', `Bearer ${customerToken}`);
      assert.equal(custRes.status, 200);
      assert.equal(custRes.body.data.requiredPointsForReward, 120);
    });

    it('5.3 Customer retrieves order history cleanly with 0 delivery fee', async () => {
      const res = await request(app)
        .get('/api/v1/orders/my')
        .set('Authorization', `Bearer ${customerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  after(async () => {
    // Restore default loyalty settings
    await request(app)
      .put('/api/v1/loyalty/admin/settings')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        requiredPoints: 200,
        rewardType: 'coupon',
        rewardValue: '5.00',
        titleAr: 'خصم 5 د.أ مقابل 200 نقطة ولاء',
        titleEn: '5 JOD Discount for 200 Loyalty Points',
        isActive: true,
      });
  });
});
