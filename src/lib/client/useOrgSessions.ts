"use client";
import { useCallback, useSyncExternalStore } from "react";
import { emptySessionSnapshot, getOrgSessionStore } from "./orgSessions";
const emptyEntry = { entered: emptySessionSnapshot.entered, loaded: false, error: "" };
const getEmpty = () => emptyEntry;
export function useOrgSessions(contestUid: string, live: boolean) {
  const store = getOrgSessionStore(contestUid);
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener, live), [store, live]);
  const snapshot = useSyncExternalStore(subscribe, store.getEntrySnapshot, getEmpty);
  return { ...snapshot, refresh: store.refresh, refreshAfterWrite: store.refreshAfterWrite };
}
