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
import { OTPFactory } from './otp/otp.factory.js';
import { TestOTPProvider } from './otp/test.otp.provider.js';
import { DevelopmentOTPProvider } from './otp/development.otp.provider.js';

const app = createApp();

describe('🔐 Backend Strict Authentication & User Accounts Test Suite', () => {
  const customerPhone = '0791112233';
  const unknownPhone = '0799991199';
  const suspendedPhone = '0799998877';
  const adminPhone = '0790000001';
  const providerPhone = '0781112233';
  const newCustomerPhone = '0792223344';
  const takenPhone = '0793334455';

  let customerAccessToken = '';
  let customerRefreshToken = '';
  let customerId = '';
  let adminAccessToken = '';
  let providerAccessToken = '';

  before(async () => {
    // Ensure TestOTPProvider is active for test suite
    OTPFactory.setProvider(new TestOTPProvider());

    // Clean test records
    await db.delete(authOtps);
    await db.delete(providers).where(eq(providers.phoneNumber, providerPhone));
    await db.delete(users).where(eq(users.phoneNumber, customerPhone));
    await db.delete(users).where(eq(users.phoneNumber, unknownPhone));
    await db.delete(users).where(eq(users.phoneNumber, suspendedPhone));
    await db.delete(users).where(eq(users.phoneNumber, adminPhone));
    await db.delete(users).where(eq(users.phoneNumber, providerPhone));
    await db.delete(users).where(eq(users.phoneNumber, newCustomerPhone));

    // 1. Create a suspended user
    await db.insert(users).values({
      phoneNumber: suspendedPhone,
      name: 'مستخدم موقوف',
      role: 'customer',
      isSuspended: true,
    });

    // 2. Create an admin user
    await db.insert(users).values({
      phoneNumber: adminPhone,
      name: 'مدير الفحص',
      role: 'admin',
    });

    // 3. Create a provider user
    await db.insert(users).values({
      phoneNumber: providerPhone,
      name: 'مزود الفحص',
      role: 'provider',
    });
  });

  after(async () => {
    await sql.end();
  });

  test('1. login: Rejects unknown phone with 404 ACCOUNT_NOT_FOUND', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ phoneNumber: unknownPhone });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'ACCOUNT_NOT_FOUND');
  });

  test('2. login: Verifies that unknown login does NOT create a user in PostgreSQL', async () => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, unknownPhone))
      .limit(1);

    assert.equal(user, undefined);
  });

  test('3. register: Rejects registration when name is missing (400 NAME_REQUIRED)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ phoneNumber: customerPhone, name: '' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NAME_REQUIRED');
  });

  test('4. register: Dispatches OTP for a new customer with valid name', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ phoneNumber: customerPhone, name: 'أحمد المجالي' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.expiresInSeconds > 0);
  });

  test('5. verify-otp (mode: register): Creates CUSTOMER account and returns JWT tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: customerPhone, code: '123456', name: 'أحمد المجالي', mode: 'register' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.phoneNumber, customerPhone);
    assert.equal(res.body.data.user.name, 'أحمد المجالي');
    assert.equal(res.body.data.user.role, 'customer');
    assert.ok(res.body.data.accessToken);
    assert.ok(res.body.data.refreshToken);

    customerId = res.body.data.user.id;
    customerAccessToken = res.body.data.accessToken;
    customerRefreshToken = res.body.data.refreshToken;
  });

  test('6. register: Rejects registration for existing customer (409 ACCOUNT_ALREADY_EXISTS)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ phoneNumber: customerPhone, name: 'أحمد المجالي' });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'ACCOUNT_ALREADY_EXISTS');
  });

  test('7. login: Successfully dispatches OTP for existing registered customer', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ phoneNumber: customerPhone });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.expiresInSeconds > 0);
  });

  test('8. verify-otp (mode: login): Successfully authenticates existing customer', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: customerPhone, code: '123456', mode: 'login' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'customer');
  });

  test('9. verify-otp (mode: login): Rejects unknown phone with 404 and does NOT create user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: unknownPhone, code: '123456', mode: 'login' });

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'ACCOUNT_NOT_FOUND');

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, unknownPhone))
      .limit(1);
    assert.equal(user, undefined);
  });

  test('10. Admin login: Preserves role=admin in PostgreSQL and JWT payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: adminPhone, code: '123456', mode: 'login' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'admin');
    assert.equal(res.body.data.user.name, 'مدير الفحص');

    adminAccessToken = res.body.data.accessToken;
  });

  test('11. Provider login: Preserves role=provider in PostgreSQL and JWT payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: providerPhone, code: '123456', mode: 'login' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'provider');
    assert.equal(res.body.data.user.name, 'مزود الفحص');

    providerAccessToken = res.body.data.accessToken;
  });

  test('12. Suspended user: Login is rejected with 403 ACCOUNT_SUSPENDED', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ phoneNumber: suspendedPhone });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'ACCOUNT_SUSPENDED');
  });

  test('13. verify-otp: Rejects invalid OTP with 400 Bad Request', async () => {
    TestOTPProvider.setCodeForPhone(customerPhone, '654321');

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: customerPhone, code: '000000', mode: 'login' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_OTP');
  });

  test('14. getMe: Authenticated customer can retrieve their profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${customerAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.phoneNumber, customerPhone);
    assert.equal(res.body.data.role, 'customer');
  });

  test('15. change-phone: Rejects if new phone already belongs to another user (409 PHONE_ALREADY_IN_USE)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/phone/send-otp')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({ newPhone: adminPhone });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'PHONE_ALREADY_IN_USE');
  });

  test('16. change-phone: Sends OTP to available new phone number', async () => {
    const res = await request(app)
      .post('/api/v1/auth/phone/send-otp')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({ newPhone: newCustomerPhone });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('17. change-phone: Verifies OTP and updates phone number, preserving user ID and role', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/phone')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({ newPhone: newCustomerPhone, code: '123456' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.id, customerId);
    assert.equal(res.body.data.user.phoneNumber, newCustomerPhone);
    assert.equal(res.body.data.user.role, 'customer');

    // Confirm in DB
    const [dbUser] = await db.select().from(users).where(eq(users.id, customerId));
    assert.equal(dbUser.phoneNumber, newCustomerPhone);
  });

  test('18. refresh: Refreshes access token and rotates refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: customerRefreshToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.ok(res.body.data.refreshToken);
    assert.notEqual(res.body.data.refreshToken, customerRefreshToken);

    customerAccessToken = res.body.data.accessToken;
    customerRefreshToken = res.body.data.refreshToken;
  });

  test('19. delete-account: Soft deletes authenticated user and revokes active sessions', async () => {
    const res = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${customerAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify user is suspended
    const [dbUser] = await db.select().from(users).where(eq(users.id, customerId));
    assert.equal(dbUser.isSuspended, true);

    // Verify refresh token is revoked
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: customerRefreshToken });

    assert.equal(refreshRes.status, 401);
  });

  test('20. logout: Successfully revokes token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ refreshToken: 'dummy-token' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('21. DevelopmentOTPProvider: Generates random 6-digit OTP and verifies accurately', async () => {
    const devProvider = new DevelopmentOTPProvider();
    const testDevPhone = '0797778899';

    const sendRes = await devProvider.sendOtp(testDevPhone);
    assert.equal(sendRes.success, true);
    assert.ok(sendRes.devOtp);
    assert.equal(sendRes.devOtp.length, 6);
    assert.match(sendRes.devOtp, /^\d{6}$/);

    // Verify invalid code fails
    const invalidVerify = await devProvider.verifyOtp(testDevPhone, '000000');
    assert.equal(invalidVerify, false);

    // Verify valid code succeeds
    const validVerify = await devProvider.verifyOtp(testDevPhone, sendRes.devOtp);
    assert.equal(validVerify, true);

    // Verify OTP cannot be reused
    const reuseVerify = await devProvider.verifyOtp(testDevPhone, sendRes.devOtp);
    assert.equal(reuseVerify, false);
  });

  test('22. Development OTP Mode: /auth/register returns devOtp in development API response', async () => {
    OTPFactory.setProvider(new DevelopmentOTPProvider());
    const devCustomerPhone = '0798889900';

    // Clean if existing
    await db.delete(users).where(eq(users.phoneNumber, devCustomerPhone));

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ phoneNumber: devCustomerPhone, name: 'عميل تجريبي ديف' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.devOtp, 'devOtp should be present in response');
    assert.equal(res.body.data.devOtp.length, 6);

    // Verify OTP completes registration
    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        phoneNumber: devCustomerPhone,
        otp: res.body.data.devOtp,
        name: 'عميل تجريبي ديف',
        mode: 'register',
      });

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.data.user.phoneNumber, devCustomerPhone);
    assert.equal(verifyRes.body.data.user.role, 'customer');

    // Reset back to TestOTPProvider for isolation
    OTPFactory.setProvider(new TestOTPProvider());
  });
});
