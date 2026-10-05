import client from './client';
import { RefundRequest, RefundStatus, ApiResponse } from '../types';

export interface GetRefundsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: RefundStatus | string;
  customerId?: string;
  orderId?: string;
}

export interface RefundsResponse {
  refunds: RefundRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateRefundPayload {
  orderId: string;
  amount: number;
  reason: string;
  notes?: string;
}

export const refundsApi = {
  getRefundRequests: async (params?: GetRefundsParams): Promise<RefundsResponse> => {
    const res = await client.get<ApiResponse<RefundsResponse>>('/refunds', { params });
    return res.data.data;
  },

  createRefundRequest: async (payload: CreateRefundPayload): Promise<RefundRequest> => {
    const res = await client.post<ApiResponse<RefundRequest>>('/refunds/request', payload);
    return res.data.data;
  },

  getRefundById: async (id: string): Promise<RefundRequest> => {
    const res = await client.get<ApiResponse<RefundRequest>>(`/refunds/${id}`);
    return res.data.data;
  },

  reviewRefundRequest: async (id: string, notes?: string): Promise<RefundRequest> => {
    const res = await client.post<ApiResponse<RefundRequest>>(`/refunds/${id}/review`, { notes });
    return res.data.data;
  },

  approveRefundRequest: async (id: string, notes?: string): Promise<RefundRequest> => {
    const res = await client.post<ApiResponse<RefundRequest>>(`/refunds/${id}/approve`, { notes });
    return res.data.data;
  },

  rejectRefundRequest: async (id: string, rejectionReason: string, notes?: string): Promise<RefundRequest> => {
    const res = await client.post<ApiResponse<RefundRequest>>(`/refunds/${id}/reject`, { rejectionReason, notes });
    return res.data.data;
  },

  processRefundRequest: async (id: string, gatewayReference?: string, notes?: string): Promise<RefundRequest> => {
    const res = await client.post<ApiResponse<RefundRequest>>(`/refunds/${id}/process`, { gatewayReference, notes });
    return res.data.data;
  },
};
