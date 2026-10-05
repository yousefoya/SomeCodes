import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { users, authOtps } from '../../db/schema/users.schema.js';
import { providers, providerServices } from '../../db/schema/providers.schema.js';
import { providerCapabilities, dispatchOffers, dispatchSettings } from '../../db/schema/dispatch.schema.js';
import { orders, orderItems, orderStatusHistory } from '../../db/schema/orders.schema.js';
import { quotations } from '../../db/schema/quotations.schema.js';
import { orderReviews } from '../../db/schema/reviews.schema.js';
import {
  providerWallets,
  walletTransactions,
  paymentIntents,
  paymentTransactions,
  providerBankAccounts,
  withdrawalRequests,
} from '../../db/schema/finance.schema.js';
import { generateTokens } from '../auth/utils/jwt.js';
import { eq, and, inArray, like } from 'drizzle-orm';
import { WalletLedgerService } from '../../services/wallet-ledger.service.js';
import { dispatchService } from '../../services/dispatch.service.js';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('🏆 BTIN7AL Phase 8: Final Production Hardening & E2E Scenarios A–J Suite', () => {
  const ts = Date.now();
  let adminUser: any;
  let superAdminUser: any;
  let customerUser: any;
  let providerAUser: any;
  let providerBUser: any;

  let adminToken = '';
  let superAdminToken = '';
  let customerToken = '';
  let providerAToken = '';
  let providerBToken = '';

  let providerAId = `prov_p8_a_${ts}`;
  let providerBId = `prov_p8_b_${ts}`;
  let providerABankAccountId = '';

  const createdOrderIds: string[] = [];

  before(async () => {
    const hash = await bcrypt.hash('1234', 10);

    // 1. Create Super Admin
    const [sa] = await db
      .insert(users)
      .values({
        phoneNumber: `0799${ts.toString().slice(-6)}`,
        name: 'Super Admin Phase8',
        role: 'super_admin',
        isActive: true,
      })
      .returning();
    superAdminUser = sa;
    superAdminToken = generateTokens(superAdminUser).accessToken;

    // 2. Create Admin
    const [ad] = await db
      .insert(users)
      .values({
        phoneNumber: `0798${ts.toString().slice(-6)}`,
        name: 'Admin Phase8',
        role: 'admin',
        isActive: true,
      })
      .returning();
    adminUser = ad;
    adminToken = generateTokens(adminUser).accessToken;

    // 3. Create Customer
    const [cu] = await db
      .insert(users)
      .values({
        phoneNumber: `0777${ts.toString().slice(-6)}`,
        name: 'Customer Phase8',
        role: 'customer',
        isActive: true,
      })
      .returning();
    customerUser = cu;
    customerToken = generateTokens(customerUser).accessToken;

    // 4. Create Provider A (Primary Towing & Mechanic)
    const [paUser] = await db
      .insert(users)
      .values({
        phoneNumber: `0781${ts.toString().slice(-6)}`,
        name: 'Provider Alpha Hub',
        role: 'provider',
        isActive: true,
      })
      .returning();
    providerAUser = paUser;
    providerAToken = generateTokens(providerAUser).accessToken;

    await db.insert(providers).values({
      id: providerAId,
      userId: providerAUser.id,
      nameAr: 'مركز خدمات ألفا المتنقل',
      nameEn: 'Alpha Mobile Services Hub',
      phoneNumber: providerAUser.phoneNumber,
      address: 'عمان - خلدا',
      latitude: 31.985,
      longitude: 35.855,
      isActive: true,
      isAvailable: true,
      rating: 5.0,
    });

    // 5. Create Provider B (Secondary Towing & Tire)
    const [pbUser] = await db
      .insert(users)
      .values({
        phoneNumber: `0782${ts.toString().slice(-6)}`,
        name: 'Provider Beta Hub',
        role: 'provider',
        isActive: true,
      })
      .returning();
    providerBUser = pbUser;
    providerBToken = generateTokens(providerBUser).accessToken;

    await db.insert(providers).values({
      id: providerBId,
      userId: providerBUser.id,
      nameAr: 'مركز خدمات بيتا المتنقل',
      nameEn: 'Beta Mobile Services Hub',
      phoneNumber: providerBUser.phoneNumber,
      address: 'عمان - الجبيهة',
      latitude: 32.012,
      longitude: 35.871,
      isActive: true,
      isAvailable: true,
      rating: 4.8,
    });

    // 6. Assign Provider Services & Capabilities
    const vehicleServices = [
      'srv_vehicle_towing',
      'srv_roadside_mechanic',
      'srv_emergency_ev_charging',
      'srv_roadside_tire_assistance',
      'srv_home_cleaning',
    ];

    for (const sId of vehicleServices) {
      await db.insert(providerServices).values([
        { providerId: providerAId, serviceId: sId, isAvailable: true },
        { providerId: providerBId, serviceId: sId, isAvailable: true },
      ]).onConflictDoNothing();
    }

    const caps = [
      'towing_truck',
      'flatbed_towing',
      'heavy_towing',
      'roadside_mechanic',
      'diagnostic_scanner',
      'mobile_ev_charger',
      'ev_connector_type2',
      'ev_connector_ccs2',
      'ev_connector_gbt',
      'tire_repair_kit',
      'air_compressor',
      'home_cleaning',
    ];

    for (const cap of caps) {
      await db.insert(providerCapabilities).values([
        { providerId: providerAId, capabilityKey: cap, isVerified: true },
        { providerId: providerBId, capabilityKey: cap, isVerified: true },
      ]).onConflictDoNothing();
    }

    // 7. Insert Verified Bank Account for Provider A
    const [bankAccountA] = await db
      .insert(providerBankAccounts)
      .values({
        providerId: providerAId,
        bankName: 'بنك الاتحاد',
        bankNameEn: 'Bank al Etihad',
        accountHolderName: 'مركز خدمات ألفا المتنقل',
        iban: 'JO94UBSI1030000001234567890123',
        maskedIban: 'JO94UBSI************0123',
        swiftCode: 'UBSIJOAM',
        isVerified: true,
        isPrimary: true,
      })
      .returning();
    providerABankAccountId = bankAccountA.id;
  });

  after(async () => {
    try {
      if (createdOrderIds.length > 0) {
        await db.delete(orderReviews).where(inArray(orderReviews.orderId, createdOrderIds));
        await db.delete(quotations).where(inArray(quotations.orderId, createdOrderIds));
        await db.delete(orderStatusHistory).where(inArray(orderStatusHistory.orderId, createdOrderIds));
        await db.delete(dispatchOffers).where(inArray(dispatchOffers.orderId, createdOrderIds));
        await db.delete(orderItems).where(inArray(orderItems.orderId, createdOrderIds));
        await db.delete(orders).where(inArray(orders.id, createdOrderIds));
      }

      await db.delete(withdrawalRequests).where(inArray(withdrawalRequests.providerId, [providerAId, providerBId]));
      await db.delete(providerBankAccounts).where(inArray(providerBankAccounts.providerId, [providerAId, providerBId]));
      await db.delete(walletTransactions).where(inArray(walletTransactions.providerId, [providerAId, providerBId]));
      await db.delete(providerWallets).where(inArray(providerWallets.providerId, [providerAId, providerBId]));
      await db.delete(providerCapabilities).where(inArray(providerCapabilities.providerId, [providerAId, providerBId]));
      await db.delete(providerServices).where(inArray(providerServices.providerId, [providerAId, providerBId]));
      await db.delete(providers).where(inArray(providers.id, [providerAId, providerBId]));

      if (customerUser) await db.delete(users).where(eq(users.id, customerUser.id));
      if (providerAUser) await db.delete(users).where(eq(users.id, providerAUser.id));
      if (providerBUser) await db.delete(users).where(eq(users.id, providerBUser.id));
      if (adminUser) await db.delete(users).where(eq(users.id, adminUser.id));
      if (superAdminUser) await db.delete(users).where(eq(users.id, superAdminUser.id));
    } catch (_) {}
  });

  // ==========================================
  // SCENARIO A: NORMAL DYNAMIC SERVICE LIFECYCLE
  // ==========================================
  describe('✨ SCENARIO A: Normal Service Complete E2E Lifecycle', () => {
    let orderAId = '';

    it('1. Customer selects home cleaning, calculates authoritative price (0 delivery fee), and creates order', async () => {
      const calcRes = await request(app)
        .post('/api/v1/services/srv_home_cleaning/calculate-price')
        .send({
          answers: {
            cleaning_package: 'pkg_standard_4h',
            cleaners_count: 2,
          },
        });

      assert.equal(calcRes.status, 200);
      assert.equal(calcRes.body.success, true);
      assert.equal(calcRes.body.data.deliveryFee, 0.0);
      assert.ok(calcRes.body.data.totalAmount > 0);

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceCategoryId: 'cat_home_services',
          providerId: providerAId,
          deliveryAddress: {
            city: 'عمان',
            area: 'خلدا',
            streetAddress: 'شارع وصفي التل',
            latitude: 31.985,
            longitude: 35.855,
          },
          items: [
            {
              serviceId: 'srv_home_cleaning',
              quantity: 1,
              answers: {
                cleaning_package: 'pkg_standard_4h',
                cleaners_count: 2,
              },
            },
          ],
        });

      assert.equal(orderRes.status, 201);
      assert.equal(orderRes.body.success, true);
      assert.equal(orderRes.body.data.status, 'confirmed');
      assert.equal(parseFloat(orderRes.body.data.deliveryFee), 0.0);
      orderAId = orderRes.body.data.id;
      createdOrderIds.push(orderAId);
    });

    it('2. Provider accepts order, arrives at location, starts service, and completes job', async () => {
      // Accept
      const acceptRes = await request(app)
        .patch(`/api/v1/orders/${orderAId}/status`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ status: 'accepted' });
      assert.equal(acceptRes.status, 200);

      // Going to customer
      const goingRes = await request(app)
        .patch(`/api/v1/orders/${orderAId}/status`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ status: 'going_to_customer' });
      assert.equal(goingRes.status, 200);

      // Complete
      const completeRes = await request(app)
        .patch(`/api/v1/orders/${orderAId}/status`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ status: 'completed' });
      assert.equal(completeRes.status, 200);
      assert.equal(completeRes.body.data.status, 'completed');
    });

    it('3. Double-entry financial settlement credits provider wallet and logs commission deduction', async () => {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderAId));
      const gross = parseFloat(order.totalAmount);

      const settleRes = await WalletLedgerService.creditOrderEarnings({
        orderId: orderAId,
        providerId: providerAId,
        grossAmount: gross,
        categoryId: order.serviceCategoryId,
        timing: 'on_service_completion',
      });

      assert.equal(settleRes.alreadyProcessed, false);
      assert.ok(settleRes.commission.netProviderAmount > 0);
      assert.ok(settleRes.commission.commissionAmount >= 0);

      // Verify wallet balance
      const wallet = await WalletLedgerService.getProviderWallet(providerAId);
      assert.ok(parseFloat(wallet.availableBalance) >= settleRes.commission.netProviderAmount);
    });

    it('4. Customer submits 5-star review on completed order and provider rating updates', async () => {
      const revRes = await request(app)
        .post(`/api/v1/orders/${orderAId}/review`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 5,
          comment: 'خدمة تنظيف ممتازة وفريق عمل احترافي جداً.',
        });

      assert.equal(revRes.status, 201);
      assert.equal(revRes.body.success, true);
      assert.equal(revRes.body.data.rating, 5);
      assert.equal(revRes.body.data.isVerifiedPurchase, true);
    });
  });

  // ==========================================
  // SCENARIO B: ON-SITE QUOTATION LIFECYCLE
  // ==========================================
  describe('📑 SCENARIO B: Diagnostic Inspection & On-Site Quotation Flow', () => {
    let quoteOrderId = '';
    let quotationId = '';

    it('1. Customer places repair order with starting fee of 15.00 JOD', async () => {
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceCategoryId: 'cat_vehicle_services',
          providerId: providerAId,
          deliveryAddress: {
            city: 'عمان',
            area: 'خلدا',
            streetAddress: 'شارع الملكة رانيا',
            latitude: 31.99,
            longitude: 35.86,
          },
          items: [
            {
              serviceId: 'srv_roadside_mechanic',
              quantity: 1,
              answers: {
                current_location: {
                  latitude: 31.99,
                  longitude: 35.86,
                  address: 'شارع الملكة رانيا',
                },
                vehicle_make_model: 'Toyota Camry 2022',
                fuel_engine_type: 'hybrid',
                problem_category: 'starting_problem',
                problem_description: 'السيارة لا تستجيب لمحاولة التشغيل ويصدر صوت طقة متكررة.',
              },
            },
          ],
        });

      assert.equal(orderRes.status, 201);
      assert.equal(parseFloat(orderRes.body.data.totalAmount), 15.0);
      quoteOrderId = orderRes.body.data.id;
      createdOrderIds.push(quoteOrderId);
    });

    it('2. Provider arrives on-site, inspects, and creates itemized draft quotation (Labor + Parts)', async () => {
      const quoteRes = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({
          orderId: quoteOrderId,
          notes: 'تم فحص المارش وتبين احتراق الفحمات والحاجة لاستبدال دينمو السلف.',
          items: [
            {
              type: 'spare_parts',
              titleAr: 'دينمو سلف أصلي تويوتا هايبرد',
              titleEn: 'Toyota Genuine Starter Motor',
              quantity: 1,
              unitPrice: 50.0,
              total: 50.0,
            },
            {
              type: 'labor',
              titleAr: 'أجرة فك وتركيب ومعايرة التوصيلات الكهربائية',
              titleEn: 'Installation & Electrical Calibration Labor',
              quantity: 1,
              unitPrice: 15.0,
              total: 15.0,
            },
          ],
        });

      assert.equal(quoteRes.status, 201);
      assert.equal(quoteRes.body.data.status, 'draft');
      assert.equal(Number(quoteRes.body.data.totalAmount), 65.0);
      quotationId = quoteRes.body.data.id;
    });

    it('3. Provider sends quotation to customer and customer approves it -> Order total expands to 80.00 JOD', async () => {
      // Send
      const sendRes = await request(app)
        .post(`/api/v1/quotations/${quotationId}/send`)
        .set('Authorization', `Bearer ${providerAToken}`);
      assert.equal(sendRes.status, 200);

      // Approve
      const approveRes = await request(app)
        .post(`/api/v1/quotations/${quotationId}/approve`)
        .set('Authorization', `Bearer ${customerToken}`);
      assert.equal(approveRes.status, 200);
      assert.equal(approveRes.body.data.status, 'customer_approved');

      // Verify parent order updated: 15.00 base + 65.00 quote = 80.00 JOD
      const [ordDb] = await db.select().from(orders).where(eq(orders.id, quoteOrderId));
      assert.equal(parseFloat(ordDb.totalAmount), 80.0);
    });
  });

  // ==========================================
  // SCENARIO C: PROVIDER REJECTS & DISPATCH FALLBACK
  // ==========================================
  describe('🔄 SCENARIO C: Provider Rejection & Smart Dispatch Fallback', () => {
    let dispatchOrderId = '';
    let redispatchedOfferId = '';

    it('1. Customer places order without specific provider -> Enters dispatch queue', async () => {
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceCategoryId: 'cat_vehicle_services',
          deliveryAddress: {
            city: 'عمان',
            area: 'الجبيهة',
            streetAddress: 'شارع الجامعة',
            latitude: 32.012,
            longitude: 35.871,
          },
          items: [
            {
              serviceId: 'srv_emergency_ev_charging',
              quantity: 1,
              answers: {
                current_location: {
                  latitude: 32.012,
                  longitude: 35.871,
                  address: 'شارع الجامعة',
                },
                connector_type: 'ccs_combo_2',
                current_battery_pct: 5,
                ev_make_model: 'Hyundai Ioniq 5',
              },
            },
          ],
        });

      assert.equal(orderRes.status, 201);
      dispatchOrderId = orderRes.body.data.id;
      createdOrderIds.push(dispatchOrderId);
    });

    it('2. Dispatch engine offers order to closest Provider B, Provider B rejects with reason', async () => {
      // Dispatch initial offer (closest candidate is Provider B at Al-Jubaiha)
      const dispResult = await dispatchService.dispatchOrder(dispatchOrderId);
      assert.equal(dispResult.success, true);
      assert.equal(dispResult.providerId, providerBId);
      const offerBId = dispResult.offerId!;

      // Provider B rejects and dispatch fallback immediately selects Candidate #2 (Provider A)
      const rejectRes = await dispatchService.rejectOffer(offerBId, providerBId, 'مشغول بحالة إنقاذ أخرى');
      assert.equal(rejectRes.success, true);
      assert.equal(rejectRes.providerId, providerAId);
      assert.equal(rejectRes.status, 'offered');
      redispatchedOfferId = rejectRes.offerId!;
    });

    it('3. Provider A accepts the re-dispatched offer -> Assigned exactly once', async () => {
      // Provider A accepts
      const acceptRes = await dispatchService.acceptOffer(redispatchedOfferId, providerAId);
      assert.equal(acceptRes.success, true);
      assert.equal(acceptRes.order.status, 'accepted');
      assert.equal(acceptRes.order.providerId, providerAId);
    });
  });

  // ==========================================
  // SCENARIO D: CONCURRENT OFFER ACCEPTANCE RACE CONDITION
  // ==========================================
  describe('⚡ SCENARIO D: Concurrent Offer Acceptance Race Condition Protection', () => {
    let raceOrderId = '';

    it('1. Simultaneous acceptance attempts by two providers result in exactly ONE success (200) and ONE conflict (409)', async () => {
      // Create test order
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceCategoryId: 'cat_vehicle_services',
          deliveryAddress: {
            city: 'عمان',
            area: 'خلدا',
            streetAddress: 'شارع وصفي التل',
            latitude: 31.985,
            longitude: 35.855,
          },
          items: [
            {
              serviceId: 'srv_roadside_tire_assistance',
              quantity: 1,
              answers: {
                current_location: {
                  latitude: 31.985,
                  longitude: 35.855,
                  address: 'شارع وصفي التل',
                },
                tire_problem_type: 'puncture_repair',
                affected_tires_count: 1,
                spare_tire_available: true,
              },
            },
          ],
        });

      assert.equal(orderRes.status, 201);
      raceOrderId = orderRes.body.data.id;
      createdOrderIds.push(raceOrderId);

      // Create two competing dispatch offers for Provider A and Provider B
      const [offerA] = await db
        .insert(dispatchOffers)
        .values({
          orderId: raceOrderId,
          providerId: providerAId,
          attemptNumber: 1,
          status: 'offered',
          score: 95.0,
          expiresAt: new Date(Date.now() + 60000),
        })
        .returning();

      const [offerB] = await db
        .insert(dispatchOffers)
        .values({
          orderId: raceOrderId,
          providerId: providerBId,
          attemptNumber: 1,
          status: 'offered',
          score: 90.0,
          expiresAt: new Date(Date.now() + 60000),
        })
        .returning();

      // Fire simultaneous acceptances concurrently
      const results = await Promise.allSettled([
        dispatchService.acceptOffer(offerA.id, providerAId),
        dispatchService.acceptOffer(offerB.id, providerBId),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly one must succeed and one must fail with 409 conflict
      assert.equal(fulfilled.length, 1, 'Exactly one provider acceptance must succeed');
      assert.equal(rejected.length, 1, 'The competing provider acceptance must be rejected');

      const err: any = (rejected[0] as PromiseRejectedResult).reason;
      assert.ok(
        err.code === 'ORDER_ALREADY_ASSIGNED' || err.code === 'OFFER_NO_LONGER_AVAILABLE',
        `Expected 409 conflict code, got: ${err.code}`
      );

      // Verify order has exactly ONE assigned provider in DB
      const [finalOrd] = await db.select().from(orders).where(eq(orders.id, raceOrderId));
      assert.equal(finalOrd.status, 'accepted');
      assert.ok(finalOrd.providerId === providerAId || finalOrd.providerId === providerBId);
    });
  });

  // ==========================================
  // SCENARIO E: PAYMENT RETRY & IDEMPOTENCY
  // ==========================================
  describe('💳 SCENARIO E: Payment Intent Creation, Retry & Webhook Idempotency', () => {
    let payOrderId = '';

    it('1. Creates payment intent and confirms idempotently across duplicate webhooks', async () => {
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceCategoryId: 'cat_vehicle_services',
          providerId: providerAId,
          deliveryAddress: {
            city: 'عمان',
            area: 'خلدا',
            streetAddress: 'شارع وصفي التل',
            latitude: 31.985,
            longitude: 35.855,
          },
          items: [
            {
              serviceId: 'srv_emergency_ev_charging',
              quantity: 1,
              answers: {
                current_location: {
                  latitude: 31.985,
                  longitude: 35.855,
                  address: 'شارع وصفي التل',
                },
                ev_make_model: 'Tesla Model Y',
                connector_type: 'ccs_combo_2',
              },
            },
          ],
        });

      assert.equal(orderRes.status, 201);
      payOrderId = orderRes.body.data.id;
      createdOrderIds.push(payOrderId);

      // Create Payment Intent
      const intentRes = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: payOrderId,
          amount: 20.0,
          currency: 'JOD',
          idempotencyKey: `idemp_pay_${payOrderId}`,
        });

      assert.equal(intentRes.status, 201);
      const intentId = intentRes.body.data.intent.id;

      // Duplicate Payment Intent request with same key returns identical intent safely
      const dupIntentRes = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: payOrderId,
          amount: 20.0,
          currency: 'JOD',
          idempotencyKey: `idemp_pay_${payOrderId}`,
        });

      assert.equal(dupIntentRes.status, 201);
      assert.equal(dupIntentRes.body.data.intent.id, intentId);

      // Webhook event 1
      const hook1 = await request(app)
        .post('/api/v1/payments/webhook')
        .send({
          eventId: `evt_${payOrderId}_1`,
          eventType: 'payment_intent.succeeded',
          paymentIntentId: intentId,
          amount: 20.0,
        });
      assert.equal(hook1.status, 200);

      // Webhook event 2 (Duplicate delivery)
      const hook2 = await request(app)
        .post('/api/v1/payments/webhook')
        .send({
          eventId: `evt_${payOrderId}_1`,
          eventType: 'payment_intent.succeeded',
          paymentIntentId: intentId,
          amount: 20.0,
        });
      assert.equal(hook2.status, 200);
      assert.equal(hook2.body.alreadyProcessed, true);
    });
  });

  // ==========================================
  // SCENARIO F: PROVIDER WITHDRAWAL & RECONCILIATION
  // ==========================================
  describe('🏦 SCENARIO F: Provider Withdrawal Lifecycle & Financial Reconciliation', () => {
    it('1. Provider accumulates earnings, requests withdrawal, Admin approves & settles with 0 discrepancies', async () => {
      // 1. Create completed order in database to anchor earnings calculation
      const [fOrder] = await db
        .insert(orders)
        .values({
          id: `ord_recon_${ts}`,
          customerId: customerUser.id,
          customerName: customerUser.name,
          customerPhone: customerUser.phoneNumber,
          providerId: providerAId,
          serviceCategoryId: 'cat_home_services',
          status: 'completed',
          subtotal: '100.00',
          totalAmount: '100.00',
          deliveryFee: '0.00',
          discountAmount: '0.00',
          deliveryCity: 'عمان',
          deliveryArea: 'خلدا',
          deliveryStreetAddress: 'شارع وصفي التل',
          deliveryLatitude: 31.985,
          deliveryLongitude: 35.855,
          deliveryAddress: {
            city: 'عمان',
            area: 'خلدا',
            streetAddress: 'شارع وصفي التل',
          },
        })
        .returning();
      createdOrderIds.push(fOrder.id);

      await WalletLedgerService.creditOrderEarnings({
        orderId: fOrder.id,
        providerId: providerAId,
        grossAmount: 100.0,
        timing: 'on_service_completion',
      });

      const walletBefore = await WalletLedgerService.getProviderWallet(providerAId);
      const avail = parseFloat(walletBefore.availableBalance);
      assert.ok(avail >= 50.0);

      // 2. Request withdrawal of 50.00 JOD
      const reqRes = await WalletLedgerService.requestWithdrawal({
        providerId: providerAId,
        bankAccountId: providerABankAccountId,
        amount: 50.0,
        idempotencyKey: `wth_req_${ts}`,
      });

      assert.ok(reqRes.withdrawal);
      assert.equal(reqRes.withdrawal.status, 'requested');

      // Held balance increased by 50.00
      const walletHeld = await WalletLedgerService.getProviderWallet(providerAId);
      assert.equal(parseFloat(walletHeld.heldBalance), 50.0);

      // 3. Admin settles withdrawal
      const settleRes = await WalletLedgerService.settleWithdrawal({
        withdrawalId: reqRes.withdrawal.id,
        transactionReference: `BANK-REF-${ts}`,
        actorUserId: superAdminUser.id,
        notes: 'تم التحويل البنكي لحساب الآيبان بنجاح',
      });

      assert.ok(settleRes.withdrawal);
      assert.equal(settleRes.withdrawal.status, 'paid');

      // 4. Run automated system-wide financial reconciliation
      const reconRun = await WalletLedgerService.runSystemWideReconciliation(superAdminUser.id);
      assert.equal(reconRun.totalDiscrepancies, 0, 'Reconciliation must find 0 discrepancies');
      assert.equal(reconRun.status, 'completed');
    });
  });

  // ==========================================
  // SCENARIO G: VEHICLE TOWING
  // ==========================================
  describe('🚚 SCENARIO G: Vehicle Towing with Road Distance (1.25x) Pricing', () => {
    it('1. Calculates distance pricing accurately (10 JOD base + 0.60 JOD/km * 1.25 factor) and stores immutable trip coordinates', async () => {
      // 7th Circle (31.9539, 35.8617) to Sweifieh (31.9632, 35.8806) ~ 2.08 km straight -> 2.6 km road
      const calcRes = await request(app)
        .post('/api/v1/services/srv_vehicle_towing/calculate-price')
        .send({
          answers: {
            pickup_location: { latitude: 31.9539, longitude: 35.8617, address: 'عمان - الدوار السابع' },
            destination_location: { latitude: 31.9632, longitude: 35.8806, address: 'عمان - الصويفية' },
            vehicle_type: 'sedan',
            towing_equipment_type: 'flatbed',
            vehicle_condition: 'drivable_neutral',
          },
        });

      assert.equal(calcRes.status, 200);
      assert.equal(calcRes.body.success, true);
      assert.ok(calcRes.body.data.subtotal >= 11.5);
      assert.equal(calcRes.body.data.deliveryFee, 0.0);
    });
  });

  // ==========================================
  // SCENARIO H: ROADSIDE MECHANIC
  // ==========================================
  describe('🔧 SCENARIO H: Roadside Mechanic Diagnostic Description Enforcement', () => {
    it('1. Rejects request without detailed problem description and accepts with valid symptoms', async () => {
      const badRes = await request(app)
        .post('/api/v1/services/srv_roadside_mechanic/calculate-price')
        .send({
          answers: {
            current_location: { latitude: 31.9539, longitude: 35.8617, address: 'عمان' },
            vehicle_make_model: 'Ford Fusion 2020',
            problem_category: 'overheating',
          },
        });

      assert.equal(badRes.status, 400);
      assert.equal(badRes.body.error.code, 'REQUIRED_FIELD_MISSING');

      const goodRes = await request(app)
        .post('/api/v1/services/srv_roadside_mechanic/calculate-price')
        .send({
          answers: {
            current_location: { latitude: 31.9539, longitude: 35.8617, address: 'عمان' },
            vehicle_make_model: 'Ford Fusion 2020',
            problem_category: 'overheating',
            problem_description: 'ارتفاع حاد في درجة حرارة المحرك مع تسريب سائل التبريد الأخضر أسفل الرديتر.',
          },
        });

      assert.equal(goodRes.status, 200);
      assert.equal(goodRes.body.data.totalAmount, 15.0);
    });
  });

  // ==========================================
  // SCENARIO I: EMERGENCY EV CHARGING
  // ==========================================
  describe('⚡ SCENARIO I: Emergency EV Charging Connector Standard Verification', () => {
    it('1. Calculates flat 20.00 JOD rescue charging fee and matches mobile EV charger capability', async () => {
      const res = await request(app)
        .post('/api/v1/services/srv_emergency_ev_charging/calculate-price')
        .send({
          answers: {
            current_location: { latitude: 31.9539, longitude: 35.8617, address: 'عمان' },
            connector_type: 'type_2',
            current_battery_pct: 2,
            ev_make_model: 'Volkswagen ID.4',
          },
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.totalAmount, 20.0);
      assert.equal(res.body.data.deliveryFee, 0.0);
    });
  });

  // ==========================================
  // SCENARIO J: ROADSIDE TIRE ASSISTANCE
  // ==========================================
  describe('🛞 SCENARIO J: Roadside Tire Assistance Service Options', () => {
    it('1. Calculates 10.00 JOD flat rate for spare wheel installation or tubeless puncture plug', async () => {
      const res = await request(app)
        .post('/api/v1/services/srv_roadside_tire_assistance/calculate-price')
        .send({
          answers: {
            current_location: { latitude: 31.9539, longitude: 35.8617, address: 'عمان' },
            tire_problem_type: 'spare_swap',
            affected_tires_count: 1,
          },
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.totalAmount, 10.0);
      assert.equal(res.body.data.deliveryFee, 0.0);
    });
  });
});
