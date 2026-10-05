import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Building,
  Edit2,
  Eye,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { staffApi, CreateStaffPayload, UpdateStaffPayload } from '../api/staff.api';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { StaffMember } from '../types';
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

export const StaffPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { success, error: toastError } = useToast();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isToggleStatusModalOpen, setIsToggleStatusModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Form states for Create
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('customer_service_agent');
  const [newDepartment, setNewDepartment] = useState('خدمة العملاء');
  const [newEmployeeCode, setNewEmployeeCode] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Form states for Edit
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('customer_service_agent');
  const [editDepartment, setEditDepartment] = useState('');
  const [editEmployeeCode, setEditEmployeeCode] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const canManageStaff = hasPermission('manage_staff');

  // Fetch staff list
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['staff-list', page, search, roleFilter, statusFilter],
    queryFn: () =>
      staffApi.getStaffList({
        page,
        limit: 15,
        search,
        role: roleFilter,
        status: statusFilter,
      }),
  });

  // Create Staff Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateStaffPayload) => staffApi.createStaff(payload),
    onSuccess: (res) => {
      success(
        isRTL ? `تم إنشاء حساب الموظف ${res.name} بنجاح.` : `Staff account for ${res.name} created successfully.`
      );
      setIsCreateModalOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  // Update Staff Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStaffPayload }) =>
      staffApi.updateStaff(id, payload),
    onSuccess: (res) => {
      success(
        isRTL ? `تم تحديث بيانات الموظف ${res.name} بنجاح.` : `Staff member ${res.name} updated successfully.`
      );
      setIsEditModalOpen(false);
      setSelectedStaff(null);
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => staffApi.toggleStaffStatus(id),
    onSuccess: (res) => {
      success(res.message);
      setIsToggleStatusModalOpen(false);
      setSelectedStaff(null);
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  const resetCreateForm = () => {
    setNewPhone('');
    setNewName('');
    setNewEmail('');
    setNewRole('customer_service_agent');
    setNewDepartment('خدمة العملاء');
    setNewEmployeeCode('');
    setNewNotes('');
  };

  const openEditModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setEditName(staff.name || '');
    setEditEmail(staff.email || '');
    setEditRole(staff.role);
    setEditDepartment(staff.department || '');
    setEditEmployeeCode(staff.employeeCode || '');
    setEditNotes(staff.notes || '');
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone || !newName) {
      toastError(isRTL ? 'يرجى إدخال الاسم ورقم الهاتف.' : 'Please enter name and phone number.');
      return;
    }
    createMutation.mutate({
      phoneNumber: newPhone.trim(),
      name: newName.trim(),
      email: newEmail.trim() || undefined,
      role: newRole,
      department: newDepartment.trim() || undefined,
      employeeCode: newEmployeeCode.trim() || undefined,
      notes: newNotes.trim() || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    updateMutation.mutate({
      id: selectedStaff.id,
      payload: {
        name: editName.trim(),
        email: editEmail.trim() || undefined,
        role: editRole,
        department: editDepartment.trim() || undefined,
        employeeCode: editEmployeeCode.trim() || undefined,
        notes: editNotes.trim() || undefined,
      },
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return <Badge variant="brand">{t.staff.roles.super_admin}</Badge>;
      case 'customer_service_manager':
        return <Badge variant="warning">{t.staff.roles.customer_service_manager}</Badge>;
      case 'customer_service_agent':
        return <Badge variant="info">{t.staff.roles.customer_service_agent}</Badge>;
      default:
        return <Badge variant="neutral">{role}</Badge>;
    }
  };

  const roleFilterOptions = [
    { value: 'all', label: t.staff.filters.allRoles },
    { value: 'customer_service_agent', label: t.staff.roles.customer_service_agent },
    { value: 'customer_service_manager', label: t.staff.roles.customer_service_manager },
    { value: 'super_admin', label: t.staff.roles.super_admin },
  ];

  const statusFilterOptions = [
    { value: 'all', label: t.staff.filters.allStatuses },
    { value: 'active', label: t.staff.filters.active },
    { value: 'suspended', label: t.staff.filters.suspended },
  ];

  const formRoleOptions = [
    { value: 'customer_service_agent', label: t.staff.roles.customer_service_agent },
    { value: 'customer_service_manager', label: t.staff.roles.customer_service_manager },
    { value: 'super_admin', label: t.staff.roles.super_admin },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-navy-900 to-navy-800 text-white p-6 rounded-2xl shadow-sm border border-navy-700">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-navy-700/60 rounded-xl text-gold-400">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">{t.staff.title}</h1>
          </div>
          <p className="text-navy-200 text-sm">{t.staff.subtitle}</p>
        </div>
        {canManageStaff && (
          <Button
            variant="primary"
            className="flex items-center gap-2 self-start sm:self-auto shadow-md"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.staff.addStaff}</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-3.5 right-3 text-gray-400 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
            <Input
              placeholder={t.staff.searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="rtl:pr-9 ltr:pl-9"
            />
          </div>

          <Select
            options={roleFilterOptions}
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          />

          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />

          <Button
            variant="outline"
            className="flex items-center justify-center gap-2"
            onClick={() => {
              setSearch('');
              setRoleFilter('all');
              setStatusFilter('all');
              setPage(1);
            }}
          >
            <Filter className="w-4 h-4" />
            <span>{t.common.resetFilters}</span>
          </Button>
        </div>
      </Card>

      {/* Staff Table */}
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
          message={(error as any)?.message || 'فشل تحميل قائمة الموظفين'}
          onRetry={refetch}
        />
      ) : !data?.staff || data.staff.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-navy-50 text-navy-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{t.staff.emptyState}</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            لم يتم العثور على أي موظف مطابق للبحث أو الفلاتر المحددة.
          </p>
          {canManageStaff && (
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              <span>{t.staff.addStaff}</span>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t.staff.table.employee}</TableHeaderCell>
                    <TableHeaderCell>{t.staff.table.phone}</TableHeaderCell>
                    <TableHeaderCell>{t.staff.table.role}</TableHeaderCell>
                    <TableHeaderCell>{t.staff.table.department}</TableHeaderCell>
                    <TableHeaderCell>{t.staff.table.employeeCode}</TableHeaderCell>
                    <TableHeaderCell>{t.staff.table.status}</TableHeaderCell>
                    <TableHeaderCell>{t.staff.table.createdAt}</TableHeaderCell>
                    <TableHeaderCell className="text-left rtl:text-right">{t.staff.table.actions}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.staff.map((member) => (
                    <TableRow key={member.id} className="hover:bg-gray-50/80 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-navy-800 to-navy-600 text-gold-300 font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                            {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{member.name || 'مجهول'}</div>
                            {member.email && (
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" />
                                <span>{member.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm font-mono text-gray-700">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span dir="ltr">{member.phoneNumber}</span>
                        </div>
                      </TableCell>

                      <TableCell>{getRoleBadge(member.role)}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Building className="w-3.5 h-3.5 text-gray-400" />
                          <span>{member.department || '—'}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {member.employeeCode ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-xs">
                            {member.employeeCode}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {member.isSuspended ? (
                          <Badge variant="danger" className="flex items-center gap-1 w-fit">
                            <UserX className="w-3 h-3" />
                            <span>{t.staff.status.suspended}</span>
                          </Badge>
                        ) : (
                          <Badge variant="success" className="flex items-center gap-1 w-fit">
                            <UserCheck className="w-3 h-3" />
                            <span>{t.staff.status.active}</span>
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{new Date(member.createdAt).toLocaleDateString('ar-JO')}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t.staff.actions.viewProfile}
                            onClick={() => navigate(`/admin/staff/${member.id}`)}
                            className="text-navy-600 hover:text-navy-800 hover:bg-navy-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {canManageStaff && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={t.staff.actions.edit}
                                onClick={() => openEditModal(member)}
                                className="text-gray-600 hover:text-navy-800 hover:bg-gray-100"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                title={member.isSuspended ? t.staff.actions.activate : t.staff.actions.suspend}
                                onClick={() => {
                                  setSelectedStaff(member);
                                  setIsToggleStatusModalOpen(true);
                                }}
                                className={
                                  member.isSuspended
                                    ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                    : 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                                }
                              >
                                {member.isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                              </Button>
                            </>
                          )}
                        </div>
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

      {/* Create Staff Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t.staff.modal.createTitle}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.staff.form.phone} <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="0791234567"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              required
              dir="ltr"
            />
            <p className="text-xs text-gray-400 mt-1">يستخدم هذا الرقم لتسجيل الدخول عبر رمز التحقق OTP.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.staff.form.name} <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="الاسم الثلاثي أو الكامل"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.staff.form.role} <span className="text-rose-500">*</span>
              </label>
              <Select
                options={formRoleOptions}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.staff.form.department}</label>
              <Input
                placeholder="مثال: خدمة العملاء / الدعم الفني"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.staff.form.email}</label>
              <Input
                type="email"
                placeholder="agent@btin7al.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.staff.form.employeeCode}</label>
              <Input
                placeholder="EMP-101"
                value={newEmployeeCode}
                onChange={(e) => setNewEmployeeCode(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.staff.form.notes}</label>
            <textarea
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 text-sm p-2.5 border"
              rows={2}
              placeholder="ملاحظات إضافية حول الموظف..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
              {t.common.create}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStaff(null);
        }}
        title={t.staff.modal.editTitle}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.staff.form.phone}</label>
            <Input value={selectedStaff?.phoneNumber || ''} disabled dir="ltr" className="bg-gray-50 text-gray-500" />
            <p className="text-xs text-gray-400 mt-1">رقم الهاتف مرتبط بالحساب ولا يمكن تعديله مباشرة.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.staff.form.name} <span className="text-rose-500">*</span>
            </label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.staff.form.role} <span className="text-rose-500">*</span>
              </label>
              <Select
                options={formRoleOptions}
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.staff.form.department}</label>
              <Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.staff.form.email}</label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.staff.form.employeeCode}</label>
              <Input value={editEmployeeCode} onChange={(e) => setEditEmployeeCode(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.staff.form.notes}</label>
            <textarea
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 text-sm p-2.5 border"
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedStaff(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" isLoading={updateMutation.isPending}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toggle Status Confirmation Modal */}
      <Modal
        isOpen={isToggleStatusModalOpen}
        onClose={() => {
          setIsToggleStatusModalOpen(false);
          setSelectedStaff(null);
        }}
        title={selectedStaff?.isSuspended ? 'تفعيل حساب الموظف' : 'تعليق حساب الموظف'}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm">
              {selectedStaff?.isSuspended
                ? `هل أنت متأكد من رغبتك في إعادة تفعيل حساب الموظف (${selectedStaff?.name})؟ سيتمكن من تسجيل الدخول واستخدام النظام فوراً.`
                : `هل أنت متأكد من رغبتك في تعليق حساب الموظف (${selectedStaff?.name})؟ سيتم منعه من الوصول إلى لوحة الإدارة فوراً.`}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsToggleStatusModalOpen(false);
                setSelectedStaff(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant={selectedStaff?.isSuspended ? 'primary' : 'danger'}
              isLoading={toggleStatusMutation.isPending}
              onClick={() => {
                if (selectedStaff) {
                  toggleStatusMutation.mutate(selectedStaff.id);
                }
              }}
            >
              {selectedStaff?.isSuspended ? 'نعم، تفعيل الحساب' : 'نعم، تعليق الحساب'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
