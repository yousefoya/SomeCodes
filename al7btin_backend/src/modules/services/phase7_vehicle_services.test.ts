import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/users.schema.js';
import { providers, providerServices } from '../../db/schema/providers.schema.js';
import { providerCapabilities } from '../../db/schema/dispatch.schema.js';
import { orders, orderItems, orderStatusHistory } from '../../db/schema/orders.schema.js';
import { quotations } from '../../db/schema/quotations.schema.js';
import { orderReviews } from '../../db/schema/reviews.schema.js';
import { providerWallets, walletTransactions } from '../../db/schema/finance.schema.js';
import { generateTokens } from '../auth/utils/jwt.js';
import { eq, and } from 'drizzle-orm';
import { WalletLedgerService } from '../../services/wallet-ledger.service.js';

describe('🚗 BTIN7AL Phase 7: Vehicle & Roadside Services Integration Suite', () => {
  const app = createApp();
  const request = supertest(app);

  let customerUser: any;
  let providerUser: any;
  let adminUser: any;
  let customerToken: string;
  let providerToken: string;
  let adminToken: string;
  let testProvider: any;
  let createdOrderIds: string[] = [];

  before(async () => {
    const timestamp = Date.now();

    // 1. Customer user
    const [cUser] = await db
      .insert(users)
      .values({
        phoneNumber: `0771${timestamp.toString().slice(-6)}`,
        name: 'Vehicle Customer',
        role: 'customer',
        isActive: true,
      })
      .returning();
    customerUser = cUser;
    customerToken = generateTokens(customerUser).accessToken;

    // 2. Provider user
    const [pUser] = await db
      .insert(users)
      .values({
        phoneNumber: `0792${timestamp.toString().slice(-6)}`,
        name: 'Vehicle Rescue Provider',
        role: 'provider',
        isActive: true,
      })
      .returning();
    providerUser = pUser;
    providerToken = generateTokens(providerUser).accessToken;

    // 3. Admin user
    const [aUser] = await db
      .insert(users)
      .values({
        phoneNumber: `0793${timestamp.toString().slice(-6)}`,
        name: 'Operations Admin',
        role: 'admin',
        isActive: true,
      })
      .returning();
    adminUser = aUser;
    adminToken = generateTokens(adminUser).accessToken;

    // 4. Provider Record
    const [prov] = await db
      .insert(providers)
      .values({
        id: `prov_vehicle_${timestamp}`,
        userId: providerUser.id,
        nameAr: 'ونش وميكانيكي الطوارئ الأردني',
        nameEn: 'Jordan Emergency Auto Rescue',
        phoneNumber: providerUser.phoneNumber,
        address: 'عمان - شارع المطار',
        latitude: 31.921,
        longitude: 35.882,
        rating: 5.0,
        isActive: true,
        isAvailable: true,
      })
      .returning();
    testProvider = prov;

    // Equip with all vehicle capabilities
    const caps = [
      'towing_truck',
      'flatbed_towing',
      'heavy_towing',
      'roadside_mechanic',
      'diagnostic_scanner',
      'mobile_ev_charger',
      'ev_connector_type2',
      'ev_connector_ccs2',
      'tire_repair_kit',
      'air_compressor',
    ];
    for (const c of caps) {
      await db
        .insert(providerCapabilities)
        .values({
          providerId: testProvider.id,
          capabilityKey: c,
          isVerified: true,
        })
        .onConflictDoNothing();
    }

    // Link all 4 vehicle services
    const srvIds = [
      'srv_vehicle_towing',
      'srv_roadside_mechanic',
      'srv_emergency_ev_charging',
      'srv_roadside_tire_assistance',
    ];
    for (const sId of srvIds) {
      await db
        .insert(providerServices)
        .values({
          providerId: testProvider.id,
          serviceId: sId,
          isAvailable: true,
        })
        .onConflictDoNothing();
    }
  });

  after(async () => {
    // Cleanup in referential integrity order
    if (testProvider) {
      await db.delete(orderReviews).where(eq(orderReviews.providerId, testProvider.id));
      await db.delete(quotations).where(eq(quotations.providerId, testProvider.id));
      for (const oId of createdOrderIds) {
        await db.delete(orderItems).where(eq(orderItems.orderId, oId));
        await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, oId));
        await db.delete(orders).where(eq(orders.id, oId));
      }
      await db.delete(orders).where(eq(orders.providerId, testProvider.id));
      await db.delete(walletTransactions).where(eq(walletTransactions.providerId, testProvider.id));
      await db.delete(providerWallets).where(eq(providerWallets.providerId, testProvider.id));
      await db.delete(providerCapabilities).where(eq(providerCapabilities.providerId, testProvider.id));
      await db.delete(providerServices).where(eq(providerServices.providerId, testProvider.id));
      await db.delete(providers).where(eq(providers.id, testProvider.id));
    }
    if (customerUser) {
      await db.delete(orders).where(eq(orders.customerId, customerUser.id));
      await db.delete(users).where(eq(users.id, customerUser.id));
    }
    if (providerUser) await db.delete(users).where(eq(users.id, providerUser.id));
    if (adminUser) await db.delete(users).where(eq(users.id, adminUser.id));
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Vehicle Towing / Car Transport
  // --------------------------------------------------------------------------
  describe('🚚 Scenario 1: Vehicle Towing / Car Transport E2E Lifecycle', () => {
    let towingOrderId: string;

    it('1. Authoritative price calculation computes base + route distance rate with 0.00 JOD delivery fee', async () => {
      const res = await request
        .post('/api/v1/services/srv_vehicle_towing/calculate-price')
        .send({
          answers: {
            pickup_location: {
              latitude: 31.9539,
              longitude: 35.9106,
              address: 'عمان - الدوار السابع',
            },
            destination_location: {
              latitude: 32.015,
              longitude: 35.872,
              address: 'الجبيهة - شارع الجامعة',
            },
            vehicle_type: 'sedan',
            towing_equipment_type: 'flatbed',
            vehicle_condition: 'drivable_neutral',
          },
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.deliveryFee, 0); // Strict 0.00 JOD Delivery Fee
      assert.ok(res.body.data.totalAmount >= 10.0, 'Total should include base fee (10 JOD)');
      assert.ok(res.body.data.evaluatedAnswers.trip_distance_km > 0, 'Should calculate trip distance in km');
    });

    it('2. Customer creates Towing Order with pickup & destination coordinates and stores immutable snapshot', async () => {
      const res = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceCategoryId: 'cat_vehicle_services',
          providerId: testProvider.id,
          deliveryAddress: {
            city: 'عمان',
            area: 'الجبيهة',
            streetAddress: 'شارع الجامعة - كراج الميكانيك',
            latitude: 32.015,
            longitude: 35.872,
          },
          items: [
            {
              serviceId: 'srv_vehicle_towing',
              quantity: 1,
              answers: {
                pickup_location: {
                  latitude: 31.9539,
                  longitude: 35.9106,
                  address: 'عمان - الدوار السابع',
                },
                destination_location: {
                  latitude: 32.015,
                  longitude: 35.872,
                  address: 'الجبيهة - شارع الجامعة - كراج الميكانيك',
                },
                vehicle_type: 'sedan',
                towing_equipment_type: 'flatbed',
                vehicle_condition: 'drivable_neutral',
              },
            },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      towingOrderId = res.body.data.id;
      createdOrderIds.push(towingOrderId);
      assert.ok(towingOrderId);

      // Verify destination and trip distance in DB
      const [orderDb] = await db.select().from(orders).where(eq(orders.id, towingOrderId));
      assert.ok(orderDb.destinationAddress);
      assert.equal(orderDb.deliveryFee, '0.00');
      assert.ok(Number(orderDb.tripDistanceKm) > 0);
    });

    it('3. Provider accepts job, arrives at pickup, and completes towing trip', async () => {
      // Transition to accepted
      const resAccept = await request
        .patch(`/api/v1/orders/${towingOrderId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'accepted' });
      assert.equal(resAccept.status, 200);

      // Transition to going_to_customer / pickup
      const resGoing = await request
        .patch(`/api/v1/orders/${towingOrderId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'going_to_customer' });
      assert.equal(resGoing.status, 200);

      // Complete order
      const resComplete = await request
        .patch(`/api/v1/orders/${towingOrderId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'completed', notes: 'تم تحميل ونقل وتنزيل المركبة بأمان.' });
      assert.equal(resComplete.status, 200);
      assert.equal(resComplete.body.data.status, 'completed');
    });

    it('4. Financial settlement credits provider wallet for completed towing order', async () => {
      const settlement = await WalletLedgerService.creditOrderEarnings({
        orderId: towingOrderId,
        providerId: testProvider.id,
        grossAmount: 19.0,
      });
      assert.ok(settlement.transaction);

      const wallet = await WalletLedgerService.getProviderWallet(testProvider.id);
      assert.ok(parseFloat(wallet.availableBalance) > 0);
    });

    it('5. Customer reviews completed towing order with 5 stars', async () => {
      const resReview = await request
        .post(`/api/v1/orders/${towingOrderId}/review`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 5,
          comment: 'خدمة سريعة وممتازة وسائق السطحة محترف جداً.',
        });

      assert.equal(resReview.status, 201);
      assert.equal(resReview.body.data.rating, 5);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Roadside Mechanic & Quotations Lifecycle
  // --------------------------------------------------------------------------
  describe('🔧 Scenario 2: Roadside Mechanic & Quotation Lifecycle', () => {
    let mechanicOrderId: string;
    let quotationId: string;

    it('1. Rejects roadside mechanic request if mandatory problem description is missing', async () => {
      const res = await request
        .post('/api/v1/services/srv_roadside_mechanic/calculate-price')
        .send({
          answers: {
            current_location: { latitude: 31.95, longitude: 35.91 },
            vehicle_make_model: 'Hyundai Sonata 2021',
            problem_category: 'starting_problem',
            // problem_description is missing
          },
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'REQUIRED_FIELD_MISSING');
    });

    it('2. Calculates roadside mechanic starting fee (15.00 JOD callout inspection)', async () => {
      const res = await request
        .post('/api/v1/services/srv_roadside_mechanic/calculate-price')
        .send({
          answers: {
            current_location: { latitude: 31.95, longitude: 35.91 },
            vehicle_make_model: 'Hyundai Sonata 2021',
            problem_category: 'starting_problem',
            problem_description: 'السيارة لا تدور وسلف لا يستجيب ويوجد صوت تكتكة.',
          },
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.basePrice, 15.0);
      assert.equal(res.body.data.totalAmount, 15.0);
    });

    it('3. Customer places Roadside Mechanic order', async () => {
      const res = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceCategoryId: 'cat_vehicle_services',
          providerId: testProvider.id,
          deliveryAddress: {
            city: 'عمان',
            area: 'خلدا',
            streetAddress: 'قرب إشارة خلدا',
            latitude: 31.98,
            longitude: 35.84,
          },
          items: [
            {
              serviceId: 'srv_roadside_mechanic',
              quantity: 1,
              answers: {
                current_location: { latitude: 31.98, longitude: 35.84 },
                vehicle_make_model: 'Hyundai Sonata 2021',
                problem_category: 'starting_problem',
                problem_description: 'السيارة لا تدور وسلف لا يستجيب ويوجد صوت تكتكة.',
              },
            },
          ],
        });

      assert.equal(res.status, 201);
      mechanicOrderId = res.body.data.id;
      createdOrderIds.push(mechanicOrderId);
    });

    it('4. Provider arrives on-site, inspects, and creates quotation for Starter Motor (45 JOD) + Extra Labor (10 JOD)', async () => {
      const resQuote = await request
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          orderId: mechanicOrderId,
          titleAr: 'تأمين وتبديل سلف جديد + أجور تركيب',
          titleEn: 'New Starter Motor + Installation Labor',
          descriptionAr: 'تم فحص السلف وتبين احتراق الفحمات والملف الداخلي، يتطلب سلف جديد أصلي.',
          sparePartsAmount: 45.0,
          laborAmount: 10.0,
          items: [
            {
              titleAr: 'سلف أصلي جديد (Starter Motor)',
              titleEn: 'Original Starter Motor',
              type: 'spare_parts',
              quantity: 1,
              unitPrice: 45.0,
              total: 45.0,
            },
            {
              titleAr: 'أجور فك وتركيب إضافية',
              titleEn: 'Additional Installation Labor',
              type: 'labor',
              quantity: 1,
              unitPrice: 10.0,
              total: 10.0,
            },
          ],
        });

      assert.equal(resQuote.status, 201);
      quotationId = resQuote.body.data.id;
      assert.equal(resQuote.body.data.totalAmount, '55.00');
    });

    it('5. Provider sends quotation to customer and customer approves it -> order total updates from 15.00 to 70.00 JOD', async () => {
      // Send quotation
      await request
        .post(`/api/v1/quotations/${quotationId}/send`)
        .set('Authorization', `Bearer ${providerToken}`);

      // Customer approves
      const resApprove = await request
        .post(`/api/v1/quotations/${quotationId}/approve`)
        .set('Authorization', `Bearer ${customerToken}`);

      assert.equal(resApprove.status, 200);
      assert.equal(resApprove.body.data.status, 'customer_approved');

      // Verify order total updated to 70.00 JOD
      const [ordDb] = await db.select().from(orders).where(eq(orders.id, mechanicOrderId));
      assert.equal(ordDb.totalAmount, '70.00');
    });

    it('6. Provider completes mechanic job and wallet settles with updated total', async () => {
      await request
        .patch(`/api/v1/orders/${mechanicOrderId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'completed' });

      const settlement = await WalletLedgerService.creditOrderEarnings({
        orderId: mechanicOrderId,
        providerId: testProvider.id,
        grossAmount: 70.0,
      });
      assert.ok(settlement.transaction);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Emergency EV Charging
  // --------------------------------------------------------------------------
  describe('⚡ Scenario 3: Emergency EV Charging', () => {
    it('1. Calculates emergency EV charging session fee (20.00 JOD) with CCS Combo 2 connector', async () => {
      const res = await request
        .post('/api/v1/services/srv_emergency_ev_charging/calculate-price')
        .send({
          answers: {
            current_location: { latitude: 31.97, longitude: 35.85 },
            ev_make_model: 'BYD Song Plus EV',
            current_battery_pct: 1,
            connector_type: 'ccs_combo_2',
          },
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.basePrice, 20.0);
      assert.equal(res.body.data.deliveryFee, 0.0);
    });

    it('2. Customer places EV charging order and provider completes rescue charging', async () => {
      const resOrder = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceCategoryId: 'cat_vehicle_services',
          providerId: testProvider.id,
          deliveryAddress: {
            city: 'عمان',
            area: 'دابوق',
            streetAddress: 'قرب مجمع الملك الحسين للأعمال',
            latitude: 31.97,
            longitude: 35.85,
          },
          items: [
            {
              serviceId: 'srv_emergency_ev_charging',
              quantity: 1,
              answers: {
                current_location: { latitude: 31.97, longitude: 35.85 },
                ev_make_model: 'BYD Song Plus EV',
                current_battery_pct: 1,
                connector_type: 'ccs_combo_2',
              },
            },
          ],
        });

      assert.equal(resOrder.status, 201);
      const evOrderId = resOrder.body.data.id;
      createdOrderIds.push(evOrderId);

      // Complete order
      const resComp = await request
        .patch(`/api/v1/orders/${evOrderId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'completed', notes: 'تم تزويد المركبة بـ 15% طاقة كافية للوصول لمحطة الشحن.' });

      assert.equal(resComp.status, 200);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Roadside Tire Assistance
  // --------------------------------------------------------------------------
  describe('🛞 Scenario 4: Roadside Tire Assistance', () => {
    it('1. Calculates roadside tire puncture repair starting fee (10.00 JOD)', async () => {
      const res = await request
        .post('/api/v1/services/srv_roadside_tire_assistance/calculate-price')
        .send({
          answers: {
            current_location: { latitude: 31.99, longitude: 35.86 },
            tire_problem_type: 'puncture_repair',
            affected_tires_count: 1,
            spare_tire_available: true,
          },
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.basePrice, 10.0);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Order Cancellation Policy & Safety
  // --------------------------------------------------------------------------
  describe('🛑 Scenario 5: Order Cancellation Policy & Safety', () => {
    let cancelableOrderId: string;

    before(async () => {
      const res = await request
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceCategoryId: 'cat_vehicle_services',
          providerId: testProvider.id,
          deliveryAddress: {
            city: 'عمان',
            area: 'تلاع العلي',
            streetAddress: 'شارع المدينة المنورة',
            latitude: 31.98,
            longitude: 35.87,
          },
          items: [
            {
              serviceId: 'srv_roadside_tire_assistance',
              quantity: 1,
              answers: {
                current_location: { latitude: 31.98, longitude: 35.87 },
                tire_problem_type: 'puncture_repair',
                affected_tires_count: 1,
                spare_tire_available: true,
              },
            },
          ],
        });
      cancelableOrderId = res.body.data.id;
      createdOrderIds.push(cancelableOrderId);
    });

    it('1. Customer can cancel pre-accepted order within cancellation window', async () => {
      const resCancel = await request
        .post(`/api/v1/orders/${cancelableOrderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'تم إصلاح الإطار بواسطة صديق قبل وصول الفني.',
        });

      assert.equal(resCancel.status, 200);
      assert.equal(resCancel.body.data.status, 'cancelled');
      assert.equal(resCancel.body.data.cancellationReason, 'تم إصلاح الإطار بواسطة صديق قبل وصول الفني.');

      // Verify in DB
      const [ordDb] = await db.select().from(orders).where(eq(orders.id, cancelableOrderId));
      assert.equal(ordDb.status, 'cancelled');
      assert.ok(ordDb.cancelledAt);
    });

    it('2. Rejects duplicate cancellation on already terminated order', async () => {
      const resCancel = await request
        .post(`/api/v1/orders/${cancelableOrderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'إلغاء مكرر' });

      assert.equal(resCancel.status, 400);
      assert.equal(resCancel.body.error.code, 'ORDER_ALREADY_TERMINATED');
    });
  });
});
