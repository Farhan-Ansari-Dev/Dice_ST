/**
 * useSavedOpportunities — loads the set of saved opportunity ids for the
 * current user and exposes an optimistic toggle. Backend is the source of
 * truth, so state survives reload and logout/login.
 */
import { useCallback, useEffect, useState } from 'react';
import savedService, { SavedItem } from '../services/savedService';

export interface UseSavedOpportunities {
  savedIds: Set<string>;
  items: SavedItem[];
  loading: boolean;
  error: boolean;
  isSaved: (id: string) => boolean;
  refresh: () => Promise<void>;
  toggle: (id: string, metadata?: Record<string, any>) => Promise<void>;
}

export default function useSavedOpportunities(): UseSavedOpportunities {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await savedService.list('opportunity');
      setItems(list);
      setSavedIds(new Set(list.map((i) => i.item_id)));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (id: string, metadata?: Record<string, any>) => {
      const wasSaved = savedIds.has(id);
      // Optimistic update, reverted on failure.
      setSavedIds((prev) => {
        const next = new Set(prev);
        wasSaved ? next.delete(id) : next.add(id);
        return next;
      });
      try {
        if (wasSaved) {
          await savedService.unsave('opportunity', id);
        } else {
          await savedService.save('opportunity', id, metadata);
        }
        await refresh();
      } catch {
        // Revert on error.
        setSavedIds((prev) => {
          const next = new Set(prev);
          wasSaved ? next.add(id) : next.delete(id);
          return next;
        });
        setError(true);
      }
    },
    [savedIds, refresh],
  );

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  return { savedIds, items, loading, error, isSaved, refresh, toggle };
}
