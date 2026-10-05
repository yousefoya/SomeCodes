import React from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const getRoleBadge = () => {
    if (!user) return null;
    const roleKey = user.role as keyof typeof t.roles;
    const roleName = t.roles[roleKey] || user.role;

    if (user.role === 'super_admin' || user.role === 'admin') {
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"><ShieldCheck className="w-3 h-3 text-amber-600" />{roleName}</span>;
    }
    if (user.role === 'customer_service_manager') {
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200"><ShieldCheck className="w-3 h-3 text-indigo-600" />{roleName}</span>;
    }
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200"><ShieldCheck className="w-3 h-3 text-teal-600" />{roleName}</span>;
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-surface-200 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-surface-500 hover:bg-surface-100 hover:text-surface-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />

        <div className="h-6 w-px bg-surface-200 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-xs">
            {user?.name ? user.name.charAt(0) : 'S'}
          </div>
          <div className="hidden md:block text-right ltr:text-left">
            <span className="text-xs font-bold text-surface-800 block leading-tight mb-0.5">
              {user?.name || 'موظف المنصة'}
            </span>
            {getRoleBadge()}
          </div>
        </div>
      </div>
    </header>
  );
};
