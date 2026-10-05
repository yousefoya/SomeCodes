import client from './client';
import { StaffMember, StaffDashboardSummary, ApiResponse } from '../types';

export interface GetStaffParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface StaffListResponse {
  staff: StaffMember[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateStaffPayload {
  phoneNumber: string;
  name: string;
  email?: string;
  role: string;
  department?: string;
  employeeCode?: string;
  notes?: string;
}

export interface UpdateStaffPayload {
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  employeeCode?: string;
  notes?: string;
  isSuspended?: boolean;
}

export const staffApi = {
  getStaffList: async (params?: GetStaffParams): Promise<StaffListResponse> => {
    const res = await client.get<ApiResponse<StaffListResponse>>('/staff', { params });
    return res.data.data;
  },

  createStaff: async (payload: CreateStaffPayload): Promise<StaffMember> => {
    const res = await client.post<ApiResponse<StaffMember>>('/staff', payload);
    return res.data.data;
  },

  getStaffById: async (id: string): Promise<{ staff: StaffMember; recentCases: any[]; recentLogs: any[] }> => {
    const res = await client.get<ApiResponse<{ staff: StaffMember; recentCases: any[]; recentLogs: any[] }>>(`/staff/${id}`);
    return res.data.data;
  },

  updateStaff: async (id: string, payload: UpdateStaffPayload): Promise<StaffMember> => {
    const res = await client.patch<ApiResponse<StaffMember>>(`/staff/${id}`, payload);
    return res.data.data;
  },

  toggleStaffStatus: async (id: string): Promise<{ id: string; isSuspended: boolean; message: string }> => {
    const res = await client.post<ApiResponse<{ id: string; isSuspended: boolean; message: string }>>(`/staff/${id}/toggle-status`);
    return res.data.data;
  },

  getDashboardSummary: async (): Promise<StaffDashboardSummary> => {
    const res = await client.get<ApiResponse<StaffDashboardSummary>>('/staff/dashboard/summary');
    return res.data.data;
  },
};
