import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../api/services.api';
import { Service } from '../types';
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
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  Tag,
  Sliders,
  Search,
  Copy,
  UploadCloud,
  Archive,
  PackageCheck,
  Wrench,
} from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const isRtl = isRTL;
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');

  // Modals State
  const [isCreateServiceOpen, setIsCreateServiceOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [optionsTargetService, setOptionsTargetService] = useState<Service | null>(null);

  // New Option Form State inside Options Modal
  const [newOption, setNewOption] = useState({
    nameAr: '',
    nameEn: '',
    optionType: 'variant' as 'variant' | 'addon' | 'package' | 'product',
    price: 5.0,
    installationPrice: 0.0,
    unitAr: 'خدمة',
    unitEn: 'service',
    size: '',
    brand: '',
    packageWorkerCount: 1,
  });

  // Service Form State
  const [serviceForm, setServiceForm] = useState({
    categoryId: '',
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    basePrice: 5.0,
    unitAr: 'خدمة',
    unitEn: 'service',
    type: 'home_service' as 'home_service' | 'delivery_product',
    serviceMode: 'dynamic_form' as 'dynamic_form' | 'product_variant' | 'labor_inspection' | 'package_bundle' | 'product_installation',
    isLaborOnly: false,
    requiresQuotation: false,
    disclaimerAr: 'السعر الظاهر هو أجرة اليد/الخدمة الأساسية فقط، ولا يشمل قطع الغيار أو المواد أو المعدات أو أي أعمال إضافية قد تكون مطلوبة.',
    disclaimerEn: 'The displayed price is the labor/service starting fee only. It does not include spare parts, materials, equipment, or additional work that may be required.',
    startingPriceLabelAr: 'يبدأ من',
    startingPriceLabelEn: 'Starting from',
    isActive: true,
  });

  // Category Form State
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
  });

  // Fetch Services & Categories
  const { data: services, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-services', categoryFilter, statusFilter],
    queryFn: () => servicesApi.getServices(categoryFilter !== 'all' ? categoryFilter : undefined),
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: servicesApi.getCategories,
  });

  // Filtered Services List
  const filteredServices = useMemo(() => {
    if (!services) return [];
    return services.filter((s) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesNameAr = s.nameAr.toLowerCase().includes(q);
        const matchesNameEn = s.nameEn.toLowerCase().includes(q);
        const matchesId = s.id.toLowerCase().includes(q);
        if (!matchesNameAr && !matchesNameEn && !matchesId) return false;
      }
      // Category
      if (categoryFilter !== 'all' && s.categoryId !== categoryFilter) return false;
      // Type
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      // Status
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      // Mode
      if (modeFilter !== 'all' && (s as any).serviceMode !== modeFilter) return false;

      return true;
    });
  }, [services, searchTerm, categoryFilter, typeFilter, statusFilter, modeFilter]);

  // Mutations
  const createServiceMutation = useMutation({
    mutationFn: (payload: any) => servicesApi.createService(payload),
    onSuccess: (newSrv) => {
      success('تم إضافة الخدمة إلى الكتالوج بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      setIsCreateServiceOpen(false);
      navigate(`/admin/services/${newSrv.id}/builder`);
    },
    onError: (err: Error) => toastError(err.message || 'فشل إضافة الخدمة.'),
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => servicesApi.updateService(id, payload),
    onSuccess: () => {
      success('تم تحديث بيانات الخدمة بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      setEditingService(null);
    },
    onError: (err: Error) => toastError(err.message || 'فشل تحديث الخدمة.'),
  });

  const duplicateServiceMutation = useMutation({
    mutationFn: (id: string) => servicesApi.duplicateService(id),
    onSuccess: (dup) => {
      success('تم استنساخ الخدمة بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      navigate(`/admin/services/${dup.id}/builder`);
    },
    onError: (err: Error) => toastError(err.message || 'فشل استنساخ الخدمة.'),
  });

  const publishServiceMutation = useMutation({
    mutationFn: (id: string) => servicesApi.publishService(id, { changelog: 'تم النشر من قائمة الخدمات' }),
    onSuccess: () => {
      success('تم نشر الخدمة بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
    onError: (err: Error) => toastError(err.message || 'فشل نشر الخدمة.'),
  });

  const archiveServiceMutation = useMutation({
    mutationFn: (id: string) => servicesApi.archiveService(id),
    onSuccess: () => {
      success('تم أرشفة الخدمة بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
    onError: (err: Error) => toastError(err.message || 'فشل أرشفة الخدمة.'),
  });

  const createOptionMutation = useMutation({
    mutationFn: ({ serviceId, payload }: { serviceId: string; payload: any }) =>
      servicesApi.createOption(serviceId, payload),
    onSuccess: () => {
      success('تم إضافة الخيار / الحجم بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      setNewOption({
        nameAr: '',
        nameEn: '',
        optionType: 'variant',
        price: 5.0,
        installationPrice: 0.0,
        unitAr: 'خدمة',
        unitEn: 'service',
        size: '',
        brand: '',
        packageWorkerCount: 1,
      });
    },
    onError: (err: Error) => toastError(err.message || 'فشل إضافة الخيار.'),
  });

  const deleteOptionMutation = useMutation({
    mutationFn: (optionId: string) => servicesApi.deleteOption(optionId),
    onSuccess: () => {
      success('تم حذف الخيار بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
    onError: (err: Error) => toastError(err.message || 'فشل حذف الخيار.'),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (payload: any) => servicesApi.createCategory(payload),
    onSuccess: () => {
      success('تم إضافة التصنيف بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsCreateCategoryOpen(false);
      setCategoryForm({ id: '', nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '' });
    },
    onError: (err: Error) => toastError(err.message || 'فشل إضافة التصنيف.'),
  });

  const handleCreateServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.categoryId || !serviceForm.nameAr || !serviceForm.nameEn) {
      toastError('يرجى ملء كافة الحقول الإلزامية.');
      return;
    }
    createServiceMutation.mutate(serviceForm);
  };

  const handleEditServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    updateServiceMutation.mutate({
      id: editingService.id,
      payload: {
        categoryId: editingService.categoryId,
        nameAr: editingService.nameAr,
        nameEn: editingService.nameEn,
        descriptionAr: editingService.descriptionAr,
        descriptionEn: editingService.descriptionEn,
        basePrice: editingService.basePrice,
        unitAr: editingService.unitAr,
        unitEn: editingService.unitEn,
        type: editingService.type,
        serviceMode: (editingService as any).serviceMode,
        isLaborOnly: (editingService as any).isLaborOnly,
        requiresQuotation: editingService.requiresQuotation,
        disclaimerAr: (editingService as any).disclaimerAr,
        disclaimerEn: (editingService as any).disclaimerEn,
        startingPriceLabelAr: (editingService as any).startingPriceLabelAr,
        startingPriceLabelEn: (editingService as any).startingPriceLabelEn,
        isActive: editingService.isActive,
      },
    });
  };

  const getServiceModeBadge = (mode?: string, isLabor?: boolean) => {
    if (isLabor || mode === 'labor_inspection') {
      return <Badge variant="warning">أجرة يد / معاينة</Badge>;
    }
    if (mode === 'product_installation') {
      return <Badge variant="brand">منتج + تركيب</Badge>;
    }
    if (mode === 'package_bundle') {
      return <Badge variant="info">باقات وخصومات</Badge>;
    }
    if (mode === 'product_variant') {
      return <Badge variant="neutral">منتج توصيل</Badge>;
    }
    return <Badge variant="neutral">نموذج ديناميكي</Badge>;
  };

  const getStatusBadge = (status?: string, isPublished?: boolean) => {
    if (status === 'published' || isPublished) {
      return <Badge variant="success">منشور</Badge>;
    }
    if (status === 'draft') {
      return <Badge variant="neutral">مسودة</Badge>;
    }
    if (status === 'in_review') {
      return <Badge variant="warning">قيد المراجعة</Badge>;
    }
    if (status === 'archived') {
      return <Badge variant="danger">مؤرشف</Badge>;
    }
    return <Badge variant="neutral">غير محدد</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-brand-600" />
            كتالوج الخدمات والمنتجات ({filteredServices.length})
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة الكتالوج الشامل، الخدمات المنزلية، منتجات التوصيل، باقات النظافة، وأسعار المعاينة وأجرة اليد
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setIsCreateCategoryOpen(true)}
            icon={<FolderPlus className="h-4 w-4" />}
          >
            إضافة تصنيف جديد
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsCreateServiceOpen(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            إنشاء خدمة جديدة
          </Button>
        </div>
      </div>

      {/* Advanced Filter Bar & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Live Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="ابحث بالاسم العربي، الإنجليزي، أو المعرف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>

          {/* Category Filter */}
          <div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'جميع التصنيفات' },
                ...(categories || []).map((cat) => ({
                  value: cat.id,
                  label: isRtl ? cat.nameAr : cat.nameEn,
                })),
              ]}
            />
          </div>

          {/* Service Mode Filter */}
          <div>
            <Select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'جميع أنماط الخدمات' },
                { value: 'labor_inspection', label: 'أجرة يد / معاينة' },
                { value: 'product_installation', label: 'منتج + تركيب' },
                { value: 'package_bundle', label: 'باقات عمال / عروض' },
                { value: 'product_variant', label: 'أحجام ومنتجات' },
                { value: 'dynamic_form', label: 'نموذج ديناميكي' },
              ]}
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'جميع الحالات' },
                { value: 'published', label: 'منشور فقط' },
                { value: 'draft', label: 'مسودات' },
                { value: 'archived', label: 'مؤرشف' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : isError ? (
          <ErrorState message={(error as Error)?.message || 'تعذر تحميل الخدمات.'} onRetry={refetch} />
        ) : filteredServices.length === 0 ? (
          <EmptyState
            title="لا توجد خدمات مطابقة"
            description="لم يتم العثور على خدمات مطابقة للبحث أو الفلتر المحدد."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setModeFilter('all');
                }}
              >
                إعادة ضبط الفلاتر
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>الخدمة / المعرف</TableHeaderCell>
                <TableHeaderCell>التصنيف</TableHeaderCell>
                <TableHeaderCell>النمط والنوع</TableHeaderCell>
                <TableHeaderCell>الحالة والإصدار</TableHeaderCell>
                <TableHeaderCell>السعر الأساسي</TableHeaderCell>
                <TableHeaderCell>الخيارات / الحقول</TableHeaderCell>
                <TableHeaderCell className="text-center">الإجراءات</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredServices.map((service) => {
                const isLabor = (service as any).isLaborOnly || (service as any).serviceMode === 'labor_inspection';
                const startingLabel = (service as any).startingPriceLabelAr || 'يبدأ من';

                return (
                  <TableRow key={service.id}>
                    {/* Service Name & ID */}
                    <TableCell>
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {isLabor ? (
                          <Wrench className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        ) : (
                          <PackageCheck className="h-4 w-4 text-brand-600 flex-shrink-0" />
                        )}
                        <span>{service.nameAr}</span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">
                        {service.id} • {service.nameEn}
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Badge variant="neutral">
                        {service.category?.nameAr || service.categoryId}
                      </Badge>
                    </TableCell>

                    {/* Mode & Type */}
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        {getServiceModeBadge((service as any).serviceMode, (service as any).isLaborOnly)}
                        <span className="text-xs text-gray-500">
                          {service.type === 'home_service' ? 'خدمة منزلية' : 'منتج توصيل'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status & Version */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(service.status, service.isPublished)}
                        <span className="text-xs font-mono font-medium text-gray-500">
                          v{service.currentVersion || 1}
                        </span>
                      </div>
                    </TableCell>

                    {/* Base Price */}
                    <TableCell>
                      <div className="font-bold text-gray-900">
                        {isLabor && <span className="text-xs font-normal text-amber-600 ml-1">{startingLabel}</span>}
                        {Number(service.basePrice).toFixed(2)} د.أ
                      </div>
                      <div className="text-xs text-gray-400">لكل {service.unitAr || 'وحدة'}</div>
                    </TableCell>

                    {/* Options / Fields Count */}
                    <TableCell>
                      <div className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-900">{(service.options || []).length}</span> خيارات/أحجام
                      </div>
                      <div className="text-xs text-gray-400">
                        <span className="font-semibold">{(service.fields || []).length}</span> حقول إدخال
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Visual Builder */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/admin/services/${service.id}/builder`)}
                          title="فتح أداة بناء الخدمة المرئية"
                          icon={<Sliders className="h-3.5 w-3.5" />}
                        >
                          أداة البناء
                        </Button>

                        {/* Edit Basic Info */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingService(service)}
                          title="تعديل البيانات الأساسية"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        {/* Options / Variants Modal */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOptionsTargetService(service)}
                          title="إدارة الأحجام والخيارات"
                        >
                          <Tag className="h-3.5 w-3.5 text-brand-600" />
                        </Button>

                        {/* Duplicate */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateServiceMutation.mutate(service.id)}
                          title="استنساخ الخدمة كمسودة"
                        >
                          <Copy className="h-3.5 w-3.5 text-gray-500" />
                        </Button>

                        {/* Publish if Draft */}
                        {service.status !== 'published' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => publishServiceMutation.mutate(service.id)}
                            title="نشر الخدمة للعملاء"
                          >
                            <UploadCloud className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        )}

                        {/* Archive */}
                        {service.status !== 'archived' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => archiveServiceMutation.mutate(service.id)}
                            title="أرشفة الخدمة"
                          >
                            <Archive className="h-3.5 w-3.5 text-amber-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal: Create Service */}
      <Modal
        isOpen={isCreateServiceOpen}
        onClose={() => setIsCreateServiceOpen(false)}
        title="إنشاء خدمة أو منتج جديد"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateServiceSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية *</label>
              <Input
                required
                value={serviceForm.nameAr}
                onChange={(e) => setServiceForm({ ...serviceForm, nameAr: e.target.value })}
                placeholder="مثال: تصليح سخانات وغسالات"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية *</label>
              <Input
                required
                value={serviceForm.nameEn}
                onChange={(e) => setServiceForm({ ...serviceForm, nameEn: e.target.value })}
                placeholder="e.g. Water Heater Repair"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف *</label>
              <Select
                required
                value={serviceForm.categoryId}
                onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
                options={[
                  { value: '', label: 'اختر التصنيف...' },
                  ...(categories || []).map((cat) => ({
                    value: cat.id,
                    label: isRtl ? cat.nameAr : cat.nameEn,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع الخدمة *</label>
              <Select
                value={serviceForm.type}
                onChange={(e) => setServiceForm({ ...serviceForm, type: e.target.value as any })}
                options={[
                  { value: 'home_service', label: 'خدمة منزلية (Home Service)' },
                  { value: 'delivery_product', label: 'منتج توصيل (Delivery Product)' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نمط الخدمة *</label>
              <Select
                value={serviceForm.serviceMode}
                onChange={(e) => setServiceForm({ ...serviceForm, serviceMode: e.target.value as any })}
                options={[
                  { value: 'dynamic_form', label: 'نموذج ديناميكي' },
                  { value: 'labor_inspection', label: 'أجرة يد / معاينة' },
                  { value: 'product_installation', label: 'منتج + تركيب' },
                  { value: 'package_bundle', label: 'باقات عمال' },
                  { value: 'product_variant', label: 'منتج وأحجام' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السعر الأساسي / أجرة اليد *</label>
              <Input
                type="number"
                step="0.01"
                required
                value={serviceForm.basePrice}
                onChange={(e) => setServiceForm({ ...serviceForm, basePrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وحدة التسعير (عربي)</label>
              <Input
                value={serviceForm.unitAr}
                onChange={(e) => setServiceForm({ ...serviceForm, unitAr: e.target.value })}
                placeholder="خدمة / معاينة / قارورة"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وحدة التسعير (إنجليزي)</label>
              <Input
                value={serviceForm.unitEn}
                onChange={(e) => setServiceForm({ ...serviceForm, unitEn: e.target.value })}
                placeholder="service / item"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف بالعربية</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-brand-500 focus:border-brand-500"
              rows={2}
              value={serviceForm.descriptionAr}
              onChange={(e) => setServiceForm({ ...serviceForm, descriptionAr: e.target.value })}
              placeholder="وصف الخدمة وشروط تقديمها..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" type="button" onClick={() => setIsCreateServiceOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit" isLoading={createServiceMutation.isPending}>
              إنشاء والمتابعة لأداة البناء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Service Basic Info */}
      {editingService && (
        <Modal
          isOpen={true}
          onClose={() => setEditingService(null)}
          title={`تعديل الخدمة: ${editingService.nameAr}`}
          maxWidth="lg"
        >
          <form onSubmit={handleEditServiceSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية *</label>
                <Input
                  required
                  value={editingService.nameAr}
                  onChange={(e) => setEditingService({ ...editingService, nameAr: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية *</label>
                <Input
                  required
                  value={editingService.nameEn}
                  onChange={(e) => setEditingService({ ...editingService, nameEn: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر الأساسي (د.أ) *</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={editingService.basePrice}
                  onChange={(e) =>
                    setEditingService({ ...editingService, basePrice: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نص يبدأ من (عربي)</label>
                <Input
                  value={(editingService as any).startingPriceLabelAr || 'يبدأ من'}
                  onChange={(e) =>
                    setEditingService({ ...editingService, startingPriceLabelAr: e.target.value } as any)
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نمط الخدمة</label>
                <Select
                  value={(editingService as any).serviceMode || 'dynamic_form'}
                  onChange={(e) =>
                    setEditingService({ ...editingService, serviceMode: e.target.value } as any)
                  }
                  options={[
                    { value: 'dynamic_form', label: 'نموذج ديناميكي' },
                    { value: 'labor_inspection', label: 'أجرة يد / معاينة' },
                    { value: 'product_installation', label: 'منتج + تركيب' },
                    { value: 'package_bundle', label: 'باقات عمال' },
                    { value: 'product_variant', label: 'منتج وأحجام' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تنبيه / إخلاء مسؤولية أجرة اليد (عربي)</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                rows={2}
                value={(editingService as any).disclaimerAr || ''}
                onChange={(e) =>
                  setEditingService({ ...editingService, disclaimerAr: e.target.value } as any)
                }
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={(editingService as any).isLaborOnly || false}
                  onChange={(e) =>
                    setEditingService({ ...editingService, isLaborOnly: e.target.checked } as any)
                  }
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                الخدمة هي أجرة يد فقط (تتطلب معاينة)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={editingService.requiresQuotation || false}
                  onChange={(e) =>
                    setEditingService({ ...editingService, requiresQuotation: e.target.checked })
                  }
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                تدعم نظام عروض الأسعار الإضافية (Quotations)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" type="button" onClick={() => setEditingService(null)}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" isLoading={updateServiceMutation.isPending}>
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Manage Options / Products */}
      {optionsTargetService && (
        <Modal
          isOpen={true}
          onClose={() => setOptionsTargetService(null)}
          title={`خيارات ومنتجات: ${optionsTargetService.nameAr}`}
          maxWidth="xl"
        >
          <div className="space-y-6">
            {/* Existing Options List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-800">الأحجام والخيارات الحالية:</h3>
              {(optionsTargetService.options || []).length === 0 ? (
                <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500">
                  لا توجد خيارات أو أحجام محددة لهذه الخدمة بعد.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(optionsTargetService.options || []).map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{opt.nameAr}</div>
                        <div className="text-xs text-gray-500">
                          {opt.size ? `الحجم: ${opt.size} • ` : ''}
                          السعر: {Number(opt.price).toFixed(2)} د.أ
                          {opt.installationPrice ? ` + تركيب: ${Number(opt.installationPrice).toFixed(2)} د.أ` : ''}
                          {opt.packageWorkerCount ? ` • عدد العمال: ${opt.packageWorkerCount}` : ''}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteOptionMutation.mutate(opt.id)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Option Form */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-bold text-gray-800">إضافة خيار / منتج / باقة جديدة:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="الاسم بالعربية (مثال: قارورة 19 لتر)"
                  value={newOption.nameAr}
                  onChange={(e) => setNewOption({ ...newOption, nameAr: e.target.value })}
                />
                <Input
                  placeholder="الاسم بالإنجليزية"
                  value={newOption.nameEn}
                  onChange={(e) => setNewOption({ ...newOption, nameEn: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="السعر (د.أ)"
                  value={newOption.price}
                  onChange={(e) => setNewOption({ ...newOption, price: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="سعر التركيب (إن وجد)"
                  value={newOption.installationPrice}
                  onChange={(e) =>
                    setNewOption({ ...newOption, installationPrice: parseFloat(e.target.value) || 0 })
                  }
                />
                <Input
                  placeholder="الحجم / السعة (مثال: 12.5 كغم)"
                  value={newOption.size}
                  onChange={(e) => setNewOption({ ...newOption, size: e.target.value })}
                />
                <Select
                  value={newOption.optionType}
                  onChange={(e) => setNewOption({ ...newOption, optionType: e.target.value as any })}
                  options={[
                    { value: 'variant', label: 'حجم / خيار' },
                    { value: 'product', label: 'منتج للبيع' },
                    { value: 'package', label: 'باقة مخصصة' },
                    { value: 'addon', label: 'إضافة إضافية' },
                  ]}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (!newOption.nameAr) {
                      toastError('يرجى كتابة اسم الخيار بالعربية.');
                      return;
                    }
                    createOptionMutation.mutate({
                      serviceId: optionsTargetService.id,
                      payload: newOption,
                    });
                  }}
                  isLoading={createOptionMutation.isPending}
                >
                  إضافة الخيار
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button variant="secondary" onClick={() => setOptionsTargetService(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Create Category */}
      <Modal
        isOpen={isCreateCategoryOpen}
        onClose={() => setIsCreateCategoryOpen(false)}
        title="إضافة تصنيف خدمات جديد"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!categoryForm.nameAr || !categoryForm.nameEn) {
              toastError('يرجى ملء اسم التصنيف.');
              return;
            }
            createCategoryMutation.mutate({
              id: categoryForm.id || `cat_${Date.now()}`,
              nameAr: categoryForm.nameAr,
              nameEn: categoryForm.nameEn,
              descriptionAr: categoryForm.descriptionAr,
              descriptionEn: categoryForm.descriptionEn,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية *</label>
            <Input
              required
              value={categoryForm.nameAr}
              onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })}
              placeholder="مثال: خدمات تنظيف وتطهير"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية *</label>
            <Input
              required
              value={categoryForm.nameEn}
              onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
              placeholder="e.g. Cleaning & Sanitization"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" type="button" onClick={() => setIsCreateCategoryOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit" isLoading={createCategoryMutation.isPending}>
              حفظ التصنيف
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
