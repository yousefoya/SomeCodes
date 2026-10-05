import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-surface-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        {icon && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-surface-400 ltr:right-auto ltr:left-0 ltr:pl-3.5">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`block w-full rounded-xl border border-surface-300 bg-white py-2.5 px-3.5 text-sm text-surface-900 placeholder-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors disabled:bg-surface-50 disabled:text-surface-500 ${
            icon ? 'pr-10 ltr:pr-3.5 ltr:pl-10' : ''
          } ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-surface-500">{hint}</p>}
    </div>
  );
};
