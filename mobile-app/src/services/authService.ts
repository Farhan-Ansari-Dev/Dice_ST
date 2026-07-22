import api from './api';
import type { User } from '../store/authStore';

export interface LoginRequest {
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
  deviceToken?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface SendOTPResponse {
  success: boolean;
  delivered_via: string;
  delivery_confirmed?: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  gstNumber?: string;
}

const authService = {
  sendOTP: (data: LoginRequest) =>
    api.post<SendOTPResponse>('/auth/send-otp', data),

  verifyOTP: async (data: VerifyOTPRequest) => {
    const res = await api.post<{ success: boolean, data: { accessToken: string, refreshToken: string, user: User } }>('/auth/verify-otp', data);
    return {
      token: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      user: res.data.user
    };
  },

  googleSignIn: async (idToken: string) => {
    // Diagnostic: production returned `validation_error / idToken Required`
    // while the client held a token, so record what we actually transmit.
    console.warn('[auth] POST /auth/google idToken length:', idToken?.length ?? 0);
    const res = await api.post<{ success: boolean, data: { accessToken: string, refreshToken: string, user: User } }>('/auth/google', { idToken });
    return {
      token: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      user: res.data.user
    };
  },

  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data),

  refreshToken: (refreshToken: string) =>
    api.post<{ token: string }>('/auth/refresh', { refreshToken }),

  getProfile: () =>
    api.get<{ success: boolean; data: User }>('/users/me').then((res) => (res as any).data),

  updateProfile: (data: Partial<User>) =>
    api.put<{ success: boolean; data: User }>('/users/me', data).then((res) => (res as any).data),

  logout: () =>
    api.post<{ message: string }>('/auth/logout'),

  deleteAccount: () =>
    api.delete<{ message: string }>('/auth/account'),
};

export default authService;
