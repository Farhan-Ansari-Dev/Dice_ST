import { useCallback, useEffect, useMemo, useState } from 'react';
import documentsService from '../services/documentsService';
import { toDocumentCard, DocumentCard } from '../utils/documentDisplay';

interface State {
  items: DocumentCard[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

/**
 * Loads the current user's documents (backend scopes to org / uploaded_by),
 * optionally filtered by category. Replaces the hardcoded empty arrays + fake
 * setTimeout "refresh" on the document screens with a real, DB-backed load.
 *
 * `clientFilter` is applied to the fetched result via useMemo — it is NOT a
 * dependency of the fetch, so passing an inline predicate cannot trigger a
 * refetch loop.
 */
export function useDocuments(category?: string, clientFilter?: (d: DocumentCard) => boolean) {
  const [state, setState] = useState<State>({ items: [], loading: true, refreshing: false, error: null });

  const load = useCallback(async (isRefresh = false) => {
    setState((s) => ({ ...s, loading: !isRefresh, refreshing: isRefresh, error: null }));
    try {
      const res = await documentsService.getAll(category ? { category } : undefined);
      const items = (res?.data ?? []).map(toDocumentCard);
      setState({ items, loading: false, refreshing: false, error: null });
    } catch (e: any) {
      setState({ items: [], loading: false, refreshing: false, error: e?.response?.data?.message ?? 'Could not load documents.' });
    }
  }, [category]);

  useEffect(() => { load(false); }, [load]);

  const items = useMemo(
    () => (clientFilter ? state.items.filter(clientFilter) : state.items),
    [state.items, clientFilter],
  );

  return { items, loading: state.loading, refreshing: state.refreshing, error: state.error, refresh: () => load(true), reload: () => load(false) };
}
