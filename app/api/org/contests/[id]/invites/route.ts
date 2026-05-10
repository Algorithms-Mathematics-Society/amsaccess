import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { isValidEmail, normalizeEmail } from "@/lib/server/request";
import { requireOrgUser } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contest_invites.create", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-invites", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error === "UNAUTHORIZED") return apiError("Sign in required.", 401, "UNAUTHORIZED");
    if (auth.error) return apiError("Organization access required.", auth.error === "ORG_REQUIRED" ? 404 : 500, auth.error === "ORG_REQUIRED" ? "NOT_FOUND" : "SERVER_ERROR");

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const emails = Array.isArray((payload as Record<string, unknown>).emails)
      ? ((payload as Record<string, unknown>).emails as unknown[])
          .map((email) => normalizeEmail(String(email)))
          .filter((email, index, list) => isValidEmail(email) && list.indexOf(email) === index)
          .slice(0, 500)
      : [];

    if (!emails.length) return apiError("Enter at least one valid email.", 400, "BAD_REQUEST");

    const rows = emails.map((email) => ({
      contest_id: params.id,
      email,
      invited_by: auth.user.id,
      status: "pending"
    }));

    const { error } = await auth.supabase.from("contest_invites").upsert(rows, { onConflict: "contest_id,email" });
    if (error) return apiError("Unable to save invites.", 500, "SERVER_ERROR");
    return apiOk({ invited: emails.length });
  });
}
