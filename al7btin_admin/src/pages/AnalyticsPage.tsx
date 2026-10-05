import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/shared/StatCard';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { BarChart3, TrendingUp, CheckCircle, Percent, DollarSign, Database, Server, ShieldCheck } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { t } = useLanguage();

  const { data: stats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
  });

  if (isError) {
    return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  }

  const fulfillmentRate =
    stats && stats.totalOrders > 0
      ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)
      : '0.0';

  const avgOrderValue =
    stats && stats.completedOrders > 0
      ? (stats.totalRevenue / stats.completedOrders).toFixed(2)
      : (0.0).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 tracking-tight">
          {t.analytics.title}
        </h1>
        <p className="text-xs text-surface-500 mt-0.5">{t.analytics.subtitle}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title={t.analytics.kpiCards.totalRevenue}
              value={`${stats?.totalRevenue.toFixed(2)} ${t.common.jod}`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="brand"
              subtitle="إجمالي المبالغ المدفوعة"
            />
            <StatCard
              title={t.analytics.kpiCards.completedOrders}
              value={stats?.completedOrders || 0}
              icon={<CheckCircle className="w-5 h-5" />}
              color="emerald"
              subtitle="تم إيصالها بنجاح للعميل"
            />
            <StatCard
              title={t.analytics.kpiCards.fulfillmentRate}
              value={`${fulfillmentRate}%`}
              icon={<Percent className="w-5 h-5" />}
              color="sky"
              subtitle="نسبة الطلبات الناجحة"
            />
            <StatCard
              title={t.analytics.kpiCards.averageOrderValue}
              value={`${avgOrderValue} ${t.common.jod}`}
              icon={<DollarSign className="w-5 h-5" />}
              color="purple"
              subtitle="متوسط قيمة السلة"
            />
          </>
        )}
      </div>

      {/* Order Status Distribution & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-bold text-surface-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-500" />
            {t.analytics.orderBreakdown}
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1.5 font-semibold text-surface-700">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  طلبات مكتملة (Completed)
                </span>
                <span className="font-mono text-surface-900 font-bold">{stats?.completedOrders || 0}</span>
              </div>
              <div className="w-full bg-surface-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((stats?.completedOrders || 0) / Math.max(1, stats?.totalOrders || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-semibold text-surface-700">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  طلبات جارية ونشطة (Active / In-progress)
                </span>
                <span className="font-mono text-surface-900 font-bold">{stats?.activeOrders || 0}</span>
              </div>
              <div className="w-full bg-surface-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((stats?.activeOrders || 0) / Math.max(1, stats?.totalOrders || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-semibold text-surface-700">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  طلبات ملغاة أو مرفوضة (Cancelled / Rejected)
                </span>
                <span className="font-mono text-surface-900 font-bold">{stats?.cancelledOrders || 0}</span>
              </div>
              <div className="w-full bg-surface-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((stats?.cancelledOrders || 0) / Math.max(1, stats?.totalOrders || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* System & Architecture Integrity */}
        <Card>
          <h3 className="text-sm font-bold text-surface-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-500" />
            {t.analytics.systemIntegrity}
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-emerald-900">{t.analytics.databaseStatus}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                Port 5432
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-sky-50/60 rounded-xl border border-sky-200/80">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-sky-900">{t.analytics.backendStatus}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px]">
                Express v5 + Drizzle
              </span>
            </div>

            <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-200 space-y-1 text-surface-600">
              <div className="flex justify-between">
                <span>المزودون النشطون في النظام:</span>
                <span className="font-bold text-surface-900">{stats?.activeProviders || 0} من {stats?.totalProviders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>كباتن التوصيل النشطون:</span>
                <span className="font-bold text-surface-900">{stats?.activeDrivers || 0} من {stats?.totalDrivers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>الحسابات النشطة إجمالاً:</span>
                <span className="font-bold text-surface-900">{stats?.activeUsers || 0}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
