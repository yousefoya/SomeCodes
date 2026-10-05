import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateTokens } from '../auth/utils/jwt.js';
import { db } from '../../db/index.js';
import { services, serviceFields, servicePricingRules } from '../../db/schema/services.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { users } from '../../db/schema/users.schema.js';
import { providers, providerServices } from '../../db/schema/providers.schema.js';
import { eq } from 'drizzle-orm';

const app = createApp();

describe('Phase A — Dynamic Order Creation & Immutable Snapshotting', () => {
  let customerToken: string;
  let adminToken: string;
  let testProviderId = '';

  const dynamicCleaningServiceId = `srv_dyn_clean_${Date.now()}`;
  let createdOrderId: string;

  before(async () => {
    const [adminDb] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    const [custDb] = await db.select().from(users).where(eq(users.role, 'customer')).limit(1);
    const [provDb] = await db.select().from(providers).where(eq(providers.isActive, true)).limit(1);

    adminToken = generateTokens(adminDb || { id: 'd603e5db-206a-4a0b-b6cd-c34293c8ae08', role: 'admin', phoneNumber: '0790980947', isSuspended: false }).accessToken;
    customerToken = generateTokens(custDb || { id: '9224d9c8-4578-406f-bffa-19b2f39aafd6', role: 'customer', phoneNumber: '+962799990001', isSuspended: false }).accessToken;

    if (provDb) {
      testProviderId = provDb.id;
    }

    // Setup a published dynamic cleaning service
    await db.insert(services).values({
      id: dynamicCleaningServiceId,
      categoryId: 'cat_home_services',
      nameAr: 'خدمة تنظيف منزلي شامل',
      nameEn: 'Comprehensive Home Cleaning',
      type: 'home_service',
      basePrice: '30.00',
      unitAr: 'شقة',
      unitEn: 'Apartment',
      status: 'published',
      currentVersion: 1,
      slaHours: 24,
      isPublished: true,
      isActive: true,
    });

    if (testProviderId) {
      await db.insert(providerServices).values({
        providerId: testProviderId,
        serviceId: dynamicCleaningServiceId,
        isAvailable: true,
      }).onConflictDoNothing();
    }

    // Add dynamic fields
    await db.insert(serviceFields).values([
      {
        id: `fld_${Date.now()}_0`,
        serviceId: dynamicCleaningServiceId,
        key: 'roomsCount',
        labelAr: 'عدد الغرف',
        labelEn: 'Rooms Count',
        fieldType: 'counter',
        defaultValue: 2,
        min: '1',
        max: '10',
        isRequired: true,
        sortOrder: 1,
      },
      {
        id: `fld_${Date.now()}_1`,
        serviceId: dynamicCleaningServiceId,
        key: 'includeBalcony',
        labelAr: 'تنظيف البلكونة؟',
        labelEn: 'Include Balcony?',
        fieldType: 'toggle',
        defaultValue: false,
        isRequired: false,
        sortOrder: 2,
      },
    ]);

    // Add pricing rules
    await db.insert(servicePricingRules).values([
      {
        id: `prc_${Date.now()}_0`,
        serviceId: dynamicCleaningServiceId,
        ruleType: 'field_multiplier',
        titleAr: 'أجرة الغرف الإضافية',
        titleEn: 'Rooms multiplier',
        targetField: 'roomsCount',
        calculationFormula: { ratePerUnit: 10.0 },
        sortOrder: 1,
      },
      {
        id: `prc_${Date.now()}_1`,
        serviceId: dynamicCleaningServiceId,
        ruleType: 'field_addon',
        titleAr: 'إضافة تنظيف البلكونة',
        titleEn: 'Balcony addon',
        targetField: 'includeBalcony',
        calculationFormula: { fixedAmount: 5.0 },
        sortOrder: 2,
      },
    ]);
  });

  after(async () => {
    if (createdOrderId) {
      await db.delete(orders).where(eq(orders.id, createdOrderId));
    }
    if (testProviderId) {
      await db.delete(providerServices).where(eq(providerServices.serviceId, dynamicCleaningServiceId));
    }
    await db.delete(services).where(eq(services.id, dynamicCleaningServiceId));
  });

  it('creates an order for a dynamic service and stores immutable snapshot & breakdown', async () => {
    const payload = {
      serviceCategoryId: 'cat_home_services',
      items: [
        {
          serviceId: dynamicCleaningServiceId,
          quantity: 1,
          answers: {
            roomsCount: 3,
            includeBalcony: true,
          },
        },
      ],
      deliveryAddress: {
        city: 'عمان',
        area: 'عبدون',
        streetAddress: 'شارع دمشق، عمارة 12',
        floor: '2',
        instructions: 'يرجى إحضار مواد التنظيف العضوية',
      },
      notes: 'الرجاء الحضور في الموعد المحدد',
      paymentMethod: 'cash_on_delivery',
    };

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);

    const orderData = res.body.data;
    createdOrderId = orderData.id;

    // Expected Calculation:
    // Base: 30.00 + (3 rooms * 10 = 30.00) + (balcony: 5.00) = 65.00 JOD
    assert.equal(parseFloat(orderData.subtotal), 65.0);
    assert.equal(parseFloat(orderData.deliveryFee), 0.0);
    assert.equal(parseFloat(orderData.totalAmount), 65.0);
    assert.equal(orderData.serviceVersion, 1);

    // Verify configurationSnapshot
    assert.ok(orderData.configurationSnapshot);
    assert.equal(orderData.configurationSnapshot.serviceId, dynamicCleaningServiceId);
    assert.equal(orderData.configurationSnapshot.answers.roomsCount, 3);
    assert.equal(orderData.configurationSnapshot.answers.includeBalcony, true);
    assert.ok(orderData.configurationSnapshot.customerNotes.includes('الرجاء الحضور'));

    // Verify priceBreakdown
    assert.ok(orderData.priceBreakdown);
    assert.equal(orderData.priceBreakdown.basePrice, 30.0);
    assert.equal(orderData.priceBreakdown.subtotal, 65.0);
    assert.equal(orderData.priceBreakdown.deliveryFee, 0.0);
    assert.equal(orderData.priceBreakdown.totalAmount, 65.0);
    assert.equal(orderData.priceBreakdown.fieldAddons.length, 2);
  });

  it('verifies historical order snapshot remains intact from PostgreSQL', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.configurationSnapshot.answers.roomsCount, 3);
    assert.equal(res.body.data.priceBreakdown.totalAmount, 65.0);
  });

  it('prevents client-side price tampering by enforcing server-side calculation', async () => {
    const tamperedPayload = {
      serviceCategoryId: 'cat_home_services',
      items: [
        {
          serviceId: dynamicCleaningServiceId,
          quantity: 1,
          unitPrice: 1.0, // Client tries to forge 1 JOD
          itemTotal: 1.0,
          answers: {
            roomsCount: 3,
            includeBalcony: true,
          },
        },
      ],
      totalAmount: 1.0, // Client forged total
      deliveryAddress: {
        city: 'عمان',
        area: 'عبدون',
        streetAddress: 'شارع دمشق',
      },
    };

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(tamperedPayload);

    assert.equal(res.status, 201);
    // Server computes true total (65 JOD), completely ignoring client-forged numbers
    assert.equal(parseFloat(res.body.data.totalAmount), 65.0);

    // Clean up tampered test order
    await db.delete(orders).where(eq(orders.id, res.body.data.id));
  });

  it('guarantees legacy gas order creation continues to work without disruption', async () => {
    // Existing Gas Service ID: srv_gas_delivery
    const [gasSrv] = await db.select().from(services).where(eq(services.id, 'srv_gas_delivery')).limit(1);

    if (gasSrv) {
      const gasPayload = {
        serviceCategoryId: gasSrv.categoryId,
        items: [
          {
            serviceId: gasSrv.id,
            quantity: 2,
          },
        ],
        deliveryAddress: {
          city: 'عمان',
          area: 'الشميساني',
          streetAddress: 'شارع الثقافة',
        },
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(gasPayload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(parseFloat(res.body.data.deliveryFee), 0.0);
      assert.equal(parseFloat(res.body.data.totalAmount), parseFloat(gasSrv.basePrice) * 2);

      // Clean up legacy test order
      await db.delete(orders).where(eq(orders.id, res.body.data.id));
    }
  });
});
