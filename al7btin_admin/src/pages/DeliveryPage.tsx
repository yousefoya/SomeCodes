import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryApi, CreateDeliveryPayload } from '../api/delivery.api';
import { providersApi } from '../api/providers.api';
import { DeliveryEmployee } from '../types';
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
import { Truck, UserPlus, Edit2, Trash2, ShieldCheck, Star } from 'lucide-react';

export const DeliveryPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DeliveryEmployee | null>(null);
  const [capabilitiesTarget, setCapabilitiesTarget] = useState<DeliveryEmployee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);

  const [formData, setFormData] = useState<CreateDeliveryPayload>({
    name: '',
    phoneNumber: '',
    providerId: '',
    vehicleType: 'دراجة نارية',
    vehiclePlateNumber: '',
  });

  const { data: drivers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: deliveryApi.getAll,
  });

  const { data: providers } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: providersApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateDeliveryPayload) => deliveryApi.create(payload),
    onSuccess: () => {
      success('تم إضافة مندوب التوصيل بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => toastError(err.message || 'فشل إضافة المندوب.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      deliveryApi.update(id, payload),
    onSuccess: () => {
      success('تم تحديث بيانات المندوب بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      setEditingDriver(null);
      resetForm();
    },
    onError: (err: Error) => toastError(err.message || 'فشل تحديث المندوب.'),
  });

  const updateCapabilitiesMutation = useMutation({
    mutationFn: ({ id, serviceIds }: { id: string; serviceIds: string[] }) =>
      deliveryApi.updateCapabilities(id, { serviceIds }),
    onSuccess: () => {
      success('تم تحديث تصاريح خدمات المندوب بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      setCapabilitiesTarget(null);
    },
    onError: (err: Error) => toastError(err.message || 'فشل تحديث التصاريح.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deliveryApi.delete(id),
    onSuccess: () => {
      success('تم حذف حساب المندوب بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setDeleteId(null);
    },
    onError: (err: Error) => toastError(err.message || 'فشل حذف المندوب.'),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phoneNumber: '',
      providerId: providers && providers.length > 0 ? providers[0].id : '',
      vehicleType: 'دراجة نارية',
      vehiclePlateNumber: '',
    });
  };

  const handleOpenEdit = (d: DeliveryEmployee) => {
    setEditingDriver(d);
    setFormData({
      name: d.name,
      phoneNumber: d.phoneNumber,
      providerId: d.providerId,
      vehicleType: d.vehicleType,
      vehiclePlateNumber: d.vehiclePlateNumber,
    });
  };

  const handleOpenCapabilities = (d: DeliveryEmployee) => {
    setCapabilitiesTarget(d);
    setSelectedCapabilities(d.serviceCapabilities || []);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phoneNumber || !formData.providerId) {
      toastError('يرجى ملء جميع الحقول الإلزامية.');
      return;
    }

    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Provider options
  const providerOptions = (providers || []).map((p) => ({
    value: p.id,
    label: `${p.nameAr} (${p.phoneNumber})`,
  }));

  // Selected driver's parent provider
  const targetProvider = capabilitiesTarget
    ? providers?.find((p) => p.id === capabilitiesTarget.providerId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 tracking-tight">
            {t.delivery.title}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">{t.delivery.subtitle}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          icon={<UserPlus className="w-4 h-4" />}
        >
          {t.delivery.addDriver}
        </Button>
      </div>

      {/* Main Table */}
      {isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="bg-white rounded-2xl border border-surface-200/80 p-4">
          <TableSkeleton rows={6} cols={7} />
        </div>
      ) : !drivers || drivers.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-12 h-12 text-surface-300" />}
          title={t.delivery.empty}
          description="لم يتم تسجيل أي مناديب توصيل في النظام بعد."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t.delivery.table.name}</TableHeaderCell>
              <TableHeaderCell>{t.delivery.table.phone}</TableHeaderCell>
              <TableHeaderCell>{t.delivery.table.provider}</TableHeaderCell>
              <TableHeaderCell>{t.delivery.table.vehicle}</TableHeaderCell>
              <TableHeaderCell>{t.delivery.table.onlineStatus}</TableHeaderCell>
              <TableHeaderCell>{t.delivery.table.capabilities}</TableHeaderCell>
              <TableHeaderCell className="text-center">{t.delivery.table.actions}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {drivers.map((drv) => (
              <TableRow key={drv.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-surface-900 block text-xs">{drv.name}</span>
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{drv.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs font-semibold text-surface-700">
                  {drv.phoneNumber}
                </TableCell>
                <TableCell className="text-xs font-medium text-surface-800">
                  {drv.providerName || 'غير محدد'}
                </TableCell>
                <TableCell className="text-xs text-surface-600">
                  <span className="block">{drv.vehicleType}</span>
                  <span className="text-[10px] text-surface-400 font-mono">{drv.vehiclePlateNumber}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={drv.isOnline ? 'success' : 'neutral'} size="sm">
                    {drv.isOnline ? t.common.online : t.common.offline}
                  </Badge>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => handleOpenCapabilities(drv)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-brand-50 hover:text-brand-700 text-surface-700 text-[11px] font-semibold border border-surface-200 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                    <span>{drv.serviceCapabilities.length} خدمة مصرح بها</span>
                  </button>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(drv)}
                      className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-800 transition-colors"
                      title={t.common.edit}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(drv.id)}
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

      {/* Create / Edit Driver Modal */}
      <Modal
        isOpen={isCreateOpen || !!editingDriver}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingDriver(null);
        }}
        title={editingDriver ? 'تعديل بيانات المندوب' : t.delivery.addDriver}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <Input
            label={t.delivery.form.name}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label={t.delivery.form.phone}
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            required
          />
          <Select
            label={t.delivery.form.provider}
            options={providerOptions}
            value={formData.providerId}
            onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
            required
          />
          <Input
            label={t.delivery.form.vehicleType}
            value={formData.vehicleType}
            onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
          />
          <Input
            label={t.delivery.form.vehiclePlate}
            value={formData.vehiclePlateNumber}
            onChange={(e) => setFormData({ ...formData, vehiclePlateNumber: e.target.value })}
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-surface-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingDriver(null);
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

      {/* Service Capabilities Modal */}
      {capabilitiesTarget && (
        <Modal
          isOpen={!!capabilitiesTarget}
          onClose={() => setCapabilitiesTarget(null)}
          title={`${t.delivery.capabilitiesModal.title} - ${capabilitiesTarget.name}`}
          subtitle={t.delivery.capabilitiesModal.subtitle}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-200">
              <span className="text-surface-500 block text-[11px]">المزود التابع له المندوب:</span>
              <span className="font-bold text-surface-900">{capabilitiesTarget.providerName}</span>
            </div>

            <div>
              <label className="font-bold text-surface-900 block mb-2">
                الخدمات المتاحة لدى المزود للتصريح بها:
              </label>
              {targetProvider?.services && targetProvider.services.length > 0 ? (
                <div className="space-y-2">
                  {targetProvider.services.map((srv) => {
                    const isChecked = selectedCapabilities.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-brand-50/70 border-brand-300 text-brand-900 font-semibold'
                            : 'bg-white border-surface-200 text-surface-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedCapabilities((prev) =>
                                prev.includes(srv.id)
                                  ? prev.filter((id) => id !== srv.id)
                                  : [...prev, srv.id]
                              );
                            }}
                            className="rounded text-brand-500 focus:ring-brand-400"
                          />
                          <span>{srv.nameAr}</span>
                        </div>
                        <span className="text-[10px] text-surface-400 font-mono">
                          {srv.basePrice} {t.common.jod}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-surface-400 py-3">
                  لا توجد خدمات معينة لدى المزود التابع له هذا المندوب. يرجى تعيين خدمات للمزود أولاً.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-surface-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCapabilitiesTarget(null)}
              >
                {t.common.cancel}
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  updateCapabilitiesMutation.mutate({
                    id: capabilitiesTarget.id,
                    serviceIds: selectedCapabilities,
                  })
                }
                isLoading={updateCapabilitiesMutation.isPending}
              >
                {t.delivery.capabilitiesModal.save}
              </Button>
            </div>
          </div>
        </Modal>
      )}

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
