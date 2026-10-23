"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { EMPTY_QUERY, orgQueryCache } from "./orgQueryCache";

export const DEFAULT_STALE_MS = 30_000;
// Notify other admin tabs of account transitions without storing any user data.
const SESSION_RESET = "ams-org-cache-reset";
export function clearApiCache() {
  orgQueryCache.clear();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("ams:org-session-reset"));
  try { localStorage.setItem(SESSION_RESET, `${Date.now()}:${Math.random()}`); } catch { /* Storage may be disabled. */ }
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === SESSION_RESET) {
      orgQueryCache.clear();
      window.dispatchEvent(new Event("ams:org-session-reset"));
    }
  });
}
export const invalidate = orgQueryCache.invalidate;

export type ApiQuery<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
};

/** Reuse recent admin reads in this tab, retaining data during refresh failures. */
export function useApiQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: { staleMs?: number } = {},
): ApiQuery<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const getSnapshot = useCallback(() => key ? orgQueryCache.snapshot(key) : EMPTY_QUERY, [key]);
  const state = useSyncExternalStore(orgQueryCache.subscribe, getSnapshot, () => EMPTY_QUERY);
  const previous = useRef<{ key: string | null; staleMs: number } | null>(null);
  useEffect(() => {
    const changed = previous.current?.key !== key || previous.current?.staleMs !== staleMs;
    previous.current = { key, staleMs };
    if (!key) return;
    const current = orgQueryCache.snapshot(key);
    if (!current.at || (changed && Date.now() - current.at >= staleMs)) void orgQueryCache.load(key, fetcherRef.current);
  }, [key, staleMs, state.revision]);
  const refresh = useCallback(() => {
    if (!key) return Promise.resolve();
    invalidate(key);
    return orgQueryCache.load(key, fetcherRef.current);
  }, [key]);
  return {
    data: state.data as T | null,
    error: state.error,
    loading: Boolean(key) && state.data === null && state.error === null,
    refreshing: state.refreshing,
    refresh,
  };
}
