import { db } from '../db/index.js';
import { sql as rawSql } from '../config/database.js';
import {
  providerWallets,
  walletTransactions,
  commissionCalculations,
  withdrawalRequests,
  providerBankAccounts,
  financialReconciliationRuns,
  financialReconciliationItems,
} from '../db/schema/finance.schema.js';
import { orders } from '../db/schema/orders.schema.js';
import { quotations } from '../db/schema/quotations.schema.js';
import { providers } from '../db/schema/providers.schema.js';
import { auditService } from './audit.service.js';
import { CommissionEngine, CommissionCalculationResult } from './commission.engine.js';
import { eq, and, or, inArray, sql, desc } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';

export interface CreditOrderEarningsParams {
  orderId: string;
  providerId: string;
  grossAmount: number;
  serviceId?: string;
  categoryId?: string;
  timing?: 'on_order_acceptance' | 'on_service_start' | 'on_service_completion' | 'on_payment_capture';
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface CreditQuotationEarningsParams {
  quotationId: string;
  orderId: string;
  providerId: string;
  serviceId: string;
  grossAmount: number;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface RequestWithdrawalParams {
  providerId: string;
  bankAccountId: string;
  amount: number;
  idempotencyKey?: string;
}

export interface SettleWithdrawalParams {
  withdrawalId: string;
  transactionReference: string;
  actorUserId?: string;
  notes?: string;
}

export interface RejectWithdrawalParams {
  withdrawalId: string;
  rejectionReason: string;
  actorUserId?: string;
}

export interface DebitRefundParams {
  refundId: string;
  orderId: string;
  providerId: string;
  refundAmount: number;
  isFullReversal?: boolean;
  idempotencyKey?: string;
  actorUserId?: string;
  reason?: string;
}

export interface ManualAdjustmentParams {
  providerId: string;
  amount: number;
  type: 'CREDIT_BONUS_INCENTIVE' | 'DEBIT_PENALTY_ADJUSTMENT' | 'MANUAL_ADMIN_ADJUSTMENT';
  direction: 'credit' | 'debit';
  reason: string;
  actorUserId: string;
  actorRole: string;
  referenceId?: string;
}

export class WalletLedgerService {
  /**
   * Generates a unique transaction number (e.g. WTX-1727712345678-ABCD)
   */
  private static generateTxNumber(prefix: string = 'WTX'): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Retrieves or creates a provider wallet with row lock (SELECT FOR UPDATE)
   */
  private static async getOrCreateWalletForUpdate(providerId: string, txClient: any = rawSql) {
    const existing = await txClient`
      SELECT * FROM provider_wallets 
      WHERE provider_id = ${providerId}
      FOR UPDATE
    `;

    if (existing.length > 0) {
      return existing[0];
    }

    // Insert wallet if not already created
    const inserted = await txClient`
      INSERT INTO provider_wallets (provider_id, available_balance, pending_balance, held_balance, total_earned, created_at, updated_at)
      VALUES (${providerId}, 0.00, 0.00, 0.00, 0.00, NOW(), NOW())
      ON CONFLICT (provider_id) DO UPDATE SET updated_at = NOW()
      RETURNING *
    `;
    return inserted[0];
  }

  /**
   * Retrieves provider wallet summary directly
   */
  public static async getProviderWallet(providerId: string) {
    let [wallet] = await db
      .select()
      .from(providerWallets)
      .where(eq(providerWallets.providerId, providerId))
      .limit(1);

    if (!wallet) {
      const [inserted] = await db
        .insert(providerWallets)
        .values({
          providerId,
          availableBalance: '0.00',
          pendingBalance: '0.00',
          heldBalance: '0.00',
          totalEarned: '0.00',
        })
        .onConflictDoNothing()
        .returning();
      return inserted || (await db.select().from(providerWallets).where(eq(providerWallets.providerId, providerId)).limit(1))[0];
    }
    return wallet;
  }

  /**
   * Credits order earnings to provider wallet and deducts platform commission atomically
   */
  public static async creditOrderEarnings(params: CreditOrderEarningsParams) {
    const idempotencyKey = params.idempotencyKey || `order_settle_${params.orderId}_${params.providerId}`;

    // Check idempotency first
    const existingTx = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingTx.length > 0) {
      return {
        alreadyProcessed: true,
        transaction: existingTx[0],
      };
    }

    // Calculate commission
    const commissionResult: CommissionCalculationResult = await CommissionEngine.calculateCommission({
      providerId: params.providerId,
      serviceId: params.serviceId,
      categoryId: params.categoryId,
      grossAmount: params.grossAmount,
      timing: params.timing,
    });

    const netAmount = commissionResult.netProviderAmount;
    const commissionAmount = commissionResult.commissionAmount;
    const gross = commissionResult.grossAmount;
    const isPending = commissionResult.timing === 'on_order_acceptance' || commissionResult.timing === 'on_service_start';

    return await rawSql.begin(async (sqlClient) => {
      // 1. Lock wallet row
      const wallet = await this.getOrCreateWalletForUpdate(params.providerId, sqlClient);

      if (wallet.status === 'locked' || wallet.status === 'suspended') {
        throw new AppError(`محفظة المزود مقفلة أو معلقة حالياً (${wallet.status})`, 400, 'WALLET_LOCKED');
      }

      const balanceBefore = Number(wallet.available_balance);
      const pendingBefore = Number(wallet.pending_balance);
      const heldBefore = Number(wallet.held_balance);

      const balanceAfter = isPending ? balanceBefore : Number((balanceBefore + netAmount).toFixed(2));
      const pendingAfter = isPending ? Number((pendingBefore + netAmount).toFixed(2)) : pendingBefore;
      const totalEarnedAfter = Number((Number(wallet.total_earned) + netAmount).toFixed(2));
      const totalCommissionAfter = Number((Number(wallet.total_commission) + commissionAmount).toFixed(2));

      // 2. Update wallet projection
      await sqlClient`
        UPDATE provider_wallets
        SET 
          available_balance = ${balanceAfter},
          pending_balance = ${pendingAfter},
          total_earned = ${totalEarnedAfter},
          total_commission = ${totalCommissionAfter},
          updated_at = NOW()
        WHERE id = ${wallet.id}
      `;

      // 3. Record commission snapshot
      await sqlClient`
        INSERT INTO commission_calculations (
          order_id, provider_id, rule_id, rule_snapshot, gross_amount,
          commission_amount, net_provider_amount, timing, status, created_at
        ) VALUES (
          ${params.orderId}, ${params.providerId}, ${commissionResult.ruleId},
          ${JSON.stringify(commissionResult.ruleSnapshot)}::jsonb, ${gross},
          ${commissionAmount}, ${netAmount}, ${commissionResult.timing}, 'settled', NOW()
        )
      `;

      // 4. Create immutable wallet ledger transaction
      const txNumber = this.generateTxNumber('ORD');
      const descAr = `أرباح تنفيذ الطلب (${params.orderId}) - المبلغ الإجمالي: ${gross} د.أ (العمولة: ${commissionAmount} د.أ)`;
      const descEn = `Earnings for order (${params.orderId}) - Gross: ${gross} JOD (Commission: ${commissionAmount} JOD)`;

      const [txRecord] = await sqlClient`
        INSERT INTO wallet_transactions (
          wallet_id, provider_id, transaction_number, type, direction,
          amount, balance_before, balance_after, pending_before, pending_after,
          held_before, held_after, reference_type, reference_id, idempotency_key,
          description_ar, description_en, metadata, created_at
        ) VALUES (
          ${wallet.id}, ${params.providerId}, ${txNumber}, 'CREDIT_ORDER_PAYMENT', 'credit',
          ${netAmount}, ${balanceBefore}, ${balanceAfter}, ${pendingBefore}, ${pendingAfter},
          ${heldBefore}, ${heldBefore}, 'order', ${params.orderId}, ${idempotencyKey},
          ${descAr}, ${descEn}, ${JSON.stringify({
            orderId: params.orderId,
            grossAmount: gross,
            commissionAmount,
            netAmount,
            explanation: commissionResult.calculationExplanation,
            ...params.metadata,
          })}::jsonb, NOW()
        )
        RETURNING *
      `;

      return {
        alreadyProcessed: false,
        transaction: txRecord,
        commission: commissionResult,
        wallet: {
          availableBalance: balanceAfter,
          pendingBalance: pendingAfter,
          totalEarned: totalEarnedAfter,
        },
      };
    });
  }

  /**
   * Credits on-site approved quotation payments (Phase 4 quotation itemized labor & spare parts)
   */
  public static async creditQuotationEarnings(params: CreditQuotationEarningsParams) {
    const idempotencyKey = params.idempotencyKey || `quotation_settle_${params.quotationId}`;

    // Check idempotency
    const existingTx = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingTx.length > 0) {
      return { alreadyProcessed: true, transaction: existingTx[0] };
    }

    const commissionResult = await CommissionEngine.calculateCommission({
      providerId: params.providerId,
      serviceId: params.serviceId,
      grossAmount: params.grossAmount,
      timing: 'on_payment_capture',
    });

    const netAmount = commissionResult.netProviderAmount;
    const commissionAmount = commissionResult.commissionAmount;
    const gross = commissionResult.grossAmount;

    return await rawSql.begin(async (sqlClient) => {
      const wallet = await this.getOrCreateWalletForUpdate(params.providerId, sqlClient);

      const balanceBefore = Number(wallet.available_balance);
      const heldBefore = Number(wallet.held_balance);
      const pendingBefore = Number(wallet.pending_balance);

      const balanceAfter = Number((balanceBefore + netAmount).toFixed(2));
      const totalEarnedAfter = Number((Number(wallet.total_earned) + netAmount).toFixed(2));
      const totalCommissionAfter = Number((Number(wallet.total_commission) + commissionAmount).toFixed(2));

      await sqlClient`
        UPDATE provider_wallets
        SET 
          available_balance = ${balanceAfter},
          total_earned = ${totalEarnedAfter},
          total_commission = ${totalCommissionAfter},
          updated_at = NOW()
        WHERE id = ${wallet.id}
      `;

      await sqlClient`
        INSERT INTO commission_calculations (
          quotation_id, order_id, provider_id, rule_id, rule_snapshot, gross_amount,
          commission_amount, net_provider_amount, timing, status, created_at
        ) VALUES (
          ${params.quotationId}, ${params.orderId}, ${params.providerId}, ${commissionResult.ruleId},
          ${JSON.stringify(commissionResult.ruleSnapshot)}::jsonb, ${gross},
          ${commissionAmount}, ${netAmount}, 'on_payment_capture', 'settled', NOW()
        )
      `;

      const txNumber = this.generateTxNumber('QUOT');
      const descAr = `أرباح عرض السعر الإضافي (${params.quotationId}) للطلب (${params.orderId}) - الصافي: ${netAmount} د.أ`;
      const descEn = `Earnings for quotation (${params.quotationId}) on order (${params.orderId}) - Net: ${netAmount} JOD`;

      const [txRecord] = await sqlClient`
        INSERT INTO wallet_transactions (
          wallet_id, provider_id, transaction_number, type, direction,
          amount, balance_before, balance_after, pending_before, pending_after,
          held_before, held_after, reference_type, reference_id, idempotency_key,
          description_ar, description_en, metadata, created_at
        ) VALUES (
          ${wallet.id}, ${params.providerId}, ${txNumber}, 'CREDIT_ORDER_PAYMENT', 'credit',
          ${netAmount}, ${balanceBefore}, ${balanceAfter}, ${pendingBefore}, ${pendingBefore},
          ${heldBefore}, ${heldBefore}, 'quotation', ${params.quotationId}, ${idempotencyKey},
          ${descAr}, ${descEn}, ${JSON.stringify({
            quotationId: params.quotationId,
            orderId: params.orderId,
            grossAmount: gross,
            commissionAmount,
            netAmount,
            ...params.metadata,
          })}::jsonb, NOW()
        )
        RETURNING *
      `;

      return {
        alreadyProcessed: false,
        transaction: txRecord,
        commission: commissionResult,
      };
    });
  }

