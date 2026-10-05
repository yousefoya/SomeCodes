import React from 'react';
import { Badge } from '../ui/Badge';
import { OrderStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

export const OrderStatusBadge: React.FC<{ status: OrderStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const { t } = useLanguage();

  const getVariant = (st: OrderStatus) => {
    switch (st) {
      case 'completed':
        return 'success';
      case 'pending':
      case 'awaiting_assignment':
      case 'offered_to_driver':
        return 'warning';
      case 'confirmed':
      case 'accepted':
      case 'assigned':
      case 'going_to_pickup':
      case 'picked_up':
      case 'going_to_customer':
        return 'brand';
      case 'cancelled':
      case 'rejected':
      case 'failed':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const label = t.orders.status[status] || status;

  return (
    <Badge variant={getVariant(status)} size={size}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
};
