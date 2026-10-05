import { apiClient } from './client';
import { Coupon } from '../types';

export interface CreateCouponPayload {
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  minOrderValue?: number;
  expiryDate?: string | null;
  usageLimit?: number;
  isActive?: boolean;
}

export const couponsApi = {
  getAll: async (): Promise<Coupon[]> => {
    const res = await apiClient.get('/coupons/admin');
    return res.data.data.coupons;
  },

  create: async (payload: CreateCouponPayload): Promise<Coupon> => {
    const res = await apiClient.post('/coupons/admin', payload);
    return res.data.data.coupon;
  },

  update: async (id: string, payload: Partial<CreateCouponPayload>): Promise<Coupon> => {
    const res = await apiClient.patch(`/coupons/admin/${id}`, payload);
    return res.data.data.coupon;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/coupons/admin/${id}`);
  },
};
