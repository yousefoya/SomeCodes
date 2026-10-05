import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../api/customers.api';
import { User, UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { SearchInput } from '../components/shared/SearchInput';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Users, UserPlus, Ban, CheckCircle, Shield, Award } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [activateTarget, setActivateTarget] = useState<User | null>(null);

  const [newUser, setNewUser] = useState({
    phoneNumber: '',
    name: '',
    email: '',
    role: 'customer' as UserRole,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-users', { page, search, role: roleFilter, status: statusFilter }],
    queryFn: () =>
      customersApi.getUsers({
        page,
        limit: 15,
        search: search || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof newUser) => customersApi.create(payload),
    onSuccess: () => {
      success('تم إضافة المستخدم بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setIsCreateOpen(false);
      setNewUser({ phoneNumber: '', name: '', email: '', role: 'customer' });
    },
    onError: (err: Error) => toastError(err.message || 'فشل إضافة المستخدم.'),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => customersApi.suspend(id),
    onSuccess: () => {
      success('تم إيقاف حساب المستخدم بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSuspendTarget(null);
    },
    onError: (err: Error) => toastError(err.message || 'فشل إيقاف الحساب.'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => customersApi.activate(id),
    onSuccess: () => {
      success('تم إعادة تنشيط الحساب بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setActivateTarget(null);
    },
    onError: (err: Error) => toastError(err.message || 'فشل تنشيط الحساب.'),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.phoneNumber) {
      toastError('رقم الهاتف مطلوب.');
      return;
    }
    createMutation.mutate(newUser);
  };

  const roleOptions = [
    { value: 'all', label: t.customers.filterAllRoles },
    { value: 'customer', label: t.customers.filterCustomer },
    { value: 'provider', label: t.customers.filterProvider },
    { value: 'delivery', label: t.customers.filterDelivery },
    { value: 'admin', label: t.customers.filterAdmin },
  ];

  const statusOptions = [
    { value: 'all', label: t.common.all },
    { value: 'active', label: t.common.active },
    { value: 'suspended', label: t.common.inactive },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 tracking-tight">
            {t.customers.title}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">{t.customers.subtitle}</p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          icon={<UserPlus className="w-4 h-4" />}
        >
          {t.customers.addUser}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-surface-200/80 shadow-card">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder={t.customers.searchPlaceholder}
        />
        <div className="w-full sm:w-44">
          <Select
            options={roleOptions}
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Main Table */}
      {isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="bg-white rounded-2xl border border-surface-200/80 p-4">
          <TableSkeleton rows={8} cols={7} />
        </div>
      ) : !data?.users || data.users.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12 text-surface-300" />}
          title={t.customers.empty}
          description="لا يوجد مستخدمون يطابقون خيارات البحث والتصفية المحددة."
        />
      ) : (
        <div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t.customers.table.name}</TableHeaderCell>
                <TableHeaderCell>{t.customers.table.phone}</TableHeaderCell>
                <TableHeaderCell>{t.customers.table.role}</TableHeaderCell>
                <TableHeaderCell>{t.customers.table.wallet}</TableHeaderCell>
                <TableHeaderCell>{t.customers.table.points}</TableHeaderCell>
                <TableHeaderCell>{t.customers.table.status}</TableHeaderCell>
                <TableHeaderCell>{t.customers.table.registeredAt}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t.customers.table.actions}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <span className="font-bold text-surface-900 block text-xs">
                      {u.name || 'بدون اسم'}
                    </span>
                    {u.email && <span className="text-[10px] text-surface-400 block">{u.email}</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-surface-700">
                    {u.phoneNumber}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === 'admin'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : u.role === 'provider'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : u.role === 'delivery'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-surface-100 text-surface-700 border border-surface-200'
                      }`}
                    >
                      {u.role === 'admin' && <Shield className="w-3 h-3" />}
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-surface-800">
                    {u.walletBalance.toFixed(2)} {t.common.jod}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 text-xs">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      {u.points}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isSuspended ? 'danger' : 'success'} size="sm">
                      {u.isSuspended ? t.common.inactive : t.common.active}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[11px] text-surface-400">
                    {new Date(u.createdAt).toLocaleDateString('ar-JO', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-center">
                    {u.isSuspended ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActivateTarget(u)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        icon={<CheckCircle className="w-3.5 h-3.5" />}
                      >
                        {t.customers.actions.activate}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSuspendTarget(u)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        icon={<Ban className="w-3.5 h-3.5" />}
                      >
                        {t.customers.actions.suspend}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            currentPage={data.page}
            totalPages={data.totalPages}
            totalItems={data.total}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t.customers.addUser}
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <Input
            label={t.customers.table.phone}
            placeholder="079XXXXXXXX"
            value={newUser.phoneNumber}
            onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
            required
          />
          <Input
            label={t.customers.table.name}
            placeholder="اسم المستخدم"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          />
          <Input
            label="البريد الإلكتروني (اختياري)"
            type="email"
            placeholder="user@example.com"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          <Select
            label={t.customers.table.role}
            options={[
              { value: 'customer', label: 'عميل (Customer)' },
              { value: 'provider', label: 'مزود خدمة (Provider)' },
              { value: 'delivery', label: 'مندوب توصيل (Delivery)' },
              { value: 'admin', label: 'مدير نظام (Admin)' },
            ]}
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-surface-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" size="sm" isLoading={createMutation.isPending}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Suspend Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => suspendTarget && suspendMutation.mutate(suspendTarget.id)}
        title={t.customers.actions.suspend}
        message={t.customers.actions.suspendConfirm}
        confirmText="تأكيد الإيقاف"
        isLoading={suspendMutation.isPending}
      />

      {/* Activate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        onConfirm={() => activateTarget && activateMutation.mutate(activateTarget.id)}
        title={t.customers.actions.activate}
        message={t.customers.actions.activateConfirm}
        confirmText="تأكيد التنشيط"
        variant="primary"
        isLoading={activateMutation.isPending}
      />
    </div>
  );
};
