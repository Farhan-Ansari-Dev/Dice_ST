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

  // Sign in with Apple — the native identityToken is verified server-side and the
  // user is upserted by email (same account as Google/OTP). fullName is only
  // provided by Apple on the very first authorization.
  appleSignIn: async (
    identityToken: string,
    fullName?: { givenName?: string | null; familyName?: string | null } | null,
  ) => {
    const res = await api.post<{ success: boolean, data: { accessToken: string, refreshToken: string, user: User } }>('/auth/apple', { identityToken, fullName });
    return {
      token: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      user: res.data.user
    };
  },

  refreshToken: (refreshToken: string) =>
    api.post<{ token: string }>('/auth/refresh', { refreshToken }),

  getProfile: () =>
    api.get<{ success: boolean; data: User }>('/users/me').then((res) => (res as any).data),

  updateProfile: (data: Partial<User>) =>
    api.put<{ success: boolean; data: User }>('/users/me', data).then((res) => (res as any).data),

  /** Starts a phone-number change: sends an OTP to the NEW number. */
  sendPhoneOtp: (phone: string) =>
    api.post<{ success: boolean; data: { deliveredVia: string; phone: string } }>(
      '/users/me/phone/send-otp', { phone },
    ),

  /** Confirms the code and swaps the number in. Returns the updated user. */
  verifyPhoneOtp: (otp: string) =>
    api.post<{ success: boolean; data: User }>('/users/me/phone/verify', { otp })
      .then((res) => res.data),

  logout: () =>
    api.post<{ message: string }>('/auth/logout'),

  /**
   * Permanently deletes the authenticated user's account. The backend derives
   * the account from the bearer token only (never a client-supplied id), soft-
   * deletes + anonymizes the user, removes their device/push records, and
   * invalidates the current session.
   */
  deleteAccount: () =>
    api.delete<{ success: boolean; message: string }>('/users/me'),
};

export default authService;
