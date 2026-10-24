import { startOrgPolling } from "./orgPolling.ts";
import { enteredParticipantKeys } from "./orgEntry.ts";
import { reuseNotificationRows, type SessionRow } from "./orgNotifications.ts";

export type SessionSnapshot = { rows: SessionRow[]; entered: Set<string>; loaded: boolean; error: string; updatedAt: number | null };
const empty = (): SessionSnapshot => ({ rows: [], entered: new Set(), loaded: false, error: "", updatedAt: null });
export const emptySessionSnapshot = empty();

/** One live source per contest. No persisted cache or cross-account reuse. */
export function createOrgSessionStore(contestUid: string, dispose = () => {}) {
  let snapshot = empty();
  let entrySnapshot = { entered: snapshot.entered, loaded: snapshot.loaded, error: snapshot.error };
  let generation = 0;
  let suspended = false;
  let flight: { controller: AbortController; promise: Promise<SessionRow[]> } | null = null;
  const listeners = new Map<() => void, boolean>();
  let stop: (() => void) | null = null;
  let polling: boolean | null = null;
  const publish = (patch: Partial<SessionSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    if (entrySnapshot.entered !== snapshot.entered || entrySnapshot.loaded !== snapshot.loaded || entrySnapshot.error !== snapshot.error) {
      entrySnapshot = { entered: snapshot.entered, loaded: snapshot.loaded, error: snapshot.error };
    }
    listeners.forEach((_live, fn) => fn());
  };
  const currentFlight = () => flight;
  const refresh = (): Promise<SessionRow[]> => {
    if (suspended) return Promise.reject(new Error("Session changed. Reload before continuing."));
    if (flight) return flight.promise;
    const controller = new AbortController();
    const epoch = generation;
    const aborted = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener("abort", () => reject(new Error("Sessions request cancelled or timed out.")), { once: true });
    });
    const timer = setTimeout(() => controller.abort(), 12_000);
    const promise = (async () => {
      try {
        const response = await Promise.race([fetch(`/api/org/contests/${encodeURIComponent(contestUid)}/invigilation?view=sessions`, { cache: "no-store", signal: controller.signal }), aborted]);
        if (!response.ok) throw new Error("Could not update sessions.");
        const data: unknown = await Promise.race([response.json(), aborted]);
        if (!Array.isArray(data)) throw new Error("Invalid sessions response.");
        if (controller.signal.aborted || epoch !== generation) throw new Error("Session changed. Reload before continuing.");
        const rows = reuseNotificationRows(snapshot.rows, data as SessionRow[]);
        publish({ rows, entered: enteredParticipantKeys(rows, snapshot.entered), loaded: true, error: "", updatedAt: Date.now() });
        return rows;
      } catch (error) {
        if (epoch === generation) publish({ error: "Entry status could not refresh." });
        throw error;
      } finally {
        clearTimeout(timer);
        if (currentFlight()?.controller === controller) flight = null;
      }
    })();
    flight = { controller, promise };
    return promise;
  };
  const reset = () => {
    suspended = true;
    generation++;
    flight?.controller.abort(); flight = null;
    stop?.(); stop = null;
    snapshot = empty();
    publish({ error: "Session changed. Reload this page before continuing." });
  };
  const store = {
    getSnapshot: () => snapshot,
    getEntrySnapshot: () => entrySnapshot,
    refresh,
    async refreshAfterWrite() {
      const epoch = generation;
      await flight?.promise.catch(() => {});
      if (epoch !== generation) throw new Error("Session source changed before refresh.");
      return refresh();
    },
    subscribe(listener: () => void, live = true) {
      listeners.set(listener, live);
      if (listeners.size === 1) window.addEventListener("ams:org-session-reset", reset);
      const wantsPolling = [...listeners.values()].some(Boolean);
      if (!suspended && (!stop || polling !== wantsPolling)) {
        stop?.(); polling = wantsPolling;
        stop = startOrgPolling(refresh, wantsPolling ? 10_000 : null, { immediate: false });
      }
      // A newly opened tab gets a current read, even if an older snapshot exists.
      if (!suspended && document.visibilityState !== "hidden") void refresh().catch(() => {});
      return () => {
        listeners.delete(listener);
        queueMicrotask(() => {
          if (!listeners.size) {
            generation++;
            stop?.(); stop = null;
            flight?.controller.abort(); flight = null;
            window.removeEventListener("ams:org-session-reset", reset);
            snapshot = empty();
            entrySnapshot = { entered: snapshot.entered, loaded: snapshot.loaded, error: snapshot.error };
            dispose();
          } else {
            const wantsPolling = [...listeners.values()].some(Boolean);
            if (!suspended && polling !== wantsPolling) {
              stop?.(); polling = wantsPolling;
              stop = startOrgPolling(refresh, wantsPolling ? 10_000 : null, { immediate: false });
            }
          }
        });
      };
    },
  };
  return store;
}
const stores = new Map<string, ReturnType<typeof createOrgSessionStore>>();
export function getOrgSessionStore(contestUid: string) {
  let store = stores.get(contestUid);
  if (!store) {
    const created = createOrgSessionStore(contestUid, () => {
      if (stores.get(contestUid) === created) stores.delete(contestUid);
    });
    stores.set(contestUid, created); store = created;
  }
  return store;
}
