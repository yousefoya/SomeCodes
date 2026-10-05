import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offersApi, CreateOfferPayload } from '../api/offers.api';
import { Offer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Flame, Plus, Edit2, Trash2 } from 'lucide-react';

export const OffersPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateOfferPayload>({
    titleAr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionEn: '',
    discountPercentage: 20,
    promoCode: '',
    bannerColor: '#C5A059',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  });

  const { data: offers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-offers'],
    queryFn: offersApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateOfferPayload) => offersApi.create(payload),
    onSuccess: () => {
      success('تم إنشاء العرض الترويجي بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => toastError(err.message || 'فشل إنشاء العرض.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateOfferPayload> }) =>
      offersApi.update(id, payload),
    onSuccess: () => {
      success('تم تحديث العرض بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
      setEditingOffer(null);
      resetForm();
    },
    onError: (err: Error) => toastError(err.message || 'فشل تحديث العرض.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => offersApi.delete(id),
    onSuccess: () => {
      success('تم حذف العرض بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
      setDeleteId(null);
    },
    onError: (err: Error) => toastError(err.message || 'فشل حذف العرض.'),
  });

  const resetForm = () => {
    setFormData({
      titleAr: '',
      titleEn: '',
      descriptionAr: '',
      descriptionEn: '',
      discountPercentage: 20,
      promoCode: '',
      bannerColor: '#C5A059',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
    });
  };

  const handleOpenEdit = (o: Offer) => {
    setEditingOffer(o);
    setFormData({
      titleAr: o.titleAr,
      titleEn: o.titleEn,
      descriptionAr: o.descriptionAr || '',
      descriptionEn: o.descriptionEn || '',
      discountPercentage: o.discountPercentage,
      promoCode: o.promoCode || '',
      bannerColor: o.bannerColor || '#C5A059',
      startDate: o.startDate ? o.startDate.split('T')[0] : '',
      endDate: o.endDate ? o.endDate.split('T')[0] : '',
      isActive: o.isActive,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titleAr || !formData.titleEn || formData.discountPercentage === undefined) {
      toastError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    if (editingOffer) {
      updateMutation.mutate({ id: editingOffer.id, payload: formData });
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
            {t.offers.title}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">{t.offers.subtitle}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          {t.offers.addOffer}
        </Button>
      </div>

      {/* Main Table */}
      {isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="bg-white rounded-2xl border border-surface-200/80 p-4">
          <TableSkeleton rows={5} cols={6} />
        </div>
      ) : !offers || offers.length === 0 ? (
        <EmptyState
          icon={<Flame className="w-12 h-12 text-surface-300" />}
          title={t.offers.empty}
          description="لا توجد عروض ترويجية نشطة في النظام حالياً."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t.offers.table.title}</TableHeaderCell>
              <TableHeaderCell>{t.offers.table.discount}</TableHeaderCell>
              <TableHeaderCell>{t.offers.table.promoCode}</TableHeaderCell>
              <TableHeaderCell>{t.offers.table.dates}</TableHeaderCell>
              <TableHeaderCell>{t.offers.table.color}</TableHeaderCell>
              <TableHeaderCell>{t.offers.table.status}</TableHeaderCell>
              <TableHeaderCell className="text-center">{t.offers.table.actions}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {offers.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                      style={{ backgroundColor: o.bannerColor || '#C5A059' }}
                    >
                      %
                    </div>
                    <div>
                      <span className="font-bold text-surface-900 block text-xs">{o.titleAr}</span>
                      <span className="text-[10px] text-surface-400 block">{o.titleEn}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-bold text-brand-700 font-mono text-xs">
                  {o.discountPercentage}%
                </TableCell>
                <TableCell>
                  {o.promoCode ? (
                    <span className="font-mono text-xs font-bold text-surface-800 bg-surface-100 px-2 py-0.5 rounded-md">
                      {o.promoCode}
                    </span>
                  ) : (
                    <span className="text-surface-400 text-[10px]">-</span>
                  )}
                </TableCell>
                <TableCell className="text-[11px] text-surface-500">
                  {new Date(o.startDate).toLocaleDateString('ar-JO')} إلى{' '}
                  {new Date(o.endDate).toLocaleDateString('ar-JO')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-surface-200"
                      style={{ backgroundColor: o.bannerColor || '#C5A059' }}
                    />
                    <span className="font-mono text-[10px] text-surface-500">{o.bannerColor}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={o.isActive ? 'success' : 'neutral'} size="sm">
                    {o.isActive ? t.common.active : t.common.inactive}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(o)}
                      className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-800 transition-colors"
                      title={t.common.edit}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(o.id)}
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

      {/* Create / Edit Offer Modal */}
      <Modal
        isOpen={isCreateOpen || !!editingOffer}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingOffer(null);
        }}
        title={editingOffer ? 'تعديل العرض الترويجي' : t.offers.addOffer}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t.offers.form.titleAr}
              value={formData.titleAr}
              onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
              required
            />
            <Input
              label={t.offers.form.titleEn}
              value={formData.titleEn}
              onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t.offers.form.discountPercentage}
              type="number"
              value={formData.discountPercentage}
              onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label={t.offers.form.promoCode}
              placeholder="مثال: WINTER20"
              value={formData.promoCode || ''}
              onChange={(e) => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label={t.offers.form.bannerColor}
              type="color"
              value={formData.bannerColor || '#C5A059'}
              onChange={(e) => setFormData({ ...formData, bannerColor: e.target.value })}
            />
            <Input
              label={t.offers.form.startDate}
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label={t.offers.form.endDate}
              type="date"
              value={formData.endDate || ''}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-surface-800 pt-1">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded text-brand-500 focus:ring-brand-400"
            />
            {t.offers.form.isActive}
          </label>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-surface-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingOffer(null);
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
