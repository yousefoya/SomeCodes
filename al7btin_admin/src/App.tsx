import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AdminLayout } from './components/layout/AdminLayout';

import { PermissionGuard } from './components/shared/PermissionGuard';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { DispatchPage } from './pages/DispatchPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerServicePage } from './pages/CustomerServicePage';
import { SupportCasesPage } from './pages/SupportCasesPage';
import { RefundsPage } from './pages/RefundsPage';
import { StaffPage } from './pages/StaffPage';
import { StaffDetailPage } from './pages/StaffDetailPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceBuilderPage } from './pages/ServiceBuilderPage';
import { CouponsPage } from './pages/CouponsPage';
import { OffersPage } from './pages/OffersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { FinancePage } from './pages/FinancePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Auth Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Admin & Operations Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route
                    path="customer-service"
                    element={
                      <PermissionGuard permission="view_customers">
                        <CustomerServicePage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="support-cases"
                    element={
                      <PermissionGuard permission="view_support_cases">
                        <SupportCasesPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="refunds"
                    element={
                      <PermissionGuard permission="view_refund_history">
                        <RefundsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="staff"
                    element={
                      <PermissionGuard permission="manage_staff">
                        <StaffPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="staff/:id"
                    element={
                      <PermissionGuard permission="manage_staff">
                        <StaffDetailPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="audit-logs"
                    element={
                      <PermissionGuard permission="view_audit_logs">
                        <AuditLogsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="orders"
                    element={
                      <PermissionGuard permission="view_orders">
                        <OrdersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="dispatch"
                    element={
                      <PermissionGuard permission="view_orders">
                        <DispatchPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="providers"
                    element={
                      <PermissionGuard permission="view_providers">
                        <ProvidersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="customers"
                    element={
                      <PermissionGuard permission="view_customers">
                        <CustomersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="delivery"
                    element={
                      <PermissionGuard permission="view_delivery">
                        <DeliveryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="services"
                    element={
                      <PermissionGuard permission="manage_services">
                        <ServicesPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="services/:id/builder"
                    element={
                      <PermissionGuard permission="manage_services">
                        <ServiceBuilderPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="services/builder/:id"
                    element={
                      <PermissionGuard permission="manage_services">
                        <ServiceBuilderPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="finance"
                    element={
                      <PermissionGuard permission="view_finance">
                        <FinancePage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="coupons"
                    element={
                      <PermissionGuard permission="manage_coupons">
                        <CouponsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="offers"
                    element={
                      <PermissionGuard permission="manage_offers">
                        <OffersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="analytics"
                    element={
                      <PermissionGuard permission="view_analytics">
                        <AnalyticsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <PermissionGuard permission="manage_settings">
                        <SettingsPage />
                      </PermissionGuard>
                    }
                  />
                </Route>

                {/* Default Fallback Redirect */}
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};
