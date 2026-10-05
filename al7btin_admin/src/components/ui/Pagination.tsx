import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
}) => {
  const { t, direction } = useLanguage();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-surface-100 bg-white px-4 py-3 sm:px-6 rounded-b-2xl">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-xl border border-surface-300 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
        >
          {direction === 'rtl' ? 'السابق' : 'Previous'}
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center rounded-xl border border-surface-300 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
        >
          {direction === 'rtl' ? 'التالي' : 'Next'}
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-surface-500">
            {t.common.page} <span className="font-semibold text-surface-800">{currentPage}</span> {t.common.of}{' '}
            <span className="font-semibold text-surface-800">{totalPages}</span>
            {totalItems !== undefined && (
              <span className="mr-2 ltr:mr-0 ltr:ml-2 text-surface-400">
                ({totalItems} {direction === 'rtl' ? 'عنصر إجمالي' : 'total items'})
              </span>
            )}
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm gap-1" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-xl p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-700 disabled:opacity-40 transition-colors"
            >
              {direction === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  (p >= currentPage - 1 && p <= currentPage + 1)
              )
              .map((pageNum, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && pageNum - prev > 1;

                return (
                  <React.Fragment key={pageNum}>
                    {showEllipsis && (
                      <span className="px-2 py-1 text-xs text-surface-400 flex items-center">...</span>
                    )}
                    <button
                      onClick={() => onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                        pageNum === currentPage
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'text-surface-700 hover:bg-surface-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  </React.Fragment>
                );
              })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-xl p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-700 disabled:opacity-40 transition-colors"
            >
              {direction === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
