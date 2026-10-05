import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Receipt,
  Scale,
  Percent,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Search,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  Sliders,
  Wallet,
} from 'lucide-react';
import { financeApi } from '../api/finance.api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import {
  WalletTransaction,
} from '../types';

export const FinancePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    toast(message, type);
  };
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'wallets' | 'transactions' | 'withdrawals' | 'commissions' | 'reconciliation'
  >('overview');

  // Filters & State
  const [walletSearch, setWalletSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const [wthStatusFilter, setWthStatusFilter] = useState('');
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  // Modals
  const [adjustmentModal, setAdjustmentModal] = useState<{ isOpen: boolean; providerId: string; providerName: string }>({
    isOpen: false,
    providerId: '',
    providerName: '',
  });
  const [adjAmount, setAdjAmount] = useState('');
  const [adjType, setAdjType] = useState<'CREDIT_BONUS_INCENTIVE' | 'DEBIT_PENALTY_ADJUSTMENT' | 'MANUAL_ADMIN_ADJUSTMENT'>('MANUAL_ADMIN_ADJUSTMENT');
  const [adjDirection, setAdjDirection] = useState<'credit' | 'debit'>('credit');
  const [adjReason, setAdjReason] = useState('');

  const [settleModal, setSettleModal] = useState<{ isOpen: boolean; withdrawalId: string; amount: number; wthNumber: string }>({
    isOpen: false,
    withdrawalId: '',
    amount: 0,
    wthNumber: '',
  });
  const [txRef, setTxRef] = useState('');

  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; withdrawalId: string; wthNumber: string }>({
    isOpen: false,
    withdrawalId: '',
    wthNumber: '',
  });
  const [rejectReason, setRejectReason] = useState('');

  const [createRuleModal, setCreateRuleModal] = useState(false);
  const [ruleNameAr, setRuleNameAr] = useState('');
  const [ruleNameEn, setRuleNameEn] = useState('');
  const [ruleType, setRuleType] = useState<'percentage' | 'fixed' | 'hybrid'>('percentage');
  const [percentageRate, setPercentageRate] = useState('10.00');
  const [fixedAmount, setFixedAmount] = useState('0.00');
  const [minCommission, setMinCommission] = useState('0.50');
  const [maxCommission, setMaxCommission] = useState('');
  const [ruleTiming, setRuleTiming] = useState('on_service_completion');

  // Queries
  const { data: kpis, refetch: refetchKpis } = useQuery({
    queryKey: ['finance-kpis'],
    queryFn: financeApi.getKpiSummary,
  });

  const { data: wallets, refetch: refetchWallets } = useQuery({
    queryKey: ['finance-wallets', walletSearch],
    queryFn: () => financeApi.getWallets({ search: walletSearch || undefined }),
  });

  const { data: txData, refetch: refetchTxs } = useQuery({
    queryKey: ['finance-transactions', txTypeFilter],
    queryFn: () => financeApi.getTransactions({ type: txTypeFilter || undefined }),
  });

  const { data: withdrawals, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['finance-withdrawals', wthStatusFilter],
    queryFn: () => financeApi.getWithdrawals({ status: wthStatusFilter || undefined }),
  });

  const { data: commissionRules, refetch: refetchRules } = useQuery({
    queryKey: ['finance-commissions'],
    queryFn: financeApi.getCommissionRules,
  });

  const { data: reconciliationRuns, refetch: refetchReconciliation } = useQuery({
    queryKey: ['finance-reconciliation-runs'],
    queryFn: financeApi.getReconciliationRuns,
  });

  // Mutations
  const manualAdjustmentMutation = useMutation({
    mutationFn: ({ providerId, payload }: { providerId: string; payload: any }) =>
      financeApi.manualAdjustment(providerId, payload),
    onSuccess: () => {
      showToast('success', 'تم تنفيذ القيد المالي اليدوي بنجاح');
      setAdjustmentModal({ isOpen: false, providerId: '', providerName: '' });
      setAdjAmount('');
      setAdjReason('');
      queryClient.invalidateQueries({ queryKey: ['finance-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-kpis'] });
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.error?.message || 'فشل تنفيذ التعديل المالي');
    },
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: (id: string) => financeApi.approveWithdrawal(id),
    onSuccess: () => {
      showToast('success', 'تمت الموافقة على طلب السحب بنجاح وهو بانتظار إشعار الصرف');
      queryClient.invalidateQueries({ queryKey: ['finance-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['finance-kpis'] });
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.error?.message || 'فشل اعتماد طلب السحب');
    },
  });

  const settleWithdrawalMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => financeApi.settleWithdrawal(id, payload),
    onSuccess: () => {
      showToast('success', 'تم تأكيد صرف وتحويل السحب البنكي بنجاح');
      setSettleModal({ isOpen: false, withdrawalId: '', amount: 0, wthNumber: '' });
      setTxRef('');
      queryClient.invalidateQueries({ queryKey: ['finance-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['finance-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-kpis'] });
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.error?.message || 'فشل صرف السحب');
    },
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => financeApi.rejectWithdrawal(id, payload),
    onSuccess: () => {
      showToast('info', 'تم رفض طلب السحب وإعادة الرصيد المحجوز للمزود بنجاح');
      setRejectModal({ isOpen: false, withdrawalId: '', wthNumber: '' });
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['finance-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['finance-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-kpis'] });
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.error?.message || 'فشل رفض السحب');
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (payload: any) => financeApi.createCommissionRule(payload),
    onSuccess: () => {
      showToast('success', 'تم إنشاء قاعدة العمولة بنجاح');
      setCreateRuleModal(false);
      setRuleNameAr('');
      setRuleNameEn('');
      queryClient.invalidateQueries({ queryKey: ['finance-commissions'] });
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.error?.message || 'فشل إنشاء قاعدة العمولة');
    },
  });

  const runReconciliationMutation = useMutation({
    mutationFn: financeApi.runReconciliation,
    onSuccess: (res: any) => {
      if (res.totalDiscrepancies === 0) {
        showToast('success', 'اكتملت المطابقة المالية الآلية بنجاح: 0 فروقات وجميع الأرصدة متطابقة 100%');
      } else {
        showToast('warning', `تم رصد ${res.totalDiscrepancies} اختلافات في التدقيق المالي`);
      }
      queryClient.invalidateQueries({ queryKey: ['finance-reconciliation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['finance-wallets'] });
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.error?.message || 'فشل تشغيل المطابقة المالية');
    },
  });

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-surface-900 tracking-tight">
                مركز العمليات والتحكم المالي (Financial Control Center)
              </h1>
              <p className="text-sm text-surface-500">
                إدارة دفتر الأستاذ المزدوج، العمولات الديناميكية، تسويات المزودين، والسحوبات البنكية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchKpis();
              refetchWallets();
              refetchTxs();
              refetchWithdrawals();
              refetchRules();
              refetchReconciliation();
            }}
          >
            <RefreshCw className="w-4 h-4 ml-1.5" />
            تحديث البيانات
          </Button>

          {isSuperAdmin && (
            <Button
              variant="primary"
              size="sm"
              isLoading={runReconciliationMutation.isPending}
              onClick={() => runReconciliationMutation.mutate()}
            >
              <Scale className="w-4 h-4 ml-1.5" />
              تدقيق ومطابقة الدفاتر المالية
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-surface-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          النظرة العامة والمؤشرات
        </button>

        <button
          onClick={() => setActiveTab('wallets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'wallets'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          محافظ المزودين ({wallets?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          دفتر الأستاذ والقيود المزدوجة
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'withdrawals'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          طلبات السحب ({withdrawals?.filter((w) => w.status === 'requested' || w.status === 'approved').length || 0})
        </button>

        <button
          onClick={() => setActiveTab('commissions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'commissions'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
          }`}
        >
          <Percent className="w-4 h-4" />
          محرك قواعد العمولات
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'reconciliation'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          التدقيق والمطابقة الآلية
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: OVERVIEW & KPIS */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-surface-500 uppercase tracking-wider">إجمالي حجم التداول (GMV)</p>
                  <h3 className="text-2xl font-black text-surface-900 mt-1">
                    {kpis?.totalGmv?.toFixed(2) || '0.00'} <span className="text-sm font-bold text-surface-500">د.أ</span>
                  </h3>
                  <p className="text-xs text-surface-500 mt-1">من {kpis?.totalOrders || 0} طلب مكتمل</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-surface-500 uppercase tracking-wider">صافي عمولات المنصة</p>
                  <h3 className="text-2xl font-black text-surface-900 mt-1">
                    {kpis?.totalPlatformCommission?.toFixed(2) || '0.00'}{' '}
                    <span className="text-sm font-bold text-surface-500">د.أ</span>
                  </h3>
                  <p className="text-xs text-amber-600 font-semibold mt-1">أرباح المنصة المحصلة</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Percent className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-surface-500 uppercase tracking-wider">مستحقات وأرباح المزودين</p>
                  <h3 className="text-2xl font-black text-surface-900 mt-1">
                    {kpis?.totalProviderEarnings?.toFixed(2) || '0.00'}{' '}
                    <span className="text-sm font-bold text-surface-500">د.أ</span>
                  </h3>
                  <p className="text-xs text-surface-500 mt-1">المتاحة في المحافظ: {kpis?.totalAvailableBalance?.toFixed(2)} د.أ</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-surface-500 uppercase tracking-wider">السحوبات المعلقة للصرف</p>
                  <h3 className="text-2xl font-black text-surface-900 mt-1">
                    {kpis?.pendingWithdrawals?.amount?.toFixed(2) || '0.00'}{' '}
                    <span className="text-sm font-bold text-surface-500">د.أ</span>
                  </h3>
                  <p className="text-xs text-purple-600 font-semibold mt-1">
                    {kpis?.pendingWithdrawals?.count || 0} طلبات سحب بانتظار التحويل
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* System Invariant & Security Banner */}
          <Card className="p-5 bg-gradient-to-r from-surface-900 to-surface-800 text-white border-0 shadow-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base flex items-center gap-2">
                    ضمانات النزاهة المالية وثبات أجور التوصيل (Delivery Invariant)
                    <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-0">
                      0.00 JOD Fee Active
                    </Badge>
                  </h4>
                  <p className="text-xs text-surface-300 mt-1">
                    جميع القيود المالية تسجل في دفتر أستاذ مزدوج غير قابل للتعديل (Immutable Ledger)، مع حماية كاملة من
                    السحب المزدوج (PostgreSQL Row Locking) وتدقيق تلقائي دوري.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PROVIDER WALLETS */}
      {/* ========================================================= */}
      {activeTab === 'wallets' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <Input
                placeholder="البحث باسم المتجر أو رقم الهاتف أو المعرف..."
                value={walletSearch}
                onChange={(e) => setWalletSearch(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface-50 text-surface-600 font-bold border-b border-surface-200">
                  <tr>
                    <th className="py-3.5 px-4">المزود / المتجر</th>
                    <th className="py-3.5 px-4">الرصيد المتاح للسحب</th>
                    <th className="py-3.5 px-4">المحجوز للسحب</th>
                    <th className="py-3.5 px-4">إجمالي الأرباح</th>
                    <th className="py-3.5 px-4">إجمالي المسحوب</th>
                    <th className="py-3.5 px-4">عمولات المنصة</th>
                    <th className="py-3.5 px-4">حالة المحفظة</th>
                    <th className="py-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {wallets?.map((w) => (
                    <tr key={w.id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-surface-900">{w.providerNameAr || 'متجر معتمد'}</div>
                        <div className="text-xs text-surface-400 dir-ltr text-right">{w.providerPhone || w.providerId}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-emerald-600 text-base">{w.availableBalance.toFixed(2)}</span>{' '}
                        <span className="text-xs font-bold text-surface-500">د.أ</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-amber-600">{w.heldBalance.toFixed(2)} د.أ</td>
                      <td className="py-3.5 px-4 font-bold text-surface-800">{w.totalEarned.toFixed(2)} د.أ</td>
                      <td className="py-3.5 px-4 text-surface-600">{w.totalWithdrawn.toFixed(2)} د.أ</td>
                      <td className="py-3.5 px-4 text-purple-600 font-semibold">{w.totalCommission.toFixed(2)} د.أ</td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            w.status === 'active'
                              ? 'success'
                              : w.status === 'locked'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {w.status === 'active'
                            ? 'نشطة'
                            : w.status === 'locked'
                            ? 'مقفلة'
                            : 'معلقة'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isSuperAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setAdjustmentModal({
                                isOpen: true,
                                providerId: w.providerId,
                                providerName: w.providerNameAr || w.providerId,
                              })
                            }
                          >
                            <Sliders className="w-3.5 h-3.5 ml-1" />
                            تعديل يدوي
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: LEDGER TRANSACTIONS */}
      {/* ========================================================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="w-56"
              >
                <option value="">جميع أنواع القيود المالية</option>
                <option value="CREDIT_ORDER_PAYMENT">أرباح تنفيذ الطلبات</option>
                <option value="DEBIT_WITHDRAWAL_REQUEST">طلب سحب رصيد</option>
                <option value="DEBIT_WITHDRAWAL_SETTLEMENT">تسوية وصرف سحب</option>
                <option value="CREDIT_WITHDRAWAL_REVERSAL">إلغاء واسترجاع سحب</option>
                <option value="DEBIT_REFUND">خصم استرجاع للعميل</option>
                <option value="CREDIT_BONUS_INCENTIVE">مكافأة تشجيعية</option>
                <option value="MANUAL_ADMIN_ADJUSTMENT">تعديل إداري يدوي</option>
              </Select>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface-50 text-surface-600 font-bold border-b border-surface-200">
                  <tr>
                    <th className="py-3.5 px-4">رقم القيد / التاريخ</th>
                    <th className="py-3.5 px-4">المزود</th>
                    <th className="py-3.5 px-4">نوع المعاملة</th>
                    <th className="py-3.5 px-4">المبلغ</th>
                    <th className="py-3.5 px-4">الرصيد قبل</th>
                    <th className="py-3.5 px-4">الرصيد بعد</th>
                    <th className="py-3.5 px-4">البيان المالي</th>
                    <th className="py-3.5 px-4 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {txData?.transactions?.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-surface-900 text-xs">{tx.transactionNumber}</div>
                        <div className="text-[11px] text-surface-400">
                          {new Date(tx.createdAt).toLocaleDateString('ar-JO')} {new Date(tx.createdAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-surface-800">{tx.providerNameAr || tx.providerId}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={tx.direction === 'credit' ? 'success' : 'danger'} className="gap-1">
                          {tx.direction === 'credit' ? (
                            <ArrowDownRight className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          {tx.type === 'CREDIT_ORDER_PAYMENT'
                            ? 'أرباح طلب'
                            : tx.type === 'DEBIT_WITHDRAWAL_REQUEST'
                            ? 'حجز سحب'
                            : tx.type === 'DEBIT_WITHDRAWAL_SETTLEMENT'
                            ? 'صرف سحب'
                            : tx.type === 'CREDIT_WITHDRAWAL_REVERSAL'
                            ? 'إرجاع سحب'
                            : tx.type === 'DEBIT_REFUND'
                            ? 'استرجاع عميل'
                            : 'تعديل مالي'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-black text-base ${
                            tx.direction === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {tx.direction === 'credit' ? '+' : '-'}
                          {tx.amount.toFixed(2)}
                        </span>{' '}
                        <span className="text-xs font-bold text-surface-500">د.أ</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-surface-500">{tx.balanceBefore.toFixed(2)} د.أ</td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-surface-800">
                        {tx.balanceAfter.toFixed(2)} د.أ
                      </td>
                      <td className="py-3.5 px-4 text-xs text-surface-600 max-w-xs truncate">{tx.descriptionAr}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-900"
                          title="عرض تفاصيل القيد الرياضي"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: WITHDRAWALS QUEUE */}
      {/* ========================================================= */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <Select
              value={wthStatusFilter}
              onChange={(e) => setWthStatusFilter(e.target.value)}
              className="w-48"
            >
              <option value="">جميع حالات السحب</option>
              <option value="requested">طلبات جديدة معلقة</option>
              <option value="approved">معتمدة جاهزة للصرف</option>
              <option value="paid">تم التحويل والصرف</option>
              <option value="rejected">مرفوضة ومسترجعة</option>
            </Select>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface-50 text-surface-600 font-bold border-b border-surface-200">
                  <tr>
                    <th className="py-3.5 px-4">رقم السحب / التاريخ</th>
                    <th className="py-3.5 px-4">المزود</th>
                    <th className="py-3.5 px-4">الحساب البنكي / الآيبان</th>
                    <th className="py-3.5 px-4">المبلغ المطلوب</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4">مرجع الصرف البنكي</th>
                    <th className="py-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {withdrawals?.map((w) => (
                    <tr key={w.id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-surface-900 text-xs">{w.withdrawalNumber}</div>
                        <div className="text-[11px] text-surface-400">
                          {new Date(w.requestedAt).toLocaleDateString('ar-JO')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-surface-900">{w.providerNameAr || w.providerId}</div>
                        <div className="text-xs text-surface-400">{w.providerPhone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-surface-800">{w.bankName || 'البنك الأردني'}</div>
                        <div className="font-mono text-xs text-surface-500 dir-ltr text-right">{w.maskedIban}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-base text-surface-900">{w.amount.toFixed(2)}</span>{' '}
                        <span className="text-xs font-bold text-surface-500">د.أ</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            w.status === 'paid'
                              ? 'success'
                              : w.status === 'approved'
                              ? 'info'
                              : w.status === 'requested'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {w.status === 'paid'
                            ? 'تم الصرف'
                            : w.status === 'approved'
                            ? 'معتمد للصرف'
                            : w.status === 'requested'
                            ? 'قيد المراجعة'
                            : 'مرفوض'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-surface-600">
                        {w.transactionReference || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {w.status === 'requested' && isSuperAdmin && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => approveWithdrawalMutation.mutate(w.id)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-emerald-600" />
                                موافقة
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-rose-600 hover:bg-rose-50"
                                onClick={() =>
                                  setRejectModal({
                                    isOpen: true,
                                    withdrawalId: w.id,
                                    wthNumber: w.withdrawalNumber,
                                  })
                                }
                              >
                                <XCircle className="w-3.5 h-3.5 ml-1" />
                                رفض
                              </Button>
                            </>
                          )}

                          {w.status === 'approved' && isSuperAdmin && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() =>
                                setSettleModal({
                                  isOpen: true,
                                  withdrawalId: w.id,
                                  amount: w.amount,
                                  wthNumber: w.withdrawalNumber,
                                })
                              }
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                              تأكيد الصرف
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: COMMISSION RULES */}
      {/* ========================================================= */}
      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-surface-900">قواعد العمولات المطبقة بالنظام</h3>
              <p className="text-xs text-surface-500">
                تسلسل الأولويات: (المزود + الخدمة) &gt; (المزود + التصنيف) &gt; (الخدمة فقط) &gt; (التصنيف فقط) &gt; (الافتراضي العام)
              </p>
            </div>
            {isSuperAdmin && (
              <Button variant="primary" size="sm" onClick={() => setCreateRuleModal(true)}>
                <Plus className="w-4 h-4 ml-1" />
                إضافة قاعدة عمولة جديدة
              </Button>
            )}
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface-50 text-surface-600 font-bold border-b border-surface-200">
                  <tr>
                    <th className="py-3.5 px-4">اسم القاعدة</th>
                    <th className="py-3.5 px-4">النوع</th>
                    <th className="py-3.5 px-4">النسبة / القيمة</th>
                    <th className="py-3.5 px-4">الحد الأدنى</th>
                    <th className="py-3.5 px-4">الحد الأقصى (السقف)</th>
                    <th className="py-3.5 px-4">توقيت التحصيل</th>
                    <th className="py-3.5 px-4">الأولوية</th>
                    <th className="py-3.5 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {commissionRules?.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-surface-900">{r.nameAr}</div>
                        <div className="text-xs text-surface-400">{r.nameEn}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="info">
                          {r.ruleType === 'percentage'
                            ? 'نسبة مئوية'
                            : r.ruleType === 'fixed'
                            ? 'مبلغ ثابت'
                            : 'هجينة (نسبة + ثابت)'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-black text-amber-600">
                        {r.ruleType === 'percentage'
                          ? `${r.percentageRate}%`
                          : r.ruleType === 'fixed'
                          ? `${r.fixedAmount} د.أ`
                          : `${r.percentageRate}% + ${r.fixedAmount} د.أ`}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-surface-700">{r.minCommission.toFixed(2)} د.أ</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-surface-700">
                        {r.maxCommission ? `${r.maxCommission.toFixed(2)} د.أ` : 'بدون سقف'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-surface-600">
                        {r.timing === 'on_service_completion' ? 'عند اكتمال الخدمة' : 'عند الدفع'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">{r.priority}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={r.isActive ? 'success' : 'danger'}>{r.isActive ? 'مفعلة' : 'معطلة'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: RECONCILIATION */}
      {/* ========================================================= */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-tr from-emerald-500/10 via-surface-50 to-surface-50 border border-emerald-500/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-surface-900">نظام المطابقة والتدقيق المالي التلقائي</h3>
                  <p className="text-xs text-surface-500 mt-0.5">
                    يقوم بمقارنة مجموع الحركات المقيدة في دفتر الأستاذ (Credits - Debits) مع الأرصدة الفعلية في محافظ المزودين
                  </p>
                </div>
              </div>

              {isSuperAdmin && (
                <Button
                  variant="primary"
                  isLoading={runReconciliationMutation.isPending}
                  onClick={() => runReconciliationMutation.mutate()}
                >
                  <RefreshCw className="w-4 h-4 ml-1.5" />
                  تشغيل فحص المطابقة الآن
                </Button>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-surface-200 font-bold text-surface-900">
              سجل عمليات التدقيق والمطابقة السابقة
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface-50 text-surface-600 font-bold border-b border-surface-200">
                  <tr>
                    <th className="py-3.5 px-4">رقم عملية التدقيق</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4">المحافظ المفحوصة</th>
                    <th className="py-3.5 px-4">الحركات المدققة</th>
                    <th className="py-3.5 px-4">فروقات الرصيد</th>
                    <th className="py-3.5 px-4">تاريخ التنفيذ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {reconciliationRuns?.map((run) => (
                    <tr key={run.id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs">{run.runNumber}</td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={run.status === 'completed' && run.totalDiscrepanciesFound === 0 ? 'success' : 'danger'}
                          className="gap-1"
                        >
                          {run.status === 'completed' && run.totalDiscrepanciesFound === 0 ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              متطابقة 100% (0 فروقات)
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              يوجد اختلافات ({run.totalDiscrepanciesFound})
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">{run.totalWalletsAudited} محفظة</td>
                      <td className="py-3.5 px-4 font-semibold">{run.totalTransactionsAudited} حركة قيود</td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-emerald-600">
                        {run.varianceAmount} د.أ
                      </td>
                      <td className="py-3.5 px-4 text-xs text-surface-500">
                        {new Date(run.createdAt).toLocaleString('ar-JO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MANUAL ADJUSTMENT */}
      {/* ========================================================= */}
      <Modal
        isOpen={adjustmentModal.isOpen}
        onClose={() => setAdjustmentModal({ isOpen: false, providerId: '', providerName: '' })}
        title={`إجراء قيد وتعديل مالي يدوي - ${adjustmentModal.providerName}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-surface-700 mb-1">نوع التعديل المالي</label>
            <Select
              value={adjType}
              onChange={(e: any) => {
                setAdjType(e.target.value);
                if (e.target.value === 'CREDIT_BONUS_INCENTIVE') setAdjDirection('credit');
                if (e.target.value === 'DEBIT_PENALTY_ADJUSTMENT') setAdjDirection('debit');
              }}
            >
              <option value="MANUAL_ADMIN_ADJUSTMENT">تعديل إداري عام</option>
              <option value="CREDIT_BONUS_INCENTIVE">مكافأة تشجيعية / حافز (إضافة للرصيد)</option>
              <option value="DEBIT_PENALTY_ADJUSTMENT">خصم جزائي / تسوية (خصم من الرصيد)</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-surface-700 mb-1">اتجاه المعاملة</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjDirection('credit')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  adjDirection === 'credit'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'border-surface-200 text-surface-600'
                }`}
              >
                + إضافة للرصيد (Credit)
              </button>
              <button
                type="button"
                onClick={() => setAdjDirection('debit')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  adjDirection === 'debit'
                    ? 'bg-rose-50 border-rose-500 text-rose-700'
                    : 'border-surface-200 text-surface-600'
                }`}
              >
                - خصم من الرصيد (Debit)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-surface-700 mb-1">المبلغ (د.أ)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-surface-700 mb-1">
              سبب التعديل المالي (إلزامي للتدقيق والامتثال)
            </label>
            <textarea
              className="w-full p-3 text-sm rounded-xl border border-surface-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              rows={3}
              placeholder="اكتب التوضيح والسبب بالتفصيل..."
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
            <Button
              variant="outline"
              onClick={() => setAdjustmentModal({ isOpen: false, providerId: '', providerName: '' })}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              isLoading={manualAdjustmentMutation.isPending}
              disabled={!adjAmount || Number(adjAmount) <= 0 || !adjReason.trim()}
              onClick={() =>
                manualAdjustmentMutation.mutate({
                  providerId: adjustmentModal.providerId,
                  payload: {
                    amount: Number(adjAmount),
                    type: adjType,
                    direction: adjDirection,
                    reason: adjReason.trim(),
                  },
                })
              }
            >
              تأكيد وتنفيذ القيد
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: SETTLE WITHDRAWAL */}
      {/* ========================================================= */}
      <Modal
        isOpen={settleModal.isOpen}
        onClose={() => setSettleModal({ isOpen: false, withdrawalId: '', amount: 0, wthNumber: '' })}
        title={`تأكيد تحويل وصرف السحب (${settleModal.wthNumber})`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-800 text-sm">
            المبلغ المصروف: <span className="font-bold">{settleModal.amount.toFixed(2)} د.أ</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-surface-700 mb-1">
              الرقم المرجعي للتحويل البنكي / إشعار الصرف (إلزامي)
            </label>
            <Input
              placeholder="مثال: CLIQ-987654321 أو BANK-TRANSFER-2026-09"
              value={txRef}
              onChange={(e) => setTxRef(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
            <Button
              variant="outline"
              onClick={() => setSettleModal({ isOpen: false, withdrawalId: '', amount: 0, wthNumber: '' })}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              isLoading={settleWithdrawalMutation.isPending}
              disabled={!txRef.trim()}
              onClick={() =>
                settleWithdrawalMutation.mutate({
                  id: settleModal.withdrawalId,
                  payload: { transactionReference: txRef.trim() },
                })
              }
            >
              تأكيد الصرف
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: REJECT WITHDRAWAL */}
      {/* ========================================================= */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, withdrawalId: '', wthNumber: '' })}
        title={`رفض طلب السحب (${rejectModal.wthNumber})`}
      >
        <div className="space-y-4">
          <p className="text-xs text-surface-500">
            عند الرفض، سيتم إلغاء السحب وإعادة المبلغ المحجوز بالكامل إلى الرصيد المتاح للمزود عبر قيد عكسي تلقائي.
          </p>

          <div>
            <label className="block text-xs font-bold text-surface-700 mb-1">سبب الرفض (إلزامي)</label>
            <textarea
              className="w-full p-3 text-sm rounded-xl border border-surface-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              rows={3}
              placeholder="سبب الرفض..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
            <Button variant="outline" onClick={() => setRejectModal({ isOpen: false, withdrawalId: '', wthNumber: '' })}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700"
              isLoading={rejectWithdrawalMutation.isPending}
              disabled={!rejectReason.trim()}
              onClick={() =>
                rejectWithdrawalMutation.mutate({
                  id: rejectModal.withdrawalId,
                  payload: { rejectionReason: rejectReason.trim() },
                })
              }
            >
              تأكيد الرفض وإعادة الرصيد
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: CREATE COMMISSION RULE */}
      {/* ========================================================= */}
      <Modal
        isOpen={createRuleModal}
        onClose={() => setCreateRuleModal(false)}
        title="إنشاء قاعدة عمولة ديناميكية جديدة"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1">اسم القاعدة (عربي)</label>
              <Input
                placeholder="عمولة خدمات التنظيف"
                value={ruleNameAr}
                onChange={(e) => setRuleNameAr(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1">اسم القاعدة (إنجليزي)</label>
              <Input
                placeholder="Cleaning Services Commission"
                value={ruleNameEn}
                onChange={(e) => setRuleNameEn(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1">نوع الحساب</label>
              <Select value={ruleType} onChange={(e: any) => setRuleType(e.target.value)}>
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (د.أ)</option>
                <option value="hybrid">هجينة (نسبة + ثابت)</option>
              </Select>
            </div>
            <div>
              {ruleType === 'fixed' ? (
                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">المبلغ الثابت (د.أ)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="1.00"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">النسبة المئوية (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="10.0"
                    value={percentageRate}
                    onChange={(e) => setPercentageRate(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1">الحد الأدنى للعمولة (د.أ)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="0.50"
                value={minCommission}
                onChange={(e) => setMinCommission(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1">الحد الأقصى للعمولة (السقف)</label>
              <Input
                type="number"
                step="1"
                placeholder="بدون سقف"
                value={maxCommission}
                onChange={(e) => setMaxCommission(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-surface-700 mb-1">توقيت احتساب العمولة</label>
            <Select value={ruleTiming} onChange={(e: any) => setRuleTiming(e.target.value)}>
              <option value="on_service_completion">عند اكتمال الخدمة بنجاح (موصى به)</option>
              <option value="on_order_created">فور إنشاء وتأكيد الطلب</option>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
            <Button variant="outline" onClick={() => setCreateRuleModal(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              isLoading={createRuleMutation.isPending}
              disabled={!ruleNameAr.trim() || !ruleNameEn.trim()}
              onClick={() =>
                createRuleMutation.mutate({
                  nameAr: ruleNameAr.trim(),
                  nameEn: ruleNameEn.trim(),
                  ruleType,
                  percentageRate: Number(percentageRate),
                  fixedAmount: Number(fixedAmount),
                  minCommission: Number(minCommission),
                  maxCommission: maxCommission ? Number(maxCommission) : null,
                  timing: ruleTiming,
                })
              }
            >
              حفظ وتفعيل القاعدة
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: TRANSACTION DETAILS */}
      {/* ========================================================= */}
      <Modal
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title={`تفاصيل القيد المحاسبي (${selectedTx?.transactionNumber})`}
      >
        {selectedTx && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-surface-50 rounded-xl space-y-1">
              <div>
                <span className="text-surface-500">البيان:</span>{' '}
                <span className="font-bold text-surface-900">{selectedTx.descriptionAr}</span>
              </div>
              <div>
                <span className="text-surface-500">المبلغ:</span>{' '}
                <span className="font-black text-sm text-surface-900">{selectedTx.amount.toFixed(2)} د.أ</span>
              </div>
              <div>
                <span className="text-surface-500">المرجع:</span>{' '}
                <span className="font-mono">{selectedTx.referenceType} #{selectedTx.referenceId}</span>
              </div>
            </div>

            <div className="p-3 bg-surface-900 text-surface-100 rounded-xl font-mono text-[11px] overflow-x-auto">
              <pre>{JSON.stringify(selectedTx.metadata, null, 2)}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
