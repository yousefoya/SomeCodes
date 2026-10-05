import { apiClient } from './client';
import { Service, ServiceOption, Category } from '../types';

export const servicesApi = {
  // Services
  getServices: async (categoryId?: string): Promise<Service[]> => {
    const res = await apiClient.get('/services', { params: { categoryId } });
    return res.data.data;
  },

  getServiceById: async (id: string): Promise<Service> => {
    const res = await apiClient.get(`/services/${id}`);
    return res.data.data;
  },

  createService: async (payload: {
    id?: string;
    categoryId: string;
    nameAr: string;
    nameEn: string;
    descriptionAr?: string;
    descriptionEn?: string;
    iconName?: string;
    basePrice: number;
    unitAr?: string;
    unitEn?: string;
    isActive?: boolean;
    sortOrder?: number;
  }): Promise<Service> => {
    const res = await apiClient.post('/services/admin', payload);
    return res.data.data;
  },

  updateService: async (id: string, payload: Partial<Service>): Promise<Service> => {
    const res = await apiClient.patch(`/services/admin/${id}`, payload);
    return res.data.data;
  },

  deleteService: async (id: string): Promise<void> => {
    await apiClient.delete(`/services/admin/${id}`);
  },

  // Service Options / Variants
  createOption: async (serviceId: string, payload: {
    nameAr: string;
    nameEn: string;
    size?: string;
    price: number;
    unitAr?: string;
    unitEn?: string;
    isAvailable?: boolean;
    isActive?: boolean;
  }): Promise<ServiceOption> => {
    const res = await apiClient.post(`/services/admin/${serviceId}/options`, payload);
    return res.data.data;
  },

  updateOption: async (optionId: string, payload: Partial<ServiceOption>): Promise<ServiceOption> => {
    const res = await apiClient.patch(`/services/admin/options/${optionId}`, payload);
    return res.data.data;
  },

  deleteOption: async (optionId: string): Promise<void> => {
    await apiClient.delete(`/services/admin/options/${optionId}`);
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    const res = await apiClient.get('/categories');
    return res.data.data;
  },

  createCategory: async (payload: {
    id?: string;
    nameAr: string;
    nameEn: string;
    descriptionAr?: string;
    descriptionEn?: string;
    iconName?: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<Category> => {
    const res = await apiClient.post('/categories/admin', payload);
    return res.data.data;
  },

  updateCategory: async (id: string, payload: Partial<Category>): Promise<Category> => {
    const res = await apiClient.patch(`/categories/admin/${id}`, payload);
    return res.data.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/admin/${id}`);
  },

  // Dynamic Service Engine & Visual Builder Endpoints
  getServiceConfiguration: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/services/${id}/configuration`);
    return res.data.data;
  },

  calculateDynamicPrice: async (id: string, payload: {
    answers: Record<string, any>;
    optionId?: string;
    quantity?: number;
    couponCode?: string;
  }): Promise<any> => {
    const res = await apiClient.post(`/services/${id}/calculate-price`, payload);
    return res.data.data;
  },

  getServiceBuilder: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/services/admin/${id}/builder`);
    return res.data.data;
  },

  saveServiceBuilder: async (id: string, payload: {
    service?: Partial<Service>;
    fields?: any[];
    rules?: any[];
    pricingRules?: any[];
    requirements?: any[];
    options?: any[];
    status?: string;
  }): Promise<any> => {
    const res = await apiClient.put(`/services/admin/${id}/builder`, payload);
    return res.data.data;
  },

  publishService: async (id: string, payload: {
    changelog?: string;
    fields?: any[];
    rules?: any[];
    pricingRules?: any[];
    requirements?: any[];
    options?: any[];
  }): Promise<any> => {
    const res = await apiClient.post(`/services/admin/${id}/publish`, payload);
    return res.data.data;
  },

  unpublishService: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/services/admin/${id}/unpublish`);
    return res.data.data;
  },

  archiveService: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/services/admin/${id}/archive`);
    return res.data.data;
  },

  duplicateService: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/services/admin/${id}/duplicate`);
    return res.data.data;
  },

  getServiceVersions: async (id: string): Promise<any[]> => {
    const res = await apiClient.get(`/services/admin/${id}/versions`);
    return res.data.data;
  },

  getServiceVersionSnapshot: async (id: string, version: number): Promise<any> => {
    const res = await apiClient.get(`/services/admin/${id}/versions/${version}`);
    return res.data.data;
  },
};
