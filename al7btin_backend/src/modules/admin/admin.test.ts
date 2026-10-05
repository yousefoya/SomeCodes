import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { users, authOtps, refreshTokens } from '../../db/schema/users.schema.js';
import { providers } from '../../db/schema/providers.schema.js';
import { deliveryEmployees } from '../../db/schema/delivery.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { sql } from '../../config/database.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('👑 Admin Endpoints & Live Analytics Test Suite', () => {
  const adminPhone = '0790000099';
  const customerPhone = '0791119977';
  const testUserPhone = '0795554433';

  let adminAccessToken = '';
  let customerAccessToken = '';
  let testUserId = '';

  before(async () => {
    // Clean test records
    await db.delete(users).where(eq(users.phoneNumber, adminPhone));
    await db.delete(users).where(eq(users.phoneNumber, customerPhone));
    await db.delete(users).where(eq(users.phoneNumber, testUserPhone));
    await db.delete(authOtps).where(eq(authOtps.phoneNumber, adminPhone));
    await db.delete(authOtps).where(eq(authOtps.phoneNumber, customerPhone));
    await db.delete(authOtps).where(eq(authOtps.phoneNumber, testUserPhone));

    // 1. Create Admin User
    const [adminUser] = await db
      .insert(users)
      .values({
        phoneNumber: adminPhone,
        name: 'مدير لوحة التحكم',
        role: 'admin',
      })
      .returning();

    // 2. Create Customer User
    const [custUser] = await db
      .insert(users)
      .values({
        phoneNumber: customerPhone,
        name: 'عميل عادي',
        role: 'customer',
      })
      .returning();

    // 3. Create Test Subject User
    const [testUser] = await db
      .insert(users)
      .values({
        phoneNumber: testUserPhone,
        name: 'مستخدم تجريبي للتحكم',
        role: 'customer',
        email: 'test_admin_user@example.com',
      })
      .returning();
    testUserId = testUser.id;

    // Login Admin to get Token
    const adminOtpHash = await bcrypt.hash('1234', 10);
    await db.insert(authOtps).values({
      phoneNumber: adminPhone,
      otpHash: adminOtpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: adminPhone, otp: '1234', mode: 'login' });

    adminAccessToken = adminLoginRes.body.data.accessToken;

    // Login Customer to get Token
    const custOtpHash = await bcrypt.hash('1234', 10);
    await db.insert(authOtps).values({
      phoneNumber: customerPhone,
      otpHash: custOtpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const custLoginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: customerPhone, otp: '1234', mode: 'login' });

    customerAccessToken = custLoginRes.body.data.accessToken;
  });

  after(async () => {
    // Clean up created records
    await db.delete(users).where(eq(users.phoneNumber, adminPhone));
    await db.delete(users).where(eq(users.phoneNumber, customerPhone));
    await db.delete(users).where(eq(users.phoneNumber, testUserPhone));
    await sql.end();
  });

  test('1. Security: Rejects unauthenticated request to /admin/users with 401', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    assert.equal(res.status, 401);
  });

  test('2. Security: Rejects non-admin user request to /admin/users with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${customerAccessToken}`);

    assert.equal(res.status, 403);
  });

  test('3. GET /api/v1/admin/users: Returns paginated user list from PostgreSQL', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.users));
    assert.ok(res.body.data.total >= 3);
    assert.equal(res.body.data.page, 1);
    assert.equal(res.body.data.limit, 10);
    assert.ok(res.body.data.totalPages >= 1);
  });

  test('4. GET /api/v1/admin/users?search=...: Searches users by name or phone or email', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?search=تجريبي')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.users.length >= 1);
    const found = res.body.data.users.find((u: any) => u.id === testUserId);
    assert.ok(found);
    assert.equal(found.name, 'مستخدم تجريبي للتحكم');
  });

  test('5. GET /api/v1/admin/users?role=customer: Filters users by role', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?role=customer')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.users.every((u: any) => u.role === 'customer'));
  });

  test('6. GET /api/v1/admin/users/:id: Returns single user detail', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, testUserId);
    assert.equal(res.body.data.phoneNumber, testUserPhone);
  });

  test('6b. POST /api/v1/admin/users: Admin creates a new user directly in PostgreSQL', async () => {
    const newPhone = '0798765400';
    await db.delete(users).where(eq(users.phoneNumber, newPhone));

    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        phoneNumber: newPhone,
        name: 'عميل مسجل بواسطة الإدارة',
        email: 'admin_created@test.com',
        role: 'customer',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.phoneNumber, newPhone);
    assert.equal(res.body.data.name, 'عميل مسجل بواسطة الإدارة');

    // Clean up
    await db.delete(users).where(eq(users.phoneNumber, newPhone));
  });

  test('7. PATCH /api/v1/admin/users/:id: Updates user details and role in PostgreSQL', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'مستخدم تجريبي محدث',
        email: 'updated_email@example.com',
        role: 'provider',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'مستخدم تجريبي محدث');
    assert.equal(res.body.data.email, 'updated_email@example.com');
    assert.equal(res.body.data.role, 'provider');

    // Verify directly in DB
    const [dbUser] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    assert.equal(dbUser.name, 'مستخدم تجريبي محدث');
    assert.equal(dbUser.email, 'updated_email@example.com');
    assert.equal(dbUser.role, 'provider');
  });

  test('8. POST /api/v1/admin/users/:id/suspend: Suspends user in PostgreSQL', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/users/${testUserId}/suspend`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isSuspended, true);

    const [dbUser] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    assert.equal(dbUser.isSuspended, true);
  });

  test('9. POST /api/v1/admin/users/:id/activate: Activates user in PostgreSQL', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/users/${testUserId}/activate`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isSuspended, false);

    const [dbUser] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    assert.equal(dbUser.isSuspended, false);
  });

  test('10. GET /api/v1/admin/stats: Returns live aggregated metrics from PostgreSQL', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.totalUsers === 'number');
    assert.ok(typeof res.body.data.activeUsers === 'number');
    assert.ok(typeof res.body.data.suspendedUsers === 'number');
    assert.ok(res.body.data.usersByRole);
    assert.ok(typeof res.body.data.usersByRole.customer === 'number');
    assert.ok(typeof res.body.data.usersByRole.admin === 'number');
    assert.ok(typeof res.body.data.usersByRole.provider === 'number');
    assert.ok(typeof res.body.data.usersByRole.delivery === 'number');
    assert.ok(typeof res.body.data.totalOrders === 'number');
    assert.ok(typeof res.body.data.totalRevenue === 'number');
    assert.ok(Array.isArray(res.body.data.recentUsers));
    assert.ok(Array.isArray(res.body.data.recentOrders));
  });
});
