"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Read<T> = {
  data: T | null;
  error: string;
  loading: boolean;
  reload: () => Promise<void>;
};

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

/**
 * One GET, loaded once on mount and again on `reload`. Each read fails on its
 * own, so one broken request never blanks the rest of the page, and a failed
 * reload keeps the last good answer on screen.
 */
export function useRead<T>(url: string): Read<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const next = await json<T>(await fetch(url, { cache: "no-store" }));
      if (mine !== seq.current) return;
      setData(next);
      setError("");
    } catch (err) {
      if (mine !== seq.current) return;
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
