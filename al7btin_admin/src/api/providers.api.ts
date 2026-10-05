import { apiClient } from './client';
import { Provider } from '../types';

export interface CreateProviderPayload {
  id?: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  logo?: string;
  phoneNumber: string;
  address: string;
  latitude?: number;
  longitude?: number;
  operatingHours?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  serviceIds?: string[];
  serviceCategoryIds?: string[];
  coverageAreas?: string[];
}

export const providersApi = {
  getAll: async (): Promise<Provider[]> => {
    const res = await apiClient.get('/providers/admin/all');
    return res.data.data;
  },

  getById: async (id: string): Promise<Provider> => {
    const res = await apiClient.get(`/providers/${id}`);
    return res.data.data;
  },

  create: async (payload: CreateProviderPayload): Promise<Provider> => {
    const res = await apiClient.post('/providers/admin', payload);
    return res.data.data;
  },

  update: async (id: string, payload: Partial<CreateProviderPayload>): Promise<Provider> => {
    const res = await apiClient.patch(`/providers/admin/${id}`, payload);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/providers/admin/${id}`);
  },
};
