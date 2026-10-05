import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { users, authOtps } from '../../db/schema/users.schema.js';
import { providers } from '../../db/schema/providers.schema.js';
import { orders, orderItems } from '../../db/schema/orders.schema.js';
import { quotations } from '../../db/schema/quotations.schema.js';
import { auditLogs } from '../../db/schema/staff.schema.js';
import { eq, inArray, like } from 'drizzle-orm';
import { sql } from '../../config/database.js';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('📑 Generic Quotations Lifecycle & Line Items Test Suite', () => {
  let adminToken = '';
  let customerToken = '';
  let providerToken = '';

  let customerId = '';
  let providerId = '';
  let testOrderId = '';
  let testQuotationId = '';

  before(async () => {
    const hash = await bcrypt.hash('1234', 10);

    // 1. Create Admin
    const [admin] = await db.insert(users).values({
      phoneNumber: '0799980001',
      name: 'مدير النظام',
      role: 'admin',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'admin' },
    }).returning();

    await db.insert(authOtps).values({
      phoneNumber: '0799980001',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const adminLogin = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0799980001', otp: '1234' });
    adminToken = adminLogin.body.data.accessToken;

    // 2. Create Customer
    const [cust] = await db.insert(users).values({
      phoneNumber: '0799980002',
      name: 'عميل الصيانة',
      role: 'customer',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'customer' },
    }).returning();
    customerId = cust.id;

    await db.insert(authOtps).values({
      phoneNumber: '0799980002',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const custLogin = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0799980002', otp: '1234' });
    customerToken = custLogin.body.data.accessToken;

    // 3. Create Provider User & Record
    const [provUser] = await db.insert(users).values({
      phoneNumber: '0799980003',
      name: 'فني الصيانة المعتمد',
      role: 'provider',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'provider' },
    }).returning();

    providerId = `prov_test_quote_${Date.now()}`;
    await db.insert(providers).values({
      id: providerId,
      userId: provUser.id,
      nameAr: 'مركز صيانة الأجهزة والسباكة المعتمد',
      nameEn: 'Certified Maintenance Hub',
      phoneNumber: '0799980003',
      address: 'عمان - الجبيهة',
      latitude: 32.0123,
      longitude: 35.8712,
      isActive: true,
      isAvailable: true,
    });

    await db.insert(authOtps).values({
      phoneNumber: '0799980003',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const provLogin = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0799980003', otp: '1234' });
    providerToken = provLogin.body.data.accessToken;

    // 4. Create an Initial Maintenance Order with 5.00 JOD starting labor fee
    testOrderId = `ORD-TEST-QUOTE-${Date.now()}`;
    await db.insert(orders).values({
      id: testOrderId,
      customerId: customerId,
      customerName: 'عميل الصيانة',
      customerPhone: '0799980002',
      providerId: providerId,
      serviceCategoryId: 'cat_home_services',
      status: 'assigned',
      subtotal: '5.00',
      deliveryFee: '0.00',
      totalAmount: '5.00',
      paymentMethod: 'cash_on_delivery',
      deliveryCity: 'عمان',
      deliveryArea: 'الجبيهة',
      deliveryStreetAddress: 'شارع الجامعة',
      deliveryLatitude: 32.0123,
      deliveryLongitude: 35.8712,
    });

    await db.insert(orderItems).values({
      orderId: testOrderId,
      serviceId: 'srv_washing_machines',
      titleAr: 'صيانة غسالات وأجهزة',
      titleEn: 'Washing Machine Repair',
      quantity: 1,
      unitPrice: '5.00',
      itemTotal: '5.00',
      unitAr: 'خدمة',
      unitEn: 'Service',
      isHomeService: true,
    });
  });

  after(async () => {
    try {
      await db.delete(quotations).where(eq(quotations.orderId, testOrderId));
      await db.delete(orderItems).where(eq(orderItems.orderId, testOrderId));
      await db.delete(orders).where(eq(orders.id, testOrderId));
      await db.delete(providers).where(eq(providers.id, providerId));
      await db.delete(users).where(inArray(users.phoneNumber, ['0799980001', '0799980002', '0799980003']));
    } catch (_) {}
  });

  test('1. Provider creates a draft quotation with itemized line items (Labor, Materials, Spare Parts, Equipment)', async () => {
    const res = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        orderId: testOrderId,
        notes: 'تم فحص الغسالة وتبين تلف طرمبة المياه وقشاط المحرك',
        items: [
          {
            type: 'labor',
            titleAr: 'أجرة يد فك وتركيب ومعايرة طرمبة وقشاط',
            titleEn: 'Labor fee for replacement and calibration',
            quantity: 1,
            unitPrice: 15.0,
            total: 15.0,
          },
          {
            type: 'spare_parts',
            titleAr: 'طرمبة تفريغ مياه أصلية',
            titleEn: 'Original drain pump',
            quantity: 1,
            unitPrice: 20.0,
            total: 20.0,
          },
          {
            type: 'spare_parts',
            titleAr: 'قشاط محرك إيطالي',
            titleEn: 'Italian drive belt',
            quantity: 1,
            unitPrice: 7.5,
            total: 7.5,
          },
          {
            type: 'materials',
            titleAr: 'مواد عزل وتوصيلات سيليكون حراري',
            titleEn: 'Sealing and thermal silicone materials',
            quantity: 1,
            unitPrice: 2.5,
            total: 2.5,
          },
        ],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'draft');
    assert.equal(res.body.data.orderId, testOrderId);
    assert.equal(Number(res.body.data.laborAmount), 15.0);
    assert.equal(Number(res.body.data.sparePartsAmount), 27.5);
    assert.equal(Number(res.body.data.materialsAmount), 2.5);
    assert.equal(Number(res.body.data.totalAmount), 45.0); // 15 + 20 + 7.5 + 2.5 = 45.00

    testQuotationId = res.body.data.id;
  });

  test('2. Provider sends quotation to customer (status changes from draft to sent)', async () => {
    const res = await request(app)
      .post(`/api/v1/quotations/${testQuotationId}/send`)
      .set('Authorization', `Bearer ${providerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'sent');
  });

  test('3. Customer views quotations for their order', async () => {
    const res = await request(app)
      .get(`/api/v1/quotations/order/${testOrderId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 1);

    const quote = res.body.data[0];
    assert.equal(quote.id, testQuotationId);
    assert.equal(quote.status, 'sent');
    assert.equal(Number(quote.totalAmount), 45.0);
    assert.equal(quote.items.length, 4);
  });

  test('4. Customer approves quotation: Status becomes customer_approved & parent order totalAmount increases', async () => {
    // Before approval: Order total is 5.00 JOD
    const [orderBefore] = await db.select().from(orders).where(eq(orders.id, testOrderId));
    assert.equal(Number(orderBefore.totalAmount), 5.0);

    const res = await request(app)
      .post(`/api/v1/quotations/${testQuotationId}/approve`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'customer_approved');

    // After approval: Parent Order total must be 5.00 + 45.00 = 50.00 JOD
    const [orderAfter] = await db.select().from(orders).where(eq(orders.id, testOrderId));
    assert.equal(Number(orderAfter.subtotal), 50.0);
    assert.equal(Number(orderAfter.totalAmount), 50.0);
    assert.equal(Number(orderAfter.deliveryFee), 0.0);

    // Verify audit log was recorded
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, testQuotationId));
    assert.ok(logs.length >= 1);
    assert.ok(logs.some(l => l.action === 'QUOTATION_APPROVE'));
  });

  test('5. Customer can reject a new quotation', async () => {
    // Create another quotation for rejection test
    const createRes = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        orderId: testOrderId,
        items: [
          {
            itemType: 'spare_part',
            descriptionAr: 'شاشة تحكم إلكترونية',
            descriptionEn: 'Control Board',
            quantity: 1,
            unitPrice: 80.0,
          },
        ],
      });

    const secondQuoteId = createRes.body.data.id;

    // Send quotation
    await request(app)
      .post(`/api/v1/quotations/${secondQuoteId}/send`)
      .set('Authorization', `Bearer ${providerToken}`);

    // Reject quotation
    const rejectRes = await request(app)
      .post(`/api/v1/quotations/${secondQuoteId}/reject`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'التكلفة مرتفعة وغير مناسبة' });

    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.success, true);
    assert.equal(rejectRes.body.data.status, 'customer_rejected');
    assert.equal(rejectRes.body.data.rejectionReason, 'التكلفة مرتفعة وغير مناسبة');
  });
});
