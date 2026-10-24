/** Bound fleet reads through body parsing, while preserving caller cancellation. */
export async function readFleetJson<T>(
  url: string,
  signal: AbortSignal,
  timeoutMs = 25_000,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  const timer = setTimeout(cancel, timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    const data = await response.json().catch((error: unknown) => {
      // Never convert an interrupted body into a successful empty snapshot.
      if (controller.signal.aborted) throw error;
      return {};
    });
    if (controller.signal.aborted) throw new Error("Fleet read interrupted.");
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data as T;
  } catch (error) {
    if (controller.signal.aborted && !signal.aborted)
      throw new Error("Judging status request timed out. Retrying automatically.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}
