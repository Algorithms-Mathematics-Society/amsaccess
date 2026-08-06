// The response shape ams-api's routes actually return: the body itself on
// success, `{ error, code? }` on failure.
//
// This used to expect an envelope — `{ok:true,data}` / `{ok:false,error:{…}}`
// — which was the retired Go API's convention. Nothing returns it any more,
// so *every* call through here failed, including successful ones: `payload.ok`
// was undefined, the failure branch ran, and reading `.code` off a string
// error threw "can't access property 'code'".
type ApiFailure = { error?: string; code?: string; detail?: string };
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

  const payload = (await response.json().catch(() => null)) as (T & ApiFailure) | null;

  if (!response.ok) {
    // `error` is ours; `detail` is FastAPI's when a response passes straight
    // through. Preferring the specific one keeps "Incorrect email or
    // password" from being flattened into "Request failed".
    const message =
      payload?.error ?? payload?.detail ?? "Request failed. Please try again.";
    const error = new Error(message) as ApiClientError;
    if (payload?.code) error.code = payload.code;
    error.name = response.status === 429 ? "RateLimitError" : "ApiError";
    throw error;
  }

  return payload as T;
}
