import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { getAuthenticatedUser } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function POST(request: NextRequest) {
  return withApiLogging("org.setup", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["setup"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await getAuthenticatedUser();
    if (!auth.user) return apiError("Sign in required.", 401, "UNAUTHORIZED");

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const record = payload as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim().slice(0, 160) : "";
    const slug = toSlug(typeof record.slug === "string" ? record.slug : name);

    if (!name || !slug) return apiError("Organization name and slug are required.", 400, "BAD_REQUEST");

    const { error } = await auth.supabase
      .from("organizations")
      .insert({ name, slug, owner_id: auth.user.id });

    if (error) return apiError("Unable to create organization.", 400, "BAD_REQUEST");
    return apiOk({ redirectTo: "/org/dashboard" });
  });
}
