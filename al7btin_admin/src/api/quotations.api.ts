import { apiClient } from './client';
import { Quotation } from '../types';

export const quotationsApi = {
  getQuotations: async (params?: {
    orderId?: string;
    status?: string;
    providerId?: string;
  }): Promise<Quotation[]> => {
    const res = await apiClient.get<{ success: boolean; data: Quotation[] }>('/quotations', {
      params,
    });
    return res.data.data;
  },

  getQuotationById: async (id: string): Promise<Quotation> => {
    const res = await apiClient.get<{ success: boolean; data: Quotation }>(`/quotations/${id}`);
    return res.data.data;
  },

  createQuotation: async (payload: {
    orderId: string;
    items?: any[];
    laborAmount?: number;
    materialsAmount?: number;
    sparePartsAmount?: number;
    equipmentAmount?: number;
    serviceFees?: number;
    discountAmount?: number;
    notes?: string;
    attachments?: string[];
    expiresInHours?: number;
  }): Promise<Quotation> => {
    const res = await apiClient.post<{ success: boolean; data: Quotation }>('/quotations', payload);
    return res.data.data;
  },

  updateQuotation: async (id: string, payload: any): Promise<Quotation> => {
    const res = await apiClient.patch<{ success: boolean; data: Quotation }>(`/quotations/${id}`, payload);
    return res.data.data;
  },

  sendQuotation: async (id: string): Promise<Quotation> => {
    const res = await apiClient.post<{ success: boolean; data: Quotation }>(`/quotations/${id}/send`);
    return res.data.data;
  },

  approveQuotation: async (id: string, payload?: { customerNotes?: string }): Promise<Quotation> => {
    const res = await apiClient.post<{ success: boolean; data: Quotation }>(`/quotations/${id}/approve`, payload);
    return res.data.data;
  },

  rejectQuotation: async (id: string, payload: { rejectionReason: string; customerNotes?: string }): Promise<Quotation> => {
    const res = await apiClient.post<{ success: boolean; data: Quotation }>(`/quotations/${id}/reject`, payload);
    return res.data.data;
  },
};
