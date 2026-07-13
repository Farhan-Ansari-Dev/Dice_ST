import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'scs_bookmarks';

interface BookmarkState {
  bookmarkedIds: string[];
  toggle: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  load: () => Promise<void>;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarkedIds: ['2'],

  toggle: (id: string) => {
    const current = get().bookmarkedIds;
    const updated = current.includes(id)
      ? current.filter((b) => b !== id)
      : [...current, id];
    set({ bookmarkedIds: updated });
    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  isBookmarked: (id: string) => get().bookmarkedIds.includes(id),

  load: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored) set({ bookmarkedIds: JSON.parse(stored) });
    } catch {}
  },
}));
