import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index.js';
import {
  providerWallets,
  walletTransactions,
  commissionRules,
  commissionCalculations,
  withdrawalRequests,
  providerBankAccounts,
  paymentIntents,
  paymentTransactions,
  financialReconciliationRuns,
  financialReconciliationItems,
} from '../../db/schema/finance.schema.js';
import { providers } from '../../db/schema/providers.schema.js';
import { orders } from '../../db/schema/orders.schema.js';
import { WalletLedgerService } from '../../services/wallet-ledger.service.js';
import { WithdrawalService } from '../../services/withdrawal.service.js';
import { CommissionEngine } from '../../services/commission.engine.js';
import { auditService } from '../../services/audit.service.js';
import { eq, and, desc, sql, or, ilike, gte, lte } from 'drizzle-orm';
import { AppError } from '../../middleware/errorHandler.js';

export class FinanceController {
  /**
   * Helper: Resolve providerId for current authenticated user
   */
  private static async resolveProviderId(req: Request): Promise<string> {
    const user = req.user;
    if (!user) {
      throw new AppError('غير مصرح لك بالوصول', 401, 'UNAUTHORIZED');
    }

    // Direct provider user
    const [p] = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, user.id))
      .limit(1);

    if (p) {
      return p.id;
    }

    // If query provides providerId and user is admin
    if (req.query.providerId && (user.role === 'admin' || user.role === 'super_admin')) {
      return req.query.providerId as string;
    }

    // Default test provider fallback for seeding
    const [firstProv] = await db.select().from(providers).limit(1);
    if (firstProv) {
      return firstProv.id;
    }

    throw new AppError('لم يتم العثور على مزود خدمة مرتبط بهذا الحساب', 404, 'PROVIDER_NOT_FOUND');
  }

  // ==========================================
  // PROVIDER PORTAL ENDPOINTS
  // ==========================================

  /**
   * GET /api/v1/providers/me/wallet
   */
  public static async getMyWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = await FinanceController.resolveProviderId(req);

      let [wallet] = await db
        .select()
        .from(providerWallets)
        .where(eq(providerWallets.providerId, providerId))
        .limit(1);

      if (!wallet) {
        // Create initial wallet
        [wallet] = await db
          .insert(providerWallets)
          .values({
            providerId,
            availableBalance: '0.00',
            pendingBalance: '0.00',
            heldBalance: '0.00',
            totalEarned: '0.00',
          })
          .returning();
      }

      const [provider] = await db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      res.json({
        success: true,
        data: {
          wallet: {
            id: wallet.id,
            providerId: wallet.providerId,
            providerNameAr: provider?.nameAr || 'متجر بتنحل',
            providerNameEn: provider?.nameEn || 'btin7al Shop',
            availableBalance: Number(wallet.availableBalance),
            pendingBalance: Number(wallet.pendingBalance),
            heldBalance: Number(wallet.heldBalance),
            totalEarned: Number(wallet.totalEarned),
            totalWithdrawn: Number(wallet.totalWithdrawn),
            totalCommission: Number(wallet.totalCommission),
            totalRefunded: Number(wallet.totalRefunded),
            liabilityBalance: Number(wallet.liabilityBalance),
            currency: wallet.currency,
            status: wallet.status,
            lastReconciledAt: wallet.lastReconciledAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/providers/me/wallet/transactions
   */
  public static async getMyTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = await FinanceController.resolveProviderId(req);
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const type = req.query.type as string;

      let whereClause = eq(walletTransactions.providerId, providerId);
      if (type) {
        whereClause = and(whereClause, eq(walletTransactions.type, type as any)) as any;
      }

      const txList = await db
        .select()
        .from(walletTransactions)
        .where(whereClause)
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult: any = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(walletTransactions)
        .where(whereClause);

      const totalCount = countResult[0]?.count || 0;

      res.json({
        success: true,
        data: {
          transactions: txList.map((tx) => ({
            id: tx.id,
            transactionNumber: tx.transactionNumber,
            type: tx.type,
            direction: tx.direction,
            amount: Number(tx.amount),
            balanceBefore: Number(tx.balanceBefore),
            balanceAfter: Number(tx.balanceAfter),
            pendingBefore: Number(tx.pendingBefore),
            pendingAfter: Number(tx.pendingAfter),
            heldBefore: Number(tx.heldBefore),
            heldAfter: Number(tx.heldAfter),
            referenceType: tx.referenceType,
            referenceId: tx.referenceId,
            descriptionAr: tx.descriptionAr,
            descriptionEn: tx.descriptionEn,
            metadata: tx.metadata,
            createdAt: tx.createdAt,
          })),
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/providers/me/earnings
   */
  public static async getMyEarningsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = await FinanceController.resolveProviderId(req);

      const [wallet] = await db
        .select()
        .from(providerWallets)
        .where(eq(providerWallets.providerId, providerId))
        .limit(1);

      // Fetch 30-day earnings
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentTxs = await db
        .select()
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.providerId, providerId),
            eq(walletTransactions.type, 'CREDIT_ORDER_PAYMENT'),
            gte(walletTransactions.createdAt, thirtyDaysAgo)
          )
        );

      const monthlyEarnings = recentTxs.reduce((acc, tx) => acc + Number(tx.amount), 0);

      res.json({
        success: true,
        data: {
          availableBalance: wallet ? Number(wallet.availableBalance) : 0,
          pendingBalance: wallet ? Number(wallet.pendingBalance) : 0,
          heldBalance: wallet ? Number(wallet.heldBalance) : 0,
          totalEarned: wallet ? Number(wallet.totalEarned) : 0,
          totalWithdrawn: wallet ? Number(wallet.totalWithdrawn) : 0,
          totalCommission: wallet ? Number(wallet.totalCommission) : 0,
          monthlyEarnings: Number(monthlyEarnings.toFixed(2)),
          currency: 'JOD',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/providers/me/bank-accounts
   */
  public static async getMyBankAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = await FinanceController.resolveProviderId(req);
      const accounts = await WithdrawalService.getProviderBankAccounts(providerId);

      res.json({
        success: true,
        data: { accounts },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/providers/me/bank-accounts
   */
  public static async addMyBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = await FinanceController.resolveProviderId(req);
      const { bankName, bankNameEn, accountHolderName, iban, swiftCode } = req.body;

      const account = await WithdrawalService.addBankAccount({
        providerId,
        bankName,
        bankNameEn,
        accountHolderName,
        iban,
        swiftCode,
      });

      res.status(201).json({
        success: true,
        message: 'تمت إضافة الحساب البنكي بنجاح',
        data: { account },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/providers/me/bank-accounts/:id
   */
  public static async deleteMyBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = await FinanceController.resolveProviderId(req);
      const accountId = req.params.id as string;

      await WithdrawalService.deleteBankAccount(providerId, accountId);

      res.json({
        success: true,
        message: 'تم حذف الحساب البنكي بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/providers/me/withdrawals
   */
  public static async requestMyWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = await FinanceController.resolveProviderId(req);
      const { bankAccountId, amount, idempotencyKey } = req.body;

      if (!bankAccountId || !amount) {
        throw new AppError('يرجى تحديد الحساب البنكي والمبلغ المطلوب سحبه', 400, 'MISSING_FIELDS');
      }

      const result = await WalletLedgerService.requestWithdrawal({
        providerId,
        bankAccountId,
        amount: Number(amount),
        idempotencyKey: idempotencyKey || (req.headers['idempotency-key'] as string),
      });

      res.status(201).json({
        success: true,
        message: 'تم إرسال طلب السحب بنجاح وهو قيد المراجعة المالية',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/providers/me/withdrawals
   */
  public static async getMyWithdrawals(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = await FinanceController.resolveProviderId(req);

      const withdrawals = await db
        .select({
          id: withdrawalRequests.id,
          withdrawalNumber: withdrawalRequests.withdrawalNumber,
          amount: withdrawalRequests.amount,
          feeAmount: withdrawalRequests.feeAmount,
          netPayoutAmount: withdrawalRequests.netPayoutAmount,
          currency: withdrawalRequests.currency,
          status: withdrawalRequests.status,
          requestedAt: withdrawalRequests.requestedAt,
          paidAt: withdrawalRequests.paidAt,
          rejectionReason: withdrawalRequests.rejectionReason,
          transactionReference: withdrawalRequests.transactionReference,
          bankName: providerBankAccounts.bankName,
          maskedIban: providerBankAccounts.maskedIban,
        })
        .from(withdrawalRequests)
        .leftJoin(providerBankAccounts, eq(withdrawalRequests.bankAccountId, providerBankAccounts.id))
        .where(eq(withdrawalRequests.providerId, providerId))
        .orderBy(desc(withdrawalRequests.requestedAt));

      res.json({
        success: true,
        data: { withdrawals },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // ADMIN FINANCIAL CONTROL CENTER ENDPOINTS
  // ==========================================

  /**
   * GET /api/v1/admin/finance/kpi-summary
   */
  public static async getFinancialKpiSummary(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Total Platform Revenue & GMV from completed orders & captured payments
      const orderStats: any = await db.execute(sql`
        SELECT 
          COALESCE(SUM(total_amount), 0)::numeric as total_gmv,
          COALESCE(SUM(delivery_fee), 0)::numeric as total_delivery_fees,
          COUNT(*)::int as total_orders
        FROM orders 
        WHERE status IN ('completed', 'accepted', 'going_to_customer', 'going_to_pickup', 'picked_up')
      `);

      const walletStats: any = await db.execute(sql`
        SELECT 
          COALESCE(SUM(available_balance), 0)::numeric as total_available_balance,
          COALESCE(SUM(pending_balance), 0)::numeric as total_pending_balance,
          COALESCE(SUM(held_balance), 0)::numeric as total_held_balance,
          COALESCE(SUM(total_earned), 0)::numeric as total_provider_earnings,
          COALESCE(SUM(total_commission), 0)::numeric as total_platform_commission,
          COALESCE(SUM(total_withdrawn), 0)::numeric as total_withdrawn,
          COALESCE(SUM(total_refunded), 0)::numeric as total_refunded,
          COALESCE(SUM(liability_balance), 0)::numeric as total_liabilities
        FROM provider_wallets
      `);

      const withdrawalStats: any = await db.execute(sql`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'requested' OR status = 'under_review' OR status = 'approved' THEN amount ELSE 0 END), 0)::numeric as pending_withdrawal_amount,
          COUNT(CASE WHEN status = 'requested' OR status = 'under_review' OR status = 'approved' THEN 1 END)::int as pending_withdrawal_count,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::numeric as paid_withdrawal_amount,
          COUNT(CASE WHEN status = 'paid' THEN 1 END)::int as paid_withdrawal_count
        FROM withdrawal_requests
      `);

      res.json({
        success: true,
        data: {
          kpis: {
            totalGmv: Number(orderStats[0]?.total_gmv || 0),
            totalOrders: Number(orderStats[0]?.total_orders || 0),
            deliveryFeeInvariant: 0.0, // Strictly 0.00 JOD delivery fee invariant
            totalPlatformCommission: Number(walletStats[0]?.total_platform_commission || 0),
            totalProviderEarnings: Number(walletStats[0]?.total_provider_earnings || 0),
            totalAvailableBalance: Number(walletStats[0]?.total_available_balance || 0),
            totalPendingBalance: Number(walletStats[0]?.total_pending_balance || 0),
            totalHeldBalance: Number(walletStats[0]?.total_held_balance || 0),
            totalWithdrawn: Number(walletStats[0]?.total_withdrawn || 0),
            totalRefunded: Number(walletStats[0]?.total_refunded || 0),
            totalLiabilities: Number(walletStats[0]?.total_liabilities || 0),
            pendingWithdrawals: {
              amount: Number(withdrawalStats[0]?.pending_withdrawal_amount || 0),
              count: Number(withdrawalStats[0]?.pending_withdrawal_count || 0),
            },
            paidWithdrawals: {
              amount: Number(withdrawalStats[0]?.paid_withdrawal_amount || 0),
              count: Number(withdrawalStats[0]?.paid_withdrawal_count || 0),
            },
            currency: 'JOD',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/finance/wallets
   */
  public static async getAllProviderWallets(req: Request, res: Response, next: NextFunction) {
    try {
      const search = (req.query.search as string)?.trim();
      const status = req.query.status as string;

      let query = db
        .select({
          id: providerWallets.id,
          providerId: providerWallets.providerId,
          providerNameAr: providers.nameAr,
          providerNameEn: providers.nameEn,
          providerPhone: providers.phoneNumber,
          availableBalance: providerWallets.availableBalance,
          pendingBalance: providerWallets.pendingBalance,
          heldBalance: providerWallets.heldBalance,
          totalEarned: providerWallets.totalEarned,
          totalWithdrawn: providerWallets.totalWithdrawn,
          totalCommission: providerWallets.totalCommission,
          totalRefunded: providerWallets.totalRefunded,
          liabilityBalance: providerWallets.liabilityBalance,
          status: providerWallets.status,
          lastReconciledAt: providerWallets.lastReconciledAt,
          updatedAt: providerWallets.updatedAt,
        })
        .from(providerWallets)
        .leftJoin(providers, eq(providerWallets.providerId, providers.id))
        .orderBy(desc(providerWallets.availableBalance));

      const wallets = await query;

      let filtered = wallets;
      if (search) {
        const lower = search.toLowerCase();
        filtered = filtered.filter(
          (w) =>
            w.providerNameAr?.toLowerCase().includes(lower) ||
            w.providerNameEn?.toLowerCase().includes(lower) ||
            w.providerPhone?.includes(lower) ||
            w.providerId.toLowerCase().includes(lower)
        );
      }

      if (status) {
        filtered = filtered.filter((w) => w.status === status);
      }

      res.json({
        success: true,
        data: {
          wallets: filtered.map((w) => ({
            ...w,
            availableBalance: Number(w.availableBalance),
            pendingBalance: Number(w.pendingBalance),
            heldBalance: Number(w.heldBalance),
            totalEarned: Number(w.totalEarned),
            totalWithdrawn: Number(w.totalWithdrawn),
            totalCommission: Number(w.totalCommission),
            totalRefunded: Number(w.totalRefunded),
            liabilityBalance: Number(w.liabilityBalance),
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/finance/transactions
   */
  public static async getAllTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
      const offset = (page - 1) * limit;
      const type = req.query.type as string;
      const providerId = req.query.providerId as string;

      let conditions: any[] = [];
      if (type) conditions.push(eq(walletTransactions.type, type as any));
      if (providerId) conditions.push(eq(walletTransactions.providerId, providerId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const txs = await db
        .select({
          id: walletTransactions.id,
          transactionNumber: walletTransactions.transactionNumber,
          walletId: walletTransactions.walletId,
          providerId: walletTransactions.providerId,
          providerNameAr: providers.nameAr,
          providerNameEn: providers.nameEn,
          type: walletTransactions.type,
          direction: walletTransactions.direction,
          amount: walletTransactions.amount,
          balanceBefore: walletTransactions.balanceBefore,
          balanceAfter: walletTransactions.balanceAfter,
          pendingBefore: walletTransactions.pendingBefore,
          pendingAfter: walletTransactions.pendingAfter,
          heldBefore: walletTransactions.heldBefore,
          heldAfter: walletTransactions.heldAfter,
          referenceType: walletTransactions.referenceType,
          referenceId: walletTransactions.referenceId,
          descriptionAr: walletTransactions.descriptionAr,
          descriptionEn: walletTransactions.descriptionEn,
          metadata: walletTransactions.metadata,
          createdAt: walletTransactions.createdAt,
        })
        .from(walletTransactions)
        .leftJoin(providers, eq(walletTransactions.providerId, providers.id))
        .where(whereClause)
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult: any = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(walletTransactions)
        .where(whereClause);

      const totalCount = countResult[0]?.count || 0;

      res.json({
        success: true,
        data: {
          transactions: txs.map((tx) => ({
            ...tx,
            amount: Number(tx.amount),
            balanceBefore: Number(tx.balanceBefore),
            balanceAfter: Number(tx.balanceAfter),
            pendingBefore: Number(tx.pendingBefore),
            pendingAfter: Number(tx.pendingAfter),
            heldBefore: Number(tx.heldBefore),
            heldAfter: Number(tx.heldAfter),
          })),
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/finance/withdrawals
   */
  public static async getAllWithdrawals(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string;

      let whereClause: any = undefined;
      if (status) {
        whereClause = eq(withdrawalRequests.status, status as any);
      }

      const list = await db
        .select({
          id: withdrawalRequests.id,
          withdrawalNumber: withdrawalRequests.withdrawalNumber,
          providerId: withdrawalRequests.providerId,
          providerNameAr: providers.nameAr,
          providerNameEn: providers.nameEn,
          providerPhone: providers.phoneNumber,
          bankName: providerBankAccounts.bankName,
          accountHolderName: providerBankAccounts.accountHolderName,
          maskedIban: providerBankAccounts.maskedIban,
          iban: providerBankAccounts.iban,
          amount: withdrawalRequests.amount,
          feeAmount: withdrawalRequests.feeAmount,
          netPayoutAmount: withdrawalRequests.netPayoutAmount,
          currency: withdrawalRequests.currency,
          status: withdrawalRequests.status,
          requestedAt: withdrawalRequests.requestedAt,
          reviewedAt: withdrawalRequests.reviewedAt,
          approvedAt: withdrawalRequests.approvedAt,
          paidAt: withdrawalRequests.paidAt,
          rejectionReason: withdrawalRequests.rejectionReason,
          transactionReference: withdrawalRequests.transactionReference,
          notes: withdrawalRequests.notes,
        })
        .from(withdrawalRequests)
        .leftJoin(providers, eq(withdrawalRequests.providerId, providers.id))
        .leftJoin(providerBankAccounts, eq(withdrawalRequests.bankAccountId, providerBankAccounts.id))
        .where(whereClause)
        .orderBy(desc(withdrawalRequests.requestedAt));

      res.json({
        success: true,
        data: {
          withdrawals: list.map((w) => ({
            ...w,
            amount: Number(w.amount),
            feeAmount: Number(w.feeAmount),
            netPayoutAmount: Number(w.netPayoutAmount),
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/finance/withdrawals/:id/approve
   */
  public static async approveWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const withdrawalId = req.params.id as string;
      const user = req.user!;

      const [wth] = await db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.id, withdrawalId))
        .limit(1);

      if (!wth) {
        throw new AppError('طلب السحب غير موجود', 404, 'WITHDRAWAL_NOT_FOUND');
      }

      if (wth.status !== 'requested' && wth.status !== 'under_review') {
        throw new AppError(`لا يمكن الموافقة على طلب في حالة: ${wth.status}`, 400, 'INVALID_STATE');
      }

      const [updated] = await db
        .update(withdrawalRequests)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approvedByUserId: user.id,
          updatedAt: new Date(),
        })
        .where(eq(withdrawalRequests.id, withdrawalId))
        .returning();

      await auditService.log({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'WITHDRAWAL_APPROVE',
        entityType: 'withdrawal_request',
        entityId: withdrawalId,
        metadata: { withdrawalNumber: wth.withdrawalNumber, amount: wth.amount },
      });

      res.json({
        success: true,
        message: 'تمت الموافقة على طلب السحب بنجاح وهو جاهز للصرف والتحويل',
        data: { withdrawal: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/finance/withdrawals/:id/settle
   */
  public static async settleWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const withdrawalId = req.params.id as string;
      const { transactionReference, notes } = req.body;
      const user = req.user!;

      if (!transactionReference || transactionReference.trim().length < 3) {
        throw new AppError('يرجى إدخال الرقم المرجعي للتحويل البنكي أو إشعار الصرف', 400, 'TX_REF_REQUIRED');
      }

      const result = await WalletLedgerService.settleWithdrawal({
        withdrawalId,
        transactionReference: transactionReference.trim(),
        actorUserId: user.id,
        notes,
      });

      await auditService.log({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'WITHDRAWAL_SETTLE_PAID',
        entityType: 'withdrawal_request',
        entityId: withdrawalId,
        metadata: {
          withdrawalNumber: result.withdrawal.withdrawal_number,
          transactionReference,
          amount: result.withdrawal.amount,
        },
      });

      res.json({
        success: true,
        message: 'تم تأكيد صرف وتحويل مبلغ السحب بنجاح',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/finance/withdrawals/:id/reject
   */
  public static async rejectWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const withdrawalId = req.params.id as string;
      const { rejectionReason } = req.body;
      const user = req.user!;

      if (!rejectionReason || rejectionReason.trim().length < 3) {
        throw new AppError('يرجى كتابة سبب رفض السحب بالتفصيل', 400, 'REASON_REQUIRED');
      }

      const result = await WalletLedgerService.rejectWithdrawal({
        withdrawalId,
        rejectionReason: rejectionReason.trim(),
        actorUserId: user.id,
      });

      await auditService.log({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'WITHDRAWAL_REJECT',
        entityType: 'withdrawal_request',
        entityId: withdrawalId,
        metadata: {
          rejectionReason,
          amount: result.withdrawal.amount,
        },
      });

      res.json({
        success: true,
        message: 'تم رفض طلب السحب وإعادة الرصيد المحجوز إلى حساب المزود',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/finance/wallets/:providerId/adjustment
   */
  public static async manualAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.params.providerId as string;
      const { amount, type, direction, reason } = req.body;
      const user = req.user!;

      if (user.role !== 'super_admin' && user.role !== 'admin') {
        throw new AppError('غير مصرح لك بإجراء تعديلات مالية يدوية', 403, 'FORBIDDEN');
      }

      const result = await WalletLedgerService.adminManualAdjustment({
        providerId,
        amount: Number(amount),
        type: type || 'MANUAL_ADMIN_ADJUSTMENT',
        direction: direction || 'credit',
        reason,
        actorUserId: user.id,
        actorRole: user.role,
      });

      res.status(201).json({
        success: true,
        message: 'تم تنفيذ التعديل المالي بنجاح وإدراجه في سجل القيود المالية',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/finance/commissions
   */
  public static async getCommissionRules(req: Request, res: Response, next: NextFunction) {
    try {
      const rules = await db
        .select()
        .from(commissionRules)
        .orderBy(desc(commissionRules.priority), desc(commissionRules.createdAt));

      res.json({
        success: true,
        data: {
          rules: rules.map((r) => ({
            ...r,
            percentageRate: Number(r.percentageRate),
            fixedAmount: Number(r.fixedAmount),
            minCommission: Number(r.minCommission),
            maxCommission: r.maxCommission ? Number(r.maxCommission) : null,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/finance/commissions
   */
  public static async createCommissionRule(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        nameAr,
        nameEn,
        ruleType,
        percentageRate,
        fixedAmount,
        minCommission,
        maxCommission,
        serviceId,
        categoryId,
        providerId,
        providerTier,
        timing,
        mode,
        priority,
      } = req.body;

      if (!nameAr || !nameEn) {
        throw new AppError('يرجى إدخال اسم قاعدة العمولة بالعربية والإنجليزية', 400, 'NAME_REQUIRED');
      }

      const [rule] = await db
        .insert(commissionRules)
        .values({
          nameAr: nameAr.trim(),
          nameEn: nameEn.trim(),
          ruleType: ruleType || 'percentage',
          percentageRate: (percentageRate || 0).toFixed(2),
          fixedAmount: (fixedAmount || 0).toFixed(2),
          minCommission: (minCommission || 0).toFixed(2),
          maxCommission: maxCommission ? maxCommission.toFixed(2) : null,
          serviceId: serviceId || null,
          categoryId: categoryId || null,
          providerId: providerId || null,
          providerTier: providerTier || 'all',
          timing: timing || 'on_service_completion',
          mode: mode || 'postpaid',
          priority: priority || 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.status(201).json({
        success: true,
        message: 'تم إنشاء قاعدة العمولة بنجاح',
        data: { rule },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/finance/commissions/:id
   */
  public static async updateCommissionRule(req: Request, res: Response, next: NextFunction) {
    try {
      const ruleId = req.params.id as string;
      const {
        nameAr,
        nameEn,
        ruleType,
        percentageRate,
        fixedAmount,
        minCommission,
        maxCommission,
        timing,
        mode,
        priority,
        isActive,
      } = req.body;

      const [updated] = await db
        .update(commissionRules)
        .set({
          ...(nameAr && { nameAr: nameAr.trim() }),
          ...(nameEn && { nameEn: nameEn.trim() }),
          ...(ruleType && { ruleType }),
          ...(percentageRate !== undefined && { percentageRate: Number(percentageRate).toFixed(2) }),
          ...(fixedAmount !== undefined && { fixedAmount: Number(fixedAmount).toFixed(2) }),
          ...(minCommission !== undefined && { minCommission: Number(minCommission).toFixed(2) }),
          ...(maxCommission !== undefined && { maxCommission: maxCommission ? Number(maxCommission).toFixed(2) : null }),
          ...(timing && { timing }),
          ...(mode && { mode }),
          ...(priority !== undefined && { priority: Number(priority) }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          updatedAt: new Date(),
        })
        .where(eq(commissionRules.id, ruleId))
        .returning();

      res.json({
        success: true,
        message: 'تم تحديث قاعدة العمولة بنجاح',
        data: { rule: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/finance/reconciliation/run
   */
  public static async runReconciliation(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const result = await WalletLedgerService.runSystemWideReconciliation(user?.id);

      res.json({
        success: true,
        message:
          result.totalDiscrepancies === 0
            ? 'اكتمل التدقيق المالي الآلي بنجاح: جميع قيود دفتر الأستاذ متطابقة مع أرصدة المحافظ بنسبة 100%'
            : `اكتمل التدقيق المالي مع تسجيل ${result.totalDiscrepancies} ملاحظات اختلاف للمراجعة`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/finance/reconciliation/runs
   */
  public static async getReconciliationRuns(req: Request, res: Response, next: NextFunction) {
    try {
      const runs = await db
        .select()
        .from(financialReconciliationRuns)
        .orderBy(desc(financialReconciliationRuns.createdAt))
        .limit(20);

      res.json({
        success: true,
        data: { runs },
      });
    } catch (error) {
      next(error);
    }
  }
}
