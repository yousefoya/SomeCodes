import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  Mail,
  Building,
  ShieldCheck,
  UserCheck,
  UserX,
  ArrowRight,
  ArrowLeft,
  LifeBuoy,
  Activity,
  Edit2,
  Calendar,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { staffApi, UpdateStaffPayload } from '../api/staff.api';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';

export const StaffDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, isRTL } = useLanguage();
  const { success, error: toastError } = useToast();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'cases' | 'audit'>('cases');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isToggleStatusModalOpen, setIsToggleStatusModalOpen] = useState(false);

  // Form states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editEmployeeCode, setEditEmployeeCode] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const canManageStaff = hasPermission('manage_staff');

  // Fetch staff member details
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['staff-detail', id],
    queryFn: () => staffApi.getStaffById(id!),
    enabled: !!id,
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateStaffPayload) => staffApi.updateStaff(id!, payload),
    onSuccess: (res) => {
      success(
        isRTL ? `تم تحديث بيانات الموظف ${res.name} بنجاح.` : `Staff member ${res.name} updated successfully.`
      );
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['staff-detail', id] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: () => staffApi.toggleStaffStatus(id!),
    onSuccess: (res) => {
      success(res.message);
      setIsToggleStatusModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['staff-detail', id] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || err.message);
    },
  });

  const openEditModal = () => {
    if (!data?.staff) return;
    setEditName(data.staff.name || '');
    setEditEmail(data.staff.email || '');
    setEditRole(data.staff.role);
    setEditDepartment(data.staff.department || '');
    setEditEmployeeCode(data.staff.employeeCode || '');
    setEditNotes(data.staff.notes || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name: editName.trim(),
      email: editEmail.trim() || undefined,
      role: editRole,
      department: editDepartment.trim() || undefined,
      employeeCode: editEmployeeCode.trim() || undefined,
      notes: editNotes.trim() || undefined,
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

  const formRoleOptions = [
    { value: 'customer_service_agent', label: t.staff.roles.customer_service_agent },
    { value: 'customer_service_manager', label: t.staff.roles.customer_service_manager },
    { value: 'super_admin', label: t.staff.roles.super_admin },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (isError || !data?.staff) {
    return (
      <ErrorState
        title={t.common.error}
        message={(error as any)?.message || 'فشل تحميل بيانات الموظف'}
        onRetry={refetch}
      />
    );
  }

  const staff = data.staff;
  const recentCases = data.recentCases || [];
  const recentLogs = data.recentLogs || [];

  return (
    <div className="space-y-6">
      {/* Back Button & Top Action */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/staff')}
          className="flex items-center gap-2 text-gray-700"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isRTL ? 'العودة إلى قائمة الموظفين' : 'Back to Staff List'}</span>
        </Button>

        {canManageStaff && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openEditModal} className="flex items-center gap-1.5">
              <Edit2 className="w-4 h-4" />
              <span>{t.staff.actions.edit}</span>
            </Button>
            <Button
              variant={staff.isSuspended ? 'primary' : 'danger'}
              size="sm"
              onClick={() => setIsToggleStatusModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              {staff.isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
              <span>{staff.isSuspended ? t.staff.actions.activate : t.staff.actions.suspend}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Staff Card */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-6 text-center relative overflow-hidden">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-navy-900 to-navy-700 text-gold-400 font-bold text-2xl flex items-center justify-center mx-auto mb-4 shadow-md border-2 border-navy-100">
              {staff.name ? staff.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">{staff.name}</h2>
            <div className="flex justify-center mb-4">{getRoleBadge(staff.role)}</div>

            <div className="border-t pt-4 space-y-3 text-sm text-right rtl:text-right ltr:text-left">
              <div className="flex items-center justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {t.staff.table.phone}
                </span>
                <span className="font-mono font-semibold text-gray-800" dir="ltr">
                  {staff.phoneNumber}
                </span>
              </div>

              {staff.email && (
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {t.staff.form.email}
                  </span>
                  <span className="text-gray-800 font-medium" dir="ltr">
                    {staff.email}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-gray-400" />
                  {t.staff.table.department}
                </span>
                <span className="text-gray-800 font-medium">{staff.department || '—'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-gray-400" />
                  {t.staff.table.employeeCode}
                </span>
                <span className="font-mono font-medium text-gray-800">{staff.employeeCode || '—'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-gray-400" />
                  {t.staff.table.status}
                </span>
                {staff.isSuspended ? (
                  <Badge variant="danger">{t.staff.status.suspended}</Badge>
                ) : (
                  <Badge variant="success">{t.staff.status.active}</Badge>
                )}
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {t.staff.table.createdAt}
                </span>
                <span className="text-gray-800 text-xs">
                  {new Date(staff.createdAt).toLocaleDateString('ar-JO')}
                </span>
              </div>
            </div>

            {staff.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 text-right border border-gray-200/60">
                <div className="font-semibold text-gray-700 mb-1">ملاحظات الإدارة:</div>
                <p>{staff.notes}</p>
              </div>
            )}
          </Card>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-navy-50/50 border-navy-100 text-center">
              <div className="text-2xl font-bold text-navy-900">{recentCases.length}</div>
              <div className="text-xs text-navy-600 font-medium mt-1">تذاكر الدعم المسندة</div>
            </Card>
            <Card className="p-4 bg-gold-50/50 border-gold-200 text-center">
              <div className="text-2xl font-bold text-gold-900">{recentLogs.length}</div>
              <div className="text-xs text-gold-700 font-medium mt-1">العمليات المسجلة</div>
            </Card>
          </div>
        </div>

        {/* Right Column: Tabbed Views */}
        <div className="space-y-4 lg:col-span-2">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <button
              onClick={() => setActiveTab('cases')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'cases'
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LifeBuoy className="w-4 h-4" />
              <span>تذاكر الدعم المسندة ({recentCases.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'audit'
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>سجل العمليات ({recentLogs.length})</span>
            </button>
          </div>

          {/* Tab 1: Cases */}
          {activeTab === 'cases' && (
            <Card className="p-0 overflow-hidden">
              {recentCases.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <LifeBuoy className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="font-medium text-sm">لا توجد تذاكر دعم مسندة لهذا الموظف حالياً.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>رقم التذكرة</TableHeaderCell>
                        <TableHeaderCell>العنوان</TableHeaderCell>
                        <TableHeaderCell>الحالة</TableHeaderCell>
                        <TableHeaderCell>الأولوية</TableHeaderCell>
                        <TableHeaderCell>تاريخ الإنشاء</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentCases.map((c: any) => (
                        <TableRow key={c.id} className="hover:bg-gray-50/80">
                          <TableCell>
                            <span className="font-mono text-xs font-semibold text-navy-900">
                              {c.caseNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-gray-900 text-sm">{c.title}</div>
                            {c.description && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">{c.description}</div>
                            )}
                          </TableCell>
                          <TableCell>{getCaseStatusBadge(c.status)}</TableCell>
                          <TableCell>
                            <span className="text-xs font-medium text-gray-600">{c.priority}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-500">
                              {new Date(c.createdAt).toLocaleDateString('ar-JO')}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          )}

          {/* Tab 2: Audit Logs */}
          {activeTab === 'audit' && (
            <Card className="p-0 overflow-hidden">
              {recentLogs.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="font-medium text-sm">لا توجد سجلات عمليات لهذا الموظف.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>الإجراء</TableHeaderCell>
                        <TableHeaderCell>نوع السجل</TableHeaderCell>
                        <TableHeaderCell>المعرف</TableHeaderCell>
                        <TableHeaderCell>عنوان IP</TableHeaderCell>
                        <TableHeaderCell>التاريخ والوقت</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentLogs.map((log: any) => (
                        <TableRow key={log.id} className="hover:bg-gray-50/80">
                          <TableCell>
                            <span className="font-semibold text-navy-800 text-xs font-mono">
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                              {log.entityType}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-gray-600">{log.entityId || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-gray-500">{log.ipAddress || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-500">
                              {new Date(log.createdAt).toLocaleString('ar-JO')}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t.staff.modal.editTitle}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.staff.form.phone}</label>
            <Input value={staff.phoneNumber} disabled dir="ltr" className="bg-gray-50 text-gray-500" />
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
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} dir="ltr" />
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
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" isLoading={updateMutation.isPending}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toggle Status Modal */}
      <Modal
        isOpen={isToggleStatusModalOpen}
        onClose={() => setIsToggleStatusModalOpen(false)}
        title={staff.isSuspended ? 'تفعيل حساب الموظف' : 'تعليق حساب الموظف'}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm">
              {staff.isSuspended
                ? `هل أنت متأكد من تفعيل حساب الموظف (${staff.name})؟`
                : `هل أنت متأكد من تعليق حساب الموظف (${staff.name})؟`}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" onClick={() => setIsToggleStatusModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant={staff.isSuspended ? 'primary' : 'danger'}
              isLoading={toggleStatusMutation.isPending}
              onClick={() => toggleStatusMutation.mutate()}
            >
              {staff.isSuspended ? 'نعم، تفعيل الحساب' : 'نعم، تعليق الحساب'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
