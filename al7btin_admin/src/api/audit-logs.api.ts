import client from './client';
import { AuditLog, ApiResponse } from '../types';

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entityType?: string;
  actorUserId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditLogsApi = {
  getAuditLogs: async (params?: GetAuditLogsParams): Promise<AuditLogsResponse> => {
    const res = await client.get<ApiResponse<AuditLogsResponse>>('/audit-logs', { params });
    return res.data.data;
  },
};
