import { NextResponse } from "next/server";

export const NO_STORE = "no-store, no-cache, must-revalidate, proxy-revalidate";
export const PUBLIC_STATIC_CACHE = "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";
export const PUBLIC_READ_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=120";

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

export function apiRateLimited(retryAfter: number) {
  return apiError("Too many requests. Please wait a moment and try again.", 429, "RATE_LIMITED", {
    headers: {
      "Retry-After": String(retryAfter)
    }
  });
}
