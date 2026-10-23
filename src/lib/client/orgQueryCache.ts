/** In-memory admin reads only. Invalidated requests cannot repopulate the cache. */
export type QuerySnapshot = {
  data: unknown;
  error: string | null;
  refreshing: boolean;
  at: number;
  revision: number;
};
export const EMPTY_QUERY: QuerySnapshot = { data: null, error: null, refreshing: false, at: 0, revision: 0 };
export function createOrgQueryCache() {
  const entries = new Map<string, QuerySnapshot>();
  const flights = new Map<string, Promise<void>>();
  const listeners = new Set<() => void>();
  let empty = EMPTY_QUERY;
  let revision = 0;
  const notify = () => { for (const listener of listeners) listener(); };
  const snapshot = (key: string) => entries.get(key) ?? empty;
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
  const load = (key: string, fetcher: () => Promise<unknown>): Promise<void> => {
    const pending = flights.get(key);
    if (pending) return pending;
    const state = { ...snapshot(key), refreshing: true };
    entries.set(key, state);
    const promise = Promise.resolve().then(fetcher).then(
      data => { if (entries.get(key) === state) entries.set(key, { ...state, data, error: null, refreshing: false, at: Date.now() }); },
      cause => { if (entries.get(key) === state) entries.set(key, { ...state, error: cause instanceof Error ? cause.message : "Could not load.", refreshing: false }); },
    ).finally(() => {
      if (flights.get(key) === promise) flights.delete(key);
      notify();
    });
    flights.set(key, promise);
    notify();
    return promise;
  };
  const invalidate = (prefix: string) => {
    for (const [key, state] of entries) {
      if (!key.startsWith(prefix)) continue;
      flights.delete(key);
      entries.set(key, { ...state, at: 0, refreshing: false, revision: ++revision });
    }
    notify();
  };
  const clear = () => {
    entries.clear();
    flights.clear();
    empty = { ...EMPTY_QUERY, revision: ++revision };
    notify();
  };
  return { snapshot, subscribe, load, invalidate, clear };
}
export const orgQueryCache = createOrgQueryCache();
