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
    const adminCookie = request.cookies.get("ams_admin_session")?.value;
    const expected = `${process.env.AMSADMIN_USER ?? ""}:${process.env.AMSADMIN_PASSWORD ?? ""}`;
    if (!adminCookie || adminCookie !== expected) {
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
