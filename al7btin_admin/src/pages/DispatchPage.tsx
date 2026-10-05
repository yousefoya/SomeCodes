import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  dispatchApi,
  DispatchOrder,
  DispatchSettings,
} from '../api/dispatch.api';
import { useToast } from '../contexts/ToastContext';
import { StatCard } from '../components/shared/StatCard';
import { SearchInput } from '../components/shared/SearchInput';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import {
  Radio,
  Clock,
  AlertTriangle,
  CheckCircle,
  Truck,
  RefreshCw,
  Eye,
  UserCheck,
  Sliders,
  MapPin,
  Star,
  Zap,
} from 'lucide-react';

export const DispatchPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unassigned' | 'offered' | 'in_progress' | 'completed'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualAssignOpen, setIsManualAssignOpen] = useState(false);
  const [manualProviderId, setManualProviderId] = useState('');
  const [manualAssignNotes, setManualAssignNotes] = useState('');

  // 1. Fetch Dispatch Analytics KPIs
  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['dispatch-analytics'],
    queryFn: dispatchApi.getAnalytics,
    refetchInterval: 15000,
  });

  // 2. Fetch Dispatch Queue
  const { data: queueData, isLoading, isError, error, refetch: refetchQueue } = useQuery({
    queryKey: ['dispatch-queue', { page, search, filter: activeFilter }],
    queryFn: () =>
      dispatchApi.getQueue({
        page,
        limit: 15,
        search: search || undefined,
        filter: activeFilter !== 'all' ? activeFilter : undefined,
      }),
    refetchInterval: 10000,
  });

  // 3. Fetch Order Dispatch Detail on demand
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['dispatch-detail', selectedOrderId],
    queryFn: () => (selectedOrderId ? dispatchApi.getDetail(selectedOrderId) : null),
    enabled: !!selectedOrderId && isDetailOpen,
  });

  // 4. Fetch Dispatch Settings
  const { data: settingsData } = useQuery({
    queryKey: ['dispatch-settings'],
    queryFn: dispatchApi.getSettings,
  });

  const [settingsForm, setSettingsForm] = useState<Partial<DispatchSettings>>({});

  // Mutations
  const manualAssignMutation = useMutation({
    mutationFn: ({ orderId, providerId, notes }: { orderId: string; providerId: string; notes?: string }) =>
      dispatchApi.manualAssign(orderId, providerId, notes),
    onSuccess: (data) => {
      success(data.message || 'تم تعيين المزود للطلب بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['dispatch-queue'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-analytics'] });
      if (selectedOrderId) queryClient.invalidateQueries({ queryKey: ['dispatch-detail', selectedOrderId] });
      setIsManualAssignOpen(false);
      setManualProviderId('');
      setManualAssignNotes('');
    },
    onError: (err: Error) => toastError(err.message || 'فشل تعيين المزود.'),
  });

  const retryDispatchMutation = useMutation({
    mutationFn: (orderId: string) => dispatchApi.retryDispatch(orderId),
    onSuccess: (data) => {
      success(data.message || 'تم بدء جولة توزيع جديدة بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['dispatch-queue'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-analytics'] });
      if (selectedOrderId) queryClient.invalidateQueries({ queryKey: ['dispatch-detail', selectedOrderId] });
    },
    onError: (err: Error) => toastError(err.message || 'فشل إعادة التوزيع.'),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: Partial<DispatchSettings>) => dispatchApi.updateSettings(payload),
    onSuccess: () => {
      success('تم تحديث إعدادات التوزيع الذكي بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['dispatch-settings'] });
      setIsSettingsOpen(false);
    },
    onError: (err: Error) => toastError(err.message || 'فشل حفظ الإعدادات.'),
  });

  const handleOpenDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDetailOpen(true);
  };

  const handleOpenManualAssign = (orderId: string) => {
    setSelectedOrderId(orderId);
    setManualProviderId('');
    setManualAssignNotes('');
    setIsManualAssignOpen(true);
  };

  const handleOpenSettings = () => {
    if (settingsData) {
      setSettingsForm(settingsData);
    }
    setIsSettingsOpen(true);
  };

  const renderStatusBadge = (order: DispatchOrder) => {
    if (order.isEscalated) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          مصعد للعمليات
        </span>
      );
    }

    switch (order.status) {
      case 'offered_to_driver':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Radio className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            عرض قيد الانتظار
          </span>
        );
      case 'assigned':
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            معين ومقبول
          </span>
        );
      case 'going_to_customer':
      case 'going_to_pickup':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            في الطريق للعميل
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            مكتمل بنجاح
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-100 text-surface-700 border border-surface-200">
            {order.status}
          </span>
        );
    }
  };

  const queueList = queueData?.data || [];
  const pagination = queueData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
              مركز التوزيع والعمليات الذكية
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              Phase 5 Active
            </span>
          </div>
          <p className="text-sm text-surface-500 mt-1">
            نظام التوزيع الذكي والمطابقة الحتمية، متابعة العروض الفورية، وإدارة التصعيد والتدخل اليدوي
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSettings}
            className="flex items-center gap-2"
          >
            <Sliders className="w-4 h-4 text-surface-600" />
            إعدادات الخوارزمية
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              refetchQueue();
              refetchAnalytics();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث القائمة
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="الطلبات المصعدة والمعلقة"
          value={analytics?.overview.escalatedCount ?? 0}
          icon={<AlertTriangle className="w-6 h-6" />}
          subtitle="تتطلب تدخل فوري من الإدارة"
          color="amber"
        />
        <StatCard
          title="عروض مرسلة قيد الانتظار"
          value={analytics?.overview.offeredCount ?? 0}
          icon={<Radio className="w-6 h-6" />}
          subtitle="بانتظار موافقة المزود خلال المهلة"
          color="sky"
        />
        <StatCard
          title="طلبات قيد التنفيذ"
          value={analytics?.overview.assignedCount ?? 0}
          icon={<Truck className="w-6 h-6" />}
          subtitle="فنيين في الميدان حالياً"
          color="brand"
        />
        <StatCard
          title="نسبة قبول العروض الفورية"
          value={`${analytics?.offers.acceptanceRate ?? 100}%`}
          icon={<Zap className="w-6 h-6" />}
          subtitle={`متوسط سرعة الاستجابة ${analytics?.offers.avgResponseTimeSeconds ?? 15} ثانية`}
          color="emerald"
        />
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-surface-200 p-4 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'كافة الطلبات' },
              { id: 'unassigned', label: 'بحاجة توزيع / مصعد' },
              { id: 'offered', label: 'عروض نشطة' },
              { id: 'in_progress', label: 'قيد التنفيذ' },
              { id: 'completed', label: 'المكتملة' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveFilter(tab.id as any);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === tab.id
                    ? 'bg-surface-900 text-white shadow-sm'
                    : 'bg-surface-50 text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full lg:w-72">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="بحث برقم الطلب، العميل، المنطقة..."
            />
          </div>
        </div>

        {/* Dispatch Queue Table */}
        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : isError ? (
          <ErrorState message={(error as Error).message || 'تعذر تحميل قائمة التوزيع'} onRetry={refetchQueue} />
        ) : queueList.length === 0 ? (
          <EmptyState
            title="لا توجد طلبات في قائمة التوزيع"
            description="جميع الطلبات تم توزيعها وتلبيتها بنجاح ولا توجد حالات معلقة حالياً."
            icon={<CheckCircle className="w-12 h-12 text-emerald-500" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>رقم الطلب</TableHeaderCell>
                  <TableHeaderCell>العميل والموقع</TableHeaderCell>
                  <TableHeaderCell>الخدمة والمبلغ</TableHeaderCell>
                  <TableHeaderCell>المزود المعين / العرض الحالي</TableHeaderCell>
                  <TableHeaderCell>حالة التوزيع</TableHeaderCell>
                  <TableHeaderCell className="text-left">الإجراءات</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queueList.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-mono text-xs font-bold text-surface-900">{order.id}</div>
                      <div className="text-[11px] text-surface-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-bold text-surface-900">{order.customerName}</div>
                      <div className="flex items-center gap-1 text-[11px] text-surface-500 mt-0.5">
                        <MapPin className="w-3 h-3 text-surface-400" />
                        {order.deliveryArea}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold text-surface-800">
                        {order.items[0]?.titleAr || order.categoryNameAr || 'خدمة مخصصة'}
                      </div>
                      <div className="text-xs font-bold text-brand-600 mt-0.5">
                        {order.totalAmount.toFixed(2)} د.أ
                      </div>
                    </TableCell>

                    <TableCell>
                      {order.providerName ? (
                        <div>
                          <div className="text-xs font-bold text-surface-900">{order.providerName}</div>
                          {order.providerPhone && (
                            <div className="text-[11px] text-surface-500">{order.providerPhone}</div>
                          )}
                        </div>
                      ) : order.latestOffer ? (
                        <div>
                          <div className="text-xs font-semibold text-amber-800">
                            عرض موجه للمزود ({order.latestOffer.providerId})
                          </div>
                          <div className="text-[11px] text-amber-600">
                            نتيجة المطابقة: {order.latestOffer.score}/100
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-surface-400 italic">غير معين</span>
                      )}
                    </TableCell>

                    <TableCell>{renderStatusBadge(order)}</TableCell>

                    <TableCell className="text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(order.id)}
                          className="h-8 px-2.5 text-xs flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-surface-600" />
                          فحص المطابقة
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenManualAssign(order.id)}
                          className="h-8 px-2.5 text-xs flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-surface-700" />
                          تعيين
                        </Button>
                        {order.isEscalated && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => retryDispatchMutation.mutate(order.id)}
                            disabled={retryDispatchMutation.isPending}
                            className="h-8 px-2.5 text-xs flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${retryDispatchMutation.isPending ? 'animate-spin' : ''}`} />
                            إعادة التوزيع
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pagination && pagination.count > 0 && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(pagination.count / pagination.limit) || 1}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Candidate Scoring Breakdown & Dispatch Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`فحص خوارزمية التوزيع والمطابقة — طلب ${selectedOrderId || ''}`}
        maxWidth="4xl"
      >
        {isDetailLoading || !detailData ? (
          <div className="py-12 text-center">
            <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-surface-600">جاري تحليل نتائج المطابقة وسجل المحاولات...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Summary Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-surface-50 rounded-2xl border border-surface-200 text-xs">
              <div>
                <span className="text-surface-400 block mb-0.5">العميل والموقع</span>
                <span className="font-bold text-surface-900 block">{detailData.order.customerName}</span>
                <span className="text-surface-600">{detailData.order.deliveryArea}</span>
              </div>
              <div>
                <span className="text-surface-400 block mb-0.5">الخدمة المطلوبة</span>
                <span className="font-bold text-surface-900 block">{detailData.order.items[0]?.titleAr || detailData.order.serviceCategoryId}</span>
                <span className="text-surface-600">{detailData.order.totalAmount.toFixed(2)} د.أ</span>
              </div>
              <div>
                <span className="text-surface-400 block mb-0.5">حالة التوزيع الحالية</span>
                {renderStatusBadge(detailData.order)}
              </div>
              <div>
                <span className="text-surface-400 block mb-0.5">المزود المعين حالياً</span>
                <span className="font-bold text-surface-900 block">{detailData.order.providerName || 'غير معين بعد'}</span>
                {detailData.order.providerPhone && <span className="text-surface-600">{detailData.order.providerPhone}</span>}
              </div>
            </div>

            {/* Historical Dispatch Attempts */}
            {detailData.offers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-surface-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-surface-500" />
                  سجل محاولات التوزيع السابقة ({detailData.offers.length} محاولات)
                </h4>
                <div className="space-y-2">
                  {detailData.offers.map((off) => (
                    <div
                      key={off.id}
                      className="p-3 bg-white rounded-xl border border-surface-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-surface-700">محاولة #{off.attemptNumber}</span>
                        <span className="text-surface-900 font-semibold">{off.providerName}</span>
                        <span className="text-surface-500 font-mono">({off.score}/100)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            off.status === 'accepted'
                              ? 'bg-emerald-50 text-emerald-700'
                              : off.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700'
                              : off.status === 'expired'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-surface-100 text-surface-600'
                          }`}
                        >
                          {off.status === 'accepted'
                            ? 'تم القبول'
                            : off.status === 'rejected'
                            ? `مرفوض: ${off.rejectionReason || 'بدون سبب'}`
                            : off.status === 'expired'
                            ? 'انتهت المهلة'
                            : off.status}
                        </span>
                        <span className="text-[11px] text-surface-400">
                          {new Date(off.offeredAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Ranked Candidates Scoring Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-surface-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-brand-600" />
                  تحليل وترتيب المزودين المؤهلين (خوارزمية المرحلة الأولى والثانية)
                </h4>
                <span className="text-xs font-semibold text-brand-600">
                  {detailData.totalEligibleCandidates} مزود مؤهل ومتاح
                </span>
              </div>

              {detailData.liveCandidates.length === 0 ? (
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-amber-900">
                    لا يوجد مزودين مؤهلين ومتاحين حالياً لهذا الطلب.
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    يرجى مراجعة المتطلبات الفنية أو استخدام التعيين اليدوي لتحديد مزود مباشر.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detailData.liveCandidates.map((cand, idx) => (
                    <div
                      key={cand.providerId}
                      className="p-4 bg-white rounded-2xl border border-surface-200 hover:border-brand-300 transition-all shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-bold flex items-center justify-center border border-brand-200">
                            {idx + 1}
                          </span>
                          <div>
                            <h5 className="text-sm font-bold text-surface-900">{cand.nameAr}</h5>
                            <div className="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-surface-400" />
                                {cand.distanceKm} كم
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                {cand.rating} نجوم
                              </span>
                              <span>{cand.activeOrdersCount} طلب نشط</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-lg font-black text-brand-600 font-mono leading-none">
                              {cand.score}
                            </div>
                            <span className="text-[10px] text-surface-400 font-semibold">درجة المطابقة الكلية</span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              manualAssignMutation.mutate({
                                orderId: detailData.order.id,
                                providerId: cand.providerId,
                                notes: `تعيين مباشر للمرشح الأفضل بنتيجة مطابقة ${cand.score}/100`,
                              });
                            }}
                            className="h-8 px-3 text-xs flex items-center gap-1 bg-surface-900 hover:bg-surface-800 text-white"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            تعيين هذا المزود
                          </Button>
                        </div>
                      </div>

                      {/* Explainable Score Progress Bars */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-surface-100 text-[11px]">
                        <div>
                          <div className="flex justify-between text-surface-500 mb-1">
                            <span>القرب ({cand.distanceKm}كم)</span>
                            <span className="font-bold text-surface-700">{cand.breakdown.distanceScore}</span>
                          </div>
                          <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${cand.breakdown.distanceScore}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-surface-500 mb-1">
                            <span>التقييم ({cand.rating}★)</span>
                            <span className="font-bold text-surface-700">{cand.breakdown.ratingScore}</span>
                          </div>
                          <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${cand.breakdown.ratingScore}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-surface-500 mb-1">
                            <span>القدرة التشغيلية</span>
                            <span className="font-bold text-surface-700">{cand.breakdown.workloadScore}</span>
                          </div>
                          <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${cand.breakdown.workloadScore}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-surface-500 mb-1">
                            <span>المتطلبات الفنية</span>
                            <span className="font-bold text-surface-700">{cand.breakdown.capabilityScore}</span>
                          </div>
                          <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${cand.breakdown.capabilityScore}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-surface-500 mb-1">
                            <span>معدل القبول</span>
                            <span className="font-bold text-surface-700">{cand.breakdown.acceptanceRateScore}</span>
                          </div>
                          <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${cand.breakdown.acceptanceRateScore}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Manual Provider Assignment Dialog */}
      <Modal
        isOpen={isManualAssignOpen}
        onClose={() => setIsManualAssignOpen(false)}
        title={`التعيين اليدوي للمزود — طلب ${selectedOrderId || ''}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-surface-600">
            يمكن لإدارة العمليات تجاوز خوارزمية التوزيع التلقائي وتعيين مزود خدمة محدد مباشرة لهذا الطلب.
          </p>

          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              معرّف أو كود المزود (Provider ID)
            </label>
            <Input
              value={manualProviderId}
              onChange={(e) => setManualProviderId(e.target.value)}
              placeholder="مثال: prov_gas_01 أو prov_cleaning_01"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              ملاحظات التعيين والسبب التشغيلي (اختياري)
            </label>
            <Input
              value={manualAssignNotes}
              onChange={(e) => setManualAssignNotes(e.target.value)}
              placeholder="مثال: طلب خاص من العميل أو تعيين فوري بعد تعذر التوزيع التلقائي"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
            <Button variant="outline" size="sm" onClick={() => setIsManualAssignOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!manualProviderId.trim() || manualAssignMutation.isPending}
              onClick={() => {
                if (selectedOrderId && manualProviderId.trim()) {
                  manualAssignMutation.mutate({
                    orderId: selectedOrderId,
                    providerId: manualProviderId.trim(),
                    notes: manualAssignNotes.trim() || undefined,
                  });
                }
              }}
            >
              {manualAssignMutation.isPending ? 'جاري التعيين...' : 'تأكيد التعيين المباشر'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dispatch Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="إعدادات وأوزان خوارزمية التوزيع الذكي (Dispatch Configuration)"
        maxWidth="xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-surface-600">
            تحكم في مدة مهلة العروض، عدد المحاولات قبل التصعيد، وأوزان معايير التقييم الذكي.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                مهلة قبول العرض (بالثواني)
              </label>
              <Input
                type="number"
                value={settingsForm.offerTimeoutSeconds ?? 90}
                onChange={(e) => setSettingsForm({ ...settingsForm, offerTimeoutSeconds: parseInt(e.target.value, 10) || 90 })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                أقصى محاولات قبل التصعيد
              </label>
              <Input
                type="number"
                value={settingsForm.maxRetryAttempts ?? 3}
                onChange={(e) => setSettingsForm({ ...settingsForm, maxRetryAttempts: parseInt(e.target.value, 10) || 3 })}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-surface-100">
            <h5 className="text-xs font-bold text-surface-800 uppercase tracking-wider">
              أوزان معايير التقييم (مجموع الأوزان = 1.0)
            </h5>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">وزن المسافة (Distance)</label>
                <Input
                  type="number"
                  step="0.05"
                  value={settingsForm.distanceWeight ?? 0.30}
                  onChange={(e) => setSettingsForm({ ...settingsForm, distanceWeight: parseFloat(e.target.value) || 0.3 })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">وزن التقييم (Rating)</label>
                <Input
                  type="number"
                  step="0.05"
                  value={settingsForm.ratingWeight ?? 0.25}
                  onChange={(e) => setSettingsForm({ ...settingsForm, ratingWeight: parseFloat(e.target.value) || 0.25 })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">وزن العبء (Workload)</label>
                <Input
                  type="number"
                  step="0.05"
                  value={settingsForm.workloadWeight ?? 0.20}
                  onChange={(e) => setSettingsForm({ ...settingsForm, workloadWeight: parseFloat(e.target.value) || 0.2 })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">وزن المتطلبات (Capability)</label>
                <Input
                  type="number"
                  step="0.05"
                  value={settingsForm.capabilityWeight ?? 0.15}
                  onChange={(e) => setSettingsForm({ ...settingsForm, capabilityWeight: parseFloat(e.target.value) || 0.15 })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">وزن القبول (Acceptance)</label>
                <Input
                  type="number"
                  step="0.05"
                  value={settingsForm.acceptanceRateWeight ?? 0.10}
                  onChange={(e) => setSettingsForm({ ...settingsForm, acceptanceRateWeight: parseFloat(e.target.value) || 0.1 })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">أقصى نطاق خدمة (كم)</label>
                <Input
                  type="number"
                  value={settingsForm.maxServiceRadiusKm ?? 35.0}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxServiceRadiusKm: parseFloat(e.target.value) || 35.0 })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={updateSettingsMutation.isPending}
              onClick={() => updateSettingsMutation.mutate(settingsForm)}
            >
              {updateSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
