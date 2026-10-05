import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse, Permission } from '../types';
import { authApi } from '../api/auth.api';
import { hasPermission as checkPermission, isStaffUser } from '../utils/permissions';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCSManager: boolean;
  isCSAgent: boolean;
  isStaff: boolean;
  isLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
  sendOtp: (phone: string) => Promise<{ devOtp?: string; message: string; expiresIn: number }>;
  verifyOtp: (phone: string, otp: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('al7btin_admin_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on app initialization
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('al7btin_admin_access_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await authApi.getMe();
        if (!isStaffUser(profile)) {
          // Reject non-staff users (customers, drivers, providers)
          localStorage.removeItem('al7btin_admin_access_token');
          localStorage.removeItem('al7btin_admin_refresh_token');
          localStorage.removeItem('al7btin_admin_user');
          setUser(null);
        } else {
          setUser(profile);
          localStorage.setItem('al7btin_admin_user', JSON.stringify(profile));
        }
      } catch {
        localStorage.removeItem('al7btin_admin_access_token');
        localStorage.removeItem('al7btin_admin_refresh_token');
        localStorage.removeItem('al7btin_admin_user');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const sendOtp = async (phone: string) => {
    return await authApi.sendOtp(phone);
  };

  const verifyOtp = async (phone: string, otp: string) => {
    const res = await authApi.verifyOtp(phone, otp);
    if (!res || !res.user || !res.accessToken) {
      throw new Error('فشل تسجيل الدخول: استجابة غير صالحة من خادم المصادقة.');
    }

    if (!isStaffUser(res.user)) {
      throw new Error('غير مصرح لك بالدخول. هذه البوابة مخصصة لموظفي وإدارة المنصة فقط.');
    }

    localStorage.setItem('al7btin_admin_access_token', res.accessToken);
    localStorage.setItem('al7btin_admin_refresh_token', res.refreshToken);
    localStorage.setItem('al7btin_admin_user', JSON.stringify(res.user));
    setUser(res.user);

    return res;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('al7btin_admin_refresh_token') || undefined;
    try {
      await authApi.logout(refreshToken);
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('al7btin_admin_access_token');
      localStorage.removeItem('al7btin_admin_refresh_token');
      localStorage.removeItem('al7btin_admin_user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isAdmin = isSuperAdmin;
  const isCSManager = user?.role === 'customer_service_manager';
  const isCSAgent = user?.role === 'customer_service_agent';
  const isStaff = isStaffUser(user);

  const hasPermission = (permission: Permission): boolean => {
    return checkPermission(user, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
        isCSManager,
        isCSAgent,
        isStaff,
        isLoading,
        hasPermission,
        sendOtp,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
