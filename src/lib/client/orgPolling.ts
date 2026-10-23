/** Organizer-only polling: one read at a time, with a full delay after completion. */
export function startOrgPolling(
  task: () => Promise<unknown>,
  intervalMs: number | null,
  options: { immediate?: boolean } = {},
): () => void {
  let stopped = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const visible = () => document.visibilityState !== "hidden";
  const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const run = async () => {
    clear();
    if (stopped || running || !visible()) return;
    running = true;
    try { await task(); } catch { /* The owning view displays read errors. */ }
    finally {
      running = false;
      if (!stopped && visible() && intervalMs !== null) timer = setTimeout(run, intervalMs);
    }
  };
  const onVisibility = () => { clear(); if (visible()) void run(); };
  const onFocus = () => { if (visible()) void run(); };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onFocus);
  if (options.immediate !== false) void run();
  else if (visible() && intervalMs !== null) timer = setTimeout(run, intervalMs);
  return () => {
    stopped = true;
    clear();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", onFocus);
  };
}
