import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireOrgUser } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanPoints(value: unknown) {
  const points = Number(value);
  return Number.isFinite(points) && points > 0 && points <= 1000 ? Math.floor(points) : null;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string; questionId: string } }) {
  return withApiLogging("org.contest_questions.update", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-question-update", params.questionId]);
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

    const record = payload as Record<string, unknown>;
    const title = cleanText(record.title, 180);
    const points = cleanPoints(record.points);
    if (!title || points === null) return apiError("Question title and points are required.", 400, "BAD_REQUEST");

    const { error } = await auth.supabase
      .from("contest_questions")
      .update({
        title,
        description: cleanText(record.description, 12_000),
        html_starter: cleanText(record.html_starter, 80_000),
        css_starter: cleanText(record.css_starter, 80_000),
        js_starter: cleanText(record.js_starter, 80_000),
        points,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.questionId)
      .eq("contest_id", params.id);

    if (error) return apiError("Unable to update question.", 500, "SERVER_ERROR");
    return apiOk({ saved: true });
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; questionId: string } }) {
  return withApiLogging("org.contest_questions.delete", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-question-delete", params.questionId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error === "UNAUTHORIZED") return apiError("Sign in required.", 401, "UNAUTHORIZED");
    if (auth.error) return apiError("Organization access required.", auth.error === "ORG_REQUIRED" ? 404 : 500, auth.error === "ORG_REQUIRED" ? "NOT_FOUND" : "SERVER_ERROR");

    const { error } = await auth.supabase
      .from("contest_questions")
      .delete()
      .eq("id", params.questionId)
      .eq("contest_id", params.id);

    if (error) return apiError("Unable to delete question.", 500, "SERVER_ERROR");
    return apiOk({ deleted: true });
  });
}
