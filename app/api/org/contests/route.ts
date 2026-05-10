import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireOrgUser } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  return withApiLogging("org.contests.create", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-create"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error === "UNAUTHORIZED") return apiError("Sign in required.", 401, "UNAUTHORIZED");
    if (auth.error === "ORG_REQUIRED") return apiError("Organization setup required.", 404, "NOT_FOUND");
    if (auth.error) return apiError("Unable to verify organization access.", 500, "SERVER_ERROR");

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const record = payload as Record<string, unknown>;
    const title = cleanText(record.title, 180);
    const description = cleanText(record.description, 2000);
    const startAt = new Date(cleanText(record.start_at, 80));
    const endAt = new Date(cleanText(record.end_at, 80));
    const status = cleanText(record.status, 20);

    if (!title || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return apiError("Valid title, start time, and end time are required.", 400, "BAD_REQUEST");
    }

    if (status !== "DRAFT" && status !== "SCHEDULED") {
      return apiError("Invalid contest status.", 400, "BAD_REQUEST");
    }

    const { data, error } = await auth.supabase
      .from("contests")
      .insert({
        org_id: auth.org.id,
        title,
        description: description || null,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status,
        created_by: auth.user.id
      })
      .select("id")
      .single();

    if (error) return apiError("Unable to create contest.", 500, "SERVER_ERROR");
    return apiOk({ id: data.id, redirectTo: `/org/contests/${data.id}` });
  });
}
