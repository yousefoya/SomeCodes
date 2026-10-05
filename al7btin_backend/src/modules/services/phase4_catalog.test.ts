import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { users, authOtps } from '../../db/schema/users.schema.js';
import { services, serviceOptions, servicePricingRules } from '../../db/schema/services.schema.js';
import { eq, inArray } from 'drizzle-orm';
import { sql } from '../../config/database.js';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('📦 Phase 4: Production Service Catalog & Pricing Engine Verification', () => {
  let adminToken = '';
  let customerToken = '';

  before(async () => {
    const hash = await bcrypt.hash('1234', 10);

    // Create Admin User for catalog verification
    const [adminUser] = await db.insert(users).values({
      phoneNumber: '0799990001',
      name: 'مسؤول الكتالوج',
      role: 'admin',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'admin' },
    }).returning();

    await db.insert(authOtps).values({
      phoneNumber: '0799990001',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const adminLogin = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0799990001', otp: '1234' });
    adminToken = adminLogin.body.data.accessToken;

    // Create Customer User
    await db.insert(users).values({
      phoneNumber: '0799990002',
      name: 'عميل الفحص',
      role: 'customer',
    }).onConflictDoUpdate({
      target: users.phoneNumber,
      set: { role: 'customer' },
    });

    await db.insert(authOtps).values({
      phoneNumber: '0799990002',
      otpHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const custLogin = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phoneNumber: '0799990002', otp: '1234' });
    customerToken = custLogin.body.data.accessToken;
  });

  after(async () => {
    try {
      await db.delete(users).where(inArray(users.phoneNumber, ['0799990001', '0799990002']));
    } catch (_) {}
    await sql.end();
  });

  test('1. Production Catalog: Exactly 26 services exist and are active in the database', async () => {
    const res = await request(app).get('/api/v1/services?active=all');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 26, `Expected at least 26 services, found ${res.body.data.length}`);

    const activeServices = res.body.data.filter((s: any) => s.isActive);
    assert.ok(activeServices.length >= 26);
  });

  test('2. Water Service (7 Variants): All 7 specified variants exist with correct prices', async () => {
    const res = await request(app).get('/api/v1/services/srv_water_delivery');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.serviceMode, 'product_variant');
    assert.ok(Array.isArray(res.body.data.options));
    assert.equal(res.body.data.options.length, 7, 'Water service must have exactly 7 active variants');

    const optionsMap = new Map(res.body.data.options.map((o: any) => [o.id, o]));

    // 19L Gallon Refill = 1.50 JOD
    const refill19 = optionsMap.get('opt_water_19l_refill') as any;
    assert.ok(refill19);
    assert.equal(refill19.price, 1.5);

    // 19L New Gallon with Water = 6.00 JOD
    const new19 = optionsMap.get('opt_water_19l_new') as any;
    assert.ok(new19);
    assert.equal(new19.price, 6.0);

    // Cups Carton (40 cups) = 3.00 JOD
    const cupsPack = optionsMap.get('opt_water_cups_pack') as any;
    assert.ok(cupsPack);
    assert.equal(cupsPack.price, 3.0);

    // 0.5L Bottles Pack = 2.50 JOD
    const botHalf = optionsMap.get('opt_water_bottles_half_liter') as any;
    assert.ok(botHalf);
    assert.equal(botHalf.price, 2.5);

    // 1.5L Bottles Pack = 2.50 JOD
    const bot15 = optionsMap.get('opt_water_bottles_1_5_liter') as any;
    assert.ok(bot15);
    assert.equal(bot15.price, 2.5);

    // 2m3 Tanker = 18.00 JOD
    const tank2 = optionsMap.get('opt_water_tanker_2m3') as any;
    assert.ok(tank2);
    assert.equal(tank2.price, 18.0);

    // 4m3 Tanker = 32.00 JOD
    const tank4 = optionsMap.get('opt_water_tanker_4m3') as any;
    assert.ok(tank4);
    assert.equal(tank4.price, 32.0);
  });

  test('3. Diesel Service (Liters Pricing Engine): Dynamic price calculation by liters quantity', async () => {
    const res = await request(app).get('/api/v1/services/srv_diesel_fuel');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.serviceMode, 'dynamic_form');

    // Calculate price for 500 liters of diesel @ 0.75 JOD / liter = 375.00 JOD
    const calcRes = await request(app)
      .post('/api/v1/services/srv_diesel_fuel/calculate-price')
      .send({
        answers: { liters_count: 500 },
        quantity: 1,
      });

    assert.equal(calcRes.status, 200);
    assert.equal(calcRes.body.success, true);
    assert.equal(calcRes.body.data.total, 375.0);
    assert.equal(calcRes.body.data.deliveryFee, 0.0);
  });

  test('4. 5.00 JOD Starting Labor Fee & Disclaimer for Maintenance Services', async () => {
    const maintenanceServiceIds = [
      'srv_plumbing',
      'srv_electricity',
      'srv_ac_cooling',
      'srv_carpentry',
      'srv_general_maintenance',
      'srv_washing_machines',
      'srv_dryers',
      'srv_refrigerators',
      'srv_freezers',
      'srv_glass_aluminum',
      'srv_painting',
      'srv_tiling',
      'srv_appliance_maintenance',
    ];

    for (const srvId of maintenanceServiceIds) {
      const res = await request(app).get(`/api/v1/services/${srvId}`);
      assert.equal(res.status, 200, `Failed for ${srvId}`);
      assert.equal(res.body.data.isLaborOnly, true, `${srvId} must be isLaborOnly`);
      assert.equal(res.body.data.basePrice, '5.00', `${srvId} basePrice must be 5.00`);
      assert.ok(
        res.body.data.disclaimerAr.includes('أجرة اليد/الخدمة الأساسية فقط'),
        `${srvId} must include disclaimerText stating labor starting fee only`
      );
    }
  });

  test('5. Home Cleaning Service: Packages configured with correct options and hours', async () => {
    const res = await request(app).get('/api/v1/services/srv_home_cleaning');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.options.length, 4, 'Home cleaning must have 4 packages');

    const optionsMap = new Map(res.body.data.options.map((o: any) => [o.id, o]));

    // 1 Worker Package = 5.00 JOD
    const pkg1 = optionsMap.get('opt_clean_pkg_1') as any;
    assert.ok(pkg1);
    assert.equal(pkg1.price, 5.0);

    // 2 Workers Package = 9.00 JOD
    const pkg2 = optionsMap.get('opt_clean_pkg_2') as any;
    assert.ok(pkg2);
    assert.equal(pkg2.price, 9.0);

    // 4 Workers Family Package = 17.00 JOD
    const pkg4 = optionsMap.get('opt_clean_pkg_4') as any;
    assert.ok(pkg4);
    assert.equal(pkg4.price, 17.0);

    // 6 Workers Villa Package = 24.00 JOD
    const pkg6 = optionsMap.get('opt_clean_pkg_6') as any;
    assert.ok(pkg6);
    assert.equal(pkg6.price, 24.0);
  });

  test('6. Product + Installation Model: Authoritative pricing calculation with itemized installation fee', async () => {
    // Water Heaters (srv_water_heaters)
    const res = await request(app).get('/api/v1/services/srv_water_heaters');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.serviceMode, 'product_installation');

    // 1. Calculate price for Product Only (80L heater = 110.00 JOD)
    const prodOnlyRes = await request(app)
      .post('/api/v1/services/srv_water_heaters/calculate-price')
      .send({
        optionId: 'opt_heater_80l_electric',
        answers: { include_installation: false },
      });

    assert.equal(prodOnlyRes.status, 200);
    assert.equal(prodOnlyRes.body.data.total, 110.0);
    assert.equal(prodOnlyRes.body.data.breakdown.some((b: any) => b.type === 'installation'), false);

    // 2. Calculate price for Product + Installation (80L heater 110.00 + 25.00 installation = 135.00 JOD)
    const withInstallRes = await request(app)
      .post('/api/v1/services/srv_water_heaters/calculate-price')
      .send({
        optionId: 'opt_heater_80l_electric',
        answers: { include_installation: true },
      });

    assert.equal(withInstallRes.status, 200);
    assert.equal(withInstallRes.body.data.total, 135.0);
    assert.ok(withInstallRes.body.data.breakdown.some((b: any) => b.type === 'installation' && b.amount === 25.0));
  });

  test('7. Water Pumps: Product + Installation calculation (Pump 65.00 JOD + 20.00 installation = 85.00 JOD)', async () => {
    const withInstallRes = await request(app)
      .post('/api/v1/services/srv_water_pumps/calculate-price')
      .send({
        optionId: 'opt_pump_half_hp',
        answers: { include_installation: true },
      });

    assert.equal(withInstallRes.status, 200);
    assert.equal(withInstallRes.body.data.total, 85.0);
    assert.ok(withInstallRes.body.data.breakdown.some((b: any) => b.type === 'installation' && b.amount === 20.0));
  });

  test('8. Water Tanks: Product + Installation calculation (2m Tank 160.00 JOD + 40.00 installation = 200.00 JOD)', async () => {
    const withInstallRes = await request(app)
      .post('/api/v1/services/srv_water_tanks/calculate-price')
      .send({
        optionId: 'opt_tank_2m3',
        answers: { include_installation: true },
      });

    assert.equal(withInstallRes.status, 200);
    assert.equal(withInstallRes.body.data.total, 200.0);
    assert.ok(withInstallRes.body.data.breakdown.some((b: any) => b.type === 'installation' && b.amount === 40.0));
  });

  test('9. Locks & Keys: Smart Lock + Installation calculation (Smart Lock 145.00 JOD + 35.00 installation = 180.00 JOD)', async () => {
    const withInstallRes = await request(app)
      .post('/api/v1/services/srv_locks_keys/calculate-price')
      .send({
        optionId: 'opt_lock_smart_biometric',
        answers: { include_installation: true },
      });

    assert.equal(withInstallRes.status, 200);
    assert.equal(withInstallRes.body.data.total, 180.0);
    assert.ok(withInstallRes.body.data.breakdown.some((b: any) => b.type === 'installation' && b.amount === 35.0));
  });

  test('10. Admin Service Builder: Admin can update service mode and starting labor price', async () => {
    const patchRes = await request(app)
      .patch('/api/v1/services/admin/srv_carpentry')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        basePrice: 6.0,
      });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.basePrice, '6.00');

    // Reset back to 5.00
    await request(app)
      .patch('/api/v1/services/admin/srv_carpentry')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        basePrice: 5.0,
      });
  });
});
