import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/index.js';
import { sql } from '../../config/database.js';
import {
  providerWallets,
  walletTransactions,
  commissionRules,
  withdrawalRequests,
  providerBankAccounts,
  paymentIntents,
  paymentTransactions,
  paymentWebhookEvents,
} from '../../db/schema/finance.schema.js';
import { providers } from '../../db/schema/providers.schema.js';
import { users } from '../../db/schema/users.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { quotations } from '../../db/schema/quotations.schema.js';
import { services } from '../../db/schema/services.schema.js';
import { WalletLedgerService } from '../../services/wallet-ledger.service.js';
import { WithdrawalService } from '../../services/withdrawal.service.js';
import { generateTokens } from '../auth/utils/jwt.js';
import { eq, and } from 'drizzle-orm';

describe('💳 BTIN7AL Phase 6: Financial System, Wallet Ledger & Payment Tests', () => {
  const app = createApp();

  let adminUser: any;
  let adminToken: string;
  let providerUser: any;
  let providerToken: string;
  let testProvider: any;
  let testCustomer: any;
  let testCustomerToken: string;
  let testOrder: any;
  let bankAccountId: string;

  before(async () => {
    // 1. Fetch or create admin
    const [existingAdmin] = await db.select().from(users).where(eq(users.role, 'super_admin')).limit(1);
    if (existingAdmin) {
      adminUser = existingAdmin;
    } else {
      [adminUser] = await db
        .insert(users)
        .values({
          phoneNumber: '0799990001',
          name: 'Super Admin Finance Test',
          role: 'super_admin',
        })
        .returning();
    }
    adminToken = generateTokens(adminUser).accessToken;

    // 2. Fetch or create provider
    const [existingProvUser] = await db.select().from(users).where(eq(users.role, 'provider')).limit(1);
    if (existingProvUser) {
      providerUser = existingProvUser;
    } else {
      [providerUser] = await db
        .insert(users)
        .values({
          phoneNumber: '0799990002',
          name: 'Provider Finance Test',
          role: 'provider',
        })
        .returning();
    }
    providerToken = generateTokens(providerUser).accessToken;

    const [existingProv] = await db.select().from(providers).limit(1);
    testProvider = existingProv;

    // 3. Customer
    const [existingCust] = await db.select().from(users).where(eq(users.role, 'customer')).limit(1);
    testCustomer = existingCust;
    testCustomerToken = generateTokens(testCustomer).accessToken;

    // 4. Fetch an existing order and service from DB
    const [existingOrder] = await db.select().from(orders).limit(1);
    testOrder = existingOrder;

    const [existingService] = await db.select().from(services).limit(1);

    // 5. Provision initial wallet for testProvider with 0 balance
    await db
      .insert(providerWallets)
      .values({
        providerId: testProvider.id,
        availableBalance: '0.00',
        pendingBalance: '0.00',
        heldBalance: '0.00',
        totalEarned: '0.00',
      })
      .onConflictDoNothing();

    // Fund the provider wallet with an initial ledger credit to establish clean double-entry baseline
    await WalletLedgerService.adminManualAdjustment({
      providerId: testProvider.id,
      amount: 200.0,
      type: 'CREDIT_BONUS_INCENTIVE',
      direction: 'credit',
      reason: 'رصيد افتتاحي تجريبي للاختبارات المالية',
      actorUserId: adminUser.id,
      actorRole: 'super_admin',
    });

    // 6. Add a verified Jordanian Bank Account
    const bank = await WithdrawalService.addBankAccount({
      providerId: testProvider.id,
      bankName: 'البنك العربي',
      bankNameEn: 'Arab Bank',
      accountHolderName: 'شركة بتنحل للخدمات',
      iban: 'JO29ARAB0123456789012345678901',
      swiftCode: 'ARABJOAX',
    });
    bankAccountId = bank.id;
  });

  it('1. Enforces 0.00 JOD Delivery Fee Invariant in Financial Summaries', async () => {
    const res = await request(app)
      .get('/api/v1/admin/finance/kpi-summary')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.kpis.deliveryFeeInvariant, 0.0);
    assert.ok(typeof res.body.data.kpis.totalGmv === 'number');
  });

  it('2. Credits order earnings atomically with commission calculation', async () => {
    const grossAmount = 50.0; // 50 JOD order
    const orderId = testOrder.id;
    const idempotencyKey = `idemp_ord_${orderId}_${Date.now()}`;

    const res = await WalletLedgerService.creditOrderEarnings({
      orderId,
      providerId: testProvider.id,
      grossAmount,
      timing: 'on_service_completion',
      idempotencyKey,
    });

    assert.equal(res.alreadyProcessed, false);
    assert.ok(res.transaction);
    assert.equal(res.transaction.type, 'CREDIT_ORDER_PAYMENT');
    // Standard 10% commission on 50 JOD = 5 JOD, Net Provider = 45 JOD
    assert.equal(Number(res.transaction.amount), 45.0);
    assert.equal(res.commission.commissionAmount, 5.0);
    assert.equal(res.commission.netProviderAmount, 45.0);
  });

  it('3. Enforces idempotency on duplicate order earnings settlement', async () => {
    const orderId = testOrder.id;
    const idempotencyKey = `idemp_dup_${orderId}_${Date.now()}`;

    // First settlement
    const res1 = await WalletLedgerService.creditOrderEarnings({
      orderId,
      providerId: testProvider.id,
      grossAmount: 30.0,
      idempotencyKey,
    });
    assert.equal(res1.alreadyProcessed, false);

    // Duplicate call with exact same idempotency key
    const res2 = await WalletLedgerService.creditOrderEarnings({
      orderId,
      providerId: testProvider.id,
      grossAmount: 30.0,
      idempotencyKey,
    });
    assert.equal(res2.alreadyProcessed, true);
    assert.equal(res2.transaction.id, res1.transaction.id);
  });

  it('4. Rejects withdrawal if requested amount exceeds available balance', async () => {
    // Current available balance is <= 300 JOD, trying to withdraw 400 JOD (which is <= 5000 max limit)
    await assert.rejects(
      async () => {
        await WalletLedgerService.requestWithdrawal({
          providerId: testProvider.id,
          bankAccountId,
          amount: 1000.0,
        });
      },
      (err: any) => {
        assert.equal(err.code, 'INSUFFICIENT_FUNDS');
        return true;
      }
    );
  });

  it('5. Locks funds into held balance on valid withdrawal request', async () => {
    const wthAmount = 20.0;
    const res = await WalletLedgerService.requestWithdrawal({
      providerId: testProvider.id,
      bankAccountId,
      amount: wthAmount,
      idempotencyKey: `wth_test_${Date.now()}`,
    });

    assert.ok(res.withdrawal);
    assert.equal(res.withdrawal.status, 'requested');
    assert.equal(Number(res.withdrawal.amount), wthAmount);
    assert.equal(res.transaction.type, 'DEBIT_WITHDRAWAL_REQUEST');
  });

  it('6. Rejection of withdrawal unlocks held balance and records CREDIT_WITHDRAWAL_REVERSAL', async () => {
    // 1. Create a withdrawal to reject
    const wthAmount = 15.0;
    const req = await WalletLedgerService.requestWithdrawal({
      providerId: testProvider.id,
      bankAccountId,
      amount: wthAmount,
      idempotencyKey: `wth_reject_test_${Date.now()}`,
    });

    // 2. Reject it
    const rej = await WalletLedgerService.rejectWithdrawal({
      withdrawalId: req.withdrawal.id,
      rejectionReason: 'عدم تطابق اسم صاحب الحساب مع السجل التجاري',
      actorUserId: adminUser.id,
    });

    assert.equal(rej.withdrawal.status, 'rejected');
    assert.equal(rej.transaction.type, 'CREDIT_WITHDRAWAL_REVERSAL');
    assert.equal(Number(rej.transaction.amount), wthAmount);
  });

  it('7. Settlement of withdrawal records DEBIT_WITHDRAWAL_SETTLEMENT and increments totalWithdrawn', async () => {
    // 1. Create a withdrawal to settle
    const wthAmount = 10.0;
    const req = await WalletLedgerService.requestWithdrawal({
      providerId: testProvider.id,
      bankAccountId,
      amount: wthAmount,
      idempotencyKey: `wth_settle_test_${Date.now()}`,
    });

    // 2. Settle with transaction reference
    const set = await WalletLedgerService.settleWithdrawal({
      withdrawalId: req.withdrawal.id,
      transactionReference: 'CLIQPAY-987654321',
      actorUserId: adminUser.id,
    });

    assert.equal(set.withdrawal.status, 'paid');
    assert.equal(set.transaction.type, 'DEBIT_WITHDRAWAL_SETTLEMENT');
    assert.equal(Number(set.transaction.amount), wthAmount);
  });

  it('8. Concurrency Protection: Prevents race conditions during concurrent withdrawal attempts', async () => {
    // Query current available balance
    const [wallet] = await db
      .select()
      .from(providerWallets)
      .where(eq(providerWallets.providerId, testProvider.id));

    const currentAvailable = Number(wallet.availableBalance);
    if (currentAvailable >= 10) {
      const amountToTry = currentAvailable;

      const attempts = await Promise.allSettled([
        WalletLedgerService.requestWithdrawal({
          providerId: testProvider.id,
          bankAccountId,
          amount: amountToTry,
          idempotencyKey: `race_1_${Date.now()}`,
        }),
        WalletLedgerService.requestWithdrawal({
          providerId: testProvider.id,
          bankAccountId,
          amount: amountToTry,
          idempotencyKey: `race_2_${Date.now()}`,
        }),
      ]);

      const successful = attempts.filter((a) => a.status === 'fulfilled');
      const rejected = attempts.filter((a) => a.status === 'rejected');

      // Exactly one should succeed and one should fail with INSUFFICIENT_FUNDS
      assert.equal(successful.length, 1, 'Exactly one concurrent withdrawal should succeed');
      assert.equal(rejected.length, 1, 'The duplicate/overdraft concurrent withdrawal must be rejected');
    }
  });

  it('9. Processes on-site quotation payment and itemized earnings', async () => {
    const [testService] = await db.select().from(services).limit(1);
    const quotId = `QT-TEST-${Date.now().toString().slice(-4)}`;
    const [quot] = await db
      .insert(quotations)
      .values({
        id: quotId,
        orderId: testOrder.id,
        serviceId: testService.id,
        providerId: testProvider.id,
        laborAmount: '20.00',
        materialsAmount: '30.00',
        sparePartsAmount: '10.00',
        subtotal: '60.00',
        deliveryFee: '0.00',
        totalAmount: '60.00',
        status: 'sent',
      })
      .returning();

    const res = await WalletLedgerService.creditQuotationEarnings({
      quotationId: quot.id,
      orderId: testOrder.id,
      providerId: testProvider.id,
      serviceId: testService.id,
      grossAmount: 60.0,
      idempotencyKey: `quot_pay_${quot.id}`,
    });

    assert.ok(res.transaction);
    const refType = res.transaction.referenceType || res.transaction.reference_type;
    const refId = res.transaction.referenceId || res.transaction.reference_id;
    assert.equal(refType, 'quotation');
    assert.equal(refId, quot.id);
  });

  it('10. Super Admin Manual Wallet Adjustment records audit trail', async () => {
    const res = await WalletLedgerService.adminManualAdjustment({
      providerId: testProvider.id,
      amount: 25.0,
      type: 'CREDIT_BONUS_INCENTIVE',
      direction: 'credit',
      reason: 'مكافأة تميز في سرعة الاستجابة وجودة الخدمة',
      actorUserId: adminUser.id,
      actorRole: 'super_admin',
    });

    assert.ok(res.transaction);
    assert.equal(res.transaction.type, 'CREDIT_BONUS_INCENTIVE');
    assert.equal(Number(res.transaction.amount), 25.0);
  });

  it('11. Automated System-Wide Financial Reconciliation runs with 0 discrepancies', async () => {
    const res = await WalletLedgerService.runSystemWideReconciliation(adminUser.id);

    assert.equal(res.status, 'completed');
    assert.equal(res.totalDiscrepancies, 0);
    assert.ok(res.totalWallets > 0);
    assert.ok(res.totalTransactions > 0);
  });

  it('12. Payment Provider Sandbox Adapter creates and confirms payment intent idempotently', async () => {
    // 1. Create Payment Intent via API
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${testCustomerToken}`)
      .send({
        orderId: testOrder.id,
        amount: 25.0,
        paymentMethod: 'card',
        idempotencyKey: `pi_test_${Date.now()}`,
      });

    assert.equal(intentRes.status, 201);
    assert.equal(intentRes.body.success, true);
    const intent = intentRes.body.data.intent;
    assert.equal(Number(intent.amount), 25.0);
    assert.equal(intent.status, 'requires_confirmation');

    // 2. Confirm Payment via API
    const confirmRes = await request(app)
      .post('/api/v1/payments/confirm')
      .set('Authorization', `Bearer ${testCustomerToken}`)
      .send({
        paymentIntentId: intent.id,
        paymentMethodDetails: { cardBrand: 'Mastercard', last4: '5555' },
      });

    assert.equal(confirmRes.status, 200);
    assert.equal(confirmRes.body.success, true);
    assert.equal(confirmRes.body.data.intent.status, 'succeeded');
    assert.equal(confirmRes.body.data.transaction.status, 'captured');
  });

  it('13. Payment Webhook Event handles duplicate deliveries idempotently', async () => {
    const eventId = `evt_test_${Date.now()}`;

    // 1. First webhook delivery
    const res1 = await request(app)
      .post('/api/v1/payments/webhook')
      .send({
        eventId,
        eventType: 'payment.captured',
        orderId: testOrder.id,
        amount: 20.0,
      });

    assert.equal(res1.status, 200);
    assert.equal(res1.body.alreadyProcessed, false);

    // 2. Duplicate webhook delivery
    const res2 = await request(app)
      .post('/api/v1/payments/webhook')
      .send({
        eventId,
        eventType: 'payment.captured',
        orderId: testOrder.id,
        amount: 20.0,
      });

    assert.equal(res2.status, 200);
    assert.equal(res2.body.alreadyProcessed, true);
  });
});
