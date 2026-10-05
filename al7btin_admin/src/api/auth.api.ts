import { apiClient } from './client';
import { AuthResponse, User } from '../types';

export const authApi = {
  sendOtp: async (phoneNumber: string): Promise<{ devOtp?: string; message: string; expiresIn: number }> => {
    const res = await apiClient.post('/auth/send-otp', { phoneNumber });
    return res.data.data;
  },

  verifyOtp: async (phoneNumber: string, otp: string): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/verify-otp', { phoneNumber, otp });
    const authData = res.data?.data;
    if (!authData || !authData.user || !authData.accessToken) {
      throw new Error('فشل تسجيل الدخول: استجابة غير صالحة من خادم المصادقة.');
    }
    return authData;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    const user = res.data?.data;
    if (!user || !user.id || !user.role) {
      throw new Error('فشل استرجاع بيانات المستخدم الحالي.');
    }
    return user;
  },

  logout: async (refreshToken?: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refreshToken });
  },
};
