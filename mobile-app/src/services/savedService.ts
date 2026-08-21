/**
 * Saved items (Market Access bookmarks) client.
 *
 * User-scoped on the backend — the API always returns only the caller's saved
 * items, so state persists across reloads and logout/login. Saving is
 * idempotent (duplicate-safe). Opportunities first; item_type is extensible.
 */
import api from './api';

export type SavedItemType = 'opportunity';

export interface SavedItem {
  _id: string;
  item_type: SavedItemType;
  item_id: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const savedService = {
  /** List the current user's saved items (optionally filtered by type). */
  list: async (itemType?: SavedItemType): Promise<SavedItem[]> => {
    const res = await api.get<{ success: boolean; data: SavedItem[] }>('/saved', {
      params: itemType ? { itemType } : undefined,
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  /** Save (idempotent). `metadata` is a small display snapshot. */
  save: async (itemType: SavedItemType, itemId: string, metadata?: Record<string, any>): Promise<SavedItem> => {
    const res = await api.post<{ success: boolean; data: SavedItem }>('/saved', { itemType, itemId, metadata });
    return res.data;
  },

  /** Un-save. Resolves to true when a record was removed. */
  unsave: async (itemType: SavedItemType, itemId: string): Promise<boolean> => {
    const res = await api.delete<{ success: boolean; data: { removed: boolean } }>(`/saved/${itemType}/${itemId}`);
    return !!res.data?.removed;
  },
};

export default savedService;
