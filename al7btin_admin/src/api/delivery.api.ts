import { apiClient } from './client';
import { DeliveryEmployee } from '../types';

export interface CreateDeliveryPayload {
  name: string;
  phoneNumber: string;
  providerId: string;
  vehicleType?: string;
  vehiclePlateNumber?: string;
  categoryIds?: string[];
  serviceIds?: string[];
}

export const deliveryApi = {
  getAll: async (): Promise<DeliveryEmployee[]> => {
    const res = await apiClient.get('/admin/delivery-employees');
    return res.data.data;
  },

  create: async (payload: CreateDeliveryPayload): Promise<any> => {
    const res = await apiClient.post('/admin/delivery-employees', payload);
    return res.data.data;
  },

  update: async (id: string, payload: Partial<CreateDeliveryPayload> & { isActive?: boolean }): Promise<DeliveryEmployee> => {
    const res = await apiClient.patch(`/admin/delivery-employees/${id}`, payload);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/delivery-employees/${id}`);
  },

  getCapabilities: async (id: string): Promise<{ driverId: string; providerId: string; categoryCapabilities: string[]; serviceCapabilities: string[] }> => {
    const res = await apiClient.get(`/admin/delivery-employees/${id}/capabilities`);
    return res.data.data;
  },

  updateCapabilities: async (id: string, payload: { categoryIds?: string[]; serviceIds?: string[] }): Promise<any> => {
    const res = await apiClient.put(`/admin/delivery-employees/${id}/capabilities`, payload);
    return res.data.data;
  },
};
