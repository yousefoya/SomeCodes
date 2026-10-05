import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <PackageOpen className="w-12 h-12 text-surface-300" />,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-dashed border-surface-200">
      <div className="p-3 bg-surface-50 rounded-2xl mb-3 text-surface-400">{icon}</div>
      <h3 className="text-base font-bold text-surface-800 mb-1">{title}</h3>
      {description && <p className="text-xs text-surface-500 max-w-sm mb-5">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};
