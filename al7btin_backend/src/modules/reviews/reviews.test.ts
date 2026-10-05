import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/users.schema.js';
import { providers } from '../../db/schema/providers.schema.js';
import { orders, orderStatusHistory } from '../../db/schema/orders.schema.js';
import { orderReviews } from '../../db/schema/reviews.schema.js';
import { generateTokens } from '../auth/utils/jwt.js';
import { eq } from 'drizzle-orm';

describe('⭐ Phase 7: Customer Reviews & Ratings Engine Test Suite', () => {
  const app = createApp();
  const request = supertest(app);

  let customerUser: any;
  let otherCustomerUser: any;
  let testProvider: any;
  let customerToken: string;
  let otherCustomerToken: string;
  let completedOrder: any;
  let pendingOrder: any;

  before(async () => {
    const timestamp = Date.now();

    // 1. Create verified customer user
    const [cUser] = await db
      .insert(users)
      .values({
        phoneNumber: `0777${timestamp.toString().slice(-6)}`,
        name: 'Verified Review Customer',
        role: 'customer',
        isActive: true,
      })
      .returning();
    customerUser = cUser;
    customerToken = generateTokens(customerUser).accessToken;

    // 2. Create second customer for IDOR checks
    const [otherUser] = await db
      .insert(users)
      .values({
        phoneNumber: `0788${timestamp.toString().slice(-6)}`,
        name: 'Other Customer',
        role: 'customer',
        isActive: true,
      })
      .returning();
    otherCustomerUser = otherUser;
    otherCustomerToken = generateTokens(otherCustomerUser).accessToken;

    // 3. Create test provider
    const [prov] = await db
      .insert(providers)
      .values({
        id: `prov_review_test_${timestamp}`,
        nameAr: 'مركز الفحص والصيانة المتقدم',
        nameEn: 'Advanced Auto Center',
        phoneNumber: `0799${timestamp.toString().slice(-6)}`,
        address: 'عمان - شارع وصفي التل',
        latitude: 31.9875,
        longitude: 35.8562,
        rating: 5.0,
        isActive: true,
        isAvailable: true,
      })
      .returning();
    testProvider = prov;

    // 4. Create Completed Order
    const [cOrd] = await db
      .insert(orders)
      .values({
        id: `ORD-REV-COMP-${timestamp}`,
        customerId: customerUser.id,
        customerName: customerUser.name,
        customerPhone: customerUser.phoneNumber,
        serviceCategoryId: 'cat_vehicle_services',
        providerId: testProvider.id,
        providerName: testProvider.nameAr,
        providerPhone: testProvider.phoneNumber,
        deliveryArea: 'الجبيهة',
        deliveryStreetAddress: 'شارع الجامعة',
        deliveryLatitude: 32.015,
        deliveryLongitude: 35.872,
        subtotal: '25.00',
        deliveryFee: '0.00',
        totalAmount: '25.00',
        status: 'completed',
      })
      .returning();
    completedOrder = cOrd;

    // 5. Create Pending Order
    const [pOrd] = await db
      .insert(orders)
      .values({
        id: `ORD-REV-PEND-${timestamp}`,
        customerId: customerUser.id,
        customerName: customerUser.name,
        customerPhone: customerUser.phoneNumber,
        serviceCategoryId: 'cat_vehicle_services',
        providerId: testProvider.id,
        providerName: testProvider.nameAr,
        providerPhone: testProvider.phoneNumber,
        deliveryArea: 'الجبيهة',
        deliveryStreetAddress: 'شارع الجامعة',
        deliveryLatitude: 32.015,
        deliveryLongitude: 35.872,
        subtotal: '25.00',
        deliveryFee: '0.00',
        totalAmount: '25.00',
        status: 'confirmed',
      })
      .returning();
    pendingOrder = pOrd;
  });

  after(async () => {
    // Clean up test data
    if (completedOrder) {
      await db.delete(orderReviews).where(eq(orderReviews.orderId, completedOrder.id));
      await db.delete(orders).where(eq(orders.id, completedOrder.id));
    }
    if (pendingOrder) {
      await db.delete(orders).where(eq(orders.id, pendingOrder.id));
    }
    if (testProvider) {
      await db.delete(providers).where(eq(providers.id, testProvider.id));
    }
    if (customerUser) {
      await db.delete(users).where(eq(users.id, customerUser.id));
    }
    if (otherCustomerUser) {
      await db.delete(users).where(eq(users.id, otherCustomerUser.id));
    }
  });

  it('1. Rejects review on uncompleted order (400 ORDER_NOT_COMPLETED)', async () => {
    const res = await request
      .post(`/api/v1/orders/${pendingOrder.id}/review`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        rating: 5,
        comment: 'خدمة ممتازة وسريعة',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'ORDER_NOT_COMPLETED');
  });

  it('2. Rejects unauthorized customer rating another customer order (403 FORBIDDEN_ORDER_ACCESS)', async () => {
    const res = await request
      .post(`/api/v1/orders/${completedOrder.id}/review`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({
        rating: 4,
        comment: 'محاولة تقييم غير مصرح بها',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_ORDER_ACCESS');
  });

  it('3. Rejects invalid rating outside 1-5 bounds (400 INVALID_RATING_VALUE)', async () => {
    const res = await request
      .post(`/api/v1/orders/${completedOrder.id}/review`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        rating: 6,
        comment: 'تقييم خارج النطاق',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_RATING_VALUE');
  });

  it('4. Verified customer submits 4-star review on completed order and recalculates provider rating', async () => {
    const res = await request
      .post(`/api/v1/orders/${completedOrder.id}/review`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        rating: 4,
        comment: 'وصل الونش بسرعة وتم نقل المركبة باحترافية عالية.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.rating, 4);
    assert.equal(res.body.data.orderId, completedOrder.id);
    assert.equal(res.body.data.isVerifiedPurchase, true);
    assert.equal(res.body.providerRating, 4);

    // Verify provider DB rating updated
    const [updatedProv] = await db.select().from(providers).where(eq(providers.id, testProvider.id));
    assert.equal(updatedProv.rating, 4);
  });

  it('5. Rejects duplicate review on the same order (400 ORDER_ALREADY_REVIEWED)', async () => {
    const res = await request
      .post(`/api/v1/orders/${completedOrder.id}/review`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        rating: 5,
        comment: 'محاولة تقييم ثانية',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'ORDER_ALREADY_REVIEWED');
  });

  it('6. Customer and Admin can retrieve review for the order', async () => {
    const res = await request
      .get(`/api/v1/orders/${completedOrder.id}/review`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.rating, 4);
    assert.equal(res.body.data.comment, 'وصل الونش بسرعة وتم نقل المركبة باحترافية عالية.');
  });

  it('7. Public can query provider reviews feed with pagination', async () => {
    const res = await request.get(`/api/v1/reviews/providers/${testProvider.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.data), true);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].rating, 4);
  });
});
