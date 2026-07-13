import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import authService from '../services/authService';
import { STORAGE_KEYS } from '../utils/constants';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  role: 'admin' | 'manager' | 'viewer';
  avatar?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  createdAt: string;
  isVerified: boolean;
  subscription: 'free' | 'pro' | 'enterprise';
  applicationsCount?: number;
  certificationsCount?: number;
  insightsRead?: number;
  businessRole?: string;
  industries?: string[];
  targetMarkets?: string[];
  interestedCertifications?: string[];
  companySize?: string;
  businessGoals?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboardingDone: boolean;
  userType: string | null;          // legacy alias for businessRole
  businessRole: string | null;
  industries: string[];
  targetMarkets: string[];
  interestedCertifications: string[];
  companySize: string | null;
  businessGoals: string[];
  isUserTypeDone: boolean;
  isBiometricEnabled: boolean;
  isBiometricAuthenticated: boolean;

  setUser: (user: User) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  setOnboardingDone: () => Promise<void>;
  setUserType: (type: string) => Promise<void>;
  setOnboardingProfile: (profile: {
    businessRole: string;
    industries: string[];
    targetMarkets: string[];
    interestedCertifications: string[];
    companySize: string;
    businessGoals: string[];
  }) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setBiometricAuthenticated: (authenticated: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isOnboardingDone: true,
  userType: null,
  businessRole: null,
  industries: [],
  targetMarkets: [],
  interestedCertifications: [],
  companySize: null,
  businessGoals: [],
  isUserTypeDone: true,
  isBiometricEnabled: false,
  isBiometricAuthenticated: false,

  setUser: (user) => set({ user }),

  setTokens: async (token, refreshToken) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } catch (e) {
      console.warn('SecureStore error:', e);
    }
    set({ token, refreshToken, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    } catch (e) {
      console.warn('SecureStore error during logout:', e);
    }
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isUserTypeDone: false, userType: null, isBiometricAuthenticated: false });
  },

  setUserType: async (type: string) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_TYPE, type);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_TYPE_DONE, 'true');
    } catch (e) {
      console.warn('SecureStore error:', e);
    }
    set({ userType: type, businessRole: type, isUserTypeDone: true });
  },

  setOnboardingProfile: async (profile) => {
    let updatedUser: User | null = null;
    try {
      updatedUser = await authService.updateProfile({
        businessRole: profile.businessRole,
        industries: profile.industries,
        targetMarkets: profile.targetMarkets,
        interestedCertifications: profile.interestedCertifications,
        companySize: profile.companySize,
        businessGoals: profile.businessGoals,
      });

      await SecureStore.setItemAsync(STORAGE_KEYS.USER_TYPE, profile.businessRole);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_TYPE_DONE, 'true');
      await SecureStore.setItemAsync('scs_onboarding_profile', JSON.stringify(profile));
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('SecureStore error:', e);
      throw e;
    }
    set({
      user: updatedUser,
      userType: profile.businessRole,
      businessRole: profile.businessRole,
      industries: profile.industries,
      targetMarkets: profile.targetMarkets,
      interestedCertifications: profile.interestedCertifications,
      companySize: profile.companySize,
      businessGoals: profile.businessGoals,
      isUserTypeDone: true,
    });
  },

  loadStoredAuth: async () => {
    try {
      const [token, refreshToken, userData, onboardingDone, userTypeSaved, userTypeDone, biometricEnabledStr] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA),
        SecureStore.getItemAsync(STORAGE_KEYS.ONBOARDING_DONE),
        SecureStore.getItemAsync(STORAGE_KEYS.USER_TYPE),
        SecureStore.getItemAsync(STORAGE_KEYS.USER_TYPE_DONE),
        SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED),
      ]);

      const isOnboardingDone = onboardingDone === 'true';
      const isUserTypeDone = userTypeDone === null ? get().isUserTypeDone : userTypeDone === 'true';
      const userType = userTypeSaved ?? get().userType;
      const isBiometricEnabled = biometricEnabledStr === 'true';

      if (userData) {
        // Restore saved user profile (works in both demo and authenticated modes)
        const user = JSON.parse(userData) as User;
        set({
          token: token || get().token,
          refreshToken: refreshToken || get().refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
          isOnboardingDone,
          userType,
          isUserTypeDone,
          isBiometricEnabled,
        });
      } else if (token) {
        try {
          const profile = await authService.getProfile();
          set({
            token,
            refreshToken: refreshToken || null,
            user: profile,
            isAuthenticated: true,
            isLoading: false,
            isOnboardingDone,
            userType,
            isUserTypeDone,
            isBiometricEnabled,
          });
          await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(profile));
        } catch (profileError) {
          console.warn('Profile reload failed:', profileError);
          set({ token, refreshToken: refreshToken || null, isAuthenticated: true, isLoading: false, isOnboardingDone, userType, isUserTypeDone, isBiometricEnabled });
        }
      } else {
        // First launch — persist the demo user so future relaunches restore it
        set({ isLoading: false, isOnboardingDone, userType, isUserTypeDone, isBiometricEnabled });
      }
    } catch (e) {
      console.warn('Load stored auth error:', e);
      set({ isLoading: false });
    }
  },

  setOnboardingDone: async () => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.ONBOARDING_DONE, 'true');
    } catch (e) {
      console.warn('SecureStore error:', e);
    }
    set({ isOnboardingDone: true });
  },

  updateUser: (updates) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updates };
    SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser)).catch(() => {});
    set({ user: updatedUser });
  },

  setBiometricEnabled: async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn('SecureStore error:', e);
    }
    set({ isBiometricEnabled: enabled });
  },

  setBiometricAuthenticated: (authenticated: boolean) => set({ isBiometricAuthenticated: authenticated }),
}));
