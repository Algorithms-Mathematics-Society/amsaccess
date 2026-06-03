import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRIVATE_CACHE_CONTROL = "no-store, no-cache, must-revalidate, proxy-revalidate";

function setSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  return response;
}

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  return setSecurityHeaders(response);
}

// Verifies the HMAC-SHA256 signed ams_admin_session cookie using Web Crypto
// (the only crypto API available in the Edge runtime). Replicates the signing
// logic from src/lib/server/amsAdmin.ts, which uses Node.js crypto and cannot
// run in middleware. crypto.subtle.verify is constant-time by spec.
async function verifyAmsAdminToken(token: string): Promise<boolean> {
  const user = process.env.AMSADMIN_USER ?? "";
  const pass = process.env.AMSADMIN_PASSWORD ?? "";
  // Mirror the secret resolution order in amsAdmin.ts
  const secret = process.env.AMSADMIN_SESSION_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? pass;

  if (!user || !pass || !secret || !token) return false;

  // Token format: base64url(payload_json).base64url(hmac_sha256)
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sigB64url = token.slice(dot + 1);

  // Decode the base64url signature to an ArrayBuffer
  let sigBuffer: ArrayBuffer;
  try {
    const base64 = sigB64url.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    sigBuffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(sigBuffer);
    for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  } catch {
    return false;
  }

  // Import secret and verify signature — crypto.subtle.verify is constant-time by spec
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify("HMAC", key, sigBuffer, new TextEncoder().encode(payload));
    if (!valid) return false;
  } catch {
    return false;
  }

  // Decode payload and check user identity and expiry
  try {
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json) as { user?: unknown; exp?: unknown };
    return parsed.user === user && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  // Subdomain routing: org.amsaccess.com → /org/*
  if (hostname.startsWith("org.") && !pathname.startsWith("/org")) {
    const url = request.nextUrl.clone();
    url.pathname = `/org${pathname === "/" ? "/login" : pathname}`;
    return noStore(NextResponse.rewrite(url));
  }

  const response = noStore(NextResponse.next());

  if (pathname.startsWith("/amsadmin")) {
    if (pathname === "/amsadmin/login") return response;
    const adminCookie = request.cookies.get("ams_admin_session")?.value ?? "";
    if (!adminCookie || !(await verifyAmsAdminToken(adminCookie))) {
      return noStore(NextResponse.redirect(new URL("/amsadmin/login", request.url)));
    }
    return response;
  }

  if (pathname === "/access-admin-only" || pathname === "/org/login" || pathname === "/org/setup") {
    return response;
  }

  const sessionCookie = request.cookies.get("ams_session")?.value;

  if (pathname === "/download") {
    if (!sessionCookie) {
      const loginUrl = new URL("/org/login", request.url);
      loginUrl.searchParams.set("next", "/download");
      return noStore(NextResponse.redirect(loginUrl));
    }
    return response;
  }

  if (pathname.startsWith("/admin")) {
    if (!sessionCookie) {
      return noStore(NextResponse.redirect(new URL("/access-admin-only", request.url)));
    }
    return response;
  }

  if (pathname.startsWith("/org")) {
    if (!sessionCookie) {
      return noStore(NextResponse.redirect(new URL("/org/login", request.url)));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/access-admin-only", "/download", "/admin/:path*", "/org/:path*", "/amsadmin/:path*"],
};
