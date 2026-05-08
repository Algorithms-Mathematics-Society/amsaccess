import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  // ── Subdomain routing ────────────────────────────────────
  // org.amsaccess.com → rewrite to /org/* paths
  if (hostname.startsWith("org.") && !pathname.startsWith("/org")) {
    const url = request.nextUrl.clone();
    url.pathname = `/org${pathname === "/" ? "/login" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── Build Supabase server client ─────────────────────────
  const response = NextResponse.next();

  function makeClient() {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
  }

  // ── Admin routes ─────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    const supabase = makeClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/access-admin-only", request.url));
    }

    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (adminError || !adminUser) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/access-admin-only?error=not_admin", request.url));
    }

    return response;
  }

  // ── Org routes ───────────────────────────────────────────
  // /org/login and /org/setup are public
  if (pathname === "/org/login" || pathname === "/org/setup") {
    return response;
  }

  if (pathname.startsWith("/org")) {
    const supabase = makeClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/org/login", request.url));
    }

    // For /org/setup we already returned above; all other /org/* need an org
    if (pathname !== "/org/setup") {
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (!org) {
        return NextResponse.redirect(new URL("/org/setup", request.url));
      }
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/org/:path*"],
};
