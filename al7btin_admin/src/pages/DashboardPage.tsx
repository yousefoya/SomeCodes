import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Headphones,
  LifeBuoy,
  RotateCcw,
  ShoppingBag,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Activity,
  Search,
} from 'lucide-react';
import { staffApi } from '../api/staff.api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/shared/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { AgentDashboardSummary, ManagerDashboardSummary, SuperAdminDashboardSummary } from '../types';

export const DashboardPage: React.FC = () => {
  const { t, direction } = useLanguage();
  const { user, isSuperAdmin, isCSManager, isCSAgent } = useAuth();

  const { data: summary, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['staff-dashboard-summary'],
    queryFn: staffApi.getDashboardSummary,
    refetchInterval: 30000,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome & Role Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-brand-900 via-brand-800 to-navy-900 text-white rounded-3xl shadow-lg border border-brand-700/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-brand-200 border border-white/15">
              {isSuperAdmin
                ? t.roles.super_admin
                : isCSManager
                ? t.roles.customer_service_manager
                : t.roles.customer_service_agent}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {t.dashboard.welcome} {user?.name || user?.phoneNumber} 👋
          </h1>
          <p className="text-xs sm:text-sm text-brand-200 mt-1 max-w-xl">
            {isCSAgent && t.dashboard.agentSubtitle}
            {isCSManager && t.dashboard.managerSubtitle}
            {isSuperAdmin && t.dashboard.adminSubtitle}
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/admin/customer-service">
            <Button
              variant="primary"
              className="bg-white text-brand-900 hover:bg-brand-50 border-0 shadow-md"
            >
              <Headphones className="w-4 h-4 mr-1.5 rtl:mr-0 rtl:ml-1.5 text-brand-600" />
              {t.dashboard.openCSWorkspace}
            </Button>
          </Link>
          <Link to="/admin/support-cases">
            <Button
              variant="secondary"
              className="bg-white/10 text-white hover:bg-white/20 border-white/20"
            >
              <LifeBuoy className="w-4 h-4 mr-1.5 rtl:mr-0 rtl:ml-1.5" />
              {t.dashboard.createSupportCase}
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Dynamic View Based On Staff Role */}
      {isError ? (
        <ErrorState
          title="فشل تحميل بيانات لوحة العمليات"
          message={(error as Error).message}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* 1. AGENT DASHBOARD VIEW */}
          {isCSAgent && summary && (
            <div className="space-y-6">
              {(() => {
                const s = summary as AgentDashboardSummary;
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard
                        title={t.dashboard.kpis.myOpenCases}
                        value={s.myOpenCasesCount}
                        icon={<LifeBuoy className="w-5 h-5" />}
                        color={s.myOpenCasesCount > 0 ? 'amber' : 'brand'}
                      />
                      <StatCard
                        title={t.dashboard.kpis.myInProgressCases}
                        value={s.myInProgressCasesCount ?? 0}
                        icon={<Activity className="w-5 h-5" />}
                        color="sky"
                      />
                      <StatCard
                        title={t.dashboard.kpis.myWaitingCases}
                        value={s.myWaitingCasesCount}
                        icon={<Clock className="w-5 h-5" />}
                        color="sky"
                      />
                      <StatCard
                        title={t.dashboard.kpis.handledToday}
                        value={s.handledInteractionsToday}
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        color="emerald"
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-2">
                        <div className="flex items-center justify-between p-5 border-b border-surface-100">
                          <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                            <LifeBuoy className="w-4 h-4 text-brand-600" />
                            {t.dashboard.recentCases}
                          </h2>
                          <Link
                            to="/admin/support-cases"
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                          >
                            <span>عرض الكل</span>
                            {direction === 'rtl' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                          </Link>
                        </div>
                        <div className="p-0 overflow-x-auto">
                          {(!s.recentCases || s.recentCases.length === 0) ? (
                            <div className="p-8 text-center text-xs text-surface-400">
                              لا توجد تذاكر مسندة إليك حالياً.
                            </div>
                          ) : (
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableHeaderCell>{t.supportCases.table.caseNumber}</TableHeaderCell>
                                  <TableHeaderCell>{t.supportCases.table.title}</TableHeaderCell>
                                  <TableHeaderCell>{t.supportCases.table.priority}</TableHeaderCell>
                                  <TableHeaderCell>{t.supportCases.table.status}</TableHeaderCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {s.recentCases.map((c) => (
                                  <TableRow key={c.id}>
                                    <TableCell className="font-mono text-xs font-bold text-brand-600">
                                      {c.caseNumber}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs text-surface-900">
                                      {c.title}
                                    </TableCell>
                                    <TableCell>{getPriorityBadge(c.priority)}</TableCell>
                                    <TableCell>{getCaseStatusBadge(c.status)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </Card>

                      {/* Quick Customer Lookup Card */}
                      <Card className="p-5 flex flex-col justify-between">
                        <div>
                          <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                            <Search className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold text-sm text-surface-900 mb-1">
                            مكتب خدمة العملاء الفوري
                          </h3>
                          <p className="text-xs text-surface-500 leading-relaxed">
                            ابحث عن أي عميل برقم الهاتف للوصول السريع إلى تفاصيل طلباته الجارية والمكتملة، رصيد المحفظة، وتسجيل الملاحظات الداخلية.
                          </p>
                        </div>
                        <Link to="/admin/customer-service" className="mt-4">
                          <Button variant="primary" className="w-full">
                            فتح شاشة العميل 360°
                          </Button>
                        </Link>
                      </Card>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* 2. MANAGER DASHBOARD VIEW */}
          {isCSManager && summary && (
            <div className="space-y-6">
              {(() => {
                const s = summary as ManagerDashboardSummary;
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <StatCard
                        title={t.dashboard.kpis.openCases}
                        value={s.openCasesCount}
                        icon={<LifeBuoy className="w-5 h-5" />}
                        color={s.openCasesCount > 0 ? 'amber' : 'brand'}
                      />
                      <StatCard
                        title={t.dashboard.kpis.unassignedCases}
                        value={s.unassignedCasesCount}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        color={s.unassignedCasesCount > 0 ? 'amber' : 'brand'}
                      />
                      <StatCard
                        title={t.dashboard.kpis.urgentCases}
                        value={s.urgentCasesCount}
                        icon={<Activity className="w-5 h-5" />}
                        color={s.urgentCasesCount > 0 ? 'amber' : 'brand'}
                      />
                      <StatCard
                        title={t.dashboard.kpis.pendingRefunds}
                        value={s.pendingRefundsCount}
                        icon={<RotateCcw className="w-5 h-5" />}
                        color={s.pendingRefundsCount > 0 ? 'amber' : 'brand'}
                      />
                      <StatCard
                        title={t.dashboard.kpis.activeStaff}
                        value={s.activeStaffCount}
                        icon={<UserCheck className="w-5 h-5" />}
                        color="emerald"
                      />
                    </div>

                    {/* Team Workload & Agent Distribution */}
                    {s.casesByAgent && s.casesByAgent.length > 0 && (
                      <Card>
                        <div className="flex items-center justify-between p-5 border-b border-surface-100">
                          <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-brand-600" />
                            {t.dashboard.casesByAgent}
                          </h2>
                          {s.averageWorkload !== undefined && (
                            <span className="text-xs font-semibold text-surface-600 bg-surface-100 px-2.5 py-1 rounded-full">
                              {t.dashboard.kpis.averageWorkload}: {s.averageWorkload} تذكرة / موظف
                            </span>
                          )}
                        </div>
                        <div className="p-0 overflow-x-auto">
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableHeaderCell>اسم الموظف</TableHeaderCell>
                                <TableHeaderCell>التذاكر النشطة المسندة</TableHeaderCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {s.casesByAgent.map((agent) => (
                                <TableRow key={agent.agentId}>
                                  <TableCell className="font-bold text-xs text-surface-900">
                                    {agent.agentName}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={agent.activeCasesCount > 0 ? 'warning' : 'neutral'}>
                                      {agent.activeCasesCount} تذكرة نشطة
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <div className="flex items-center justify-between p-5 border-b border-surface-100">
                          <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                            <RotateCcw className="w-4 h-4 text-brand-600" />
                            {t.dashboard.recentRefunds}
                          </h2>
                          <Link
                            to="/admin/refunds"
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                          >
                            <span>مراجعة الطلبات</span>
                            {direction === 'rtl' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                          </Link>
                        </div>
                        <div className="p-0 overflow-x-auto">
                          {(!s.recentRefunds || s.recentRefunds.length === 0) ? (
                            <div className="p-8 text-center text-xs text-surface-400">
                              لا توجد طلبات استرجاع معلقة تتطلب المراجعة.
                            </div>
                          ) : (
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableHeaderCell>{t.refunds.table.refundNumber}</TableHeaderCell>
                                  <TableHeaderCell>{t.refunds.table.orderId}</TableHeaderCell>
                                  <TableHeaderCell>{t.refunds.table.amount}</TableHeaderCell>
                                  <TableHeaderCell>{t.refunds.table.status}</TableHeaderCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {s.recentRefunds.map((r) => (
                                  <TableRow key={r.id}>
                                    <TableCell className="font-mono text-xs font-bold text-brand-600">
                                      {r.refundNumber}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{r.orderId}</TableCell>
                                    <TableCell className="font-bold text-xs">{r.amount.toFixed(2)} د.أ</TableCell>
                                    <TableCell>
                                      <Badge variant="warning">{t.refunds.status[r.status as keyof typeof t.refunds.status] || r.status}</Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </Card>

                      <Card>
                        <div className="flex items-center justify-between p-5 border-b border-surface-100">
                          <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                            <LifeBuoy className="w-4 h-4 text-brand-600" />
                            {t.dashboard.recentCases}
                          </h2>
                          <Link
                            to="/admin/support-cases"
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                          >
                            <span>إدارة التذاكر</span>
                            {direction === 'rtl' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                          </Link>
                        </div>
                        <div className="p-0 overflow-x-auto">
                          {(!s.recentCases || s.recentCases.length === 0) ? (
                            <div className="p-8 text-center text-xs text-surface-400">
                              جميع التذاكر معينة للموظفين ولا توجد تذاكر معلقة.
                            </div>
                          ) : (
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableHeaderCell>{t.supportCases.table.caseNumber}</TableHeaderCell>
                                  <TableHeaderCell>{t.supportCases.table.title}</TableHeaderCell>
                                  <TableHeaderCell>{t.supportCases.table.priority}</TableHeaderCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {s.recentCases.map((c) => (
                                  <TableRow key={c.id}>
                                    <TableCell className="font-mono text-xs font-bold text-brand-600">
                                      {c.caseNumber}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs text-surface-900">
                                      {c.title}
                                    </TableCell>
                                    <TableCell>{getPriorityBadge(c.priority)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </Card>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* 3. SUPER ADMIN / ADMIN DASHBOARD VIEW */}
          {isSuperAdmin && summary && (
            <div className="space-y-6">
              {(() => {
                const s = summary as SuperAdminDashboardSummary;
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard
                        title={t.dashboard.kpis.totalRevenue}
                        value={`${(s.totalRevenue || 0).toLocaleString()} د.أ`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        color="amber"
                      />
                      <StatCard
                        title={t.dashboard.kpis.totalOrders}
                        value={s.totalOrders}
                        icon={<ShoppingBag className="w-5 h-5" />}
                        color="brand"
                      />
                      <StatCard
                        title={t.dashboard.kpis.totalCustomers}
                        value={s.totalCustomers}
                        icon={<Users className="w-5 h-5" />}
                        color="brand"
                      />
                      <StatCard
                        title={t.dashboard.kpis.totalStaff}
                        value={`${s.activeStaff} / ${s.totalStaff}`}
                        icon={<UserCheck className="w-5 h-5" />}
                        color="emerald"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <StatCard
                        title={t.dashboard.kpis.activeOrders}
                        value={s.activeOrders}
                        icon={<Activity className="w-5 h-5" />}
                        color={s.activeOrders > 0 ? 'amber' : 'brand'}
                      />
                      <StatCard
                        title={t.dashboard.kpis.openCases}
                        value={s.openCases}
                        icon={<LifeBuoy className="w-5 h-5" />}
                        color={s.openCases > 0 ? 'amber' : 'brand'}
                      />
                      <StatCard
                        title={t.dashboard.kpis.pendingRefunds}
                        value={s.pendingRefunds}
                        icon={<RotateCcw className="w-5 h-5" />}
                        color={s.pendingRefunds > 0 ? 'amber' : 'brand'}
                      />
                    </div>

                    {/* Recent Audit Logs Feed */}
                    <Card>
                      <div className="flex items-center justify-between p-5 border-b border-surface-100">
                        <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-brand-600" />
                          {t.dashboard.recentAuditLogs}
                        </h2>
                        <Link
                          to="/admin/audit-logs"
                          className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                        >
                          <span>سجل الرقابة الكامل</span>
                          {direction === 'rtl' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        </Link>
                      </div>
                      <div className="p-0 overflow-x-auto">
                        {s.recentAuditLogs.length === 0 ? (
                          <div className="p-8 text-center text-xs text-surface-400">
                            لا توجد سجلات رقابة حديثة.
                          </div>
                        ) : (
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableHeaderCell>{t.auditLogs.table.timestamp}</TableHeaderCell>
                                <TableHeaderCell>{t.auditLogs.table.action}</TableHeaderCell>
                                <TableHeaderCell>{t.auditLogs.table.actor}</TableHeaderCell>
                                <TableHeaderCell>{t.auditLogs.table.entity}</TableHeaderCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {s.recentAuditLogs.map((log) => (
                                <TableRow key={log.id}>
                                  <TableCell className="text-xs font-mono text-surface-500">
                                    {new Date(log.createdAt).toLocaleTimeString('ar-JO')}
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-mono text-xs font-bold text-surface-800">
                                      {log.action}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-xs font-medium text-surface-700">
                                    {log.actorName || log.actorPhone || 'نظام آلي'} ({log.actorRole})
                                  </TableCell>
                                  <TableCell className="text-xs text-surface-600 font-mono">
                                    {log.entityType} ({log.entityId})
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </Card>
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
};
