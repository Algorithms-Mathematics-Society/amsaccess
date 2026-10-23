"use client";

import { useCallback, useSyncExternalStore } from "react";
import { startOrgPolling } from "./orgPolling";
import { reconcileNotifications } from "./orgNotifications";
import type { NotificationAction, NotificationRaw, NotificationStream, OrgNotification, SessionRow } from "./orgNotifications";

export type { OrgNotification } from "./orgNotifications";
type Snapshot = { items: OrgNotification[]; raw: NotificationRaw; loading: boolean; updatedAt: number | null; errors: string[]; busyIds: ReadonlySet<string>; actionErrors: Record<string,string> };
const empty = (): Snapshot => ({items:[],raw:{resumes:[],incidents:[],sessions:[]},loading:true,updatedAt:null,errors:[],busyIds:new Set(),actionErrors:{}});
const serverSnapshot = empty();
const streams: NotificationStream[] = ["resumes","incidents","sessions"];
const views = {resumes:"resume-requests",incidents:"incidents",sessions:"sessions"};

const sessionFlights = new Map<string,{controller:AbortController;promise:Promise<SessionRow[]>}>();
let sessionResetListening = false;
let sessionGeneration = 0;
function listenForSessionReset() {
  if (sessionResetListening || typeof window === "undefined") return;
  sessionResetListening = true;
  window.addEventListener("ams:org-session-reset", () => {
    sessionGeneration++;
    sessionFlights.forEach(flight => flight.controller.abort());
    sessionFlights.clear();
  });
}
/** Share sessions reads with the leaderboard and participants without coupling caller cancellation. */
export function fetchOrgSessions(contestUid:string):Promise<SessionRow[]> {
  listenForSessionReset();
  const epoch = sessionGeneration;
  const existing = sessionFlights.get(contestUid);
  if (existing) return existing.promise;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),12_000);
  const promise = (async () => {
    try {
      const response = await fetch(`/api/org/contests/${encodeURIComponent(contestUid)}/invigilation?view=sessions`,{cache:"no-store",signal:controller.signal});
      if (!response.ok) throw new Error("Could not update sessions.");
      const rows:unknown = await response.json();
      if (!Array.isArray(rows)) throw new Error("Invalid sessions response.");
      if (controller.signal.aborted || epoch !== sessionGeneration) throw new Error("Session changed. Reload before continuing.");
      return rows as SessionRow[];
    } finally {
      clearTimeout(timer);
      if (sessionFlights.get(contestUid)?.controller === controller) sessionFlights.delete(contestUid);
    }
  })();
  sessionFlights.set(contestUid,{controller,promise});
  return promise;
}

