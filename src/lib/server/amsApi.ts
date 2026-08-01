/**
 * Client for ams-api.
 *
 * Replaces the old `callGoApi` proxy. The Go service it pointed at never
 * existed; this talks to the FastAPI backend that does.
 *
 * Two headers carry the whole auth model:
 *   Authorization: Bearer <INTERNAL_API_SECRET>  — authenticates *this app*
 *   X-Auth-Subject: <identity subject>           — says which user we vouched for
 *
 * That split is deliberate: the backend never re-verifies a user token, and
 * the identity provider can change without the backend knowing.
 */

import { NextResponse } from "next/server";

export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T;
  requestId: string;
};

const DEFAULT_TIMEOUT_MS = 25_000;

function baseUrl(): string {
  return process.env.AMS_API_URL ?? "http://127.0.0.1:8080";
}

export async function callAmsApi<T = unknown>(
  method: string,
  path: string,
  body: Record<string, unknown> | null,
  subject: string | null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ApiResult<T>> {
  const secret = process.env.AMS_INTERNAL_API_SECRET ?? "";
  const requestId = crypto.randomUUID();

  if (!secret) {
    return {
      ok: false,
      status: 503,
      data: {
        error: "AMS_INTERNAL_API_SECRET is not configured.",
        code: "SERVER_ERROR",
      } as T,
      requestId,
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    "X-Request-ID": requestId,
  };
  if (subject) headers["X-Auth-Subject"] = subject;
  if (body !== null) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      signal: controller.signal,
      body: body !== null ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (err) {
    // A timeout and a refused connection are different operational problems;
    // conflating them makes an outage harder to diagnose from logs alone.
    const aborted = controller.signal.aborted;
    return {
      ok: false,
      status: aborted ? 504 : 502,
      data: {
        error: aborted ? "Upstream request timed out." : "Cannot reach the API.",
        code: aborted ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNREACHABLE",
      } as T,
      requestId,
    };
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) {
    return { ok: true, status: 204, data: null as T, requestId };
  }

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? ((await res.json()) as T)
    : ((await res.text()) as unknown as T);

  return { ok: res.ok, status: res.status, data, requestId };
}

/** Pass an upstream response straight through to the browser. */
export async function proxyToAmsApi(
  method: string,
  path: string,
  body: Record<string, unknown> | null,
  subject: string | null,
): Promise<NextResponse> {
  const res = await callAmsApi(method, path, body, subject);
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(res.data, {
    status: res.status,
    headers: { "X-Request-ID": res.requestId },
  });
}

/** FastAPI reports errors as `{detail: "..."}`; the UI wants a plain string. */
export function errorMessage(data: unknown, fallback = "Something went wrong."): string {
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const detail = (data as { detail?: unknown; error?: unknown }).detail
      ?? (data as { error?: unknown }).error;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
  }
  return fallback;
}

/** Forward a file upload to ams-api.
 *
 * `callAmsApi` serialises JSON, which cannot carry a package. This streams
 * the multipart body through instead — and deliberately does *not* set
 * Content-Type, because the boundary parameter must survive from the
 * original FormData or the upstream parser rejects the body.
 */
export async function uploadToAmsApi<T = unknown>(
  path: string,
  form: FormData,
  subject: string | null,
  timeoutMs = 120_000,
): Promise<ApiResult<T>> {
  const secret = process.env.AMS_INTERNAL_API_SECRET ?? "";
  const requestId = crypto.randomUUID();

  if (!secret) {
    return {
      ok: false,
      status: 503,
      data: { error: "AMS_INTERNAL_API_SECRET is not configured.", code: "SERVER_ERROR" } as T,
      requestId,
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    "X-Request-ID": requestId,
  };
  if (subject) headers["X-Auth-Subject"] = subject;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    const aborted = controller.signal.aborted;
    return {
      ok: false,
      status: aborted ? 504 : 502,
      data: {
        error: aborted ? "Upload timed out." : "Cannot reach the API.",
        code: aborted ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNREACHABLE",
      } as T,
      requestId,
    };
  } finally {
    clearTimeout(timer);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? ((await res.json()) as T)
    : ((await res.text()) as unknown as T);
  return { ok: res.ok, status: res.status, data, requestId };
}
