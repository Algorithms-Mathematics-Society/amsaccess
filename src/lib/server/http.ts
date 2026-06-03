import { NextResponse } from "next/server";

export const NO_STORE = "no-store, no-cache, must-revalidate, proxy-revalidate";
export const PUBLIC_STATIC_CACHE = "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";
export const PUBLIC_READ_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=120";
// User-specific reads: browser caches for 30s, then revalidates in background. Safe because
// "private" prevents CDN/proxy caching. Eliminates redundant fetches on tab re-focus.
export const PRIVATE_READ_CACHE = "private, max-age=30, stale-while-revalidate=60";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | string;

export function noStoreHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set("Cache-Control", NO_STORE);
  return headers;
}

export function publicCacheHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set("Cache-Control", PUBLIC_STATIC_CACHE);
  return headers;
}

export function publicReadCacheHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set("Cache-Control", PUBLIC_READ_CACHE);
  return headers;
}

export function privateCacheHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set("Cache-Control", PRIVATE_READ_CACHE);
  return headers;
}

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    { ok: true, data },
    {
      ...init,
      headers: noStoreHeaders(init?.headers)
    }
  );
}

export function apiError(message: string, status: number, code: ApiErrorCode, init?: ResponseInit) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    {
      ...init,
      status,
      headers: noStoreHeaders(init?.headers)
    }
  );
}

// Like apiOk but sets private browser cache headers instead of no-store.
// Use for authenticated read endpoints whose data is user-specific and tolerable
// at up to 30s stale (e.g., dashboard list, contest detail). Not for live data.
export function apiOkCached<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    { ok: true, data },
    { ...init, headers: privateCacheHeaders(init?.headers) },
  );
}

// Extracts a safe error string from a Go API response. Only passes the upstream
// error message through for 400 (user-actionable validation failures). All other
// status codes use the caller-supplied fallback to prevent internal detail leaks.
export function safeGoApiError(res: { status: number; data: unknown }, fallback: string): string {
  if (
    res.status === 400 &&
    typeof res.data === "object" &&
    res.data !== null &&
    "error" in res.data &&
    typeof (res.data as { error: unknown }).error === "string"
  ) {
    return (res.data as { error: string }).error;
  }
  return fallback;
}

export function apiRateLimited(retryAfter: number) {
  return apiError("Too many requests. Please wait a moment and try again.", 429, "RATE_LIMITED", {
    headers: {
      "Retry-After": String(retryAfter)
    }
  });
}
