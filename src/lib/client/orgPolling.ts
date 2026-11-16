export const ORG_SIGNED_OUT_EVENT = "ams:org-signed-out";
export const ORG_SIGNED_IN_EVENT = "ams:org-signed-in";
const MAX_BACKOFF_MS = 60_000;

// Shared by every poller: most owning views swallow their own read errors, so
// API health is observed at the response level (see reportOrgResponse).
let failureStreak = 0;
let signedOut = false;

/** Called for every organizer API response; `null` is a network failure. */
export function reportOrgResponse(status: number | null): void {
  if (status === 401) {
    if (signedOut) return;
    signedOut = true;
    if (typeof window !== "undefined") window.dispatchEvent(new Event(ORG_SIGNED_OUT_EVENT));
  } else if (status === null || status === 429 || status >= 500) failureStreak++;
  else if (status < 400) failureStreak = 0;
}

export function orgSignedOut(): boolean {
  return signedOut;
}

/** After a confirmed re-sign-in as the same account: every poller reads now. */
export function resumeOrgPolling(): void {
  signedOut = false;
  failureStreak = 0;
  window.dispatchEvent(new Event(ORG_SIGNED_IN_EVENT));
}

/** One failure retries on the normal cadence; each further consecutive failure
 *  doubles the delay, capped at a minute but never below the cadence. */
export function orgBackoffMs(intervalMs: number, failures: number): number {
  if (failures <= 1) return intervalMs;
  return Math.min(Math.max(intervalMs, MAX_BACKOFF_MS), intervalMs * 2 ** Math.min(failures - 1, 5));
}

/** Organizer-only polling: one read at a time, with a full delay after completion.
 *  Pauses while hidden or signed out, and backs off while reads keep failing. */
export function startOrgPolling(
  task: () => Promise<unknown>,
  intervalMs: number | null,
  options: { immediate?: boolean } = {},
): () => void {
  let stopped = false;
  let running = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const visible = () => document.visibilityState !== "hidden";
  const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const run = async () => {
    clear();
    if (stopped || running || !visible() || signedOut) return;
    running = true;
    try { await task(); failures = 0; } catch { failures++; /* The owning view displays read errors. */ }
    finally {
      running = false;
      if (!stopped && visible() && !signedOut && intervalMs !== null)
        timer = setTimeout(run, orgBackoffMs(intervalMs, Math.max(failures, failureStreak)));
    }
  };
  const onVisibility = () => { clear(); if (visible()) void run(); };
  // Focus must not bypass a backoff: every poller hears the same focus event.
  const onFocus = () => { if (visible() && Math.max(failures, failureStreak) <= 1) void run(); };
  const onSignedIn = () => { failures = 0; onVisibility(); };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onFocus);
  window.addEventListener(ORG_SIGNED_IN_EVENT, onSignedIn);
  if (options.immediate !== false) void run();
  else if (visible() && intervalMs !== null) timer = setTimeout(run, intervalMs);
  return () => {
    stopped = true;
    clear();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener(ORG_SIGNED_IN_EVENT, onSignedIn);
  };
}
