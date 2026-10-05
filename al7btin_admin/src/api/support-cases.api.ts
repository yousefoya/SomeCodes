import client from './client';
import { SupportCase, SupportCaseStatus, SupportCasePriority, ApiResponse } from '../types';

export interface GetSupportCasesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  assignedStaffId?: string;
  customerId?: string;
  orderId?: string;
}

export interface SupportCasesResponse {
  cases: SupportCase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateSupportCasePayload {
  customerId: string;
  orderId?: string | null;
  assignedStaffId?: string | null;
  title: string;
  description: string;
  category?: string;
  priority?: SupportCasePriority;
}

export interface UpdateSupportCasePayload {
  status?: SupportCaseStatus;
  priority?: SupportCasePriority;
  category?: string;
  assignedStaffId?: string | null;
  resolutionNotes?: string | null;
}

export interface SupportCaseNote {
  id: string;
  caseId: string;
  authorStaffId: string;
  authorName?: string;
  authorRole?: string;
  note: string;
  createdAt: string;
}

export const supportCasesApi = {
  getSupportCases: async (params?: GetSupportCasesParams): Promise<SupportCasesResponse> => {
    const res = await client.get<ApiResponse<SupportCasesResponse>>('/support-cases', { params });
    return res.data.data;
  },

  createSupportCase: async (payload: CreateSupportCasePayload): Promise<SupportCase> => {
    const res = await client.post<ApiResponse<SupportCase>>('/support-cases', payload);
    return res.data.data;
  },

  getSupportCaseById: async (id: string): Promise<SupportCase & { notes?: SupportCaseNote[] }> => {
    const res = await client.get<ApiResponse<SupportCase & { notes?: SupportCaseNote[] }>>(`/support-cases/${id}`);
    return res.data.data;
  },

  updateSupportCase: async (id: string, payload: UpdateSupportCasePayload): Promise<SupportCase> => {
    const res = await client.patch<ApiResponse<SupportCase>>(`/support-cases/${id}`, payload);
    return res.data.data;
  },

  addCaseNote: async (id: string, note: string): Promise<SupportCaseNote> => {
    const res = await client.post<ApiResponse<SupportCaseNote>>(`/support-cases/${id}/notes`, { note });
    return res.data.data;
  },
};
