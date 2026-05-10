import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireOrgUser } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const CONTEST_STATUSES = new Set(["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function getOrgAuth() {
  const auth = await requireOrgUser();
  if (auth.error === "UNAUTHORIZED") return { auth, response: apiError("Sign in required.", 401, "UNAUTHORIZED") };
  if (auth.error === "ORG_REQUIRED") return { auth, response: apiError("Organization setup required.", 404, "NOT_FOUND") };
  if (auth.error) return { auth, response: apiError("Unable to verify organization access.", 500, "SERVER_ERROR") };
  return { auth, response: null };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contests.detail", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["contest", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const { auth, response } = await getOrgAuth();
    if (response) return response;

    const { data: contestData, error: contestError } = await auth.supabase
      .from("contests")
      .select("*")
      .eq("id", params.id)
      .single();

    if (contestError) return apiError("Contest not found.", 404, "NOT_FOUND");

    const [{ data: questions, error: questionError }, { data: invites, error: inviteError }] = await Promise.all([
      auth.supabase.from("contest_questions").select("*").eq("contest_id", params.id).order("order_index").limit(500),
      auth.supabase.from("contest_invites").select("*").eq("contest_id", params.id).order("created_at").limit(2000)
    ]);

    if (questionError || inviteError) return apiError("Unable to load contest detail.", 500, "SERVER_ERROR");

    return apiOk({
      contest: contestData,
      questions: questions ?? [],
      invites: invites ?? []
    });
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contests.update", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-update", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const { auth, response } = await getOrgAuth();
    if (response) return response;

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

    if (!title || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt || !CONTEST_STATUSES.has(status)) {
      return apiError("Valid contest settings are required.", 400, "BAD_REQUEST");
    }

    const { error } = await auth.supabase
      .from("contests")
      .update({
        title,
        description: description || null,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id);

    if (error) return apiError("Unable to update contest.", 500, "SERVER_ERROR");
    return apiOk({ saved: true });
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contests.delete", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-delete", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const { auth, response } = await getOrgAuth();
    if (response) return response;

    const { error } = await auth.supabase.from("contests").delete().eq("id", params.id);
    if (error) return apiError("Unable to delete contest.", 500, "SERVER_ERROR");
    return apiOk({ deleted: true });
  });
}
