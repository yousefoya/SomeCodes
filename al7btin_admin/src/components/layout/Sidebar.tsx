import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Headphones,
  LifeBuoy,
  RotateCcw,
  ShoppingBag,
  Users,
  Store,
  Truck,
  Layers,
  Ticket,
  Flame,
  BarChart3,
  UserCheck,
  ShieldAlert,
  Settings,
  Radio,
  Banknote,
  LogOut,
  X,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Permission } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItemConfig {
  to: string;
  icon: React.ReactNode;
  label: string;
  permission?: Permission;
  end?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { logout, user, hasPermission } = useAuth();

  const allNavItems: NavItemConfig[] = [
    {
      to: '/admin',
      icon: <LayoutDashboard className="w-4 h-4" />,
      label: t.nav.dashboard,
      permission: 'view_dashboard',
      end: true,
    },
    {
      to: '/admin/customer-service',
      icon: <Headphones className="w-4 h-4" />,
      label: t.nav.customerService,
      permission: 'view_customers',
    },
    {
      to: '/admin/support-cases',
      icon: <LifeBuoy className="w-4 h-4" />,
      label: t.nav.supportCases,
      permission: 'view_support_cases',
    },
    {
      to: '/admin/refunds',
      icon: <RotateCcw className="w-4 h-4" />,
      label: t.nav.refunds,
      permission: 'view_refund_history',
    },
    {
      to: '/admin/orders',
      icon: <ShoppingBag className="w-4 h-4" />,
      label: t.nav.orders,
      permission: 'view_orders',
    },
    {
      to: '/admin/dispatch',
      icon: <Radio className="w-4 h-4" />,
      label: t.nav.dispatch,
      permission: 'view_orders',
    },
    {
      to: '/admin/customers',
      icon: <Users className="w-4 h-4" />,
      label: t.nav.customers,
      permission: 'view_customers',
    },
    {
      to: '/admin/providers',
      icon: <Store className="w-4 h-4" />,
      label: t.nav.providers,
      permission: 'view_providers',
    },
    {
      to: '/admin/delivery',
      icon: <Truck className="w-4 h-4" />,
      label: t.nav.delivery,
      permission: 'view_delivery',
    },
    {
      to: '/admin/services',
      icon: <Layers className="w-4 h-4" />,
      label: t.nav.services,
      permission: 'manage_services',
    },
    {
      to: '/admin/finance',
      icon: <Banknote className="w-4 h-4" />,
      label: t.nav.finance,
      permission: 'view_finance',
    },
    {
      to: '/admin/coupons',
      icon: <Ticket className="w-4 h-4" />,
      label: t.nav.coupons,
      permission: 'manage_coupons',
    },
    {
      to: '/admin/offers',
      icon: <Flame className="w-4 h-4" />,
      label: t.nav.offers,
      permission: 'manage_offers',
    },
    {
      to: '/admin/analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      label: t.nav.analytics,
      permission: 'view_analytics',
    },
    {
      to: '/admin/staff',
      icon: <UserCheck className="w-4 h-4" />,
      label: t.nav.staff,
      permission: 'manage_staff',
    },
    {
      to: '/admin/audit-logs',
      icon: <ShieldAlert className="w-4 h-4" />,
      label: t.nav.auditLogs,
      permission: 'view_audit_logs',
    },
    {
      to: '/admin/settings',
      icon: <Settings className="w-4 h-4" />,
      label: t.nav.settings,
      permission: 'manage_settings',
    },
  ];

  const allowedNavItems = allNavItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const getRoleLabel = () => {
    if (!user) return '';
    return t.roles[user.role as keyof typeof t.roles] || user.role;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 z-50 flex flex-col w-64 bg-white border-r ltr:border-r rtl:border-l rtl:border-r-0 border-surface-200 shadow-xl lg:shadow-none transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white font-black text-xl shadow-sm">
              ب
            </div>
            <div>
              <h1 className="text-base font-extrabold text-surface-900 leading-none">
                {t.brand.name}
              </h1>
              <span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider block mt-1">
                {t.brand.subtitle}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl text-surface-400 hover:bg-surface-100 hover:text-surface-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3.5 py-4 overflow-y-auto space-y-1">
          {allowedNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200/60 shadow-xs'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Footer / User & Logout */}
        <div className="p-4 border-t border-surface-100 bg-surface-50/50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-200 shrink-0">
              {user?.name ? user.name.charAt(0) : 'م'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-surface-800 truncate">{user?.name || 'موظف النظام'}</p>
              <p className="text-[10px] font-semibold text-brand-600 truncate">{getRoleLabel()}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.nav.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
