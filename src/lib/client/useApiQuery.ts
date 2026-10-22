"use client";

/**
 * A small stale-while-revalidate cache for the org console.
 *
 * Every panel here fetched in a `useEffect` with `cache: "no-store"`, which
 * is correct for freshness and miserable to use: leaving a page and coming
 * back threw the data away and showed a spinner for something the browser
 * had held thirty seconds earlier. Going back felt like a page load because,
 * as far as the app was concerned, it was one.
 *
 * So: keep the last answer per key in memory, hand it over immediately on
 * the next mount, and refresh behind it. The screen is populated instantly
 * and still ends up current. `no-store` stays on the request itself -- this
 * caches in the tab, not in the browser's HTTP cache, so a hard reload is
 * still a genuinely fresh read.
 *
 * Deliberately not react-query. The need here is one hook over a single
 * `apiFetch` chokepoint, and a dependency whose feature list dwarfs the use
 * is its own kind of cost.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Entry = { data: unknown; at: number };

const cache = new Map<string, Entry>();
/** In-flight requests, so two panels mounting together ask once. */
const inflight = new Map<string, Promise<unknown>>();

/** Past this an entry is shown but refreshed behind the view. */
export const DEFAULT_STALE_MS = 30_000;

/** Drop everything, for sign-out: the next reader must not see the last
 *  account's data sitting in memory. */
export function clearApiCache(): void {
  cache.clear();
  inflight.clear();
}

/** Drop one key, or every key beginning with it. Call after a mutation. */
export function invalidate(prefix: string): void {
  for (const key of [...cache.keys()]) {
    if (key === prefix || key.startsWith(prefix)) cache.delete(key);
  }
}

export type ApiQuery<T> = {
  data: T | null;
  error: string | null;
  /** Only true when there is nothing to show yet. A background refresh over
   *  cached data is not something to put a spinner on. */
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
};

export function useApiQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: { staleMs?: number } = {},
): ApiQuery<T> {
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const cached = key ? (cache.get(key) as Entry | undefined) : undefined;

  const [data, setData] = useState<T | null>((cached?.data as T) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Kept in a ref so a caller passing an inline arrow does not re-run the
  // effect on every render, which is the usual way a hook like this turns
  // into an infinite request loop.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(
    async (currentKey: string, hasData: boolean) => {
      setRefreshing(true);
      try {
        let promise = inflight.get(currentKey);
        if (!promise) {
          promise = fetcherRef.current();
          inflight.set(currentKey, promise);
          void promise.catch(() => {}).finally(() => inflight.delete(currentKey));
        }
        const result = (await promise) as T;
        cache.set(currentKey, { data: result, at: Date.now() });
        setData(result);
        setError(null);
      } catch (cause) {
        // A failed refresh keeps what is on screen. Replacing a populated
        // panel with an error because one poll timed out loses information
        // the reviewer was in the middle of reading.
        const message = cause instanceof Error ? cause.message : "Could not load.";
        if (!hasData) setData(null);
        setError(message);
      } finally {
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!key) return;
    const entry = cache.get(key) as Entry | undefined;
    if (entry) {
      setData(entry.data as T);
      setError(null);
      if (Date.now() - entry.at < staleMs) return;
    }
    void run(key, Boolean(entry));
  }, [key, staleMs, run]);

  const refresh = useCallback(() => {
    if (!key) return;
    cache.delete(key);
    void run(key, cache.has(key));
  }, [key, run]);

  return {
    data,
    error,
    loading: data === null && error === null,
    refreshing,
    refresh,
  };
}