type Store = ReturnType<typeof createStore>;
const stores = new Map<string,Store>();
function createStore(contestUid:string) {
  let snapshot = empty();
  let generation = 0;
  let suspended = false;
  const listeners = new Set<() => void>();
  const flights = new Map<NotificationStream,{controller:AbortController;promise:Promise<void>}>();
  const writes = new Set<AbortController>();
  const activeActions = new Set<string>();
  const uncertainActions = new Map<string,NotificationStream>();
  const failures = new Map<NotificationStream,string>();
  const loaded = new Set<NotificationStream>();
  const settled = new Map<string,string>();
  let stops: Array<() => void> = [];
  const publish = (patch:Partial<Snapshot>) => { snapshot = {...snapshot,...patch}; listeners.forEach(fn => fn()); };
  const publishBusy = () => publish({busyIds:new Set([...activeActions,...uncertainActions.keys()])});
  const base = `/api/org/contests/${encodeURIComponent(contestUid)}/invigilation`;
  async function read(stream:NotificationStream):Promise<void> {
    if (suspended) return;
    const existing = flights.get(stream);
    if (existing) return existing.promise;
    const controller = new AbortController();
    const epoch = generation;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const promise = (async () => {
      try {
        let rows:unknown;
        if (stream === "sessions") rows = await fetchOrgSessions(contestUid);
        else {
          const response = await fetch(`${base}?view=${views[stream]}`,{cache:"no-store",signal:controller.signal});
          if (!response.ok) throw new Error(`Could not update ${views[stream]}.`);
          rows = await response.json();
        }
        if (!Array.isArray(rows)) throw new Error(`Invalid ${views[stream]} response.`);
        if (epoch !== generation || flights.get(stream)?.controller !== controller) return;
        const raw = {...snapshot.raw,[stream]:rows} as NotificationRaw;
        // A pre-action read cannot undo an acknowledged decision.
        if (stream === "resumes") raw.resumes = raw.resumes.map(row => {
          const status = settled.get(`resume:${row.uid}`);
          return status && row.status === "pending" ? {...row,status} : row;
        });
        if (stream === "incidents") raw.incidents = raw.incidents.map(row => {
          const status = settled.get(`incident:${row.uid}`);
          return status && row.status !== "resolved" ? {...row,status} : row;
        });
        failures.delete(stream);
        // Only this current, successful source read may unlock an uncertain write.
        for (const [id,source] of uncertainActions) if (source === stream) uncertainActions.delete(id);
        const observedAt = Date.now();
        publish({raw,busyIds:new Set([...activeActions,...uncertainActions.keys()]),updatedAt:observedAt,items:reconcileNotifications(snapshot.items,contestUid,stream,raw,new Date(observedAt).toISOString())});
      } catch {
        if (epoch === generation && flights.get(stream)?.controller === controller) failures.set(stream,`Could not update ${views[stream]}. Retrying automatically.`);
      } finally {
        clearTimeout(timeout);
        if (flights.get(stream)?.controller === controller) {
          flights.delete(stream);
          loaded.add(stream);
          publish({loading:loaded.size < streams.length,errors:[...failures.values()]});
        }
      }
    })();
    flights.set(stream,{controller,promise});
    return promise;
  }
  const refresh = async () => { await Promise.all(streams.map(read)); };
  const reset = () => {
    generation++;
    flights.forEach(f => f.controller.abort()); flights.clear();
    writes.forEach(c => c.abort()); writes.clear();
    failures.clear(); loaded.clear(); settled.clear(); activeActions.clear(); uncertainActions.clear();
    snapshot = empty(); listeners.forEach(fn => fn());
  };
  const onSessionReset = () => {
    suspended = true; stops.forEach(stop => stop()); stops=[]; reset();
    publish({loading:false,errors:["Session changed. Reload this page before continuing."]});
  };
  const act = async (id:string, action:NotificationAction) => {
    if (suspended || snapshot.busyIds.has(id)) return;
    const item = snapshot.items.find(n => n.id === id);
    if (!item?.pending || (action === "resolve-incident" ? item.kind !== "incident" : item.kind !== "resume")) return;
    const epoch = generation;
    const controller = new AbortController(); writes.add(controller);
    const timeout = setTimeout(() => controller.abort(),20_000);
    activeActions.add(id);
    const actionErrors = {...snapshot.actionErrors}; delete actionErrors[id];
    publish({actionErrors}); publishBusy();
    try {
      const response = await fetch(`${base}?action=${action}&uid=${encodeURIComponent(item.targetUid)}`,{
        method:"POST",headers:{"Content-Type":"application/json"},body:"{}",signal:controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Action failed. Refresh before trying again.");
      if (epoch !== generation) return;
      const status = action === "approve-resume" ? "approved" : action === "reject-resume" ? "rejected" : "resolved";
      settled.set(id,status);
      const stream = item.kind === "resume" ? "resumes" : "incidents";
      const raw = {...snapshot.raw,[stream]:snapshot.raw[stream].map(row => row.uid === item.targetUid ? {...row,status} : row)};
      publish({raw,items:snapshot.items.map(n => n.id === id ? {...n,status,pending:false} : n)});
      // Start a fresh reconciliation, not a read that began before the write.
      flights.get(stream)?.controller.abort(); flights.delete(stream);
      void read(stream);
    } catch (error) {
      if (epoch === generation) {
        const message = controller.signal.aborted ? "No confirmation received. Refresh and check the request before retrying." : error instanceof Error ? error.message : "Action failed.";
        const stream = item.kind === "resume" ? "resumes" : "incidents";
        uncertainActions.set(id,stream);
        publish({actionErrors:{...snapshot.actionErrors,[id]:`${message} Checking latest status before another decision.`}});
        publishBusy();
        // Discard the pre-decision read; its pending result cannot unlock this item.
        flights.get(stream)?.controller.abort(); flights.delete(stream);
        await read(stream);
        if (epoch !== generation) return;
        const finalMessage = uncertainActions.has(id)
          ? `${message} Status is unconfirmed; decisions stay disabled until Refresh succeeds.`
          : message;
        publish({actionErrors:{...snapshot.actionErrors,[id]:finalMessage}});
        throw new Error(finalMessage);
      }
    } finally {
      clearTimeout(timeout); writes.delete(controller);
      if (epoch === generation) { activeActions.delete(id); publishBusy(); }
    }
  };
  const store = {
    getSnapshot:() => snapshot,refresh,act,
    subscribe(listener:() => void) {
      listeners.add(listener);
      if (listeners.size === 1 && stops.length === 0 && !suspended) {
        window.addEventListener("ams:org-session-reset",onSessionReset);
        stops = streams.map(stream => startOrgPolling(() => read(stream),stream === "sessions" ? 10_000 : 3_000));
      }
      return () => {
        listeners.delete(listener);
        queueMicrotask(() => {
          if (!listeners.size) {
            stops.forEach(stop => stop()); stops=[];
            window.removeEventListener("ams:org-session-reset",onSessionReset);
            reset();
            if (stores.get(contestUid) === store) stores.delete(contestUid);
          }
        });
      };
    },
  };
  return store;
}
function getStore(contestUid:string) {
  let store = stores.get(contestUid);
  if (!store) { store = createStore(contestUid); stores.set(contestUid,store); }
  return store;
}
const noopSubscribe = () => () => {};
const getEmpty = () => serverSnapshot;
export function useOrgNotifications(contestUid:string,enabled=true) {
  const store = enabled && contestUid ? getStore(contestUid) : null;
  const snapshot = useSyncExternalStore(store?.subscribe ?? noopSubscribe,store?.getSnapshot ?? getEmpty,getEmpty);
  const refresh = useCallback(async () => { await store?.refresh(); },[store]);
  const act = useCallback(async (id:string,action:NotificationAction) => { await store?.act(id,action); },[store]);
  return {...snapshot,refresh,act};
}
