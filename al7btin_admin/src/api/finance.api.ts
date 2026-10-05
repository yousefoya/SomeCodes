import client from './client';
import {
  FinancialKpiSummary,
  ProviderWallet,
  WalletTransaction,
  CommissionRule,
  WithdrawalRequest,
  ReconciliationRun,
  ApiResponse,
} from '../types';

export interface GetTransactionsParams {
  page?: number;
  limit?: number;
  type?: string;
  providerId?: string;
}

export interface GetWithdrawalsParams {
  status?: string;
  providerId?: string;
}

export interface ManualAdjustmentPayload {
  amount: number;
  type: 'CREDIT_BONUS_INCENTIVE' | 'DEBIT_PENALTY_ADJUSTMENT' | 'MANUAL_ADMIN_ADJUSTMENT';
  direction: 'credit' | 'debit';
  reason: string;
}

export interface SettleWithdrawalPayload {
  transactionReference: string;
  notes?: string;
}

export interface RejectWithdrawalPayload {
  rejectionReason: string;
}

export interface CreateCommissionRulePayload {
  nameAr: string;
  nameEn: string;
  ruleType: 'percentage' | 'fixed' | 'hybrid';
  percentageRate?: number;
  fixedAmount?: number;
  minCommission?: number;
  maxCommission?: number | null;
  serviceId?: string | null;
  categoryId?: string | null;
  providerId?: string | null;
  providerTier?: string;
  timing?: string;
  mode?: string;
  priority?: number;
}

export const financeApi = {
  // 1. KPI & Overview
  getKpiSummary: async (): Promise<FinancialKpiSummary> => {
    const res = await client.get<ApiResponse<{ kpis: FinancialKpiSummary }>>('/admin/finance/kpi-summary');
    return res.data.data.kpis;
  },

  // 2. Wallets
  getWallets: async (params?: { search?: string; status?: string }): Promise<ProviderWallet[]> => {
    const res = await client.get<ApiResponse<{ wallets: ProviderWallet[] }>>('/admin/finance/wallets', { params });
    return res.data.data.wallets;
  },

  manualAdjustment: async (providerId: string, payload: ManualAdjustmentPayload): Promise<any> => {
    const res = await client.post<ApiResponse<any>>(`/admin/finance/wallets/${providerId}/adjustment`, payload);
    return res.data.data;
  },

  // 3. Transactions Journal
  getTransactions: async (
    params?: GetTransactionsParams
  ): Promise<{ transactions: WalletTransaction[]; pagination: any }> => {
    const res = await client.get<ApiResponse<{ transactions: WalletTransaction[]; pagination: any }>>(
      '/admin/finance/transactions',
      { params }
    );
    return res.data.data;
  },

  // 4. Withdrawals Queue
  getWithdrawals: async (params?: GetWithdrawalsParams): Promise<WithdrawalRequest[]> => {
    const res = await client.get<ApiResponse<{ withdrawals: WithdrawalRequest[] }>>('/admin/finance/withdrawals', {
      params,
    });
    return res.data.data.withdrawals;
  },

  approveWithdrawal: async (id: string): Promise<WithdrawalRequest> => {
    const res = await client.post<ApiResponse<{ withdrawal: WithdrawalRequest }>>(
      `/admin/finance/withdrawals/${id}/approve`
    );
    return res.data.data.withdrawal;
  },

  settleWithdrawal: async (id: string, payload: SettleWithdrawalPayload): Promise<any> => {
    const res = await client.post<ApiResponse<any>>(`/admin/finance/withdrawals/${id}/settle`, payload);
    return res.data.data;
  },

  rejectWithdrawal: async (id: string, payload: RejectWithdrawalPayload): Promise<any> => {
    const res = await client.post<ApiResponse<any>>(`/admin/finance/withdrawals/${id}/reject`, payload);
    return res.data.data;
  },

  // 5. Commission Rules
  getCommissionRules: async (): Promise<CommissionRule[]> => {
    const res = await client.get<ApiResponse<{ rules: CommissionRule[] }>>('/admin/finance/commissions');
    return res.data.data.rules;
  },

  createCommissionRule: async (payload: CreateCommissionRulePayload): Promise<CommissionRule> => {
    const res = await client.post<ApiResponse<{ rule: CommissionRule }>>('/admin/finance/commissions', payload);
    return res.data.data.rule;
  },

  updateCommissionRule: async (id: string, payload: Partial<CreateCommissionRulePayload>): Promise<CommissionRule> => {
    const res = await client.put<ApiResponse<{ rule: CommissionRule }>>(`/admin/finance/commissions/${id}`, payload);
    return res.data.data.rule;
  },

  // 6. Automated Financial Reconciliation
  runReconciliation: async (): Promise<any> => {
    const res = await client.post<ApiResponse<any>>('/admin/finance/reconciliation/run');
    return res.data.data;
  },

  getReconciliationRuns: async (): Promise<ReconciliationRun[]> => {
    const res = await client.get<ApiResponse<{ runs: ReconciliationRun[] }>>('/admin/finance/reconciliation/runs');
    return res.data.data.runs;
  },
};
