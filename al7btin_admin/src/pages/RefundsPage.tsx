import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { refundsApi } from '../api/refunds.api';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { RefundRequest, RefundStatus } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';

export const RefundsPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError, info } = useToast();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newOrderId, setNewOrderId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Selected Refund for Review / Approval / Rejection / Processing
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [actionType, setActionType] = useState<'review' | 'approve' | 'reject' | 'process' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [gatewayReference, setGatewayReference] = useState('');
  const [actionNotes, setActionNotes] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['refunds', page, search, statusFilter],
    queryFn: () =>
      refundsApi.getRefundRequests({
        page,
        limit: 15,
        search,
        status: statusFilter,
      }),
  });

  // Request Refund Mutation
  const requestMutation = useMutation({
    mutationFn: refundsApi.createRefundRequest,
    onSuccess: () => {
      success('تم رفع طلب الاسترجاع بنجاح للمراجعة والاعتماد.');
      setIsRequestModalOpen(false);
      setNewOrderId('');
      setNewAmount('');
      setNewReason('');
      setNewNotes('');
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  // Review Refund Mutation
  const reviewMutation = useMutation({
    mutationFn: (refundId: string) => refundsApi.reviewRefundRequest(refundId, actionNotes),
    onSuccess: () => {
      success('تم نقل طلب الاسترجاع إلى حالة قيد المراجعة.');
      setSelectedRefund(null);
      setActionType(null);
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  // Approve Refund Mutation
  const approveMutation = useMutation({
    mutationFn: (refundId: string) => refundsApi.approveRefundRequest(refundId, actionNotes),
    onSuccess: () => {
      success('تمت الموافقة على طلب الاسترجاع بنجاح.');
      setSelectedRefund(null);
      setActionType(null);
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  // Reject Refund Mutation
  const rejectMutation = useMutation({
    mutationFn: (refundId: string) =>
      refundsApi.rejectRefundRequest(refundId, rejectionReason, actionNotes),
    onSuccess: () => {
      info('تم رفض طلب الاسترجاع وتسجيل سبب الرفض.');
      setSelectedRefund(null);
      setActionType(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  // Process Refund Mutation
  const processMutation = useMutation({
    mutationFn: (refundId: string) =>
      refundsApi.processRefundRequest(refundId, gatewayReference, actionNotes),
    onSuccess: () => {
      success('تم تأكيد تنفيذ الاسترجاع وتسوية التعويض.');
      setSelectedRefund(null);
      setActionType(null);
      setGatewayReference('');
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  const getRefundStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case 'requested':
        return <Badge variant="warning">{t.refunds.status.requested}</Badge>;
      case 'under_review':
        return <Badge variant="info">{t.refunds.status.under_review}</Badge>;
      case 'approved':
        return <Badge variant="success">{t.refunds.status.approved}</Badge>;
      case 'rejected':
        return <Badge variant="danger">{t.refunds.status.rejected}</Badge>;
      case 'processed':
        return <Badge variant="success">{t.refunds.status.processed}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const handleOpenActionModal = (refund: RefundRequest, action: 'review' | 'approve' | 'reject' | 'process') => {
    setSelectedRefund(refund);
    setActionType(action);
    setActionNotes('');
    setRejectionReason('');
    setGatewayReference('');
  };

  if (isError) {
    return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-brand-600" />
            {t.refunds.title}
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 mt-1">
            {t.refunds.subtitle}
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsRequestModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5 rtl:mr-0 rtl:ml-1.5" />
          {t.refunds.requestRefund}
        </Button>
      </div>

      {/* Safety Notice Card */}
      <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <p className="font-bold">{t.refunds.safetyNotice}</p>
          <p className="text-amber-700 mt-0.5">
            المنصة تعتمد نظام الدفع عند الاستلام ولا تستخدم بوابات دفع إلكترونية تلقائية. يمر الاسترجاع بمراحل مراجعة واعتماد إدارية قبل تأكيد التسوية النقدية للعميل.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-3 ltr:left-3 rtl:right-3 text-surface-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="بحث برقم الاسترجاع، رقم الطلب، أو السبب..."
              className="ltr:pl-9 rtl:pr-9 text-xs"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'جميع الحالات' },
              { value: 'requested', label: t.refunds.status.requested },
              { value: 'under_review', label: t.refunds.status.under_review },
              { value: 'approved', label: t.refunds.status.approved },
              { value: 'rejected', label: t.refunds.status.rejected },
              { value: 'processed', label: t.refunds.status.processed },
            ]}
          />
        </div>
      </Card>

      {/* Refunds Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : data && data.refunds.length > 0 ? (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t.refunds.table.refundNumber}</TableHeaderCell>
                  <TableHeaderCell>{t.refunds.table.orderId}</TableHeaderCell>
                  <TableHeaderCell>{t.refunds.table.customer}</TableHeaderCell>
                  <TableHeaderCell>{t.refunds.table.amount}</TableHeaderCell>
                  <TableHeaderCell>{t.refunds.table.reason}</TableHeaderCell>
                  <TableHeaderCell>{t.refunds.table.status}</TableHeaderCell>
                  <TableHeaderCell>{t.refunds.table.requestedBy}</TableHeaderCell>
                  <TableHeaderCell className="text-center">{t.refunds.table.actions}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.refunds.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-bold text-xs text-brand-700">
                      {r.refundNumber}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-xs text-surface-900">
                      {r.orderId}
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-surface-900 text-xs">{r.customerName}</p>
                      <p className="font-mono text-[11px] text-surface-500">{r.customerPhone}</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-extrabold text-surface-900 text-xs">
                        {r.amount.toFixed(2)} د.أ
                      </span>
                      <span className="block text-[10px] text-surface-400">
                        الحد الأقصى: {r.maxRefundableAmount.toFixed(2)} د.أ
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-surface-700 max-w-xs truncate">
                      {r.reason}
                    </TableCell>
                    <TableCell>{getRefundStatusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs text-surface-600">
                      {r.requestedByName || 'موظف خدمة العملاء'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Manager / Admin Actions */}
                        {hasPermission('approve_refunds') && r.status === 'requested' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-[11px] py-1 px-2 h-auto text-blue-700"
                            onClick={() => handleOpenActionModal(r, 'review')}
                          >
                            مراجعة
                          </Button>
                        )}
                        {hasPermission('approve_refunds') && (r.status === 'requested' || r.status === 'under_review') && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-[11px] py-1 px-2 h-auto text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                              onClick={() => handleOpenActionModal(r, 'approve')}
                            >
                              موافقة
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-[11px] py-1 px-2 h-auto text-rose-700 bg-rose-50 hover:bg-rose-100"
                              onClick={() => handleOpenActionModal(r, 'reject')}
                            >
                              رفض
                            </Button>
                          </>
                        )}
                        {hasPermission('execute_refunds') && r.status === 'approved' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-[11px] py-1 px-2.5 h-auto bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleOpenActionModal(r, 'process')}
                          >
                            تأكيد التسوية
                          </Button>
                        )}
                        {r.status === 'processed' && (
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تم الصرف
                          </span>
                        )}
                        {r.status === 'rejected' && (
                          <span className="text-[11px] text-rose-600 font-semibold" title={r.rejectionReason || ''}>
                            {r.rejectionReason || 'مرفوض'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="p-4 border-t border-surface-100 flex items-center justify-between">
              <span className="text-xs text-surface-500">
                إجمالي الطلبات: <span className="font-bold text-surface-800">{data.total}</span>
              </span>
              <Pagination
                currentPage={page}
                totalPages={data.totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-surface-400 text-xs">
            {t.refunds.empty}
          </div>
        )}
      </Card>

      {/* Request Refund Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title={t.refunds.form.createTitle}
      >
        <div className="space-y-4">
          <Input
            label={t.refunds.form.orderId}
            value={newOrderId}
            onChange={(e) => setNewOrderId(e.target.value)}
            placeholder="ORD-XXXXX"
          />
          <Input
            label={t.refunds.form.amount}
            type="number"
            step="0.5"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="0.00"
          />
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              {t.refunds.form.reason}
            </label>
            <textarea
              rows={3}
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="اذكر سبب طلب الاسترجاع..."
              className="w-full p-3 rounded-xl border border-surface-200 text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              {t.refunds.form.notes}
            </label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="ملاحظات إضافية (اختياري)..."
              className="w-full p-3 rounded-xl border border-surface-200 text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsRequestModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              disabled={!newOrderId.trim() || !newAmount || !newReason.trim() || requestMutation.isPending}
              onClick={() =>
                requestMutation.mutate({
                  orderId: newOrderId.trim(),
                  amount: parseFloat(newAmount),
                  reason: newReason,
                  notes: newNotes,
                })
              }
            >
              {requestMutation.isPending ? t.common.loading : t.refunds.form.submit}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Action Dialog Modal (Review / Approve / Reject / Process) */}
      {selectedRefund && actionType && (
        <Modal
          isOpen={!!selectedRefund && !!actionType}
          onClose={() => {
            setSelectedRefund(null);
            setActionType(null);
          }}
          title={`إجراء استرجاع مالي - ${selectedRefund.refundNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-surface-50 border border-surface-200 rounded-xl space-y-1">
              <div className="flex justify-between font-bold text-surface-900">
                <span>طلب الشراء: {selectedRefund.orderId}</span>
                <span>المبلغ: {selectedRefund.amount.toFixed(2)} د.أ</span>
              </div>
              <p className="text-surface-600 mt-1">السبب: {selectedRefund.reason}</p>
            </div>

            {actionType === 'reject' && (
              <div>
                <label className="block text-xs font-bold text-rose-700 mb-1">
                  {t.refunds.actions.rejectionReasonPrompt}
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="اكتب سبب الرفض هنا..."
                  className="w-full p-2.5 rounded-xl border border-rose-200 text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            )}

            {actionType === 'process' && (
              <div>
                <label className="block text-xs font-bold text-surface-800 mb-1">
                  {t.refunds.actions.gatewayReferencePrompt}
                </label>
                <Input
                  value={gatewayReference}
                  onChange={(e) => setGatewayReference(e.target.value)}
                  placeholder="مثال: CASH-VOUCHER-901 / تسوية نقدية"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                ملاحظات المتابعة (اختياري):
              </label>
              <textarea
                rows={2}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="ملاحظات إدارية داخلية..."
                className="w-full p-2.5 rounded-xl border border-surface-200 text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedRefund(null);
                  setActionType(null);
                }}
              >
                {t.common.cancel}
              </Button>

              {actionType === 'review' && (
                <Button
                  variant="primary"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate(selectedRefund.id)}
                >
                  {reviewMutation.isPending ? t.common.loading : t.refunds.actions.review}
                </Button>
              )}

              {actionType === 'approve' && (
                <Button
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(selectedRefund.id)}
                >
                  {approveMutation.isPending ? t.common.loading : t.refunds.actions.approve}
                </Button>
              )}

              {actionType === 'reject' && (
                <Button
                  variant="danger"
                  disabled={!rejectionReason.trim() || rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate(selectedRefund.id)}
                >
                  {rejectMutation.isPending ? t.common.loading : t.refunds.actions.reject}
                </Button>
              )}

              {actionType === 'process' && (
                <Button
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={processMutation.isPending}
                  onClick={() => processMutation.mutate(selectedRefund.id)}
                >
                  {processMutation.isPending ? t.common.loading : t.refunds.actions.process}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
