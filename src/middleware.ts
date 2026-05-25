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

  if (pathname === "/access-admin-only" || pathname === "/org/login" || pathname === "/org/setup") {
    return response;
  }

  const sessionCookie = request.cookies.get("ams_session")?.value;

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
  matcher: ["/access-admin-only", "/admin/:path*", "/org/:path*"],
};
