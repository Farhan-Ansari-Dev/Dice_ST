import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

type Language = 'en' | 'hi' | 'ta';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  loadPersistedLanguage: () => Promise<void>;
}

const LANGUAGE_KEY = 'scs_app_language';

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',

  setLanguage: async (lang: Language) => {
    set({ language: lang });
    try {
      await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
    } catch {
      // SecureStore not available in some environments
    }
  },

  loadPersistedLanguage: async () => {
    try {
      const saved = await SecureStore.getItemAsync(LANGUAGE_KEY);
      if (saved === 'en' || saved === 'hi' || saved === 'ta') {
        set({ language: saved });
      }
    } catch {
      // ignore
    }
  },
}));
