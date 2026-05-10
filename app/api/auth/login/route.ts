import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { isValidEmail, normalizeEmail } from "@/lib/server/request";
import { createRouteSupabaseClient } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

type LoginScope = "admin" | "org";

function isLoginScope(value: unknown): value is LoginScope {
  return value === "admin" || value === "org";
}

export async function POST(request: NextRequest) {
  return withApiLogging("auth.login", async () => {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const record = payload as Record<string, unknown>;
    const email = normalizeEmail(typeof record.email === "string" ? record.email : "");
    const password = typeof record.password === "string" ? record.password : "";
    const scope = record.scope;

    if (!isValidEmail(email) || !password || !isLoginScope(scope)) {
      return apiError("Email and password are required.", 400, "BAD_REQUEST");
    }

    const minuteLimit = checkRequestRateLimit(request, "auth", [scope, email]);
    if (minuteLimit.limited) return apiRateLimited(minuteLimit.retryAfter);

    const hourlyLimit = checkRequestRateLimit(request, "authHourly", [scope, email]);
    if (hourlyLimit.limited) return apiRateLimited(hourlyLimit.retryAfter);

    const supabase = createRouteSupabaseClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return apiError("Invalid credentials.", 401, "UNAUTHORIZED");

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      await supabase.auth.signOut();
      return apiError("Unable to verify your account.", 401, "UNAUTHORIZED");
    }

    if (scope === "admin") {
      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (adminError || !adminUser) {
        await supabase.auth.signOut();
        return apiError("Your account does not have admin privileges.", 403, "FORBIDDEN");
      }

      return apiOk({ redirectTo: "/admin" });
    }

    const { data: orgs, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);

    if (orgError) {
      await supabase.auth.signOut();
      return apiError("Unable to verify organization access.", 403, "FORBIDDEN");
    }

    return apiOk({ redirectTo: orgs && orgs.length > 0 ? "/org/dashboard" : "/org/setup" });
  });
}
