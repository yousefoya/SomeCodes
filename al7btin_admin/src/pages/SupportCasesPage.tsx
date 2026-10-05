import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  MessageSquare,
  User as UserIcon,
} from 'lucide-react';
import { supportCasesApi } from '../api/support-cases.api';
import { staffApi } from '../api/staff.api';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { SupportCase, SupportCaseStatus, SupportCasePriority } from '../types';
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

export const SupportCasesPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const { isSuperAdmin, isCSManager } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assignedStaffFilter, setAssignedStaffFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newOrderId, setNewOrderId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<SupportCasePriority>('normal');
  const [newAssignedStaffId, setNewAssignedStaffId] = useState('');

  // Inspect Case Modal
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<SupportCaseStatus>('open');
  const [updatePriority, setUpdatePriority] = useState<SupportCasePriority>('normal');
  const [updateCategory, setUpdateCategory] = useState('general');
  const [updateAssignedStaffId, setUpdateAssignedStaffId] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newCaseNote, setNewCaseNote] = useState('');

  // Fetch Cases
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['support-cases', page, search, statusFilter, priorityFilter, categoryFilter, assignedStaffFilter],
    queryFn: () =>
      supportCasesApi.getSupportCases({
        page,
        limit: 15,
        search,
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        assignedStaffId: assignedStaffFilter,
      }),
  });

  // Fetch Staff list for assignment
  const { data: staffData } = useQuery({
    queryKey: ['staff-list-options'],
    queryFn: () => staffApi.getStaffList({ limit: 100 }),
    enabled: isSuperAdmin || isCSManager,
  });

  // Fetch Detailed Case for Modal
  const { data: caseDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['support-case-details', selectedCaseId],
    queryFn: () => supportCasesApi.getSupportCaseById(selectedCaseId!),
    enabled: !!selectedCaseId,
  });

  // Create Case Mutation
  const createMutation = useMutation({
    mutationFn: supportCasesApi.createSupportCase,
    onSuccess: () => {
      success('تم إنشاء تذكرة الدعم بنجاح.');
      setIsCreateModalOpen(false);
      setNewCustomerId('');
      setNewOrderId('');
      setNewTitle('');
      setNewCategory('general');
      setNewDescription('');
      setNewAssignedStaffId('');
      queryClient.invalidateQueries({ queryKey: ['support-cases'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  // Update Case Mutation
  const updateMutation = useMutation({
    mutationFn: (payload: any) => supportCasesApi.updateSupportCase(selectedCaseId!, payload),
    onSuccess: () => {
      success('تم تحديث تذكرة الدعم بنجاح.');
      setSelectedCaseId(null);
      queryClient.invalidateQueries({ queryKey: ['support-cases'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  // Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: (noteText: string) => supportCasesApi.addCaseNote(selectedCaseId!, noteText),
    onSuccess: () => {
      success('تم إضافة الملاحظة الداخلية بنجاح.');
      setNewCaseNote('');
      queryClient.invalidateQueries({ queryKey: ['support-case-details', selectedCaseId] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="danger">{t.supportCases.priority.urgent}</Badge>;
      case 'high':
        return <Badge variant="warning">{t.supportCases.priority.high}</Badge>;
      case 'normal':
        return <Badge variant="info">{t.supportCases.priority.normal}</Badge>;
      default:
        return <Badge variant="neutral">{t.supportCases.priority.low}</Badge>;
    }
  };

  const getCaseStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="warning">{t.supportCases.status.open}</Badge>;
      case 'in_progress':
        return <Badge variant="info">{t.supportCases.status.in_progress}</Badge>;
      case 'waiting_for_customer':
        return <Badge variant="neutral">{t.supportCases.status.waiting_for_customer}</Badge>;
      case 'resolved':
      case 'closed':
        return <Badge variant="success">{t.supportCases.status.resolved}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getCategoryLabel = (cat?: string) => {
    if (!cat) return t.supportCases.categories.general;
    return (t.supportCases.categories as any)[cat] || cat;
  };

  const handleOpenDetails = (caseItem: SupportCase) => {
    setSelectedCaseId(caseItem.id);
    setUpdateStatus(caseItem.status);
    setUpdatePriority(caseItem.priority);
    setUpdateCategory(caseItem.category || 'general');
    setUpdateAssignedStaffId(caseItem.assignedStaffId || '');
    setResolutionNotes(caseItem.resolutionNotes || '');
    setNewCaseNote('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId || !newTitle || !newDescription) {
      toastError('يرجى ملء جميع الحقول المطلوبة (معرف العميل، العنوان، والوصف).');
      return;
    }

    createMutation.mutate({
      customerId: newCustomerId.trim(),
      orderId: newOrderId.trim() || undefined,
      title: newTitle.trim(),
      category: newCategory,
      description: newDescription.trim(),
      priority: newPriority,
      assignedStaffId: newAssignedStaffId.trim() || undefined,
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    updateMutation.mutate({
      status: updateStatus,
      priority: updatePriority,
      category: updateCategory,
      assignedStaffId: (isSuperAdmin || isCSManager) ? (updateAssignedStaffId || undefined) : undefined,
      resolutionNotes: resolutionNotes.trim() || undefined,
    });
  };

  const statusFilterOptions = [
    { value: 'all', label: t.supportCases.allStatuses },
    { value: 'open', label: t.supportCases.status.open },
    { value: 'in_progress', label: t.supportCases.status.in_progress },
    { value: 'waiting_for_customer', label: t.supportCases.status.waiting_for_customer },
    { value: 'resolved', label: t.supportCases.status.resolved },
    { value: 'closed', label: t.supportCases.status.closed },
  ];

  const priorityFilterOptions = [
    { value: 'all', label: t.supportCases.allPriorities },
    { value: 'urgent', label: t.supportCases.priority.urgent },
    { value: 'high', label: t.supportCases.priority.high },
    { value: 'normal', label: t.supportCases.priority.normal },
    { value: 'low', label: t.supportCases.priority.low },
  ];

  const categoryFilterOptions = [
    { value: 'all', label: t.supportCases.allCategories },
    { value: 'order_delay', label: t.supportCases.categories.order_delay },
    { value: 'damaged_item', label: t.supportCases.categories.damaged_item },
    { value: 'wrong_item', label: t.supportCases.categories.wrong_item },
    { value: 'driver_behavior', label: t.supportCases.categories.driver_behavior },
    { value: 'payment_issue', label: t.supportCases.categories.payment_issue },
    { value: 'general_inquiry', label: t.supportCases.categories.general_inquiry },
    { value: 'general', label: t.supportCases.categories.general },
    { value: 'other', label: t.supportCases.categories.other },
  ];

  const categoryFormOptions = [
    { value: 'order_delay', label: t.supportCases.categories.order_delay },
    { value: 'damaged_item', label: t.supportCases.categories.damaged_item },
    { value: 'wrong_item', label: t.supportCases.categories.wrong_item },
    { value: 'driver_behavior', label: t.supportCases.categories.driver_behavior },
    { value: 'payment_issue', label: t.supportCases.categories.payment_issue },
    { value: 'general_inquiry', label: t.supportCases.categories.general_inquiry },
    { value: 'general', label: t.supportCases.categories.general },
    { value: 'other', label: t.supportCases.categories.other },
  ];

  const staffFilterOptions = [
    { value: 'all', label: 'جميع الموظفين' },
    ...(staffData?.staff?.map((s) => ({ value: s.id, label: s.name || s.phoneNumber })) || []),
  ];

  const formPriorityOptions = [
    { value: 'low', label: t.supportCases.priority.low },
    { value: 'normal', label: t.supportCases.priority.normal },
    { value: 'high', label: t.supportCases.priority.high },
    { value: 'urgent', label: t.supportCases.priority.urgent },
  ];

  const assignStaffOptions = [
    { value: '', label: '-- بدون تعيين --' },
    ...(staffData?.staff?.map((s) => ({ value: s.id, label: `${s.name} (${s.role})` })) || []),
  ];

  const updateStatusOptions = [
    { value: 'open', label: t.supportCases.status.open },
    { value: 'in_progress', label: t.supportCases.status.in_progress },
    { value: 'waiting_for_customer', label: t.supportCases.status.waiting_for_customer },
    { value: 'resolved', label: t.supportCases.status.resolved },
    { value: 'closed', label: t.supportCases.status.closed },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-navy-900 to-navy-800 text-white p-6 rounded-2xl shadow-sm border border-navy-700">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-navy-700/60 rounded-xl text-gold-400">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">{t.supportCases.title}</h1>
          </div>
          <p className="text-navy-200 text-sm">{t.supportCases.subtitle}</p>
        </div>
        <Button
          variant="primary"
          className="flex items-center gap-2 self-start sm:self-auto shadow-md"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          <span>{t.supportCases.createCase}</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-3.5 right-3 text-gray-400 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
            <Input
              placeholder="بحث بالتذكرة أو العنوان..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="rtl:pr-9 ltr:pl-9"
            />
          </div>

          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />

          <Select
            options={priorityFilterOptions}
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
          />

          <Select
            options={categoryFilterOptions}
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          />

          {(isSuperAdmin || isCSManager) && (
            <Select
              options={staffFilterOptions}
              value={assignedStaffFilter}
              onChange={(e) => {
                setAssignedStaffFilter(e.target.value);
                setPage(1);
              }}
            />
          )}

          <Button
            variant="outline"
            className="flex items-center justify-center gap-2"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setCategoryFilter('all');
              setAssignedStaffFilter('all');
              setPage(1);
            }}
          >
            <Filter className="w-4 h-4" />
            <span>{t.common.resetFilters}</span>
          </Button>
        </div>
      </Card>

      {/* Cases Table */}
      {isLoading ? (
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      ) : isError ? (
        <ErrorState
          title={t.common.error}
          message={(error as any)?.message || 'فشل تحميل قائمة التذاكر'}
          onRetry={refetch}
        />
      ) : !data?.cases || data.cases.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-navy-50 text-navy-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{t.supportCases.empty}</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            لا توجد تذاكر دعم مفتوحة تطابق الفلاتر المحددة حالياً.
          </p>
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            <span>{t.supportCases.createCase}</span>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t.supportCases.table.caseNumber}</TableHeaderCell>
                    <TableHeaderCell>{t.supportCases.table.customer}</TableHeaderCell>
                    <TableHeaderCell>{t.supportCases.table.title}</TableHeaderCell>
                    <TableHeaderCell>{t.supportCases.table.category}</TableHeaderCell>
                    <TableHeaderCell>{t.supportCases.table.priority}</TableHeaderCell>
                    <TableHeaderCell>{t.supportCases.table.status}</TableHeaderCell>
                    <TableHeaderCell>{t.supportCases.table.assignedTo}</TableHeaderCell>
                    <TableHeaderCell>{t.supportCases.table.createdAt}</TableHeaderCell>
                    <TableHeaderCell className="text-left rtl:text-right">{t.supportCases.table.actions}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.cases.map((c) => (
                    <TableRow key={c.id} className="hover:bg-gray-50/80 transition-colors">
                      <TableCell>
                        <span className="font-mono font-bold text-navy-900 text-xs px-2 py-0.5 rounded bg-navy-50 border border-navy-200">
                          {c.caseNumber}
                        </span>
                        {c.orderId && (
                          <div className="text-xs text-gray-400 mt-1 font-mono">{c.orderId}</div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="font-medium text-gray-900 text-sm">
                          {c.customerName || 'عميل'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono" dir="ltr">
                          {c.customerPhone || c.customerId}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-gray-900 text-sm max-w-xs truncate">
                          {c.title}
                        </div>
                        <div className="text-xs text-gray-500 max-w-xs truncate mt-0.5">
                          {c.description}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {getCategoryLabel(c.category)}
                        </span>
                      </TableCell>

                      <TableCell>{getPriorityBadge(c.priority)}</TableCell>

                      <TableCell>{getCaseStatusBadge(c.status)}</TableCell>

                      <TableCell>
                        {c.assignedStaffName ? (
                          <div className="text-xs text-gray-800 font-medium">
                            {c.assignedStaffName}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            غير معينة
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <span className="text-xs text-gray-500">
                          {new Date(c.createdAt).toLocaleDateString('ar-JO')}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetails(c)}
                          className="text-xs"
                        >
                          معاينة وتحديث
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {data.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Create Case Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t.supportCases.form.createTitle}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.supportCases.form.customerId} <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="مثال: a1b2c3d4-..."
              value={newCustomerId}
              onChange={(e) => setNewCustomerId(e.target.value)}
              required
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.supportCases.form.orderId}
            </label>
            <Input
              placeholder="مثال: ORD-10023 (اختياري)"
              value={newOrderId}
              onChange={(e) => setNewOrderId(e.target.value)}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.supportCases.form.title} <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="ملخص المشكلة..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.supportCases.form.category}
              </label>
              <Select
                options={categoryFormOptions}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.supportCases.form.priority}
              </label>
              <Select
                options={formPriorityOptions}
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as SupportCasePriority)}
              />
            </div>
          </div>

          {(isSuperAdmin || isCSManager) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.supportCases.form.assignedStaff}
              </label>
              <Select
                options={assignStaffOptions}
                value={newAssignedStaffId}
                onChange={(e) => setNewAssignedStaffId(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.supportCases.form.description} <span className="text-rose-500">*</span>
            </label>
            <textarea
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 text-sm p-2.5 border"
              rows={3}
              placeholder="شرح وتفاصيل الشكوى..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
              {t.supportCases.form.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Inspect & Update Case Modal */}
      <Modal
        isOpen={!!selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
        title={t.supportCases.details.title}
      >
        {isLoadingDetails ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : caseDetails ? (
          <div className="space-y-6">
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              {/* Header Details */}
              <div className="bg-navy-50/50 p-4 rounded-xl border border-navy-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono font-bold text-navy-800 mb-1">
                    {caseDetails.caseNumber}
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{caseDetails.title}</h3>
                  <div className="text-xs text-gray-500 mt-1">
                    العميل: {caseDetails.customerName || 'عميل'} ({caseDetails.customerPhone || caseDetails.customerId})
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                    {getCategoryLabel(caseDetails.category)}
                  </span>
                  {getPriorityBadge(caseDetails.priority)}
                  {getCaseStatusBadge(caseDetails.status)}
                </div>
              </div>

              {/* Description */}
              <div className="p-3 bg-gray-50 rounded-xl border text-sm text-gray-700">
                <span className="font-semibold block mb-1 text-gray-900">وصف الشكوى:</span>
                <p className="whitespace-pre-wrap">{caseDetails.description}</p>
              </div>

              {/* Status, Category & Priority controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t.supportCases.details.updateStatus}
                  </label>
                  <Select
                    options={updateStatusOptions}
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as SupportCaseStatus)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t.supportCases.form.category}
                  </label>
                  <Select
                    options={categoryFormOptions}
                    value={updateCategory}
                    onChange={(e) => setUpdateCategory(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t.supportCases.form.priority}
                  </label>
                  <Select
                    options={formPriorityOptions}
                    value={updatePriority}
                    onChange={(e) => setUpdatePriority(e.target.value as SupportCasePriority)}
                  />
                </div>
              </div>

              {(isSuperAdmin || isCSManager) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.supportCases.details.reassign}
                  </label>
                  <Select
                    options={assignStaffOptions}
                    value={updateAssignedStaffId}
                    onChange={(e) => setUpdateAssignedStaffId(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.supportCases.details.resolutionNotes}
                </label>
                <textarea
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 text-sm p-2.5 border"
                  rows={2}
                  placeholder="اكتب ملاحظات الحل أو الإجراء المتخذ..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setSelectedCaseId(null)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" variant="primary" isLoading={updateMutation.isPending}>
                  {t.common.save}
                </Button>
              </div>
            </form>

            {/* Internal Notes Thread */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-600" />
                {t.supportCases.details.notesThread} ({caseDetails.notes?.length || 0})
              </h4>

              {/* Notes List */}
              <div className="space-y-2.5 max-h-48 overflow-y-auto mb-3 pr-1">
                {caseDetails.notes && caseDetails.notes.length > 0 ? (
                  caseDetails.notes.map((n: any) => (
                    <div key={n.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <UserIcon className="w-3 h-3 text-brand-600" />
                          {n.authorName || 'موظف'} ({n.authorRole})
                        </span>
                        <span className="font-mono">{new Date(n.createdAt).toLocaleString('ar-JO')}</span>
                      </div>
                      <p className="text-slate-800 whitespace-pre-wrap">{n.note}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic py-2">{t.supportCases.details.noNotes}</p>
                )}
              </div>

              {/* Add Note Form */}
              <div className="flex gap-2">
                <Input
                  placeholder={t.supportCases.details.notePlaceholder}
                  value={newCaseNote}
                  onChange={(e) => setNewCaseNote(e.target.value)}
                  className="text-xs"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!newCaseNote.trim() || addNoteMutation.isPending}
                  onClick={() => addNoteMutation.mutate(newCaseNote.trim())}
                  className="shrink-0"
                >
                  {addNoteMutation.isPending ? t.common.loading : t.supportCases.details.addNote}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

