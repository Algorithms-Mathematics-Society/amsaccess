"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

/**
 * The current time, refreshed every minute and whenever the tab becomes
 * visible again, so "starts in 2 hours" and "today" never go stale on an open
 * tab. It only re-renders: it never fetches.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
  return now;
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The content width of an element in rem, so layout choices follow the
 * container (the Dashboard column), not the viewport. Measured before paint so
 * the first frame already uses the right layout. Null until measured.
 */
export function useWidthRem<E extends HTMLElement>(): [(node: E | null) => void, number | null] {
  const [node, setNode] = useState<E | null>(null);
  const [rem, setRem] = useState<number | null>(null);
  const ref = useCallback((n: E | null) => setNode(n), []);

  useIsoLayoutEffect(() => {
    if (!node) return;
    const measure = () => {
      const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setRem(node.getBoundingClientRect().width / root);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);

  return [ref, rem];
}
