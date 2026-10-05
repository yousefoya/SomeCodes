import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Permission } from '../../types';
import { Card } from '../ui/Card';
import { AlertCircle } from 'lucide-react';

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallbackToCard?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  children,
  fallbackToCard = true,
}) => {
  const { hasPermission, isAuthenticated, isStaff, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !isStaff) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(permission)) {
    if (fallbackToCard) {
      return (
        <Card className="p-12 text-center my-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-surface-900 mb-1">غير مصرح لك بالوصول</h3>
          <p className="text-surface-500 text-sm max-w-md mx-auto">
            عذراً، يتطلب الوصول إلى هذا القسم صلاحيات إدارية إضافية ({permission}).
          </p>
        </Card>
      );
    }
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
