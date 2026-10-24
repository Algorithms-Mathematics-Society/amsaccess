/** Read-only snapshots owned by one mounted contest console. Never persisted. */
export type ContestReadResource = "participants" | "scoreboard" | "analytics";
export type ContestReadSnapshot = { data: unknown; error: string; refreshing: boolean };
export const EMPTY_CONTEST_READ: ContestReadSnapshot = { data: null, error: "", refreshing: false };
const resources: ContestReadResource[] = ["participants", "scoreboard", "analytics"];

/** Exact JSON-value equality; object key order is immaterial, array order is not.
 * Iterative traversal avoids recursion limits on nested response data. */
export function equivalentJson(left: unknown, right: unknown): boolean {
  const pending: [unknown, unknown][] = [[left, right]];
  while (pending.length) {
    const [a, b] = pending.pop()!;
    if (Object.is(a, b)) continue;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) return false;
    // Inputs originate in response.json(); reject non-JSON object types defensively.
    if (!Array.isArray(a) && (Object.getPrototypeOf(a) !== Object.prototype || Object.getPrototypeOf(b) !== Object.prototype)) return false;
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      pending.push([(a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]]);
    }
  }
  return true;
}

export function createContestReadStore(contestUid: string, timeoutMs = 15_000) {
  const states = new Map<ContestReadResource, ContestReadSnapshot>();
  const flights = new Map<ContestReadResource, { controller: AbortController; promise: Promise<void> }>();
  const prepared = new Map<ContestReadResource, number>();
  const navigation = new Set<ContestReadResource>();
  const PREFETCH_HANDOFF_MS = 1_000;
  const listeners = new Map<ContestReadResource, Set<() => void>>();
  let suspended = false;
  const snapshot = (resource: ContestReadResource) => states.get(resource) ?? EMPTY_CONTEST_READ;
  const notify = () => { for (const group of listeners.values()) for (const listener of group) listener(); };
  const load = (resource: ContestReadResource): Promise<void> => {
    if (suspended) return Promise.resolve();
    const existing = flights.get(resource);
    if (existing) return existing.promise;
    const controller = new AbortController();
    let state = { ...snapshot(resource), refreshing: true };
    states.set(resource, state);
    const aborted = new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("Read cancelled or timed out. Please retry.")), { once: true }));
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const promise = (async () => {
      let lostAccess = false;
      try {
        const response = await Promise.race([fetch(`/api/org/contests/${encodeURIComponent(contestUid)}/${resource}`, { cache: "no-store", signal: controller.signal }), aborted]);
        lostAccess = response.status === 401 || response.status === 403;
        if (lostAccess && states.get(resource) === state) {
          state = { ...state, data: null };
          states.set(resource, state);
          notify();
        }
        const data = await Promise.race([response.json(), aborted]);
        if (!response.ok) throw new Error(data?.error ?? `Could not load ${resource}.`);
        if (resource === "participants" && !Array.isArray(data)) throw new Error("Invalid roster response.");
        if (!controller.signal.aborted && states.get(resource) === state)
          states.set(resource, { data: equivalentJson(state.data, data) ? state.data : data, error: "", refreshing: false });
      } catch (cause) {
        if (states.get(resource) === state)
          states.set(resource, { ...state, data: lostAccess ? null : state.data, refreshing: false, error: cause instanceof Error ? cause.message : "Could not load." });
      } finally {
        clearTimeout(timer);
        if (flights.get(resource)?.controller === controller) flights.delete(resource);
        notify();
      }
    })();
    flights.set(resource, { controller, promise });
    notify();
    return promise;
  };
  const invalidate = (resource: ContestReadResource, clear = false) => {
    prepared.delete(resource);
    navigation.delete(resource);
    states.set(resource, clear ? EMPTY_CONTEST_READ : { ...snapshot(resource), refreshing: false });
    flights.get(resource)?.controller.abort();
    flights.delete(resource);
  };
  // Mutation invalidation must replace a mounted view's read. Unopened
  // resources remain lazy; reset/dispose use the non-refreshing invalidator.
  const refreshIfObserved = (resource: ContestReadResource) => {
    if (listeners.get(resource)?.size) void load(resource);
  };
  return {
    snapshot,
    subscribe(resource: ContestReadResource, listener: () => void) {
      let group = listeners.get(resource);
      if (!group) { group = new Set(); listeners.set(resource, group); }
      group.add(listener);
      return () => { group.delete(listener); };
    },
    load,
    invalidate(resource: ContestReadResource) {
      invalidate(resource, true);
      refreshIfObserved(resource);
      notify();
    },
    prefetch(resource: ContestReadResource) {
      const at = prepared.get(resource);
      if (at !== undefined && Date.now() - at < PREFETCH_HANDOFF_MS)
        return flights.get(resource)?.promise ?? Promise.resolve();
      prepared.set(resource, Date.now());
      return load(resource);
    },
    /** A committed navigation owns its read even when chunk/render work delays mount.
     * Call on every tab transition (including navigate([]) for other tabs). */
    navigate(selected: ContestReadResource[]): Promise<void> {
      navigation.clear();
      if (suspended) return Promise.resolve();
      const reads = [...new Set(selected)].map(resource => {
        const at = prepared.get(resource);
        prepared.delete(resource);
        navigation.add(resource);
        if (flights.has(resource) || (at !== undefined && Date.now() - at < PREFETCH_HANDOFF_MS))
          return flights.get(resource)?.promise ?? Promise.resolve();
        return load(resource);
      });
      return Promise.all(reads).then(() => {});
    },
    /** Consume the current navigation once; speculative hover alone remains bounded. */
    open(resource: ContestReadResource) {
      if (navigation.delete(resource)) {
        prepared.delete(resource);
        return flights.get(resource)?.promise ?? Promise.resolve();
      }
      const at = prepared.get(resource);
      prepared.delete(resource);
      if (at !== undefined && Date.now() - at < PREFETCH_HANDOFF_MS)
        return flights.get(resource)?.promise ?? Promise.resolve();
      return load(resource);
    },
    refreshAfterWrite(resource: ContestReadResource) {
      // A mutation must never join an older read or allow it to overwrite its result.
      invalidate(resource);
      if (resource === "participants") {
        invalidate("scoreboard", true);
        invalidate("analytics", true);
        refreshIfObserved("scoreboard");
        refreshIfObserved("analytics");
      }
      notify();
      return load(resource);
    },
    reset() {
      suspended = true;
      for (const resource of resources) {
        invalidate(resource);
        states.set(resource, { data: null, refreshing: false, error: "Session changed. Reload this page before continuing." });
      }
      notify();
    },
    dispose() {
      suspended = true;
      for (const resource of resources) invalidate(resource);
      states.clear();
      prepared.clear();
    },
  };
}
