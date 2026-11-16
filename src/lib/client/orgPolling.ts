import { startSupportPolling } from "./support-poll.ts";

export const ORG_SIGNED_OUT_EVENT = "ams:org-signed-out";
export const ORG_SIGNED_IN_EVENT = "ams:org-signed-in";
const MAX_BACKOFF_MS = 60_000;

let signedOut = false;

export function pauseOrgPolling(): void {
  if (signedOut) return;
  signedOut = true;
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(ORG_SIGNED_OUT_EVENT));
}

/** Session health is shared; each poller owns its own failure count. */
export function reportOrgResponse(status: number | null): void {
  if (status === 401) pauseOrgPolling();
}

/** Observe only staff requests, and stop reporting even if a later wrapper
 * retains this wrapper after the shell unmounts. */
export function observeOrgApiResponses(): () => void {
  const original = window.fetch;
  let active = true;
  const observed: typeof window.fetch = async (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.href,
    );
    const watched =
      url.origin === window.location.origin &&
      (url.pathname.startsWith("/api/org/") || url.pathname === "/api/auth/me");
    const response = await original.call(window, input, init);
    if (active && watched) reportOrgResponse(response.status);
    return response;
  };
  window.fetch = observed;
  return () => {
    active = false;
    if (window.fetch === observed) window.fetch = original;
  };
}

export function orgSignedOut(): boolean {
  return signedOut;
}

/** After a confirmed re-sign-in as the same account: every poller reads now. */
export function resumeOrgPolling(): void {
  signedOut = false;
  window.dispatchEvent(new Event(ORG_SIGNED_IN_EVENT));
}

/** One failure retries on the normal cadence; each further consecutive failure
 *  doubles the delay, capped at a minute but never below the cadence. */
export function orgBackoffMs(intervalMs: number, failures: number): number {
  if (failures <= 1) return intervalMs;
  return Math.min(
    Math.max(intervalMs, MAX_BACKOFF_MS),
    intervalMs * 2 ** (failures - 1),
  );
}

/** Organizer-only polling: one read at a time, with a full delay after completion.
 *  Return false for a handled error, or reject, to back off this poller only.
 *  Pauses while hidden or signed out. */
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
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const run = async () => {
    clear();
    if (stopped || running || !visible() || signedOut) return;
    running = true;
    try {
      failures = (await task()) === false ? failures + 1 : 0;
    } catch {
      failures++; /* The owning view displays read errors. */
    } finally {
      running = false;
      if (!stopped && visible() && !signedOut && intervalMs !== null)
        timer = setTimeout(run, orgBackoffMs(intervalMs, failures));
    }
  };
  const onVisibility = () => {
    clear();
    if (visible()) void run();
  };
  // Focus must not bypass a backoff: every poller hears the same focus event.
  const onFocus = () => {
    if (visible() && failures <= 1) void run();
  };
  const onSignedIn = () => {
    failures = 0;
    onVisibility();
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onFocus);
  window.addEventListener(ORG_SIGNED_IN_EVENT, onSignedIn);
  window.addEventListener(ORG_SIGNED_OUT_EVENT, clear);
  if (options.immediate !== false) void run();
  else if (visible() && intervalMs !== null)
    timer = setTimeout(run, intervalMs);
  return () => {
    stopped = true;
    clear();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener(ORG_SIGNED_IN_EVENT, onSignedIn);
    window.removeEventListener(ORG_SIGNED_OUT_EVENT, clear);
  };
}

/** Keep support's jitter/cooldown behavior, but share the staff session pause. */
export function startOrgSupportPolling(
  task: Parameters<typeof startSupportPolling>[0],
  options: Parameters<typeof startSupportPolling>[1] = {},
): () => void {
  let stop: (() => void) | undefined;
  let suspended = false;
  const pause = () => {
    stop?.();
    stop = undefined;
  };
  const resume = () => {
    pause();
    if (!suspended && !orgSignedOut())
      stop = startSupportPolling(async (signal) => {
        try {
          return await task(signal);
        } catch (error) {
          if (
            !signal.aborted &&
            (error as { status?: number } | null)?.status === 401
          )
            pauseOrgPolling();
          throw error;
        }
      }, options);
    if (orgSignedOut()) pause();
  };
  const reset = () => {
    suspended = true;
    pause();
  };
  window.addEventListener("ams:org-session-reset", reset);
  window.addEventListener(ORG_SIGNED_OUT_EVENT, pause);
  window.addEventListener(ORG_SIGNED_IN_EVENT, resume);
  resume();
  return () => {
    pause();
    window.removeEventListener("ams:org-session-reset", reset);
    window.removeEventListener(ORG_SIGNED_OUT_EVENT, pause);
    window.removeEventListener(ORG_SIGNED_IN_EVENT, resume);
  };
}
