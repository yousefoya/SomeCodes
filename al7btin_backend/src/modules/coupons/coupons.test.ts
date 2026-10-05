import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { coupons, users } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { generateTokens } from '../auth/utils/jwt.js';

test('🎟️ Dynamic Coupon Engine Test Suite', async (t) => {
  const app = createApp();

  // Create or get Admin token
  const adminId = '11111111-1111-1111-1111-111111111111';
  const [adminUser] = await db
    .insert(users)
    .values({
      id: adminId,
      phoneNumber: '0790980947',
      name: 'System Admin',
      role: 'admin',
      isPhoneVerified: true,
      status: 'active',
    })
    .onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'admin', status: 'active' },
    })
    .returning();

  const { accessToken: adminToken } = generateTokens(adminUser);

  const testCouponCode = `TEST${Date.now()}`;

  await t.test('1. Admin can create dynamic percentage coupon', async () => {
    const res = await request(app)
      .post('/api/v1/coupons/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: testCouponCode,
        type: 'percentage',
        value: '20.00',
        minOrderValue: '10.00',
        usageLimit: 100,
        isActive: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.coupon.code, testCouponCode);
    assert.equal(res.body.data.coupon.type, 'percentage');
  });

  await t.test('2. Public user can view active coupons', async () => {
    const res = await request(app).get('/api/v1/coupons');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.coupons));
    const found = res.body.data.coupons.find((c: any) => c.code === testCouponCode);
    assert.ok(found);
  });

  await t.test('3. Validate coupon with valid subtotal calculates exact 20% discount', async () => {
    const res = await request(app)
      .post('/api/v1/coupons/validate')
      .send({
        code: testCouponCode,
        subtotal: 50.0,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isValid, true);
    assert.equal(res.body.data.discountAmount, 10.0); // 20% of 50 = 10
    assert.equal(res.body.data.finalTotal, 40.0);
  });

  await t.test('4. Validate coupon fails when below minimum order value', async () => {
    const res = await request(app)
      .post('/api/v1/coupons/validate')
      .send({
        code: testCouponCode,
        subtotal: 5.0, // min is 10.0
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('5. Admin can toggle coupon active status and delete it', async () => {
    // Find coupon
    const [c] = await db.select().from(coupons).where(eq(coupons.code, testCouponCode));
    assert.ok(c);

    // Toggle inactive
    const updateRes = await request(app)
      .patch(`/api/v1/coupons/admin/${c.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.coupon.isActive, false);

    // Delete
    const delRes = await request(app)
      .delete(`/api/v1/coupons/admin/${c.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(delRes.status, 200);
  });
});
