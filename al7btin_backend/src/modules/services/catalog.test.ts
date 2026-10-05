import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { users, authOtps } from '../../db/schema/users.schema.js';
import { providers, providerServices } from '../../db/schema/providers.schema.js';
import { services, serviceOptions } from '../../db/schema/services.schema.js';
import { deliveryEmployees } from '../../db/schema/delivery.schema.js';
import { orders, orderItems } from '../../db/schema/orders.schema.js';
import { supportCases } from '../../db/schema/staff.schema.js';
import { eq, like, inArray } from 'drizzle-orm';
import { sql } from '../../config/database.js';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('🛍️ Backend Catalog & Provider Management Test Suite', () => {
  let adminAccessToken = '';
  let customerAccessToken = '';
  let testServiceId = '';
  let testProviderId = '';
  let testDriverId = '';

  before(async () => {
    // Clean previous test data in foreign-key safe order
    await db.delete(authOtps);
    await db.delete(orderItems).where(like(orderItems.serviceId, 'srv_test_%'));
    await db.delete(serviceOptions).where(like(serviceOptions.serviceId, 'srv_test_%'));
    await db.delete(providerServices).where(like(providerServices.serviceId, 'srv_test_%'));
    await db.delete(services).where(like(services.id, 'srv_test_%'));
    await db.delete(deliveryEmployees).where(eq(deliveryEmployees.phoneNumber, '0797776655'));
    await db.delete(deliveryEmployees).where(eq(deliveryEmployees.phoneNumber, '+962797776655'));
    await db.delete(providers).where(eq(providers.phoneNumber, '0798881122'));
    await db.delete(providers).where(eq(providers.phoneNumber, '+962798881122'));

    const testUserRows = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.phoneNumber, ['0798881122', '+962798881122', '0797776655', '+962797776655']));
    for (const tu of testUserRows) {
      await db.delete(supportCases).where(eq(supportCases.createdByStaffId, tu.id));
    }

    await db.delete(users).where(eq(users.phoneNumber, '0798881122'));
    await db.delete(users).where(eq(users.phoneNumber, '+962798881122'));

    // 1. Create Admin
    const hash = await bcrypt.hash('1234', 10);
    await db.insert(users).values({
      phoneNumber: '0790000005',
      name: 'مدير الكتالوج',
      role: 'admin',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'admin' },
    });

    await db.insert(authOtps).values({
      phoneNumber: '0790000005',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const adminRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0790000005', otp: '1234' });

    adminAccessToken = adminRes.body.data.accessToken;

    // 2. Create Customer
    await db.insert(users).values({
      phoneNumber: '0791119988',
      name: 'عميل الفحص',
      role: 'customer',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'customer' },
    });

    await db.insert(authOtps).values({
      phoneNumber: '0791119988',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const custRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0791119988', otp: '1234' });

    customerAccessToken = custRes.body.data.accessToken;

    // 3. Create Provider User for prov_gas_hub_amman
    const [provUser] = await db.insert(users).values({
      phoneNumber: '0795551122',
      name: 'وكالة غاز الأردن المركزية',
      role: 'provider',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'provider' },
    }).returning();

    // 4. Create Provider Record for prov_gas_hub_amman
    await db.insert(providers).values({
      id: 'prov_gas_hub_amman',
      userId: provUser.id,
      nameAr: 'وكالة غاز الأردن المركزية - خلدا',
      nameEn: 'Jordan Central Gas Agency - Khalda',
      phoneNumber: '0795551122',
      address: 'عمان - خلدا - شارع وصفي التل',
      latitude: 31.9892,
      longitude: 35.8456,
      operatingHours: '07:00 AM - 11:00 PM',
      isActive: true,
      isAvailable: true,
      rating: 4.9,
    }).onConflictDoUpdate({
      target: providers.id,
      set: { isActive: true, isAvailable: true, rating: 4.9 },
    });

    // 5. Ensure water service and options exist for variant tests
    await db.insert(services).values({
      id: 'srv_water',
      categoryId: 'cat_products',
      nameAr: 'مياه',
      nameEn: 'Drinking Water',
      type: 'delivery_product',
      basePrice: '1.50',
      unitAr: 'قارورة',
      unitEn: 'Gallon',
      isActive: true,
      isAvailable: true,
    }).onConflictDoNothing();

    await db.insert(serviceOptions).values([
      {
        id: 'opt_water_cups_200ml',
        serviceId: 'srv_water',
        nameAr: 'كاسات ماء (كرتونة 40 كأس 200 مل)',
        nameEn: 'Water Cups (Box of 40 Cups 200ml)',
        optionType: 'cups',
        size: '200 مل × 40',
        price: '2.50',
        unitAr: 'كرتونة',
        unitEn: 'Box',
        sortOrder: 1,
        isAvailable: true,
        isActive: true,
      },
      {
        id: 'opt_water_gallon_19l',
        serviceId: 'srv_water',
        nameAr: 'قوارير ماء 19 لتر',
        nameEn: 'Water Gallon 19L',
        optionType: 'gallons',
        size: '19 لتر',
        price: '1.50',
        unitAr: 'قارورة',
        unitEn: 'Gallon',
        sortOrder: 2,
        isAvailable: true,
        isActive: true,
      },
      {
        id: 'opt_water_bottles_330ml',
        serviceId: 'srv_water',
        nameAr: 'قناني ماء 330 مل',
        nameEn: 'Water Bottles 330ml',
        optionType: 'bottles',
        size: '330 مل × 24',
        price: '3.00',
        unitAr: 'كرتونة',
        unitEn: 'Box',
        sortOrder: 3,
        isAvailable: true,
        isActive: true,
      },
      {
        id: 'opt_water_bottles_1500ml',
        serviceId: 'srv_water',
        nameAr: 'قناني ماء 1.5 لتر',
        nameEn: 'Water Bottles 1.5L',
        optionType: 'bottles',
        size: '1.5 لتر × 6',
        price: '2.00',
        unitAr: 'كرتونة',
        unitEn: 'Box',
        sortOrder: 4,
        isAvailable: true,
        isActive: true,
      },
    ]).onConflictDoNothing();

    // 6. Map gas and water services to provider
    await db.insert(providerServices).values([
      {
        providerId: 'prov_gas_hub_amman',
        serviceId: 'srv_gas_cylinder',
        isAvailable: true,
      },
      {
        providerId: 'prov_gas_hub_amman',
        serviceId: 'srv_water',
        isAvailable: true,
      },
    ]).onConflictDoNothing();
  });

  after(async () => {
    try {
      const testUsers = await db.select().from(users).where(eq(users.phoneNumber, '0791119988'));
      if (testUsers.length > 0) {
        await db.delete(orders).where(eq(orders.customerId, testUsers[0].id));
      }
      await db.delete(orderItems).where(like(orderItems.serviceId, 'srv_test_%'));
      await db.delete(serviceOptions).where(like(serviceOptions.serviceId, 'srv_test_%'));
      await db.delete(serviceOptions).where(eq(serviceOptions.serviceId, 'srv_water'));
      await db.delete(providerServices).where(like(providerServices.serviceId, 'srv_test_%'));
      await db.delete(providerServices).where(eq(providerServices.providerId, 'prov_gas_hub_amman'));
      await db.delete(deliveryEmployees).where(eq(deliveryEmployees.phoneNumber, '0797776655'));
      await db.delete(providers).where(eq(providers.id, 'prov_gas_hub_amman'));
      await db.delete(services).where(like(services.id, 'srv_test_%'));
      await db.delete(services).where(eq(services.id, 'srv_water'));
      await db.delete(users).where(eq(users.phoneNumber, '0790000005'));
      await db.delete(users).where(eq(users.phoneNumber, '0791119988'));
      await db.delete(users).where(eq(users.phoneNumber, '0795551122'));
    } catch (_) {}
    await sql.end();
  });

  test('1. list categories: Customer can read active service categories', async () => {
    const res = await request(app).get('/api/v1/categories');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2);
  });

  test('2. list active services: Customer can read active services list', async () => {
    const res = await request(app).get('/api/v1/services');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });

  test('3. get service: Customer can fetch specific service by ID', async () => {
    const res = await request(app).get('/api/v1/services/srv_gas_cylinder');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, 'srv_gas_cylinder');
    assert.equal(res.body.data.basePrice, '7.00');
  });

  test('4. customer cannot create service (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/services/admin')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({
        nameAr: 'خدمة غير مصرح بها',
        nameEn: 'Unauthorized Service',
        categoryId: 'cat_products',
        basePrice: '10.00',
        unitAr: 'قطعة',
        unitEn: 'Piece',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
  });

  test('5. admin creates service: Admin can add new service to catalog', async () => {
    testServiceId = `srv_test_${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/services/admin')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        id: testServiceId,
        categoryId: 'cat_products',
        nameAr: 'أسطوانة غاز صناعية 50 كغ',
        nameEn: 'Industrial Gas Cylinder 50kg',
        descriptionAr: 'أسطوانة غاز سعة 50 كغ للمطاعم والمصانع',
        type: 'delivery_product',
        basePrice: '32.50',
        unitAr: 'أسطوانة',
        unitEn: 'Cylinder',
        requiresQuotation: false,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, testServiceId);
    assert.equal(res.body.data.basePrice, '32.50');
  });

  test('6. admin updates service price: Admin can adjust prices in PostgreSQL', async () => {
    const res = await request(app)
      .patch(`/api/v1/services/admin/${testServiceId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        basePrice: '35.00',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.basePrice, '35.00');
  });

  test('7. admin deactivates service: Inactive service hidden from public catalog', async () => {
    const res = await request(app)
      .patch(`/api/v1/services/admin/${testServiceId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        isActive: false,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.isActive, false);

    // Verify service is excluded from public list
    const listRes = await request(app).get('/api/v1/services');
    const found = listRes.body.data.find((s: any) => s.id === testServiceId);
    assert.equal(found, undefined);
  });

  test('8. admin creates provider: Admin can register a new distribution hub with services', async () => {
    testProviderId = `prov_test_${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/providers/admin')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        id: testProviderId,
        nameAr: 'مستودع غاز ومياه عبدون النموذجي',
        nameEn: 'Abdoun Gas & Water Hub',
        phoneNumber: '0798881122',
        address: 'عمان - عبدون الشمالي',
        latitude: 31.9421,
        longitude: 35.8821,
        serviceIds: ['srv_gas_cylinder', 'srv_water'],
        categoryIds: ['cat_products'],
        coverageAreas: ['عبدون', 'دير غبار', 'الصويفية'],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, testProviderId);
    assert.ok(res.body.data.serviceIds.includes('srv_gas_cylinder'));
    assert.ok(res.body.data.serviceIds.includes('srv_water'));
  });

  test('9. customer can read active providers and their services', async () => {
    const res = await request(app).get('/api/v1/providers');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    const provider = res.body.data.find((p: any) => p.id === testProviderId);
    assert.ok(provider);
    assert.ok(provider.serviceIds.includes('srv_gas_cylinder'));
    assert.ok(provider.serviceIds.includes('srv_water'));
    assert.ok(provider.coverageAreas.includes('عبدون'));
  });

  test('10. customer cannot modify provider (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/providers/admin/${testProviderId}`)
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({ nameAr: 'تعديل مخترق' });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
  });

  test('11. admin assigns service to provider', async () => {
    const res = await request(app)
      .patch(`/api/v1/services/admin/${testServiceId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        providerId: testProviderId,
        isActive: true,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.providerId, testProviderId);
  });

  test('12. admin creates delivery employee belonging to provider with valid service capabilities', async () => {
    // 1. Create a driver belonging to testProviderId
    const driverRes = await request(app)
      .post('/api/v1/admin/delivery-employees')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        phoneNumber: '0797776655',
        name: 'كابتن خلدون',
        vehicleType: 'بيك آب غاز',
        providerId: testProviderId,
        serviceIds: ['srv_gas_cylinder'],
      });

    assert.equal(driverRes.status, 201);
    assert.equal(driverRes.body.success, true);
    assert.equal(driverRes.body.data.driver.providerId, testProviderId);
    assert.ok(driverRes.body.data.driver.serviceCapabilities.includes('srv_gas_cylinder'));

    testDriverId = driverRes.body.data.driver.id;

    // 2. Fetch Capabilities
    const getCapRes = await request(app)
      .get(`/api/v1/admin/delivery-employees/${testDriverId}/capabilities`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    assert.equal(getCapRes.status, 200);
    assert.equal(getCapRes.body.data.providerId, testProviderId);
    assert.ok(getCapRes.body.data.serviceCapabilities.includes('srv_gas_cylinder'));
  });

  test('13. driver cannot be assigned a service NOT offered by their provider (400 Bad Request)', async () => {
    // testProviderId only offers 'srv_gas_cylinder' & 'srv_water_tank_6m'
    // Attempting to assign 'srv_electrical_maintenance' must fail!
    const invalidRes = await request(app)
      .put(`/api/v1/admin/delivery-employees/${testDriverId}/capabilities`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        serviceIds: ['srv_electrical_maintenance'],
      });

    assert.equal(invalidRes.status, 400);
    assert.equal(invalidRes.body.error.code, 'INVALID_DRIVER_SERVICE_CAPABILITY');
  });

  test('14. unauthorized access returns 401 when token missing', async () => {
    const res = await request(app).post('/api/v1/services/admin').send({});
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_REQUIRED');
  });

  test('15. provider can view assigned services with current availability status', async () => {
    // Authenticate as test provider
    const hash = await bcrypt.hash('1234', 10);
    await db.insert(authOtps).values({
      phoneNumber: '0798881122',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const provAuthRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0798881122', otp: '1234' });

    assert.equal(provAuthRes.status, 200);
    const providerToken = provAuthRes.body.data.accessToken;

    const srvRes = await request(app)
      .get('/api/v1/provider/services')
      .set('Authorization', `Bearer ${providerToken}`);

    assert.equal(srvRes.status, 200);
    assert.equal(srvRes.body.success, true);
    assert.ok(Array.isArray(srvRes.body.data));
    assert.ok(srvRes.body.data.length >= 2);

    const gasSrv = srvRes.body.data.find((s: any) => s.id === 'srv_gas_cylinder');
    assert.ok(gasSrv);
    assert.equal(gasSrv.isAvailable, true);
    assert.equal(gasSrv.basePrice, 7.0);
  });

  test('16. provider toggles own service availability to false (out of stock)', async () => {
    const hash = await bcrypt.hash('1234', 10);
    await db.insert(authOtps).values({
      phoneNumber: '0798881122',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const provAuthRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0798881122', otp: '1234' });

    const providerToken = provAuthRes.body.data.accessToken;

    const toggleRes = await request(app)
      .patch('/api/v1/provider/services/srv_gas_cylinder/availability')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ isAvailable: false });

    assert.equal(toggleRes.status, 200);
    assert.equal(toggleRes.body.success, true);
    assert.equal(toggleRes.body.data.serviceId, 'srv_gas_cylinder');
    assert.equal(toggleRes.body.data.isAvailable, false);
  });

  test('17. provider cannot modify unassigned service (404 / error)', async () => {
    const hash = await bcrypt.hash('1234', 10);
    await db.insert(authOtps).values({
      phoneNumber: '0798881122',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const provAuthRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0798881122', otp: '1234' });

    const providerToken = provAuthRes.body.data.accessToken;

    const invalidSrvRes = await request(app)
      .patch('/api/v1/provider/services/srv_electrical_maintenance/availability')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ isAvailable: true });

    assert.equal(invalidSrvRes.status, 404);
    assert.equal(invalidSrvRes.body.error.code, 'SERVICE_NOT_ASSIGNED_TO_PROVIDER');
  });

  test('18. customer discovery excludes provider when requested service is marked unavailable', async () => {
    const res = await request(app).get('/api/v1/providers?serviceId=srv_gas_cylinder');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    // testProviderId marked srv_gas_cylinder as isAvailable: false, so it must NOT appear in available providers
    const match = res.body.data.find((p: any) => p.id === testProviderId);
    assert.equal(match, undefined);
  });

  test('19. order creation rejects currently unavailable product for selected provider (400 PRODUCT_CURRENTLY_UNAVAILABLE)', async () => {
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: testProviderId,
        items: [
          { serviceId: 'srv_gas_cylinder', quantity: 1 },
        ],
        deliveryAddress: {
          city: 'عمان',
          area: 'عبدون الشمالي',
          streetAddress: 'شارع دمشق، عمارة 14',
          latitude: 31.9421,
          longitude: 35.8821,
        },
      });

    assert.equal(orderRes.status, 400);
    assert.equal(orderRes.body.error.code, 'PRODUCT_CURRENTLY_UNAVAILABLE');
  });

  test('20. provider re-enables service availability and order placement succeeds', async () => {
    const hash = await bcrypt.hash('1234', 10);
    await db.insert(authOtps).values({
      phoneNumber: '0798881122',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const provAuthRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0798881122', otp: '1234' });

    const providerToken = provAuthRes.body.data.accessToken;

    const toggleRes = await request(app)
      .patch('/api/v1/provider/services/srv_gas_cylinder/availability')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ isAvailable: true });

    assert.equal(toggleRes.status, 200);
    assert.equal(toggleRes.body.data.isAvailable, true);

    // Now order succeeds
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .send({
        serviceCategoryId: 'cat_products',
        providerId: testProviderId,
        items: [
          { serviceId: 'srv_gas_cylinder', quantity: 1 },
        ],
        deliveryAddress: {
          city: 'عمان',
          area: 'عبدون الشمالي',
          streetAddress: 'شارع دمشق، عمارة 14',
          latitude: 31.9421,
          longitude: 35.8821,
        },
      })
      .set('Authorization', `Bearer ${customerAccessToken}`);

    assert.equal(orderRes.status, 201);
    assert.equal(orderRes.body.success, true);
    assert.equal(orderRes.body.data.providerId, testProviderId);
    assert.equal(orderRes.body.data.deliveryFee, '0.00');
  });

  test('21. admin creates service option / variant: Admin can add new variant to service', async () => {
    const res = await request(app)
      .post(`/api/v1/services/admin/srv_water/options`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        nameAr: 'كرتونة قناني 1 لتر (12 قنينة)',
        nameEn: '1L Bottles Carton (12 bottles)',
        size: '1 لتر',
        price: '2.75',
        unitAr: 'كرتونة',
        unitEn: 'Carton',
        sortOrder: 10,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.nameAr, 'كرتونة قناني 1 لتر (12 قنينة)');
    assert.equal(res.body.data.price, 2.75);
  });

  test('22. customer fetches service and receives all active options / variants', async () => {
    const res = await request(app).get('/api/v1/services/srv_water');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.options));
    assert.ok(res.body.data.options.length >= 4);

    const cupsOption = res.body.data.options.find((o: any) => o.id === 'opt_water_cups_200ml');
    assert.ok(cupsOption);
    assert.equal(cupsOption.price, 2.5);
  });

  test('23. customer places order with selected variant: Order items snapshot variant details and price', async () => {
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({
        serviceCategoryId: 'cat_products',
        providerId: 'prov_gas_hub_amman',
        items: [
          {
            serviceId: 'srv_water',
            serviceOptionId: 'opt_water_cups_200ml',
            quantity: 2,
          },
        ],
        deliveryAddress: {
          city: 'عمان',
          area: 'عبدون الشمالي',
          streetAddress: 'شارع دمشق، عمارة 14',
          latitude: 31.9421,
          longitude: 35.8821,
        },
      });

    assert.equal(orderRes.status, 201);
    assert.equal(orderRes.body.success, true);
    assert.equal(orderRes.body.data.items.length, 1);

    const item = orderRes.body.data.items[0];
    assert.equal(item.serviceOptionId, 'opt_water_cups_200ml');
    assert.equal(item.unitPrice, 2.5);
    assert.equal(item.itemTotal, 5);
    assert.equal(orderRes.body.data.totalAmount, '5.00');
  });

  test('24. admin updates and deletes service option', async () => {
    // Create option to update & delete
    const createRes = await request(app)
      .post('/api/v1/services/admin/srv_gas_cylinder/options')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        nameAr: 'محبس أمان إضافي',
        nameEn: 'Extra Safety Valve',
        price: '4.00',
        unitAr: 'قطعة',
        unitEn: 'Piece',
      });

    assert.equal(createRes.status, 201);
    const optionId = createRes.body.data.id;

    // Update option
    const patchRes = await request(app)
      .patch(`/api/v1/services/admin/options/${optionId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        price: '4.50',
      });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.price, 4.5);

    // Delete option
    const deleteRes = await request(app)
      .delete(`/api/v1/services/admin/options/${optionId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.success, true);
  });

  test('25. provider updates online/offline status: Provider can toggle isAvailable', async () => {
    // 1. Authenticate as Gas provider
    const hash = await bcrypt.hash('1234', 10);
    await db.insert(authOtps).values({
      phoneNumber: '0795551122',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const provLoginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0795551122', otp: '1234' });

    const provToken = provLoginRes.body.data.accessToken;

    // 2. Toggle status to offline (false)
    const offlineRes = await request(app)
      .patch('/api/v1/provider/status')
      .set('Authorization', `Bearer ${provToken}`)
      .send({ isAvailable: false });

    assert.equal(offlineRes.status, 200);
    assert.equal(offlineRes.body.data.isAvailable, false);

    // 3. Customer discovery excludes offline provider
    const custRes = await request(app).get('/api/v1/providers?serviceId=srv_gas_cylinder');
    assert.equal(custRes.status, 200);
    const hasGasHub = custRes.body.data.some((p: any) => p.id === 'prov_gas_hub_amman');
    assert.equal(hasGasHub, false);

    // 4. Toggle status back to online (true)
    const onlineRes = await request(app)
      .patch('/api/v1/provider/status')
      .set('Authorization', `Bearer ${provToken}`)
      .send({ isAvailable: true });

    assert.equal(onlineRes.status, 200);
    assert.equal(onlineRes.body.data.isAvailable, true);
  });

  test('26. provider updates store profile details', async () => {
    const hash = await bcrypt.hash('1234', 10);
    await db.insert(authOtps).values({
      phoneNumber: '0795551122',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const provLoginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0795551122', otp: '1234' });

    const provToken = provLoginRes.body.data.accessToken;

    const profileRes = await request(app)
      .patch('/api/v1/provider/profile')
      .set('Authorization', `Bearer ${provToken}`)
      .send({
        operatingHours: '06:30 AM - 11:30 PM',
        descriptionAr: 'الموزع الأول المعتمد لأسطوانات الغاز وصمامات الأمان في عمان الغربية',
      });

    assert.equal(profileRes.status, 200);
    assert.equal(profileRes.body.success, true);
    assert.equal(profileRes.body.data.operatingHours, '06:30 AM - 11:30 PM');
  });

  test('27. customer fetches provider details with joined services and variants', async () => {
    const res = await request(app).get('/api/v1/providers/prov_gas_hub_amman');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, 'prov_gas_hub_amman');
    assert.ok(Array.isArray(res.body.data.services));
    assert.ok(res.body.data.services.length >= 1);
    assert.ok(res.body.data.rating >= 4.0);
  });

  test('28. provider fetches orders assigned to their hub', async () => {
    const hash = await bcrypt.hash('1234', 10);
    await db.insert(authOtps).values({
      phoneNumber: '0795551122',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const provLoginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0795551122', otp: '1234' });

    const provToken = provLoginRes.body.data.accessToken;

    const ordersRes = await request(app)
      .get('/api/v1/provider/orders')
      .set('Authorization', `Bearer ${provToken}`);

    assert.equal(ordersRes.status, 200);
    assert.equal(ordersRes.body.success, true);
    assert.ok(Array.isArray(ordersRes.body.data));
  });
});


