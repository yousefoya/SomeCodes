import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loyaltyApi } from '../api/loyalty.api';
import { LoyaltySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { Award, Save, ShieldCheck } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<LoyaltySettings>({
    pointsPerCompletedOrder: 10,
    pointsThresholdForDiscount: 200,
    discountPercentage: 0,
    discountFixedAmount: 2.0,
    rewardType: 'fixed_amount',
    couponExpiryDays: 30,
    isActive: true,
  });

  const { data: settings, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-loyalty-settings'],
    queryFn: loyaltyApi.getSettings,
  });

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<LoyaltySettings>) => loyaltyApi.updateSettings(payload),
    onSuccess: (updated) => {
      success(t.settings.savedSuccess);
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-settings'] });
      setForm(updated);
    },
    onError: (err: Error) => toastError(err.message || 'فشل تحديث الإعدادات.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 tracking-tight">
          {t.settings.title}
        </h1>
        <p className="text-xs text-surface-500 mt-0.5">{t.settings.subtitle}</p>
      </div>

      {isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Loyalty Program Form */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center gap-2.5 mb-6 border-b border-surface-100 pb-4">
                <div className="p-2.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-600">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">{t.settings.loyaltySection}</h3>
                  <p className="text-xs text-surface-500">
                    قواعد منح النقاط عند اكتمال الطلب واستبدالها بكوبونات خصم
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t.settings.pointsPerOrder}
                    type="number"
                    value={form.pointsPerCompletedOrder}
                    onChange={(e) =>
                      setForm({ ...form, pointsPerCompletedOrder: parseInt(e.target.value, 10) || 0 })
                    }
                    required
                  />
                  <Input
                    label={t.settings.pointsThreshold}
                    type="number"
                    value={form.pointsThresholdForDiscount}
                    onChange={(e) =>
                      setForm({ ...form, pointsThresholdForDiscount: parseInt(e.target.value, 10) || 0 })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t.settings.discountFixedAmount}
                    type="number"
                    step="0.01"
                    value={form.discountFixedAmount}
                    onChange={(e) =>
                      setForm({ ...form, discountFixedAmount: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                  <Input
                    label={t.settings.couponExpiryDays}
                    type="number"
                    value={form.couponExpiryDays}
                    onChange={(e) =>
                      setForm({ ...form, couponExpiryDays: parseInt(e.target.value, 10) || 30 })
                    }
                    required
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-surface-800">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="rounded text-brand-500 focus:ring-brand-400"
                    />
                    تفعيل برنامج نقاط الولاء والمكافآت في التطبيق
                  </label>
                </div>

                <div className="flex justify-end pt-4 border-t border-surface-100">
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={updateMutation.isPending}
                    icon={<Save className="w-4 h-4" />}
                  >
                    {t.settings.saveSettings}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* System & Delivery Rules Card */}
          <div className="space-y-6">
            <Card>
              <h3 className="text-sm font-bold text-surface-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ثوابت المنصة والسياسات المالية
              </h3>
              <div className="space-y-3 text-xs text-surface-600">
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-200">
                  <span className="text-[11px] text-surface-400 block font-semibold">رسوم التوصيل:</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">0.00 د.أ (مجاني لجميع الطلبات)</span>
                </div>
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-200">
                  <span className="text-[11px] text-surface-400 block font-semibold">قاعدة البيانات النشطة:</span>
                  <span className="font-bold text-surface-800 font-mono text-xs">btin7al_db (PostgreSQL)</span>
                </div>
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-200">
                  <span className="text-[11px] text-surface-400 block font-semibold">التحقق من الهوية والأدوار:</span>
                  <span className="font-bold text-surface-800 text-xs">JWT Bearer Auth + RBAC</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
