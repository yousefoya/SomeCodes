import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('al7btin_admin_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Normalize Errors and Handle 401
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ success?: boolean; message?: string; error?: { message: string; code: string } }>) => {
    if (error.response?.status === 401) {
      // Clear token if invalid or expired
      localStorage.removeItem('al7btin_admin_access_token');
      localStorage.removeItem('al7btin_admin_refresh_token');
      localStorage.removeItem('al7btin_admin_user');

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    const backendMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      (error.message === 'Network Error' ? 'تعذر الاتصال بالخادم. يرجى التحقق من تشغيل الباك إند.' : error.message);

    return Promise.reject(new Error(backendMessage));
  }
);

export default apiClient;


