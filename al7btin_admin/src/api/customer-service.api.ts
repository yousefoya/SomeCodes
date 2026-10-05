import client from './client';
import { User, CustomerSummary, CustomerServiceNote, Order, ApiResponse } from '../types';

export interface CreateCustomerNotePayload {
  customerId: string;
  orderId?: string | null;
  note: string;
}

export const customerServiceApi = {
  searchCustomers: async (query: string): Promise<User[]> => {
    const res = await client.get<ApiResponse<User[]>>('/customer-service/customers/search', {
      params: { q: query },
    });
    return res.data.data;
  },

  searchOrders: async (query: string): Promise<Order[]> => {
    const res = await client.get<ApiResponse<Order[]>>('/customer-service/orders/search', {
      params: { q: query },
    });
    return res.data.data;
  },

  getCustomerSummary: async (id: string): Promise<CustomerSummary> => {
    const res = await client.get<ApiResponse<CustomerSummary>>(`/customer-service/customers/${id}/summary`);
    return res.data.data;
  },

  getCustomerNotes: async (customerId?: string, orderId?: string): Promise<CustomerServiceNote[]> => {
    const res = await client.get<ApiResponse<CustomerServiceNote[]>>('/customer-service/notes', {
      params: { customerId, orderId },
    });
    return res.data.data;
  },

  createCustomerNote: async (payload: CreateCustomerNotePayload): Promise<CustomerServiceNote> => {
    const res = await client.post<ApiResponse<CustomerServiceNote>>('/customer-service/notes', payload);
    return res.data.data;
  },
};
