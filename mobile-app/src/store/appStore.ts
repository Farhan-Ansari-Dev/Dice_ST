import { create } from 'zustand';

interface AppState {
  isNetworkConnected: boolean;
  isAppReady: boolean;
  activeTab: string;
  searchQuery: string;
  globalLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;

  setNetworkConnected: (connected: boolean) => void;
  setAppReady: (ready: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setGlobalLoading: (loading: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
  setSuccessMessage: (msg: string | null) => void;
  clearMessages: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isNetworkConnected: true,
  isAppReady: false,
  activeTab: 'home',
  searchQuery: '',
  globalLoading: false,
  errorMessage: null,
  successMessage: null,

  setNetworkConnected: (connected) => set({ isNetworkConnected: connected }),
  setAppReady: (ready) => set({ isAppReady: ready }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  setSuccessMessage: (msg) => set({ successMessage: msg }),
  clearMessages: () => set({ errorMessage: null, successMessage: null }),
}));