  /**
   * Requests withdrawal: locks requested amount into heldBalance
   */
  public static async requestWithdrawal(params: RequestWithdrawalParams) {
    const amount = Number(Number(params.amount).toFixed(2));
    if (amount <= 0) {
      throw new AppError('مبلغ السحب يجب أن يكون أكبر من 0 د.أ', 400, 'INVALID_AMOUNT');
    }

    if (amount < 10.0) {
      throw new AppError('الحد الأدنى للسحب هو 10.00 د.أ', 400, 'MIN_WITHDRAWAL_LIMIT');
    }

    if (amount > 5000.0) {
      throw new AppError('الحد الأقصى للسحب في المرة الواحدة هو 5,000.00 د.أ', 400, 'MAX_WITHDRAWAL_LIMIT');
    }

    const idempotencyKey = params.idempotencyKey || `wth_${params.providerId}_${amount}_${Date.now()}`;

    // Verify bank account belongs to provider
    const [bankAccount] = await db
      .select()
      .from(providerBankAccounts)
      .where(and(eq(providerBankAccounts.id, params.bankAccountId), eq(providerBankAccounts.providerId, params.providerId)))
      .limit(1);

    if (!bankAccount) {
      throw new AppError('الحساب البنكي المحدد غير موجود أو غير مرتبط بهذا المتجر', 404, 'BANK_ACCOUNT_NOT_FOUND');
    }

    return await rawSql.begin(async (sqlClient) => {
      const wallet = await this.getOrCreateWalletForUpdate(params.providerId, sqlClient);

      if (wallet.status !== 'active') {
        throw new AppError(`لا يمكن طلب السحب لأن حالة المحفظة: ${wallet.status}`, 400, 'WALLET_INACTIVE');
      }

      const available = Number(wallet.available_balance);
      if (available < amount) {
        throw new AppError(
          `الرصيد المتاح (${available.toFixed(2)} د.أ) غير كافٍ لسحب ${amount.toFixed(2)} د.أ`,
          400,
          'INSUFFICIENT_FUNDS'
        );
      }

      const balanceBefore = available;
      const heldBefore = Number(wallet.held_balance);
      const pendingBefore = Number(wallet.pending_balance);

      const balanceAfter = Number((balanceBefore - amount).toFixed(2));
      const heldAfter = Number((heldBefore + amount).toFixed(2));

      // Lock funds into held balance
      await sqlClient`
        UPDATE provider_wallets
        SET 
          available_balance = ${balanceAfter},
          held_balance = ${heldAfter},
          updated_at = NOW()
        WHERE id = ${wallet.id}
      `;

      // Create withdrawal request
      const wthNumber = `WTH-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      const [withdrawal] = await sqlClient`
        INSERT INTO withdrawal_requests (
          withdrawal_number, provider_id, bank_account_id, amount, fee_amount,
          net_payout_amount, currency, status, idempotency_key, requested_at, created_at, updated_at
        ) VALUES (
          ${wthNumber}, ${params.providerId}, ${params.bankAccountId}, ${amount}, 0.00,
          ${amount}, 'JOD', 'requested', ${idempotencyKey}, NOW(), NOW(), NOW()
        )
        RETURNING *
      `;

      // Create double-entry ledger record
      const txNumber = this.generateTxNumber('WTH_REQ');
      const descAr = `طلب سحب رصيد (${wthNumber}) بقيمة ${amount} د.أ إلى الحساب (${bankAccount.maskedIban})`;
      const descEn = `Withdrawal request (${wthNumber}) for ${amount} JOD to account (${bankAccount.maskedIban})`;

      const [txRecord] = await sqlClient`
        INSERT INTO wallet_transactions (
          wallet_id, provider_id, transaction_number, type, direction,
          amount, balance_before, balance_after, pending_before, pending_after,
          held_before, held_after, reference_type, reference_id, idempotency_key,
          description_ar, description_en, metadata, created_at
        ) VALUES (
          ${wallet.id}, ${params.providerId}, ${txNumber}, 'DEBIT_WITHDRAWAL_REQUEST', 'debit',
          ${amount}, ${balanceBefore}, ${balanceAfter}, ${pendingBefore}, ${pendingBefore},
          ${heldBefore}, ${heldAfter}, 'withdrawal', ${withdrawal.id}, ${idempotencyKey},
          ${descAr}, ${descEn}, ${JSON.stringify({
            withdrawalId: withdrawal.id,
            withdrawalNumber: wthNumber,
            bankAccountId: params.bankAccountId,
            maskedIban: bankAccount.maskedIban,
            bankName: bankAccount.bankName,
          })}::jsonb, NOW()
        )
        RETURNING *
      `;

      return {
        withdrawal,
        transaction: txRecord,
        wallet: {
          availableBalance: balanceAfter,
          heldBalance: heldAfter,
        },
      };
    });
  }

  /**
   * Settles approved withdrawal (Admin disburses payout via bank transfer / gateway)
   */
  public static async settleWithdrawal(params: SettleWithdrawalParams) {
    return await rawSql.begin(async (sqlClient) => {
      const [wth] = await sqlClient`
        SELECT * FROM withdrawal_requests
        WHERE id = ${params.withdrawalId}
        FOR UPDATE
      `;

      if (!wth) {
        throw new AppError('طلب السحب غير موجود', 404, 'WITHDRAWAL_NOT_FOUND');
      }

      if (wth.status === 'paid') {
        throw new AppError('طلب السحب مدفوع ومكتمل مسبقاً', 400, 'ALREADY_PAID');
      }

      if (wth.status === 'rejected' || wth.status === 'cancelled') {
        throw new AppError(`لا يمكن تنفيذ سحب ملغي أو مرفوض (${wth.status})`, 400, 'INVALID_STATE');
      }

      const amount = Number(wth.amount);
      const wallet = await this.getOrCreateWalletForUpdate(wth.provider_id, sqlClient);

      const balanceBefore = Number(wallet.available_balance);
      const heldBefore = Number(wallet.held_balance);
      const pendingBefore = Number(wallet.pending_balance);

      const heldAfter = Number(Math.max(0, heldBefore - amount).toFixed(2));
      const totalWithdrawnAfter = Number((Number(wallet.total_withdrawn) + amount).toFixed(2));

      // Update wallet held balance and total withdrawn
      await sqlClient`
        UPDATE provider_wallets
        SET 
          held_balance = ${heldAfter},
          total_withdrawn = ${totalWithdrawnAfter},
          updated_at = NOW()
        WHERE id = ${wallet.id}
      `;

      // Update withdrawal request state to paid
      const [updatedWth] = await sqlClient`
        UPDATE withdrawal_requests
        SET 
          status = 'paid',
          paid_at = NOW(),
          processed_at = NOW(),
          processed_by_user_id = ${params.actorUserId || null},
          transaction_reference = ${params.transactionReference},
          notes = ${params.notes || wth.notes},
          updated_at = NOW()
        WHERE id = ${params.withdrawalId}
        RETURNING *
      `;

      // Create ledger settlement transaction
      const txNumber = this.generateTxNumber('WTH_SETTLE');
      const descAr = `اكتمال تحويل السحب (${wth.withdrawal_number}) - الرقم المرجعي للتحويل: ${params.transactionReference}`;
      const descEn = `Withdrawal payout settled (${wth.withdrawal_number}) - Ref: ${params.transactionReference}`;

      const [txRecord] = await sqlClient`
        INSERT INTO wallet_transactions (
          wallet_id, provider_id, transaction_number, type, direction,
          amount, balance_before, balance_after, pending_before, pending_after,
          held_before, held_after, reference_type, reference_id, idempotency_key,
          description_ar, description_en, metadata, created_at
        ) VALUES (
          ${wallet.id}, ${wth.provider_id}, ${txNumber}, 'DEBIT_WITHDRAWAL_SETTLEMENT', 'debit',
          ${amount}, ${balanceBefore}, ${balanceBefore}, ${pendingBefore}, ${pendingBefore},
          ${heldBefore}, ${heldAfter}, 'withdrawal', ${params.withdrawalId},
          ${`settle_${params.withdrawalId}`},
          ${descAr}, ${descEn}, ${JSON.stringify({
            withdrawalId: params.withdrawalId,
            transactionReference: params.transactionReference,
            actorUserId: params.actorUserId,
          })}::jsonb, NOW()
        )
        RETURNING *
      `;

      return {
        withdrawal: updatedWth,
        transaction: txRecord,
      };
    });
  }

  /**
   * Rejects withdrawal: unlocks held balance back to available balance
   */
  public static async rejectWithdrawal(params: RejectWithdrawalParams) {
    return await rawSql.begin(async (sqlClient) => {
      const [wth] = await sqlClient`
        SELECT * FROM withdrawal_requests
        WHERE id = ${params.withdrawalId}
        FOR UPDATE
      `;

      if (!wth) {
        throw new AppError('طلب السحب غير موجود', 404, 'WITHDRAWAL_NOT_FOUND');
      }

      if (wth.status === 'paid') {
        throw new AppError('لا يمكن رفض طلب سحب تم صرفه مسبقاً', 400, 'ALREADY_PAID');
      }

      if (wth.status === 'rejected') {
        throw new AppError('تم رفض هذا السحب مسبقاً', 400, 'ALREADY_REJECTED');
      }

      const amount = Number(wth.amount);
      const wallet = await this.getOrCreateWalletForUpdate(wth.provider_id, sqlClient);

      const balanceBefore = Number(wallet.available_balance);
      const heldBefore = Number(wallet.held_balance);
      const pendingBefore = Number(wallet.pending_balance);

      const heldAfter = Number(Math.max(0, heldBefore - amount).toFixed(2));
      const balanceAfter = Number((balanceBefore + amount).toFixed(2));

      // Return funds from held back to available balance
      await sqlClient`
        UPDATE provider_wallets
        SET 
          available_balance = ${balanceAfter},
          held_balance = ${heldAfter},
          updated_at = NOW()
        WHERE id = ${wallet.id}
      `;

      // Update withdrawal request
      const [updatedWth] = await sqlClient`
        UPDATE withdrawal_requests
        SET 
          status = 'rejected',
          rejection_reason = ${params.rejectionReason},
          reviewed_at = NOW(),
          reviewed_by_user_id = ${params.actorUserId || null},
          updated_at = NOW()
        WHERE id = ${params.withdrawalId}
        RETURNING *
      `;

      // Create ledger reversal transaction
      const txNumber = this.generateTxNumber('WTH_REV');
      const descAr = `إلغاء ورفض طلب السحب (${wth.withdrawal_number}) وإعادة ${amount} د.أ إلى الرصيد المتاح. السبب: ${params.rejectionReason}`;
      const descEn = `Withdrawal (${wth.withdrawal_number}) rejected and ${amount} JOD refunded to available balance. Reason: ${params.rejectionReason}`;

      const [txRecord] = await sqlClient`
        INSERT INTO wallet_transactions (
          wallet_id, provider_id, transaction_number, type, direction,
          amount, balance_before, balance_after, pending_before, pending_after,
          held_before, held_after, reference_type, reference_id, idempotency_key,
          description_ar, description_en, metadata, created_at
        ) VALUES (
          ${wallet.id}, ${wth.provider_id}, ${txNumber}, 'CREDIT_WITHDRAWAL_REVERSAL', 'credit',
          ${amount}, ${balanceBefore}, ${balanceAfter}, ${pendingBefore}, ${pendingBefore},
          ${heldBefore}, ${heldAfter}, 'withdrawal', ${params.withdrawalId},
          ${`reject_${params.withdrawalId}`},
          ${descAr}, ${descEn}, ${JSON.stringify({
            withdrawalId: params.withdrawalId,
            rejectionReason: params.rejectionReason,
            actorUserId: params.actorUserId,
          })}::jsonb, NOW()
        )
        RETURNING *
      `;

      return {
        withdrawal: updatedWth,
        transaction: txRecord,
      };
    });
  }

  /**
   * Synchronizes refund with provider wallet and commission adjustment
   */
  public static async debitRefundAdjustment(params: DebitRefundParams) {
    const idempotencyKey = params.idempotencyKey || `refund_debit_${params.refundId}`;

    const existingTx = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingTx.length > 0) {
      return { alreadyProcessed: true, transaction: existingTx[0] };
    }

    return await rawSql.begin(async (sqlClient) => {
      const wallet = await this.getOrCreateWalletForUpdate(params.providerId, sqlClient);
      const refundAmount = Number(Number(params.refundAmount).toFixed(2));

      const balanceBefore = Number(wallet.available_balance);
      const heldBefore = Number(wallet.held_balance);
      const pendingBefore = Number(wallet.pending_balance);
      const liabilityBefore = Number(wallet.liability_balance);

      let balanceAfter = balanceBefore - refundAmount;
      let liabilityAfter = liabilityBefore;

      if (balanceAfter < 0) {
        liabilityAfter = Number((liabilityBefore + Math.abs(balanceAfter)).toFixed(2));
        balanceAfter = 0.0;
      } else {
        balanceAfter = Number(balanceAfter.toFixed(2));
      }

      const totalRefundedAfter = Number((Number(wallet.total_refunded) + refundAmount).toFixed(2));

      await sqlClient`
        UPDATE provider_wallets
        SET 
          available_balance = ${balanceAfter},
          liability_balance = ${liabilityAfter},
          total_refunded = ${totalRefundedAfter},
          updated_at = NOW()
        WHERE id = ${wallet.id}
      `;

      const txNumber = this.generateTxNumber('REF_DEBIT');
      const descAr = `خصم استرجاع للعميل (${params.refundId}) للطلب (${params.orderId}) بمبلغ ${refundAmount} د.أ`;
      const descEn = `Customer refund adjustment (${params.refundId}) on order (${params.orderId}) for ${refundAmount} JOD`;

      const [txRecord] = await sqlClient`
        INSERT INTO wallet_transactions (
          wallet_id, provider_id, transaction_number, type, direction,
          amount, balance_before, balance_after, pending_before, pending_after,
          held_before, held_after, reference_type, reference_id, idempotency_key,
          description_ar, description_en, metadata, created_at
        ) VALUES (
          ${wallet.id}, ${params.providerId}, ${txNumber}, 'DEBIT_REFUND', 'debit',
          ${refundAmount}, ${balanceBefore}, ${balanceAfter}, ${pendingBefore}, ${pendingBefore},
          ${heldBefore}, ${heldBefore}, 'refund', ${params.refundId}, ${idempotencyKey},
          ${descAr}, ${descEn}, ${JSON.stringify({
            refundId: params.refundId,
            orderId: params.orderId,
            refundAmount,
            isFullReversal: params.isFullReversal,
            actorUserId: params.actorUserId,
            reason: params.reason,
          })}::jsonb, NOW()
        )
        RETURNING *
      `;

      return {
        alreadyProcessed: false,
        transaction: txRecord,
        wallet: {
          availableBalance: balanceAfter,
          liabilityBalance: liabilityAfter,
          totalRefunded: totalRefundedAfter,
        },
      };
    });
  }

  /**
   * Super Admin Manual Wallet Adjustment (Bonus, Penalty, Correction)
   */
  public static async adminManualAdjustment(params: ManualAdjustmentParams) {
    const amount = Number(Number(params.amount).toFixed(2));
    if (amount <= 0) {
      throw new AppError('قيمة التعديل يجب أن تكون أكبر من 0 د.أ', 400, 'INVALID_AMOUNT');
    }

    if (!params.reason || params.reason.trim().length < 5) {
      throw new AppError('يرجى توضيح سبب التعديل المالي بالتفصيل', 400, 'REASON_REQUIRED');
    }

    return await rawSql.begin(async (sqlClient) => {
      const wallet = await this.getOrCreateWalletForUpdate(params.providerId, sqlClient);

      const balanceBefore = Number(wallet.available_balance);
      const heldBefore = Number(wallet.held_balance);
      const pendingBefore = Number(wallet.pending_balance);

      let balanceAfter = balanceBefore;
      if (params.direction === 'credit') {
        balanceAfter = Number((balanceBefore + amount).toFixed(2));
      } else {
        if (balanceBefore < amount) {
          throw new AppError(
            `الرصيد المتاح (${balanceBefore} د.أ) أقل من قيمة الخصم (${amount} د.أ)`,
            400,
            'INSUFFICIENT_BALANCE'
          );
        }
        balanceAfter = Number((balanceBefore - amount).toFixed(2));
      }

      await sqlClient`
        UPDATE provider_wallets
        SET 
          available_balance = ${balanceAfter},
          updated_at = NOW()
        WHERE id = ${wallet.id}
      `;

      const txNumber = this.generateTxNumber('MANUAL');
      const actionTypeLabelAr =
        params.type === 'CREDIT_BONUS_INCENTIVE'
          ? 'مكافأة تشجيعية'
          : params.type === 'DEBIT_PENALTY_ADJUSTMENT'
          ? 'خصم جزائي'
          : 'تعديل إداري';

      const descAr = `${actionTypeLabelAr} بمبلغ ${amount} د.أ. السبب: ${params.reason}`;
      const descEn = `Manual admin adjustment (${params.type}) for ${amount} JOD. Reason: ${params.reason}`;

      const [txRecord] = await sqlClient`
        INSERT INTO wallet_transactions (
          wallet_id, provider_id, transaction_number, type, direction,
          amount, balance_before, balance_after, pending_before, pending_after,
          held_before, held_after, reference_type, reference_id, idempotency_key,
          description_ar, description_en, metadata, created_at
        ) VALUES (
          ${wallet.id}, ${params.providerId}, ${txNumber}, ${params.type}, ${params.direction},
          ${amount}, ${balanceBefore}, ${balanceAfter}, ${pendingBefore}, ${pendingBefore},
          ${heldBefore}, ${heldBefore}, 'manual_adjustment', ${params.referenceId || txNumber},
          ${`admin_adj_${txNumber}`},
          ${descAr}, ${descEn}, ${JSON.stringify({
            actorUserId: params.actorUserId,
            actorRole: params.actorRole,
            reason: params.reason,
            type: params.type,
          })}::jsonb, NOW()
        )
        RETURNING *
      `;

      // Log to central audit trail
      await auditService.log({
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        action: 'FINANCIAL_MANUAL_ADJUSTMENT',
        entityType: 'provider_wallet',
        entityId: params.providerId,
        metadata: {
          amount,
          direction: params.direction,
          type: params.type,
          reason: params.reason,
          balanceBefore,
          balanceAfter,
          txNumber,
        },
      });

      return {
        transaction: txRecord,
        wallet: {
          availableBalance: balanceAfter,
        },
      };
    });
  }

  /**
   * Reconciles a single provider's wallet balance against the immutable ledger
   */
  public static async reconcileProviderWallet(providerId: string) {
    const [wallet] = await db
      .select()
      .from(providerWallets)
      .where(eq(providerWallets.providerId, providerId))
      .limit(1);

    if (!wallet) {
      return { found: false, providerId, isConsistent: true, variance: 0 };
    }

    const txRows = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.providerId, providerId));

    let totalCredits = 0;
    let totalDebits = 0;

    let availableCredits = 0;
    let availableDebits = 0;

    for (const tx of txRows) {
      const amt = Number(tx.amount);
      if (tx.type === 'DEBIT_WITHDRAWAL_SETTLEMENT') {
        // Settlement clears held balance without further delta to available balance
        continue;
      }
      if (tx.direction === 'credit') {
        availableCredits += amt;
      } else {
        availableDebits += amt;
      }
    }

    const calculatedAvailable = Number((availableCredits - availableDebits).toFixed(2));
    const actualAvailable = Number(wallet.availableBalance);
    const variance = Number((calculatedAvailable - actualAvailable).toFixed(2));

    // Calculate expected held balance from active withdrawal requests
    const activeWithdrawals = await db
      .select()
      .from(withdrawalRequests)
      .where(
        and(
          eq(withdrawalRequests.providerId, providerId),
          or(
            eq(withdrawalRequests.status, 'requested'),
            eq(withdrawalRequests.status, 'under_review'),
            eq(withdrawalRequests.status, 'approved')
          )
        )
      );

    const calculatedHeld = activeWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
    const actualHeld = Number(wallet.heldBalance);
    const heldVariance = Number((calculatedHeld - actualHeld).toFixed(2));

    const isConsistent = Math.abs(variance) < 0.01 && Math.abs(heldVariance) < 0.01;

    // Update last reconciled timestamp
    await db
      .update(providerWallets)
      .set({ lastReconciledAt: new Date() })
      .where(eq(providerWallets.id, wallet.id));

    return {
      found: true,
      providerId,
      walletId: wallet.id,
      availableBalance: actualAvailable,
      pendingBalance: Number(wallet.pendingBalance),
      heldBalance: actualHeld,
      liabilityBalance: Number(wallet.liabilityBalance),
      totalEarned: Number(wallet.totalEarned),
      totalWithdrawn: Number(wallet.totalWithdrawn),
      totalRefunded: Number(wallet.totalRefunded),
      totalTransactions: txRows.length,
      totalCredits: Number(availableCredits.toFixed(2)),
      totalDebits: Number(availableDebits.toFixed(2)),
      expectedActive: calculatedAvailable,
      actualSum: actualAvailable,
      variance,
      heldVariance,
      isConsistent,
    };
  }

  /**
   * Runs automated system-wide financial reconciliation across all providers
   */
  public static async runSystemWideReconciliation(executedByUserId?: string) {
    const allProviders = await db.select().from(providers);
    const runNumber = `REC-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    let totalWallets = 0;
    let totalTransactions = 0;
    let totalDiscrepancies = 0;
    let totalLedgerSum = 0;
    let totalWalletBalances = 0;
    const itemsToInsert: any[] = [];
    const providerSummaries: any[] = [];

    for (const p of allProviders) {
      const audit = await this.reconcileProviderWallet(p.id);
      if (audit.found && audit.totalTransactions !== undefined && audit.expectedActive !== undefined && audit.actualSum !== undefined) {
        totalWallets++;
        totalTransactions += audit.totalTransactions;
        totalLedgerSum += audit.expectedActive;
        totalWalletBalances += audit.actualSum;
        providerSummaries.push(audit);

        if (!audit.isConsistent) {
          totalDiscrepancies++;
          itemsToInsert.push({
            entityType: 'provider_wallet',
            entityId: p.id,
            discrepancyType: 'BALANCE_LEDGER_MISMATCH',
            expectedValue: audit.expectedActive.toFixed(2),
            actualValue: audit.actualSum.toFixed(2),
            variance: audit.variance.toString(),
            details: audit,
          });
        }
      }
    }

    const varianceAmount = Number((totalLedgerSum - totalWalletBalances).toFixed(2));
    const status = totalDiscrepancies > 0 ? 'discrepancies_found' : 'completed';

    const [runRecord] = await db
      .insert(financialReconciliationRuns)
      .values({
        runNumber,
        status,
        totalWalletsAudited: totalWallets,
        totalTransactionsAudited: totalTransactions,
        totalDiscrepanciesFound: totalDiscrepancies,
        totalLedgerSum: totalLedgerSum.toFixed(2),
        totalWalletBalances: totalWalletBalances.toFixed(2),
        varianceAmount: varianceAmount.toFixed(2),
        auditSummary: {
          providers: providerSummaries,
          auditedAt: new Date().toISOString(),
        },
        executedByUserId: executedByUserId || null,
        completedAt: new Date(),
      })
      .returning();

    for (const item of itemsToInsert) {
      await db.insert(financialReconciliationItems).values({
        runId: runRecord.id,
        entityType: item.entityType,
        entityId: item.entityId,
        discrepancyType: item.discrepancyType,
        expectedValue: item.expectedValue,
        actualValue: item.actualValue,
        variance: item.variance,
        details: item.details,
      });
    }

    return {
      run: runRecord,
      totalWallets,
      totalTransactions,
      totalDiscrepancies,
      totalLedgerSum: Number(totalLedgerSum.toFixed(2)),
      totalWalletBalances: Number(totalWalletBalances.toFixed(2)),
      varianceAmount,
      status,
    };
  }
}
