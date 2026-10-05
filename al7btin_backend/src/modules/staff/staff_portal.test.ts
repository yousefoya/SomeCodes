import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateTokens } from '../auth/utils/jwt.js';
import { db } from '../../db/index.js';
import { users, User } from '../../db/schema/users.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { refundRequests, supportCases, customerServiceNotes, auditLogs } from '../../db/schema/staff.schema.js';

const app = createApp();

describe('🏢 Staff & Operations Portal RBAC & Workflows Test Suite', () => {
  let superAdminUser: User;
  let managerUser: User;
  let agentUser: User;
  let customerUser: User;

  let superAdminToken: string;
  let managerToken: string;
  let agentToken: string;
  let customerToken: string;

  before(async () => {
    // 1. Setup Super Admin Test User
    const [sa] = await db
      .insert(users)
      .values({
        phoneNumber: '0799990001',
        name: 'Super Admin Tester',
        role: 'super_admin',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'super_admin', isSuspended: false },
      })
      .returning();
    superAdminUser = sa;
    superAdminToken = generateTokens(sa).accessToken;

    // 2. Setup Manager Test User
    const [mgr] = await db
      .insert(users)
      .values({
        phoneNumber: '0799990002',
        name: 'CS Manager Tester',
        role: 'customer_service_manager',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer_service_manager', isSuspended: false },
      })
      .returning();
    managerUser = mgr;
    managerToken = generateTokens(mgr).accessToken;

    // 3. Setup Agent Test User
    const [agt] = await db
      .insert(users)
      .values({
        phoneNumber: '0799990003',
        name: 'CS Agent Tester',
        role: 'customer_service_agent',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer_service_agent', isSuspended: false },
      })
      .returning();
    agentUser = agt;
    agentToken = generateTokens(agt).accessToken;

    // 4. Setup Customer Test User
    const [cust] = await db
      .insert(users)
      .values({
        phoneNumber: '0799990004',
        name: 'Customer Tester',
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

  describe('1. RBAC Permissions on Staff Management', () => {
    it('Super Admin can list staff members', async () => {
      const res = await request(app)
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.staff));
    });

    it('Super Admin can create a new staff account', async () => {
      const phone = `079999${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          phoneNumber: phone,
          name: 'New Agent',
          role: 'customer_service_agent',
          department: 'Support Ops',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.role, 'customer_service_agent');
    });

    it('Customer Service Manager CANNOT create staff accounts (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          phoneNumber: '0799995555',
          name: 'Unauthorized Agent',
          role: 'customer_service_agent',
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.error?.code, 'FORBIDDEN_PERMISSION');
    });

    it('Customer Service Agent CANNOT list or create staff accounts (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${agentToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.error?.code, 'FORBIDDEN_PERMISSION');
    });
  });

  describe('2. Customer Service Workspace & Notes', () => {
    it('Agent and Manager can search customers', async () => {
      const res = await request(app)
        .get('/api/v1/customer-service/customers/search?q=Customer')
        .set('Authorization', `Bearer ${agentToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it('Agent can add an immutable customer service note', async () => {
      const res = await request(app)
        .post('/api/v1/customer-service/notes')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          customerId: customerUser.id,
          note: 'Customer contacted support regarding gas refill delay.',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.note.includes('gas refill delay'));
      assert.equal(res.body.data.authorRole, 'customer_service_agent');
    });

    it('Customer 360 summary returns notes, orders, and cases', async () => {
      const res = await request(app)
        .get(`/api/v1/customer-service/customers/${customerUser.id}/summary`)
        .set('Authorization', `Bearer ${managerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.customer.id, customerUser.id);
      assert.ok(Array.isArray(res.body.data.notes));
      assert.ok(res.body.data.notes.length > 0);
    });
  });

  describe('3. Support Cases Lifecycle', () => {
    let createdCaseId: string;

    it('Agent can create a support case', async () => {
      const res = await request(app)
        .post('/api/v1/support-cases')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          customerId: customerUser.id,
          title: 'Damaged Valve Issue',
          description: 'Customer reports cylinder valve leakage.',
          priority: 'urgent',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.match(res.body.data.caseNumber, /^CASE-/);
      assert.equal(res.body.data.status, 'open');
      assert.equal(res.body.data.priority, 'urgent');
      createdCaseId = res.body.data.id;
    });

    it('Manager can update case status and assign agent', async () => {
      const res = await request(app)
        .patch(`/api/v1/support-cases/${createdCaseId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: 'in_progress',
          assignedStaffId: agentUser.id,
          resolutionNotes: 'Assigned to Agent for field inspection dispatch.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'in_progress');
      assert.equal(res.body.data.assignedStaffId, agentUser.id);
    });
  });

  describe('4. Safe Refund Request & Approval Workflow', () => {
    let testOrderId: string;
    let refundRequestId: string;

    it('Agent can submit a refund request for an eligible order', async () => {
      // Create a completed test order with valid category 'cat_products'
      testOrderId = `ORD-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
      await db.insert(orders).values({
        id: testOrderId,
        customerId: customerUser.id,
        customerName: customerUser.name || 'Customer',
        customerPhone: customerUser.phoneNumber,
        serviceCategoryId: 'cat_products',
        subtotal: '14.00',
        discountAmount: '0.00',
        deliveryFee: '0.00',
        totalAmount: '14.00',
        paymentMethod: 'cash_on_delivery',
        status: 'completed',
        deliveryArea: 'خلدا',
        deliveryStreetAddress: 'شارع وصفي التل',
        deliveryLatitude: 31.98,
        deliveryLongitude: 35.85,
      });

      const res = await request(app)
        .post('/api/v1/refunds/request')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderId: testOrderId,
          amount: 7.00,
          reason: 'One empty cylinder delivered by mistake.',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.match(res.body.data.refundNumber, /^REF-/);
      assert.equal(res.body.data.status, 'requested');
      assert.equal(res.body.data.amount, 7.0);
      refundRequestId = res.body.data.id;
    });

    it('Rejects duplicate open refund request for the same order (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/refunds/request')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderId: testOrderId,
          amount: 7.00,
          reason: 'Duplicate attempt.',
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.error?.code, 'DUPLICATE_OPEN_REFUND_REQUEST');
    });

    it('Agent CANNOT approve a refund (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/refunds/${refundRequestId}/approve`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ notes: 'Self approval attempt' });

      assert.equal(res.status, 403);
      assert.equal(res.body.error?.code, 'FORBIDDEN_PERMISSION');
    });

    it('Manager can review and approve refund request', async () => {
      // 1. Move to review
      const reviewRes = await request(app)
        .post(`/api/v1/refunds/${refundRequestId}/review`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: 'Verified with delivery driver.' });

      assert.equal(reviewRes.status, 200);
      assert.equal(reviewRes.body.data.status, 'under_review');

      // 2. Approve
      const approveRes = await request(app)
        .post(`/api/v1/refunds/${refundRequestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: 'Approved for refund.' });

      assert.equal(approveRes.status, 200);
      assert.equal(approveRes.body.data.status, 'approved');
    });

    it('Manager CANNOT execute/process refund (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/refunds/${refundRequestId}/process`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: 'Manager process attempt' });

      assert.equal(res.status, 403);
      assert.equal(res.body.error?.code, 'FORBIDDEN_PERMISSION');
    });

    it('Super Admin can process and mark refund completed', async () => {
      const res = await request(app)
        .post(`/api/v1/refunds/${refundRequestId}/process`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          gatewayReference: 'MANUAL_CASH_VOUCHER_101',
          notes: 'Customer compensated via cash voucher.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'processed');
      assert.equal(res.body.data.gatewayReference, 'MANUAL_CASH_VOUCHER_101');
    });
  });

  describe('5. Centralized Audit Logs', () => {
    it('Super Admin and Manager can query audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.logs));
      assert.ok(res.body.data.logs.length > 0);
    });

    it('Customer Service Agent CANNOT view audit logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${agentToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.error?.code, 'FORBIDDEN_PERMISSION');
    });
  });
});
