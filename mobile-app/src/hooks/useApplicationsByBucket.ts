import { useCallback, useEffect, useState } from 'react';
import applicationsService from '../services/applicationsService';
import { STATUS_BUCKETS, StatusBucket, toApplicationCard, ApplicationCard } from '../utils/applicationDisplay';

interface State {
  items: ApplicationCard[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

/**
 * Fetches the current user's applications (backend already scopes to
 * created_by/assignees) and filters them into the given status bucket. Replaces
 * the old hardcoded empty arrays + fake setTimeout "refresh" on the list screens
 * with a real, DB-backed load.
 */
export function useApplicationsByBucket(bucket: StatusBucket) {
  const [state, setState] = useState<State>({ items: [], loading: true, refreshing: false, error: null });

  const load = useCallback(async (isRefresh = false) => {
    setState((s) => ({ ...s, loading: !isRefresh, refreshing: isRefresh, error: null }));
    try {
      const res = await applicationsService.getAll({ limit: 100 });
      const all = res?.data ?? [];
      const allow = new Set<string>(STATUS_BUCKETS[bucket]);
      const items = all.filter((a) => allow.has(a.status)).map(toApplicationCard);
      setState({ items, loading: false, refreshing: false, error: null });
    } catch (e: any) {
      setState({ items: [], loading: false, refreshing: false, error: e?.response?.data?.message ?? 'Could not load applications.' });
    }
  }, [bucket]);

  useEffect(() => { load(false); }, [load]);

  return { ...state, refresh: () => load(true), reload: () => load(false) };
}
