import { apiClient } from './client';
import { LoyaltySettings } from '../types';

export const loyaltyApi = {
  getSettings: async (): Promise<LoyaltySettings> => {
    const res = await apiClient.get('/loyalty/admin/settings');
    return res.data.data.settings;
  },

  updateSettings: async (payload: Partial<LoyaltySettings>): Promise<LoyaltySettings> => {
    const res = await apiClient.put('/loyalty/admin/settings', payload);
    return res.data.data.settings;
  },
};
