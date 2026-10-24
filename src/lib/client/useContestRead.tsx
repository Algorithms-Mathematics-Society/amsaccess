"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createContestReadStore, EMPTY_CONTEST_READ, type ContestReadResource } from "./contestReads";

type Store = ReturnType<typeof createContestReadStore>;
const Context = createContext<Store | null>(null);

/** The console owns snapshots across tab switches, but never across contests/accounts. */
export function ContestReadProvider({ contestUid, children }: { contestUid: string; children: React.ReactNode }) {
  const [store] = useState(() => createContestReadStore(contestUid));
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const reset = () => store.reset();
    window.addEventListener("ams:org-session-reset", reset);
    return () => {
      mounted.current = false;
      window.removeEventListener("ams:org-session-reset", reset);
      queueMicrotask(() => { if (!mounted.current) store.dispose(); });
    };
  }, [store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useContestReadStore() {
  const store = useContext(Context);
  if (!store) throw new Error("Contest read panels require ContestReadProvider.");
  return store;
}

export function useContestRead<T>(resource: ContestReadResource) {
  const store = useContestReadStore();
  const getSnapshot = useCallback(() => store.snapshot(resource), [store, resource]);
  const subscribe = useCallback((listener: () => void) => store.subscribe(resource, listener), [store, resource]);
  const state = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_CONTEST_READ);
  const load = useCallback(() => store.load(resource), [store, resource]);
  const open = useCallback(() => store.open(resource), [store, resource]);
  const refreshAfterWrite = useCallback(() => store.refreshAfterWrite(resource), [store, resource]);
  return { data: state.data as T | null, error: state.error, refreshing: state.refreshing, load, open, refreshAfterWrite };
}
