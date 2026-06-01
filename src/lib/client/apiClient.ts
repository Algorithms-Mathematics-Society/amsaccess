type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: { code: string; message: string } };
export type ApiClientError = Error & { code?: string };

const DEFAULT_API_TIMEOUT_MS = 20000;

function timeoutSignal(timeoutMs: number, upstream?: AbortSignal) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  const abort = () => controller.abort();
  upstream?.addEventListener("abort", abort, { once: true });

  return {
    signal: controller.signal,
    cleanup() {
      window.clearTimeout(timeout);
      upstream?.removeEventListener("abort", abort);
    }
  };
}

export async function apiFetch<T>(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs, ...restInit } = init;
  const headers = new Headers(restInit.headers);
  const body = restInit.body;
  const timeout = timeoutSignal(timeoutMs ?? DEFAULT_API_TIMEOUT_MS, restInit.signal ?? undefined);

  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(input, {
      ...restInit,
      headers,
      signal: timeout.signal
    });
  } catch (fetchError) {
    if (timeout.signal.aborted && !restInit.signal?.aborted) {
      const error = new Error("Request timed out. Please try again.");
      error.name = "TimeoutError";
      throw error;
    }
    throw fetchError;
  } finally {
    timeout.cleanup();
  }

  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!response.ok || !payload || !payload.ok) {
    const code = payload && !payload.ok ? payload.error.code : undefined;
    const message = payload && !payload.ok ? payload.error.message : "Request failed. Please try again.";
    const error = new Error(message) as ApiClientError;
    if (code) error.code = code;
    error.name = response.status === 429 ? "RateLimitError" : "ApiError";
    throw error;
  }

  return payload.data;
}
