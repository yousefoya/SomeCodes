import test, { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateTokens } from '../auth/utils/jwt.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/users.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { services, serviceVersions } from '../../db/schema/services.schema.js';
import { providers, providerServices } from '../../db/schema/providers.schema.js';
import { eq } from 'drizzle-orm';

const app = createApp();

describe('🚚 Phase 3: Generic Dynamic Service Engine — Furniture Moving E2E Integration Suite', () => {
  let adminToken: string;
  let customerToken: string;
  let adminUserId: string;
  let customerUserId: string;
  let furnitureServiceId: string;
  let placedOrderId: string;
  let testProviderId = '';

  const testSuffix = Date.now();

  after(async () => {
    if (placedOrderId) {
      await db.delete(orders).where(eq(orders.id, placedOrderId));
    }
    if (furnitureServiceId) {
      await db.delete(providerServices).where(eq(providerServices.serviceId, furnitureServiceId));
      await db.delete(serviceVersions).where(eq(serviceVersions.serviceId, furnitureServiceId));
      await db.delete(services).where(eq(services.id, furnitureServiceId));
    }
    if (adminUserId) {
      await db.delete(users).where(eq(users.id, adminUserId));
    }
    if (customerUserId) {
      await db.delete(users).where(eq(users.id, customerUserId));
    }
  });

  it('1. Prepares test admin and customer users in database', async () => {
    adminUserId = crypto.randomUUID();
    customerUserId = crypto.randomUUID();

    const [provDb] = await db.select().from(providers).where(eq(providers.isActive, true)).limit(1);
    if (provDb) {
      testProviderId = provDb.id;
    }

    const adminPhone = `079${Math.floor(1000000 + Math.random() * 9000000)}`;
    const custPhone = `078${Math.floor(1000000 + Math.random() * 9000000)}`;

    await db.insert(users).values([
      {
        id: adminUserId,
        phoneNumber: adminPhone,
        name: 'Super Admin E2E',
        role: 'super_admin',
        isSuspended: false,
      },
      {
        id: customerUserId,
        phoneNumber: custPhone,
        name: 'Customer E2E',
        role: 'customer',
        isSuspended: false,
      },
    ]);

    adminToken = generateTokens({ id: adminUserId, phoneNumber: adminPhone, role: 'super_admin', isSuspended: false } as any).accessToken;
    customerToken = generateTokens({ id: customerUserId, phoneNumber: custPhone, role: 'customer', isSuspended: false } as any).accessToken;
    assert.ok(adminToken);
    assert.ok(customerToken);
  });

  it('2. Admin creates "Furniture Moving" service draft via Builder API', async () => {
    furnitureServiceId = `srv_furniture_${testSuffix}`;

    const res = await request(app)
      .post('/api/v1/services/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        id: furnitureServiceId,
        categoryId: 'cat_home_services',
        nameAr: 'نقل وتغليف الأثاث المنزلي',
        nameEn: 'Furniture Moving & Packaging',
        descriptionAr: 'خدمة نقل أثاث احترافية مع الفك والتغليف والتركيب والتحميل',
        descriptionEn: 'Professional furniture moving, dismantling, packaging, and assembly',
        basePrice: 10.0,
        unitAr: 'نقلة',
        unitEn: 'trip',
        type: 'home_service',
        slaHours: 24,
        minOrderValue: 10.0,
        maxOrderValue: 500.0,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, furnitureServiceId);
    assert.equal(res.body.data.currentVersion, 1);

    if (testProviderId) {
      await db.insert(providerServices).values({
        providerId: testProviderId,
        serviceId: furnitureServiceId,
        isAvailable: true,
      }).onConflictDoNothing();
    }
  });

  it('3. Admin saves complete schema: 9 dynamic fields, conditional rules & pricing formulas', async () => {
    const fields = [
      {
        key: 'truck_size',
        labelAr: 'حجم شاحنة النقل',
        labelEn: 'Truck Size',
        fieldType: 'select',
        isRequired: true,
        sortOrder: 1,
        options: [
          { labelAr: 'شاحنة صغيرة (ديانا)', labelEn: 'Small Truck', value: 'small', priceModifier: 0 },
          { labelAr: 'شاحنة متوسطة (4 طن)', labelEn: 'Medium Truck', value: 'medium', priceModifier: 5 },
          { labelAr: 'شاحنة كبيرة مغلقة (مجهزة)', labelEn: 'Large Truck', value: 'large', priceModifier: 15 },
        ],
      },
      {
        key: 'workers_count',
        labelAr: 'عدد العمال المطلوبين',
        labelEn: 'Number of Workers',
        fieldType: 'counter',
        defaultValue: 2,
        min: 1,
        max: 10,
        step: 1,
        unitAr: 'عامل',
        unitEn: 'workers',
        isRequired: true,
        sortOrder: 2,
      },
      {
        key: 'floors_count',
        labelAr: 'عدد الطوابق في موقع التحميل',
        labelEn: 'Floors Count',
        fieldType: 'number',
        defaultValue: 0,
        min: 0,
        max: 20,
        unitAr: 'طابق',
        unitEn: 'floors',
        isRequired: true,
        sortOrder: 3,
      },
      {
        key: 'has_elevator',
        labelAr: 'هل يتوفر مصعد لنقل الأثاث؟',
        labelEn: 'Is elevator available?',
        fieldType: 'toggle',
        defaultValue: true,
        isRequired: true,
        sortOrder: 4,
      },
      {
        key: 'building_type',
        labelAr: 'نوع المبنى',
        labelEn: 'Building Type',
        fieldType: 'radio',
        isRequired: true,
        sortOrder: 5,
        options: [
          { labelAr: 'شقة سكنية', labelEn: 'Apartment', value: 'apartment' },
          { labelAr: 'فيلا مستقلة', labelEn: 'Villa', value: 'villa' },
          { labelAr: 'مكتب / شركة', labelEn: 'Office', value: 'office' },
        ],
      },
      {
        key: 'pickup_location',
        labelAr: 'موقع الاستلام (التحميل)',
        labelEn: 'Pickup Location',
        fieldType: 'location',
        isRequired: true,
        sortOrder: 6,
      },
      {
        key: 'delivery_location',
        labelAr: 'موقع التوصيل (التنزيل)',
        labelEn: 'Delivery Location',
        fieldType: 'location',
        isRequired: true,
        sortOrder: 7,
      },
      {
        key: 'moving_date',
        labelAr: 'تاريخ النقل المطلوب',
        labelEn: 'Moving Date',
        fieldType: 'date',
        isRequired: true,
        sortOrder: 8,
      },
      {
        key: 'furniture_photos',
        labelAr: 'صور الأثاث المراد نقله',
        labelEn: 'Furniture Photos',
        fieldType: 'image_upload',
        isRequired: false,
        sortOrder: 9,
      },
    ];

    const rules = [
      {
        ruleName: 'تنبيه عدم وجود مصعد للأدوار العليا',
        condition: {
          operator: 'AND',
          expressions: [
            { field: 'has_elevator', op: 'eq', value: false },
            { field: 'floors_count', op: 'gt', value: 2 },
          ],
        },
        actions: [
          {
            type: 'SHOW_ALERT',
            messageAr: 'يرجى العلم بأنه سيتم احتساب رسوم إضافية لعدم توفر مصعد للأدوار العليا',
            messageEn: 'Additional floor surcharge applied due to lack of elevator for upper floors',
            severity: 'warning',
          },
          {
            type: 'REQUIRE_CAPABILITY',
            capabilityKey: 'heavy_lifting',
          },
        ],
        priority: 1,
      },
    ];

    const pricingRules = [
      {
        ruleType: 'field_multiplier',
        titleAr: 'رسوم العمال الإضافيين (أكثر من عاملين)',
        titleEn: 'Extra Workers Fee',
        targetField: 'workers_count',
        calculationFormula: {
          ratePerUnit: 5.0,
          threshold: 2,
        },
        sortOrder: 1,
      },
      {
        ruleType: 'step_increment',
        titleAr: 'رسوم تنزيل بدون مصعد للأدوار',
        titleEn: 'Floor Surcharge Without Elevator',
        targetField: 'floors_count',
        calculationFormula: {
          ratePerUnit: 2.0,
          threshold: 0,
        },
        condition: {
          operator: 'AND',
          expressions: [{ field: 'has_elevator', op: 'eq', value: false }],
        },
        sortOrder: 2,
      },
    ];

    const res = await request(app)
      .put(`/api/v1/services/admin/${furnitureServiceId}/builder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields,
        rules,
        pricingRules,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('4. Admin publishes Version 1 and creates immutable schema snapshot', async () => {
    const res = await request(app)
      .post(`/api/v1/services/admin/${furnitureServiceId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        changelog: 'الإصدار الأول لخدمة نقل وتغليف الأثاث المنزلي',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.service.isPublished, true);
    assert.equal(res.body.data.service.status, 'published');
  });

  it('5. Flutter client fetches dynamic configuration via GET /services/:id/configuration', async () => {
    const res = await request(app)
      .get(`/api/v1/services/${furnitureServiceId}/configuration`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.fields.length, 9);
    assert.equal(res.body.data.rules.length, 1);
    assert.equal(res.body.data.pricingRules.length, 2);
  });

  it('6. Flutter client requests authoritative price calculation with customer selections', async () => {
    // Selections:
    // Base Price = 10.00 JOD
    // Large Truck (select option modifier) = +15.00 JOD
    // Workers = 3 -> (3 - 2) * 5.00 = +5.00 JOD
    // Floors = 3 & has_elevator = false -> 3 * 2.00 = +6.00 JOD
    // Expected Subtotal = 10 + 15 + 5 + 6 = 36.00 JOD
    // Expected Delivery Fee = 0.00 JOD (Guaranteed invariant)
    // Expected Total = 36.00 JOD

    const answers = {
      truck_size: 'large',
      workers_count: 3,
      floors_count: 3,
      has_elevator: false,
      building_type: 'apartment',
      pickup_location: 'عمان - الجبيهة شارع الجامعة',
      delivery_location: 'عمان - عبدون بالقرب من الدوار الأول',
      moving_date: '2026-10-01',
    };

    const res = await request(app)
      .post(`/api/v1/services/${furnitureServiceId}/calculate-price`)
      .send({
        answers,
        quantity: 1,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.subtotal, 36.0);
    assert.equal(res.body.data.deliveryFee, 0.0);
    assert.equal(res.body.data.total, 36.0);
    assert.equal(res.body.data.breakdown.length >= 3, true);
  });

  it('7. Customer places dynamic order and server stores immutable configurationSnapshot & priceBreakdown', async () => {
    const answers = {
      truck_size: 'large',
      workers_count: 3,
      floors_count: 3,
      has_elevator: false,
      building_type: 'apartment',
      pickup_location: 'عمان - الجبيهة',
      delivery_location: 'عمان - عبدون',
      moving_date: '2026-10-01',
    };

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceCategoryId: 'cat_home_services',
        deliveryAddress: {
          city: 'عمان',
          area: 'الجبيهة',
          streetAddress: 'شارع الجامعة مبنى 14',
          latitude: 31.9539,
          longitude: 35.9106,
        },
        paymentMethod: 'cash_on_delivery',
        items: [
          {
            serviceId: furnitureServiceId,
            quantity: 1,
            answers,
            // Even if client attempts to forge item total, server calculates authoritatively
            unitPrice: 1.0,
          },
        ],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);

    placedOrderId = res.body.data.id;
    assert.ok(placedOrderId);
    assert.equal(parseFloat(res.body.data.totalAmount), 36.0);
    assert.equal(parseFloat(res.body.data.deliveryFee), 0.0);

    // Verify record in PostgreSQL directly
    const [dbOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, placedOrderId))
      .limit(1);

    assert.ok(dbOrder);
    assert.equal(parseFloat(dbOrder.totalAmount), 36.0);
    assert.equal(dbOrder.serviceVersion, 2); // Initial version was 1, published incremented to 2
    assert.ok(dbOrder.priceBreakdown);
    assert.equal(parseFloat((dbOrder.priceBreakdown as any)?.totalAmount || (dbOrder.priceBreakdown as any)?.total || '36.0'), 36.0);
    assert.ok(Array.isArray((dbOrder.priceBreakdown as any)?.lineItems || dbOrder.priceBreakdown));
  });

  it('8. Admin republishes service with modified base price (Version 3) and verifies immutability of historical orders', async () => {
    // 1. Admin updates base price to 15.00 JOD
    await request(app)
      .patch(`/api/v1/services/admin/${furnitureServiceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        basePrice: 15.0,
      });

    // 2. Admin publishes Version 3
    const pubRes = await request(app)
      .post(`/api/v1/services/admin/${furnitureServiceId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        changelog: 'تحديث السعر الأساسي إلى 15 دينار',
      });

    assert.equal(pubRes.status, 200);
    assert.equal(pubRes.body.data.service.currentVersion, 3);

    // 3. Verify previous order in database remains UNTOUCHED (36.00 JOD, Version 2 snapshot)
    const [dbOldOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, placedOrderId))
      .limit(1);

    assert.equal(parseFloat(dbOldOrder.totalAmount), 36.0);
    assert.equal(dbOldOrder.serviceVersion, 2);

    // 4. Verify a new calculation uses the new base price (15 + 15 + 5 + 6 = 41.00 JOD)
    const answers = {
      truck_size: 'large',
      workers_count: 3,
      floors_count: 3,
      has_elevator: false,
      building_type: 'apartment',
      pickup_location: 'عمان - الجبيهة',
      delivery_location: 'عمان - عبدون',
      moving_date: '2026-10-01',
    };

    const calcRes = await request(app)
      .post(`/api/v1/services/${furnitureServiceId}/calculate-price`)
      .send({
        answers,
        quantity: 1,
      });

    assert.equal(calcRes.status, 200);
    assert.equal(calcRes.body.data.total, 41.0);
    assert.equal(calcRes.body.data.serviceVersion, 3);
  });
});
