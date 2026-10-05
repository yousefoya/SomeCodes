import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/users.schema.js';
import { generateTokens } from '../auth/utils/jwt.js';

const app = createApp();

describe('📍 Amman-Only Service Area Address Validation Test Suite', () => {
  let customerToken = '';

  before(async () => {
    const [cust] = await db
      .insert(users)
      .values({
        phoneNumber: '0793334455',
        name: 'عميل اختبار العناوين',
        role: 'customer',
      })
      .onConflictDoUpdate({
        target: users.phoneNumber,
        set: { name: 'عميل اختبار العناوين' },
      })
      .returning();

    customerToken = generateTokens(cust).accessToken;
  });

  test('1. Successfully creates address inside Amman service area', async () => {
    const res = await request(app)
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'المنزل - عمان',
        city: 'عمان',
        area: 'عبدون',
        streetAddress: 'شارع دمشق، مبنى 12',
        latitude: 31.9539,
        longitude: 35.9106,
        isDefault: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.city, 'عمان');
    assert.equal(res.body.data.area, 'عبدون');
  });

  test('2. Rejects address outside Amman with 400 and SERVICE_AREA_NOT_SUPPORTED', async () => {
    const res = await request(app)
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'منزل إربد',
        city: 'إربد',
        area: 'الحي الشرقي',
        streetAddress: 'شارع الجامعة',
        latitude: 32.5568,
        longitude: 35.8469,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'SERVICE_AREA_NOT_SUPPORTED');
    assert.match(res.body.error.message, /عمان فقط/);
  });

  test('3. Rejects Zarqa and Aqaba addresses', async () => {
    const resZarqa = await request(app)
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'مكتب الزرقاء',
        city: 'الزرقاء',
        area: 'الزرقاء الجديدة',
        streetAddress: 'شارع 36',
        latitude: 32.0608,
        longitude: 36.0942,
      });

    assert.equal(resZarqa.status, 400);
    assert.equal(resZarqa.body.error.code, 'SERVICE_AREA_NOT_SUPPORTED');
  });
});
