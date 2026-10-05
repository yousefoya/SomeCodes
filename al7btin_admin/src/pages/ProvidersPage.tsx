import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providersApi, CreateProviderPayload } from '../api/providers.api';
import { servicesApi } from '../api/services.api';
import { Provider } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { SearchInput } from '../components/shared/SearchInput';
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
import { Store, Plus, Edit2, Trash2 } from 'lucide-react';

export const ProvidersPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'online' | 'offline'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateProviderPayload>({
    nameAr: '',
    nameEn: '',
    phoneNumber: '',
    address: '',
    operatingHours: '08:00 AM - 10:00 PM',
    descriptionAr: '',
    descriptionEn: '',
    latitude: 31.9539,
    longitude: 35.9106,
    isActive: true,
    isAvailable: true,
    serviceIds: [],
    coverageAreas: ['عمان', 'خلدا', 'تلاع العلي', 'الجبيهة'],
  });

  // Fetch Providers
  const { data: providers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: providersApi.getAll,
  });

  // Fetch all active global services to populate assignment checkboxes
  const { data: globalServices } = useQuery({
    queryKey: ['global-services'],
    queryFn: () => servicesApi.getServices(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateProviderPayload) => providersApi.create(payload),
    onSuccess: () => {
      success('تم إضافة المزود بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => toastError(err.message || 'فشل إضافة المزود.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateProviderPayload> }) =>
      providersApi.update(id, payload),
    onSuccess: () => {
      success('تم تحديث بيانات المزود بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setEditingProvider(null);
      resetForm();
    },
    onError: (err: Error) => toastError(err.message || 'فشل تحديث المزود.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => providersApi.delete(id),
    onSuccess: () => {
      success('تم حذف المزود بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setDeleteId(null);
    },
    onError: (err: Error) => toastError(err.message || 'فشل حذف المزود.'),
  });

  const resetForm = () => {
    setFormData({
      nameAr: '',
      nameEn: '',
      phoneNumber: '',
      address: '',
      operatingHours: '08:00 AM - 10:00 PM',
      descriptionAr: '',
      descriptionEn: '',
      latitude: 31.9539,
      longitude: 35.9106,
      isActive: true,
      isAvailable: true,
      serviceIds: [],
      coverageAreas: ['عمان', 'خلدا'],
    });
  };

  const handleOpenEdit = (p: Provider) => {
    setEditingProvider(p);
    setFormData({
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      phoneNumber: p.phoneNumber,
      address: p.address,
      operatingHours: p.operatingHours,
      descriptionAr: p.descriptionAr || '',
      descriptionEn: p.descriptionEn || '',
      latitude: p.latitude,
      longitude: p.longitude,
      isActive: p.isActive,
      isAvailable: p.isAvailable,
      serviceIds: p.serviceIds || [],
      coverageAreas: p.coverageAreas || ['عمان'],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr || !formData.nameEn || !formData.phoneNumber || !formData.address) {
      toastError('يرجى ملء جميع الحقول الإلزامية.');
      return;
    }

    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleService = (serviceId: string) => {
    const current = formData.serviceIds || [];
    const exists = current.includes(serviceId);
    setFormData({
      ...formData,
      serviceIds: exists ? current.filter((id) => id !== serviceId) : [...current, serviceId],
    });
  };

  // Filter Providers
  const filtered = (providers || []).filter((p) => {
    const matchSearch =
      !search ||
      p.nameAr.toLowerCase().includes(search.toLowerCase()) ||
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.phoneNumber.includes(search) ||
      p.address.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (statusFilter === 'active') return p.isActive;
    if (statusFilter === 'inactive') return !p.isActive;
    if (statusFilter === 'online') return p.isAvailable && p.isActive;
    if (statusFilter === 'offline') return !p.isAvailable;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 tracking-tight">
            {t.providers.title}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">{t.providers.subtitle}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          {t.providers.addProvider}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-surface-200/80 shadow-card">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t.providers.searchPlaceholder}
        />
        <div className="w-full sm:w-56">
          <Select
            options={[
              { value: 'all', label: t.providers.filterAll },
              { value: 'active', label: t.providers.filterActive },
              { value: 'inactive', label: t.providers.filterInactive },
              { value: 'online', label: t.providers.filterOnline },
              { value: 'offline', label: t.providers.filterOffline },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          />
        </div>
      </div>

      {/* Main Table */}
      {isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="bg-white rounded-2xl border border-surface-200/80 p-4">
          <TableSkeleton rows={6} cols={6} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Store className="w-12 h-12 text-surface-300" />}
          title={t.providers.empty}
          description="لا يوجد أي مزودين مطابقين للشروط الحالية."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t.providers.table.name}</TableHeaderCell>
              <TableHeaderCell>{t.providers.table.phone}</TableHeaderCell>
              <TableHeaderCell>{t.providers.table.address}</TableHeaderCell>
              <TableHeaderCell>{t.providers.table.assignedServices}</TableHeaderCell>
              <TableHeaderCell>{t.providers.table.status}</TableHeaderCell>
              <TableHeaderCell>{t.providers.table.availability}</TableHeaderCell>
              <TableHeaderCell className="text-center">{t.providers.table.actions}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((prov) => (
              <TableRow key={prov.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-surface-900 block text-xs">{prov.nameAr}</span>
                      <span className="text-[10px] text-surface-400 block">{prov.nameEn}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs font-semibold text-surface-700">
                  {prov.phoneNumber}
                </TableCell>
                <TableCell className="text-xs text-surface-600 max-w-xs truncate">
                  {prov.address}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(prov.services || []).length > 0 ? (
                      prov.services?.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded-md bg-surface-100 text-surface-700 text-[10px] font-medium"
                        >
                          {s.nameAr}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-surface-400">لا توجد خدمات معينة</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={prov.isActive ? 'success' : 'neutral'} size="sm">
                    {prov.isActive ? t.common.active : t.common.inactive}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={prov.isAvailable ? 'brand' : 'warning'} size="sm">
                    {prov.isAvailable ? t.common.online : t.common.offline}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(prov)}
                      className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-800 transition-colors"
                      title={t.common.edit}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(prov.id)}
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

      {/* Create / Edit Provider Modal */}
      <Modal
        isOpen={isCreateOpen || !!editingProvider}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingProvider(null);
        }}
        title={editingProvider ? t.providers.form.editTitle : t.providers.form.createTitle}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t.providers.form.nameAr}
              value={formData.nameAr}
              onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              required
            />
            <Input
              label={t.providers.form.nameEn}
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t.providers.form.phone}
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              required
            />
            <Input
              label={t.providers.form.address}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t.providers.form.operatingHours}
              value={formData.operatingHours}
              onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
            />
            <Input
              label={t.providers.form.coverageAreas}
              value={(formData.coverageAreas || []).join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  coverageAreas: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
            />
          </div>

          {/* Assigned Services Selection */}
          <div className="p-3.5 bg-surface-50 rounded-2xl border border-surface-200">
            <label className="block font-bold text-surface-900 mb-2">
              {t.providers.form.assignServices}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {(globalServices || []).map((srv) => {
                const isSelected = (formData.serviceIds || []).includes(srv.id);
                return (
                  <label
                    key={srv.id}
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-brand-50/70 border-brand-300 text-brand-900 font-semibold'
                        : 'bg-white border-surface-200 text-surface-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleService(srv.id)}
                      className="rounded text-brand-500 focus:ring-brand-400"
                    />
                    <span>{srv.nameAr}</span>
                    <span className="text-[10px] text-surface-400 font-mono">({srv.basePrice} د.أ)</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-surface-800">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded text-brand-500 focus:ring-brand-400"
              />
              {t.providers.form.isActive}
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-surface-800">
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="rounded text-brand-500 focus:ring-brand-400"
              />
              {t.providers.form.isAvailable}
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-surface-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingProvider(null);
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
