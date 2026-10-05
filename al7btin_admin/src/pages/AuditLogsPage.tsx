import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Search,
  Filter,
  Clock,
  Eye,
  Globe,
  Terminal,
  FileCode,
  AlertCircle,
  Database,
  RefreshCw,
} from 'lucide-react';
import { auditLogsApi } from '../api/audit-logs.api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { AuditLog } from '../types';
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

export const AuditLogsPage: React.FC = () => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const canViewAudit = hasPermission('view_audit_logs');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit-logs', page, search, actionFilter, entityTypeFilter],
    queryFn: () =>
      auditLogsApi.getAuditLogs({
        page,
        limit: 20,
        search,
        action: actionFilter,
        entityType: entityTypeFilter,
      }),
    enabled: canViewAudit,
  });

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE') || action.includes('REQUESTED')) {
      return <Badge variant="success">{action}</Badge>;
    }
    if (action.includes('APPROVE') || action.includes('PROCESSED')) {
      return <Badge variant="brand">{action}</Badge>;
    }
    if (action.includes('REJECT') || action.includes('SUSPEND') || action.includes('DELETE')) {
      return <Badge variant="danger">{action}</Badge>;
    }
    if (action.includes('UPDATE') || action.includes('TOGGLE')) {
      return <Badge variant="warning">{action}</Badge>;
    }
    return <Badge variant="neutral">{action}</Badge>;
  };

  const actionFilterOptions = [
    { value: 'all', label: t.auditLogs.filters.allActions },
    { value: 'STAFF_CREATED', label: 'STAFF_CREATED' },
    { value: 'STAFF_UPDATED', label: 'STAFF_UPDATED' },
    { value: 'STAFF_STATUS_TOGGLED', label: 'STAFF_STATUS_TOGGLED' },
    { value: 'CUSTOMER_SERVICE_NOTE_ADDED', label: 'CUSTOMER_SERVICE_NOTE_ADDED' },
    { value: 'SUPPORT_CASE_CREATED', label: 'SUPPORT_CASE_CREATED' },
    { value: 'SUPPORT_CASE_UPDATED', label: 'SUPPORT_CASE_UPDATED' },
    { value: 'REFUND_REQUESTED', label: 'REFUND_REQUESTED' },
    { value: 'REFUND_UNDER_REVIEW', label: 'REFUND_UNDER_REVIEW' },
    { value: 'REFUND_APPROVED', label: 'REFUND_APPROVED' },
    { value: 'REFUND_REJECTED', label: 'REFUND_REJECTED' },
    { value: 'REFUND_PROCESSED', label: 'REFUND_PROCESSED' },
    { value: 'ORDER_STATUS_UPDATED', label: 'ORDER_STATUS_UPDATED' },
    { value: 'PROVIDER_STATUS_TOGGLED', label: 'PROVIDER_STATUS_TOGGLED' },
  ];

  const entityTypeFilterOptions = [
    { value: 'all', label: t.auditLogs.filters.allEntities },
    { value: 'staff', label: 'staff' },
    { value: 'support_case', label: 'support_case' },
    { value: 'customer_service_note', label: 'customer_service_note' },
    { value: 'refund_request', label: 'refund_request' },
    { value: 'order', label: 'order' },
    { value: 'provider', label: 'provider' },
    { value: 'user', label: 'user' },
    { value: 'service', label: 'service' },
  ];

  if (!canViewAudit) {
    return (
      <Card className="p-12 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{t.common.unauthorized}</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          عذراً، يتطلب الوصول إلى سجل الرقابة والعمليات صلاحيات مدير أو مسؤول نظام.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-navy-900 to-navy-800 text-white p-6 rounded-2xl shadow-sm border border-navy-700">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-navy-700/60 rounded-xl text-gold-400">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">{t.auditLogs.title}</h1>
          </div>
          <p className="text-navy-200 text-sm">{t.auditLogs.subtitle}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="flex items-center gap-2 self-start sm:self-auto bg-navy-800/80 text-white border-navy-600 hover:bg-navy-700"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث السجل</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-3.5 right-3 text-gray-400 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
            <Input
              placeholder={t.auditLogs.searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="rtl:pr-9 ltr:pl-9"
            />
          </div>

          <Select
            options={actionFilterOptions}
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          />

          <Select
            options={entityTypeFilterOptions}
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setPage(1);
            }}
          />

          <Button
            variant="outline"
            className="flex items-center justify-center gap-2"
            onClick={() => {
              setSearch('');
              setActionFilter('all');
              setEntityTypeFilter('all');
              setPage(1);
            }}
          >
            <Filter className="w-4 h-4" />
            <span>{t.common.resetFilters}</span>
          </Button>
        </div>
      </Card>

      {/* Audit Logs Table */}
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
          message={(error as any)?.message || 'فشل تحميل سجل الرقابة'}
          onRetry={refetch}
        />
      ) : !data?.logs || data.logs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-navy-50 text-navy-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{t.auditLogs.emptyState}</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            لم يتم العثور على أي سجلات مطابقة للبحث المحدد.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t.auditLogs.table.timestamp}</TableHeaderCell>
                    <TableHeaderCell>{t.auditLogs.table.action}</TableHeaderCell>
                    <TableHeaderCell>{t.auditLogs.table.actor}</TableHeaderCell>
                    <TableHeaderCell>{t.auditLogs.table.entityType}</TableHeaderCell>
                    <TableHeaderCell>{t.auditLogs.table.entityId}</TableHeaderCell>
                    <TableHeaderCell>{t.auditLogs.table.ipAddress}</TableHeaderCell>
                    <TableHeaderCell className="text-left rtl:text-right">{t.auditLogs.table.details}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50/80 transition-colors">
                      <TableCell>
                        <div className="text-xs text-gray-700 flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{new Date(log.createdAt).toLocaleString('ar-JO')}</span>
                        </div>
                      </TableCell>

                      <TableCell>{getActionBadge(log.action)}</TableCell>

                      <TableCell>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {log.actorName || log.actorPhone || 'نظام آلي'}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            {log.actorRole ? log.actorRole : 'System'}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                          {log.entityType}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="font-mono text-xs text-gray-600 truncate max-w-[120px] inline-block" title={log.entityId || ''}>
                          {log.entityId || '—'}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                          <Globe className="w-3 h-3 text-gray-400" />
                          <span>{log.ipAddress || '—'}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="flex items-center gap-1.5 text-navy-600 hover:text-navy-800 hover:bg-navy-50"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs">عرض التفاصيل</span>
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

      {/* JSON State / Diff Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={t.auditLogs.detailsModal.title}
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-xl text-xs border border-gray-200/70">
              <div>
                <span className="text-gray-400 block mb-0.5">الإجراء:</span>
                <span className="font-semibold text-navy-900 font-mono">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">المنفذ:</span>
                <span className="font-semibold text-gray-800">{selectedLog.actorName || selectedLog.actorPhone || 'System'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">الكيان:</span>
                <span className="font-medium text-gray-800">{selectedLog.entityType} ({selectedLog.entityId || '—'})</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">التوقيت:</span>
                <span className="font-mono text-gray-700">{new Date(selectedLog.createdAt).toLocaleString('ar-JO')}</span>
              </div>
            </div>

            {/* Before / After Diff */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-gray-400" />
                  <span>{t.auditLogs.detailsModal.beforeState}</span>
                </h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-xl font-mono text-xs overflow-x-auto max-h-64 border border-gray-800">
                  <pre>{selectedLog.previousState ? JSON.stringify(selectedLog.previousState, null, 2) : '// لا توجد حالة سابقة'}</pre>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t.auditLogs.detailsModal.afterState}</span>
                </h4>
                <div className="bg-gray-900 text-emerald-300 p-3 rounded-xl font-mono text-xs overflow-x-auto max-h-64 border border-gray-800">
                  <pre>{selectedLog.newState ? JSON.stringify(selectedLog.newState, null, 2) : '// لا توجد حالة لاحقة'}</pre>
                </div>
              </div>
            </div>

            {/* Metadata */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-gray-400" />
                  <span>{t.auditLogs.detailsModal.metadata}</span>
                </h4>
                <div className="bg-gray-50 text-gray-800 p-3 rounded-xl font-mono text-xs overflow-x-auto max-h-40 border border-gray-200">
                  <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                </div>
              </div>
            )}

            {selectedLog.userAgent && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200/60 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="font-mono truncate">{selectedLog.userAgent}</span>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                {t.common.close}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
