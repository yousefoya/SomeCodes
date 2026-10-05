import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponsApi, CreateCouponPayload } from '../api/coupons.api';
import { Coupon } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Ticket, Plus, Edit2, Trash2 } from 'lucide-react';

export const CouponsPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateCouponPayload>({
    code: '',
    type: 'percentage',
    value: 10,
    minOrderValue: 0,
    expiryDate: '',
    usageLimit: 1000,
    isActive: true,
  });

  const { data: coupons, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: couponsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCouponPayload) => couponsApi.create(payload),
    onSuccess: () => {
      success('تم إنشاء كود الخصم بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => toastError(err.message || 'فشل إنشاء الكوبون.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateCouponPayload> }) =>
      couponsApi.update(id, payload),
    onSuccess: () => {
      success('تم تحديث بيانات الكوبون بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setEditingCoupon(null);
      resetForm();
    },
    onError: (err: Error) => toastError(err.message || 'فشل تحديث الكوبون.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponsApi.delete(id),
    onSuccess: () => {
      success('تم حذف الكوبون بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setDeleteId(null);
    },
    onError: (err: Error) => toastError(err.message || 'فشل حذف الكوبون.'),
  });

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: 10,
      minOrderValue: 0,
      expiryDate: '',
      usageLimit: 1000,
      isActive: true,
    });
  };

  const handleOpenEdit = (cpn: Coupon) => {
    setEditingCoupon(cpn);
    setFormData({
      code: cpn.code,
      type: cpn.type,
      value: typeof cpn.value === 'string' ? parseFloat(cpn.value) : cpn.value,
      minOrderValue: typeof cpn.minOrderValue === 'string' ? parseFloat(cpn.minOrderValue) : cpn.minOrderValue,
      expiryDate: cpn.expiryDate ? cpn.expiryDate.split('T')[0] : '',
      usageLimit: cpn.usageLimit,
      isActive: cpn.isActive,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || formData.value === undefined) {
      toastError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 tracking-tight">
            {t.coupons.title}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">{t.coupons.subtitle}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          {t.coupons.addCoupon}
        </Button>
      </div>

      {/* Main Table */}
      {isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="bg-white rounded-2xl border border-surface-200/80 p-4">
          <TableSkeleton rows={5} cols={7} />
        </div>
      ) : !coupons || coupons.length === 0 ? (
        <EmptyState
          icon={<Ticket className="w-12 h-12 text-surface-300" />}
          title={t.coupons.empty}
          description="لم يتم إنشاء أي كوبونات خصم ترويجية حتى الآن."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t.coupons.table.code}</TableHeaderCell>
              <TableHeaderCell>{t.coupons.table.type}</TableHeaderCell>
              <TableHeaderCell>{t.coupons.table.value}</TableHeaderCell>
              <TableHeaderCell>{t.coupons.table.minOrder}</TableHeaderCell>
              <TableHeaderCell>{t.coupons.table.usage}</TableHeaderCell>
              <TableHeaderCell>{t.coupons.table.expiry}</TableHeaderCell>
              <TableHeaderCell>{t.coupons.table.status}</TableHeaderCell>
              <TableHeaderCell className="text-center">{t.coupons.table.actions}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.map((cpn) => (
              <TableRow key={cpn.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                      {cpn.code}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-100 text-surface-700">
                    {cpn.type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}
                  </span>
                </TableCell>
                <TableCell className="font-bold text-brand-700 font-mono text-xs">
                  {cpn.type === 'percentage'
                    ? `${parseFloat(String(cpn.value))}%`
                    : `${parseFloat(String(cpn.value)).toFixed(2)} ${t.common.jod}`}
                </TableCell>
                <TableCell className="font-mono text-xs text-surface-600">
                  {parseFloat(String(cpn.minOrderValue)).toFixed(2)} {t.common.jod}
                </TableCell>
                <TableCell className="text-xs font-mono">
                  <span className="font-bold text-surface-800">{cpn.usageCount}</span> /{' '}
                  <span className="text-surface-400">{cpn.usageLimit}</span>
                </TableCell>
                <TableCell className="text-[11px] text-surface-500">
                  {cpn.expiryDate ? new Date(cpn.expiryDate).toLocaleDateString('ar-JO') : 'دائم / غير محدد'}
                </TableCell>
                <TableCell>
                  <Badge variant={cpn.isActive ? 'success' : 'neutral'} size="sm">
                    {cpn.isActive ? t.common.active : t.common.inactive}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cpn)}
                      className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-800 transition-colors"
                      title={t.common.edit}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(cpn.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                      title={t.common.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create / Edit Coupon Modal */}
      <Modal
        isOpen={isCreateOpen || !!editingCoupon}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingCoupon(null);
        }}
        title={editingCoupon ? t.coupons.form.editTitle : t.coupons.form.title}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <Input
            label={t.coupons.form.code}
            placeholder="مثال: AL7BTIN15"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label={t.coupons.form.type}
              options={[
                { value: 'percentage', label: t.coupons.form.percentage },
                { value: 'fixed_amount', label: t.coupons.form.fixed },
              ]}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            />
            <Input
              label={t.coupons.form.value}
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t.coupons.form.minOrder}
              type="number"
              step="0.01"
              value={formData.minOrderValue}
              onChange={(e) => setFormData({ ...formData, minOrderValue: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label={t.coupons.form.usageLimit}
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value, 10) || 1000 })}
            />
          </div>

          <Input
            label={t.coupons.form.expiryDate}
            type="date"
            value={formData.expiryDate || ''}
            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
          />

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-surface-800 pt-1">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded text-brand-500 focus:ring-brand-400"
            />
            {t.coupons.form.isActive}
          </label>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-surface-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingCoupon(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t.common.deleteConfirmTitle}
        message={t.common.deleteConfirmMessage}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
