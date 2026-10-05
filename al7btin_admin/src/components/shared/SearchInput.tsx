import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'بحث...',
  className = '',
  debounceMs = 300,
}) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localVal !== value) {
        onChange(localVal);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [localVal, onChange, debounceMs, value]);

  return (
    <div className={`relative w-full max-w-md ${className}`}>
      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-surface-400 ltr:right-auto ltr:left-0 ltr:pl-3.5">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-xl border border-surface-300 bg-white py-2 px-3.5 pr-9 ltr:pr-3.5 ltr:pl-9 text-xs sm:text-sm text-surface-900 placeholder-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors shadow-sm"
      />
      {localVal && (
        <button
          onClick={() => {
            setLocalVal('');
            onChange('');
          }}
          className="absolute inset-y-0 left-0 pl-3 flex items-center text-surface-400 hover:text-surface-600 ltr:left-auto ltr:right-0 ltr:pr-3"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
