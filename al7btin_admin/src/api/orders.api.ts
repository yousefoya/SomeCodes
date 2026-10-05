import { apiClient } from './client';
import { Order, OrderStatus } from '../types';

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  providerId?: string;
}

export const ordersApi = {
  getOrders: async (params?: GetOrdersParams): Promise<{ orders: Order[]; total: number; page: number; limit: number; totalPages: number }> => {
    const res = await apiClient.get('/admin/orders', { params });
    return res.data.data;
  },

  getOrderById: async (id: string): Promise<Order> => {
    const res = await apiClient.get(`/orders/${id}`);
    return res.data.data;
  },

  updateStatus: async (id: string, status: OrderStatus, notes?: string): Promise<Order> => {
    const res = await apiClient.patch(`/orders/${id}/status`, { status, notes });
    return res.data.data;
  },
};
