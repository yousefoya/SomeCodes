import { apiClient } from './client';

export interface DispatchScoreBreakdown {
  distanceKm: number;
  distanceScore: number;
  ratingScore: number;
  workloadScore: number;
  capabilityScore: number;
  acceptanceRateScore: number;
  totalScore: number;
  weights: {
    distance: number;
    rating: number;
    workload: number;
    capability: number;
    acceptanceRate: number;
  };
  matchedCapabilities?: string[];
  missingCapabilities?: string[];
  eligibilityReasons?: string[];
}

export interface DispatchCandidate {
  providerId: string;
  nameAr: string;
  nameEn: string;
  phoneNumber: string;
  rating: number;
  latitude: number;
  longitude: number;
  distanceKm: number;
  activeOrdersCount: number;
  score: number;
  breakdown: DispatchScoreBreakdown;
  isEligible: boolean;
}

export interface DispatchOfferItem {
  id: string;
  attemptNumber: number;
  providerId: string;
  providerName: string;
  providerPhone?: string;
  status: 'offered' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  score: number;
  scoreBreakdown: DispatchScoreBreakdown;
  offeredAt: string;
  expiresAt: string;
  respondedAt?: string;
  rejectionReason?: string;
}

export interface DispatchOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceCategoryId: string;
  categoryNameAr?: string;
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  deliveryCity: string;
  deliveryArea: string;
  deliveryStreetAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  assignmentStatus: string;
  isEscalated: boolean;
  escalationReason?: string;
  escalatedAt?: string;
  dispatchAttempt: number;
  arrivedAt?: string;
  serviceStartedAt?: string;
  serviceCompletedAt?: string;
  configurationSnapshot?: any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
  items: Array<{
    id: string;
    titleAr: string;
    titleEn: string;
    variantNameAr?: string;
    unitPrice: number;
    quantity: number;
    itemTotal: number;
    isHomeService?: boolean;
  }>;
  latestOffer?: DispatchOfferItem | null;
}

export interface DispatchDetailResponse {
  order: DispatchOrder;
  offers: DispatchOfferItem[];
  liveCandidates: DispatchCandidate[];
  totalEligibleCandidates: number;
  history: any[];
}

export interface DispatchAnalytics {
  overview: {
    totalOrders: number;
    unassignedCount: number;
    offeredCount: number;
    assignedCount: number;
    completedCount: number;
    escalatedCount: number;
  };
  offers: {
    totalOffers: number;
    acceptedOffers: number;
    rejectedOffers: number;
    expiredOffers: number;
    acceptanceRate: number;
    avgResponseTimeSeconds: number;
  };
}

export interface DispatchSettings {
  id: string;
  offerTimeoutSeconds: number;
  maxRetryAttempts: number;
  autoDispatchEnabled: boolean;
  distanceWeight: number;
  ratingWeight: number;
  workloadWeight: number;
  capabilityWeight: number;
  acceptanceRateWeight: number;
  maxServiceRadiusKm: number;
  updatedAt: string;
}

export const dispatchApi = {
  getQueue: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    filter?: string;
    search?: string;
    categoryId?: string;
  }): Promise<{ data: DispatchOrder[]; pagination: { page: number; limit: number; count: number } }> => {
    const res = await apiClient.get('/admin/dispatch', { params });
    return res.data;
  },

  getDetail: async (orderId: string): Promise<DispatchDetailResponse> => {
    const res = await apiClient.get(`/admin/dispatch/${orderId}`);
    return res.data.data;
  },

  manualAssign: async (orderId: string, providerId: string, notes?: string): Promise<any> => {
    const res = await apiClient.post(`/admin/dispatch/${orderId}/assign`, { providerId, notes });
    return res.data;
  },

  retryDispatch: async (orderId: string): Promise<any> => {
    const res = await apiClient.post(`/admin/dispatch/${orderId}/retry`);
    return res.data;
  },

  getAnalytics: async (): Promise<DispatchAnalytics> => {
    const res = await apiClient.get('/admin/dispatch/analytics');
    return res.data.data;
  },

  getSettings: async (): Promise<DispatchSettings> => {
    const res = await apiClient.get('/admin/dispatch/settings');
    return res.data.data;
  },

  updateSettings: async (payload: Partial<DispatchSettings>): Promise<DispatchSettings> => {
    const res = await apiClient.put('/admin/dispatch/settings', payload);
    return res.data.data;
  },
};
