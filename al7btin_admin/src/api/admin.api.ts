import { apiClient } from './client';
import { AdminStats } from '../types';

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const res = await apiClient.get('/admin/stats');
    return res.data.data;
  },
};
