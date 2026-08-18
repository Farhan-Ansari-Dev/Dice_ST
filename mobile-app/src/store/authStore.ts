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
  // Mirrors the backend role enum (backend/src/models/User.ts). The previous
  // 'admin' | 'manager' | 'viewer' union did not match any role the API issues.
  role: 'super_admin' | 'admin' | 'consultant' | 'employee' | 'client' | 'viewer' | 'cb' | 'lab' | 'ib';
  avatar?: string;
  gstNumber?: string;
  cin?: string;
  iec?: string;
  country_code?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
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
  /** Server-authoritative: true once the onboarding wizard has been submitted. */
  isOnboardingComplete?: boolean;
  onboardingCompletedAt?: string | null;
  /** Server-computed 0–100 customer-profile completeness. */
  profileCompletion?: number;
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
  /**
   * Local-only, network-free session reset — the authoritative "you are logged
   * out" primitive. Clears secure tokens + cached profile and flips
   * isAuthenticated to false. Never calls the API, so it can never hang or
   * re-enter the api interceptor; safe to call from the interceptor itself.
   */
  clearSession: () => Promise<void>;
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
  /** Persist arbitrary profile fields to the server, then refresh local state + SecureStore. */
  saveProfile: (updates: Record<string, any>) => Promise<User>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setBiometricAuthenticated: (authenticated: boolean) => void;
}

/**
 * True only when the server actively rejected the session (401/403).
 * Network errors, timeouts and 5xx must NOT sign the user out — being offline
 * is not the same as being logged out.
 */
function isAuthFailure(error: unknown): boolean {
  const status = (error as any)?.response?.status;
  return status === 401 || status === 403;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  // Intro carousel (pre-login). Defaults false so a fresh install sees it once.
  isOnboardingDone: false,
  userType: null,
  businessRole: null,
  industries: [],
  targetMarkets: [],
  interestedCertifications: [],
  companySize: null,
  businessGoals: [],
  // Post-login onboarding wizard. Authoritative value comes from the server
  // (`isOnboardingComplete`); false until a user object proves otherwise, so a
  // brand-new account can never fall straight through to the dashboard.
  isUserTypeDone: false,
  isBiometricEnabled: false,
  isBiometricAuthenticated: false,

  // Setting the user also settles the onboarding gate. Every auth path
  // (OTP, Google, cold-start restore) funnels through here, so the wizard
  // decision is made in exactly one place from server-owned data.
  setUser: (user) =>
    set({
      user,
      isUserTypeDone: Boolean(user?.isOnboardingComplete),
      userType: user?.businessRole ?? null,
      businessRole: user?.businessRole ?? null,
    }),

  setTokens: async (token, refreshToken) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } catch (e) {
      console.warn('SecureStore error:', e);
    }
    set({ token, refreshToken, isAuthenticated: true });
  },

  clearSession: async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    } catch (e) {
      console.warn('SecureStore error during clearSession:', e);
    }
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isUserTypeDone: false, userType: null, isBiometricAuthenticated: false });
  },

  logout: async () => {
    // Best-effort server-side push unregister. This is OPTIONAL cleanup and must
    // NEVER gate the local session reset: after account deletion the auth token
    // is already dead, so this call 401s → the api interceptor tries a refresh →
    // which also 401s. The interceptor now resets auth locally (clearSession, no
    // network) instead of re-calling logout(), and settles its refresh queue, so
    // this can no longer deadlock. The timeout is a belt-and-suspenders bound so
    // a slow/hung network can never block logout either. A normal sign-out (valid
    // token) still completes the server-side cleanup in milliseconds.
    try {
      const notificationsService = (await import('../services/notificationsService')).default;
      await Promise.race([
        notificationsService.unregisterPushToken(),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch (e) {
      console.warn('Push unregister during logout failed (ignored):', e);
    }
    // Local auth state is the source of truth and is ALWAYS cleared.
    await get().clearSession();
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

  saveProfile: async (updates) => {
    const updated = await authService.updateProfile(updates as any);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updated)).catch(() => {});
    get().setUser(updated);
    return updated;
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
      const userType = userTypeSaved ?? get().userType;
      const isBiometricEnabled = biometricEnabledStr === 'true';
      // SecureStore is a per-install cache only; it is wiped on reinstall and is
      // not shared across devices. The cached flag is an optimistic starting
      // value that the /users/me refresh below corrects.
      const cachedUserTypeDone = userTypeDone === 'true';

      if (userData) {
        // Restore the cached profile for an instant first paint, then reconcile
        // with the server so onboarding state follows the account, not the device.
        const user = JSON.parse(userData) as User;
        set({
          token: token || get().token,
          refreshToken: refreshToken || get().refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
          isOnboardingDone,
          userType: user.businessRole ?? userType,
          isUserTypeDone: user.isOnboardingComplete ?? cachedUserTypeDone,
          isBiometricEnabled,
        });

        if (token) {
          try {
            const fresh = await authService.getProfile();
            get().setUser(fresh);
            await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(fresh));
          } catch (e) {
            // The api client already attempted a refresh before surfacing a 401,
            // so a 401/403 here means the session is genuinely dead — sign out.
            // Anything else (offline, 5xx) keeps the cached profile.
            if (isAuthFailure(e)) await get().logout();
          }
        }
      } else if (token) {
        try {
          const profile = await authService.getProfile();
          set({
            token,
            refreshToken: refreshToken || null,
            isAuthenticated: true,
            isLoading: false,
            isOnboardingDone,
            isBiometricEnabled,
          });
          get().setUser(profile);
          await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(profile));
        } catch (profileError) {
          // A token with no cached profile is unusable if it is also rejected —
          // there is nothing to fall back to, so clear it and send them to Login.
          if (isAuthFailure(profileError)) {
            await get().logout();
            set({ isLoading: false, isOnboardingDone, isBiometricEnabled });
          } else {
            console.warn('Profile reload failed:', profileError);
            set({ token, refreshToken: refreshToken || null, isAuthenticated: true, isLoading: false, isOnboardingDone, userType, isUserTypeDone: cachedUserTypeDone, isBiometricEnabled });
          }
        }
      } else {
        // No session — land on the intro carousel / login.
        set({ isLoading: false, isOnboardingDone, userType, isUserTypeDone: false, isBiometricEnabled });
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
