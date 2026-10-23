"use client";

import { useCallback, useEffect, useRef } from "react";

/** Share overlapping reads. A post-write refresh must wait out any older read. */
export function useOrgReadTask(task: (signal: AbortSignal) => Promise<void>) {
  const flight = useRef<{ controller: AbortController; promise: Promise<void> } | null>(null);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; flight.current?.controller.abort(); };
  }, [task]);

  const load = useCallback((): Promise<void> => {
    if (!active.current) return Promise.resolve();
    if (flight.current && !flight.current.controller.signal.aborted) return flight.current.promise;
    const controller = new AbortController();
    const promise = task(controller.signal).finally(() => {
      if (flight.current?.controller === controller) flight.current = null;
    });
    flight.current = { controller, promise };
    return promise;
  }, [task]);

  const refreshAfterWrite = useCallback(async () => {
    await flight.current?.promise;
    await load();
  }, [load]);

  return { load, refreshAfterWrite };
}
