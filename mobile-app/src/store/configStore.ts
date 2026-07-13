import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

interface FeatureFlags {
  maintenance_mode: boolean;
  enable_ai_assistant: boolean;
  enable_ocr_scanning: boolean;
  enable_referral_rewards: boolean;
  enable_promotional_banners: boolean;
  enable_notifications: boolean;
}

interface DynamicConfig {
  banner_text: string;
  banner_color: string;
  referral_reward_value: number;
  announcement_title: string;
  announcement_body: string;
}

interface ConfigState {
  featureFlags: FeatureFlags;
  dynamicConfig: DynamicConfig;
  isLoading: boolean;
  lastFetchedAt: number | null;
  loadRemoteConfig: () => Promise<void>;
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  maintenance_mode: false,
  enable_ai_assistant: true,
  enable_ocr_scanning: false,
  enable_referral_rewards: true,
  enable_promotional_banners: false,
  enable_notifications: true,
};

const DEFAULT_DYNAMIC_CONFIG: DynamicConfig = {
  banner_text: 'Welcome to DICE by Sanyog',
  banner_color: '#6C63FF',
  referral_reward_value: 200,
  announcement_title: '',
  announcement_body: '',
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  featureFlags: DEFAULT_FEATURE_FLAGS,
  dynamicConfig: DEFAULT_DYNAMIC_CONFIG,
  isLoading: false,
  lastFetchedAt: null,

  loadRemoteConfig: async () => {
    set({ isLoading: true });
    
    // Try to load cached config first for immediate availability
    try {
      const cached = await SecureStore.getItemAsync('sanyog_remote_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        set({
          featureFlags: parsed.featureFlags || DEFAULT_FEATURE_FLAGS,
          dynamicConfig: parsed.dynamicConfig || DEFAULT_DYNAMIC_CONFIG,
          lastFetchedAt: parsed.timestamp,
        });
      }
    } catch (e) {
      console.warn('Failed to load cached config', e);
    }

    // Fetch from remote
    try {
      const response = await api.get('/remote-config') as any;
      if (response.data?.data) {
        const config = response.data.data;
        const newFlags = config.featureFlags || DEFAULT_FEATURE_FLAGS;
        const newDynamic = config.dynamicConfig || DEFAULT_DYNAMIC_CONFIG;
        const timestamp = Date.now();

        set({
          featureFlags: newFlags,
          dynamicConfig: newDynamic,
          lastFetchedAt: timestamp,
        });

        // Persist to cache
        await SecureStore.setItemAsync('sanyog_remote_config', JSON.stringify({
          featureFlags: newFlags,
          dynamicConfig: newDynamic,
          timestamp,
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch remote config', e);
      // Graceful degradation: we just rely on cached config or defaults
    } finally {
      set({ isLoading: false });
    }
  },
}));
