import React, { createContext, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import DarkColors from './colors';
import LightColors from './lightColors';
import { STORAGE_KEYS } from '../utils/constants';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  _loaded: boolean;
  _setLoaded: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'system',   // Default: follow device setting
  _loaded: false,
  setMode: async (m) => {
    set({ mode: m });
    try { await SecureStore.setItemAsync(STORAGE_KEYS.THEME, m); } catch {}
  },
  _setLoaded: () => set({ _loaded: true }),
}));

// Load persisted theme preference once
export async function loadPersistedTheme() {
  try {
    const saved = await SecureStore.getItemAsync(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      useThemeStore.getState().setMode(saved);
    } else {
      // No saved preference — follow device system setting
      useThemeStore.getState().setMode('system');
    }
  } catch {}
  useThemeStore.getState()._setLoaded();
}

// ── Context ─────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  isDark: boolean;
  mode: ThemeMode;
  colors: typeof DarkColors;
  toggleTheme: () => void;
  setThemeMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  mode: 'system',
  colors: DarkColors,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { mode, setMode } = useThemeStore();

  const resolvedDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  const colors = resolvedDark ? DarkColors : LightColors;

  const toggleTheme = () => {
    if (mode === 'dark') setMode('light');
    else if (mode === 'light') setMode('dark');
    else setMode(systemScheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ isDark: resolvedDark, mode, colors, toggleTheme, setThemeMode: setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Convenience — just the color object, like the old `Colors` import
export function useThemeColors() {
  return useContext(ThemeContext).colors;
}
