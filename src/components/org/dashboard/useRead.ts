"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Read<T> = {
  data: T | null;
  error: string;
  loading: boolean;
  reload: () => Promise<void>;
};

const UNEXPECTED = "Unexpected response from the server.";

async function json<T>(res: Response, isValid?: (data: unknown) => boolean): Promise<T> {
  // A body that is not JSON (a proxy or CDN error page, even with a 2xx) is
  // an error for this section, never data the page would trip over.
  const data: unknown = await res.json().catch(() => undefined);
  if (!res.ok)
    throw new Error((data as { error?: string } | undefined)?.error ?? "Request failed.");
  if (data === undefined || (isValid && !isValid(data))) throw new Error(UNEXPECTED);
  return data as T;
}

/**
 * One GET, loaded once on mount and again on `reload`. Each read fails on its
 * own, so one broken request never blanks the rest of the page, and a failed
 * reload keeps the last good answer on screen. `isValid` rejects a body of
 * the wrong shape; pass a module-level function so it never causes a refetch.
 */
export function useRead<T>(url: string, isValid?: (data: unknown) => boolean): Read<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const next = await json<T>(await fetch(url, { cache: "no-store" }), isValid);
      if (mine !== seq.current) return;
      setData(next);
      setError("");
    } catch (err) {
      if (mine !== seq.current) return;
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [url, isValid]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
