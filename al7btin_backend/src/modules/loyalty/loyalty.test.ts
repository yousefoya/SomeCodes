import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/users.schema.js';
import { serviceCategories } from '../../db/schema/categories.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { coupons } from '../../db/schema/coupons.schema.js';
import { loyaltyTransactions } from '../../db/schema/loyalty.schema.js';
import { eq, like } from 'drizzle-orm';
import { generateTokens } from '../auth/utils/jwt.js';
import { loyaltyService } from './loyalty.service.js';
import { sql } from '../../config/database.js';

const app = createApp();

describe('👑 Loyalty System & Rewards Test Suite', () => {
  let customerId: string;
  let customerToken = '';
  let adminToken = '';
  const testOrderId = 'ORD-LOYALTY-001';

  before(async () => {
    // 1. Create test customer
    const [cust] = await db
      .insert(users)
      .values({
        phoneNumber: '0797771122',
        name: 'عميل اختبار الولاء',
        role: 'customer',
        points: 0,
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { points: 0 },
      })
      .returning();
    customerId = cust.id;
    customerToken = generateTokens(cust).accessToken;

    // Clean up previous test transactions for this test customer
    await db.delete(loyaltyTransactions).where(eq(loyaltyTransactions.userId, customerId));
    await db.update(users).set({ points: 0 }).where(eq(users.id, customerId));

    // 2. Create test admin
    const [adm] = await db
      .insert(users)
      .values({
        phoneNumber: '0790000099',
        name: 'مسؤول الولاء',
        role: 'admin',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { role: 'admin' },
      })
      .returning();
    adminToken = generateTokens(adm).accessToken;

    // 3. Ensure test category and completed test order exist
    await db
      .insert(serviceCategories)
      .values({
        id: 'cat_test_loyalty',
        nameAr: 'قسم اختبار الولاء',
        nameEn: 'Loyalty Test Category',
        isActive: true,
      })
      .onConflictDoNothing();

    await db
      .insert(orders)
      .values({
        id: testOrderId,
        customerId,
        customerName: 'عميل اختبار الولاء',
        customerPhone: '0797771122',
        serviceCategoryId: 'cat_test_loyalty',
        deliveryArea: 'عبدون',
        deliveryStreetAddress: 'شارع دمشق',
        deliveryLatitude: 31.9539,
        deliveryLongitude: 35.9106,
        subtotal: '25.00',
        totalAmount: '25.00',
        status: 'completed',
      })
      .onConflictDoNothing();

    // 4. Initialize and normalize loyalty settings for testing
    await loyaltyService.getSettings();
    await loyaltyService.updateSettings({
      requiredPoints: 200,
      rewardType: 'coupon',
      rewardValue: '5.00',
      titleAr: 'خصم 5 د.أ مقابل 200 نقطة ولاء',
      titleEn: '5 JOD Discount for 200 Loyalty Points',
      isActive: true,
    });
  });

  test('1. Customer initial loyalty profile has 0 points and is not eligible', async () => {
    const res = await request(app)
      .get('/api/v1/loyalty/my-points')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.points, 0);
    assert.equal(res.body.data.isEligibleForReward, false);
    assert.equal(res.body.data.requiredPointsForReward, 200);
  });

  test('2. Award +10 points only upon successful completed order', async () => {
    const result = await loyaltyService.awardOrderCompletionPoints(testOrderId, customerId);
    assert.equal(result.awarded, true);
    assert.equal(result.pointsAwarded, 10);
    assert.equal(result.newTotal, 10);

    // Verify in customer profile
    const profileRes = await request(app)
      .get('/api/v1/loyalty/my-points')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(profileRes.status, 200);
    assert.equal(profileRes.body.data.points, 10);
    assert.equal(profileRes.body.data.totalEarned, 10);
  });

  test('3. Strictly prevents duplicate point awards for the same completed order', async () => {
    // Second attempt for the same order
    const result = await loyaltyService.awardOrderCompletionPoints(testOrderId, customerId);
    assert.equal(result.awarded, false);
    assert.equal(result.pointsAwarded, 0);
    assert.equal(result.newTotal, 10);

    // Verify balance was NOT incremented
    const [user] = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
    assert.equal(user.points, 10);
  });

  test('4. Redemption fails with 400 when points are insufficient (< 200)', async () => {
    const res = await request(app)
      .post('/api/v1/loyalty/redeem')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INSUFFICIENT_LOYALTY_POINTS');
  });

  test('5. Admin can view and update loyalty settings', async () => {
    const getRes = await request(app)
      .get('/api/v1/loyalty/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.requiredPoints, 200);

    const updateRes = await request(app)
      .put('/api/v1/loyalty/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        requiredPoints: 200,
        rewardValue: 5.0,
        titleAr: 'كوبون خصم 5 دنانير مقابل 200 نقطة',
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.rewardValue, '5.00');
    assert.equal(updateRes.body.data.titleAr, 'كوبون خصم 5 دنانير مقابل 200 نقطة');
  });

  test('6. Customer with 250 points redeems 200 points, retains 50 points remainder, and receives coupon', async () => {
    // Set points to 250 for testing
    await db.update(users).set({ points: 250 }).where(eq(users.id, customerId));

    const redeemRes = await request(app)
      .post('/api/v1/loyalty/redeem')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(redeemRes.status, 200);
    assert.equal(redeemRes.body.success, true);
    assert.equal(redeemRes.body.data.redeemedPoints, 200);
    assert.equal(redeemRes.body.data.remainingPoints, 50);
    assert.equal(redeemRes.body.data.coupon.value, 5);
    assert.match(redeemRes.body.data.coupon.code, /^LOYAL-/);

    // Verify database state
    const [userAfter] = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
    assert.equal(userAfter.points, 50);

    // Verify coupon was generated in coupons table
    const [couponRecord] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, redeemRes.body.data.coupon.code))
      .limit(1);
    assert.ok(couponRecord);
    assert.equal(couponRecord.value, '5.00');
  });

  after(async () => {
    try {
      await db.delete(loyaltyTransactions).where(eq(loyaltyTransactions.userId, customerId));
      await db.delete(coupons).where(like(coupons.code, 'LOYAL-%'));
      await db.delete(orders).where(eq(orders.id, testOrderId));
      await db.delete(serviceCategories).where(eq(serviceCategories.id, 'cat_test_loyalty'));
      await db.delete(users).where(eq(users.phoneNumber, '0797771122'));
      await db.delete(users).where(eq(users.phoneNumber, '0790000099'));
    } catch (_) {}
  });
});
