import { apiClient } from './client';
import { Offer } from '../types';

export interface CreateOfferPayload {
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  discountPercentage: number;
  promoCode?: string;
  bannerColor?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export const offersApi = {
  getAll: async (): Promise<Offer[]> => {
    const res = await apiClient.get('/offers/admin');
    return res.data.data.offers;
  },

  create: async (payload: CreateOfferPayload): Promise<Offer> => {
    const res = await apiClient.post('/offers/admin', payload);
    return res.data.data.offer;
  },

  update: async (id: string, payload: Partial<CreateOfferPayload>): Promise<Offer> => {
    const res = await apiClient.patch(`/offers/admin/${id}`, payload);
    return res.data.data.offer;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/offers/admin/${id}`);
  },
};
