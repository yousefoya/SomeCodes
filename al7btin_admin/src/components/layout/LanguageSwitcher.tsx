import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC<{ variant?: 'button' | 'dropdown' }> = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 bg-white hover:bg-surface-50 text-surface-700 text-xs font-semibold shadow-sm transition-colors"
      title="تبديل اللغة / Switch Language"
    >
      <Globe className="w-3.5 h-3.5 text-brand-500" />
      <span>{language === 'ar' ? 'English (EN)' : 'العربية (AR)'}</span>
    </button>
  );
};
