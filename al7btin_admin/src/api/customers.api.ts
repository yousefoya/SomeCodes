import { apiClient } from './client';
import { User } from '../types';

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export const customersApi = {
  getUsers: async (params?: GetUsersParams): Promise<{ users: User[]; total: number; page: number; limit: number; totalPages: number }> => {
    const res = await apiClient.get('/admin/users', { params });
    return res.data.data;
  },

  getById: async (id: string): Promise<User> => {
    const res = await apiClient.get(`/admin/users/${id}`);
    return res.data.data;
  },

  create: async (payload: { phoneNumber: string; name?: string; email?: string; role?: string }): Promise<User> => {
    const res = await apiClient.post('/admin/users', payload);
    return res.data.data;
  },

  update: async (id: string, payload: { name?: string; email?: string; role?: string; isSuspended?: boolean }): Promise<User> => {
    const res = await apiClient.patch(`/admin/users/${id}`, payload);
    return res.data.data;
  },

  suspend: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/users/${id}/suspend`);
  },

  activate: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/users/${id}/activate`);
  },
};
