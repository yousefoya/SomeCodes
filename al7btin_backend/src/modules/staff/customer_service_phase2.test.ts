import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateTokens } from '../auth/utils/jwt.js';
import { db } from '../../db/index.js';
import { users, User } from '../../db/schema/users.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { supportCases, auditLogs } from '../../db/schema/staff.schema.js';
import { eq, desc } from 'drizzle-orm';

const app = createApp();

describe('🎧 Phase 2: Customer Service Operations & Support System Verification', () => {
  let superAdminUser: User;
  let managerUser: User;
  let agent1User: User;
  let agent2User: User;
  let customerUser: User;

  let superAdminToken: string;
  let managerToken: string;
  let agent1Token: string;
  let agent2Token: string;
  let customerToken: string;

  let testCaseId: string;
  let testOrderId: string;

  before(async () => {
    // 1. Super Admin
    const [sa] = await db
      .insert(users)
      .values({
        phoneNumber: '0799981001',
        name: 'Phase2 Super Admin',
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
        phoneNumber: '0799981002',
        name: 'Phase2 CS Manager',
        role: 'customer_service_manager',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer_service_manager', isSuspended: false },
      })
      .returning();
    managerUser = mgr;
    managerToken = generateTokens(mgr).accessToken;

    // 3. CS Agent 1
    const [agt1] = await db
      .insert(users)
      .values({
        phoneNumber: '0799981003',
        name: 'Phase2 CS Agent 1',
        role: 'customer_service_agent',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer_service_agent', isSuspended: false },
      })
      .returning();
    agent1User = agt1;
    agent1Token = generateTokens(agt1).accessToken;

    // 4. CS Agent 2
    const [agt2] = await db
      .insert(users)
      .values({
        phoneNumber: '0799981004',
        name: 'Phase2 CS Agent 2',
        role: 'customer_service_agent',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer_service_agent', isSuspended: false },
      })
      .returning();
    agent2User = agt2;
    agent2Token = generateTokens(agt2).accessToken;

    // 5. Customer
    const [cust] = await db
      .insert(users)
      .values({
        phoneNumber: '0799981005',
        name: 'Phase2 Test Customer',
        role: 'customer',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'customer', isSuspended: false },
      })
      .returning();
    customerUser = cust;
    customerToken = generateTokens(cust).accessToken;

    // Create a dummy order for testing
    const testOrderIdVal = `ORD-P2-${Date.now()}`;
    const [ord] = await db
      .insert(orders)
      .values({
        id: testOrderIdVal,
        customerId: customerUser.id,
        customerName: customerUser.name || 'Phase2 Test Customer',
        customerPhone: customerUser.phoneNumber,
        serviceCategoryId: 'cat_products',
        status: 'pending',
        deliveryCity: 'عمان',
        deliveryArea: 'Khalda',
        deliveryStreetAddress: 'Wasfi Al-Tal Street, Building 14',
        deliveryLatitude: 31.9722,
        deliveryLongitude: 35.8522,
        subtotal: '15.00',
        deliveryFee: '0.00',
        totalAmount: '15.00',
        paymentMethod: 'cash_on_delivery',
      })
      .returning();
    testOrderId = ord.id;
  });

  describe('1. Support Case Categories & CRUD', () => {
    it('1.1 Allows creating support case with valid categories', async () => {
      const res = await request(app)
        .post('/api/v1/support-cases')
        .set('Authorization', `Bearer ${agent1Token}`)
        .send({
          customerId: customerUser.id,
          orderId: testOrderId,
          title: 'Order delivery delayed past SLA',
          description: 'The gas cylinder was scheduled for 2 PM but has not arrived by 4 PM.',
          category: 'order_delay',
          priority: 'high',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.category, 'order_delay');
      assert.equal(res.body.data.priority, 'high');
      assert.equal(res.body.data.status, 'open');
      testCaseId = res.body.data.id;
    });

    it('1.2 Defaults invalid categories safely to general without crashing', async () => {
      const res = await request(app)
        .post('/api/v1/support-cases')
        .set('Authorization', `Bearer ${agent1Token}`)
        .send({
          customerId: customerUser.id,
          title: 'Miscellaneous inquiry',
          description: 'Customer asked about cylinder dimensions',
          category: 'non_existent_category',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.category, 'general');
    });

    it('1.3 Filters support cases by category accurately', async () => {
      const res = await request(app)
        .get('/api/v1/support-cases?category=order_delay')
        .set('Authorization', `Bearer ${agent1Token}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.cases.length >= 1);
      for (const c of res.body.data.cases) {
        assert.equal(c.category, 'order_delay');
      }
    });
  });

  describe('2. Strict Reassignment RBAC Enforcement', () => {
    it('2.1 Rejects case reassignment attempt by CS Agent with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/v1/support-cases/${testCaseId}`)
        .set('Authorization', `Bearer ${agent1Token}`)
        .send({
          assignedStaffId: agent2User.id,
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN_PERMISSION');
    });

    it('2.2 Allows CS Manager to reassign case to another agent', async () => {
      const res = await request(app)
        .patch(`/api/v1/support-cases/${testCaseId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          assignedStaffId: agent2User.id,
          status: 'in_progress',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.assignedStaffId, agent2User.id);
      assert.equal(res.body.data.status, 'in_progress');
    });
  });

  describe('3. Support Case Internal Notes Thread & Audit Logging', () => {
    it('3.1 Adds internal note to support case with author metadata', async () => {
      const res = await request(app)
        .post(`/api/v1/support-cases/${testCaseId}/notes`)
        .set('Authorization', `Bearer ${agent2Token}`)
        .send({
          note: 'Called the delivery driver; driver reported traffic on Wasfi Al-Tal street. ETA 15 mins.',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.authorUserId, agent2User.id);
      assert.equal(res.body.data.authorRole, 'customer_service_agent');
    });

    it('3.2 Rejects blank internal note', async () => {
      const res = await request(app)
        .post(`/api/v1/support-cases/${testCaseId}/notes`)
        .set('Authorization', `Bearer ${agent2Token}`)
        .send({
          note: '   ',
        });

      assert.equal(res.status, 400);
    });

    it('3.3 Returns case details with internal notes attached', async () => {
      const res = await request(app)
        .get(`/api/v1/support-cases/${testCaseId}`)
        .set('Authorization', `Bearer ${agent2Token}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data.notes));
      assert.ok(res.body.data.notes.length >= 1);
      assert.ok(res.body.data.notes.some((n: any) => n.note.includes('Called the delivery driver')));
    });

    it('3.4 Verifies audit log entry for case note addition', async () => {
      const [log] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, 'SUPPORT_CASE_NOTE_CREATE'))
        .orderBy(desc(auditLogs.createdAt))
        .limit(1);

      assert.ok(log);
      assert.equal(log.actorUserId, agent2User.id);
      assert.equal(log.entityType, 'support_case');
      assert.equal(log.entityId, testCaseId);
    });
  });

  describe('4. Fast Order Search for Customer Service Workspace', () => {
    it('4.1 Searches orders by partial order ID', async () => {
      const partialId = testOrderId.slice(0, 8);
      const res = await request(app)
        .get(`/api/v1/customer-service/orders/search?q=${partialId}`)
        .set('Authorization', `Bearer ${agent1Token}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((o: any) => o.id === testOrderId));
    });

    it('4.2 Returns empty array on short query string (<2 chars)', async () => {
      const res = await request(app)
        .get('/api/v1/customer-service/orders/search?q=a')
        .set('Authorization', `Bearer ${agent1Token}`);

      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data, []);
    });

    it('4.3 Rejects customer access to CS order search', async () => {
      const res = await request(app)
        .get(`/api/v1/customer-service/orders/search?q=${testOrderId.slice(0, 8)}`)
        .set('Authorization', `Bearer ${customerToken}`);

      assert.equal(res.status, 403);
    });
  });

  describe('5. Operational Dashboard Aggregations (Agent & Manager)', () => {
    it('5.1 Agent dashboard contains myInProgressCasesCount and handledInteractionsToday', async () => {
      const res = await request(app)
        .get('/api/v1/staff/dashboard/summary')
        .set('Authorization', `Bearer ${agent2Token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.role, 'customer_service_agent');
      assert.equal(typeof res.body.data.myOpenCasesCount, 'number');
      assert.equal(typeof res.body.data.myInProgressCasesCount, 'number');
      assert.ok(res.body.data.myInProgressCasesCount >= 1); // Assigned in test 2.2
      assert.equal(typeof res.body.data.myWaitingCasesCount, 'number');
      assert.equal(typeof res.body.data.handledInteractionsToday, 'number');
    });

    it('5.2 Manager dashboard contains casesByStatus, casesByAgent, and averageWorkload', async () => {
      const res = await request(app)
        .get('/api/v1/staff/dashboard/summary')
        .set('Authorization', `Bearer ${managerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.role, 'customer_service_manager');
      assert.equal(typeof res.body.data.openCasesCount, 'number');
      assert.equal(typeof res.body.data.unassignedCasesCount, 'number');
      assert.equal(typeof res.body.data.urgentCasesCount, 'number');
      assert.equal(typeof res.body.data.pendingRefundsCount, 'number');
      assert.equal(typeof res.body.data.activeStaffCount, 'number');

      // Breakdown metrics
      assert.ok(res.body.data.casesByStatus);
      assert.equal(typeof res.body.data.casesByStatus.in_progress, 'number');
      assert.ok(Array.isArray(res.body.data.casesByAgent));
      assert.equal(typeof res.body.data.averageWorkload, 'number');
    });
  });
});
