import { Router } from 'express';
import { FinanceController } from './finance.controller.js';
import { requireAuth, requirePermission, requireStaff } from '../../middleware/auth.js';

const router = Router();

// ==========================================
// 1. Provider Wallet & Payout Routes
// ==========================================
router.get('/wallet', requireAuth, FinanceController.getMyWallet);
router.get('/wallet/transactions', requireAuth, FinanceController.getMyTransactions);
router.get('/earnings', requireAuth, FinanceController.getMyEarningsSummary);

// Bank Accounts
router.get('/bank-accounts', requireAuth, FinanceController.getMyBankAccounts);
router.post('/bank-accounts', requireAuth, FinanceController.addMyBankAccount);
router.delete('/bank-accounts/:id', requireAuth, FinanceController.deleteMyBankAccount);

// Withdrawals
router.post('/withdrawals', requireAuth, FinanceController.requestMyWithdrawal);
router.get('/withdrawals', requireAuth, FinanceController.getMyWithdrawals);

export const providerFinanceRoutes = router;

// ==========================================
// 2. Admin Financial Control Center Routes
// ==========================================
const adminRouter = Router();

adminRouter.use(requireAuth, requireStaff);

// KPIs & Overview
adminRouter.get('/kpi-summary', requirePermission('view_finance'), FinanceController.getFinancialKpiSummary);
adminRouter.get('/overview', requirePermission('view_finance'), FinanceController.getFinancialKpiSummary);

// Provider Wallets
adminRouter.get('/wallets', requirePermission('view_finance'), FinanceController.getAllProviderWallets);
adminRouter.post('/wallets/:providerId/adjustment', requirePermission('manage_finance'), FinanceController.manualAdjustment);

// Transactions Journal
adminRouter.get('/transactions', requirePermission('view_finance'), FinanceController.getAllTransactions);

// Withdrawals Queue & Actions
adminRouter.get('/withdrawals', requirePermission('view_finance'), FinanceController.getAllWithdrawals);
adminRouter.post('/withdrawals/:id/approve', requirePermission('manage_withdrawals'), FinanceController.approveWithdrawal);
adminRouter.post('/withdrawals/:id/settle', requirePermission('manage_withdrawals'), FinanceController.settleWithdrawal);
adminRouter.post('/withdrawals/:id/reject', requirePermission('manage_withdrawals'), FinanceController.rejectWithdrawal);

// Commission Rules
adminRouter.get('/commissions', requirePermission('view_finance'), FinanceController.getCommissionRules);
adminRouter.post('/commissions', requirePermission('manage_commissions'), FinanceController.createCommissionRule);
adminRouter.put('/commissions/:id', requirePermission('manage_commissions'), FinanceController.updateCommissionRule);

// Automated Reconciliation
adminRouter.post('/reconciliation/run', requirePermission('manage_finance'), FinanceController.runReconciliation);
adminRouter.get('/reconciliation/runs', requirePermission('view_finance'), FinanceController.getReconciliationRuns);

export const adminFinanceRoutes = adminRouter;
