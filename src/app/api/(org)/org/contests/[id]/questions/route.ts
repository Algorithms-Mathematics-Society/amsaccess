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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contest_questions.create", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-question-create", params.id]);
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
    const orderIndex = Number(record.order_index);

    if (!title || points === null) return apiError("Question title and points are required.", 400, "BAD_REQUEST");

    const questionType = cleanText(record.question_type, 20);
    const timeLimitMs = Number(record.time_limit_ms);
    const memoryLimitMb = Number(record.memory_limit_mb);
    const validQuestionTypes = new Set(["code", "output_only"]);

    const { error } = await auth.supabase
      .from("contest_questions")
      .insert({
        contest_id: params.id,
        title,
        description: cleanText(record.description, 12_000),
        html_starter: cleanText(record.html_starter, 80_000),
        css_starter: cleanText(record.css_starter, 80_000),
        js_starter: cleanText(record.js_starter, 80_000),
        points,
        order_index: Number.isFinite(orderIndex) && orderIndex > 0 ? Math.floor(orderIndex) : 1,
        question_type: validQuestionTypes.has(questionType) ? questionType : "code",
        time_limit_ms: Number.isFinite(timeLimitMs) && timeLimitMs >= 100 ? Math.floor(timeLimitMs) : 2000,
        memory_limit_mb: Number.isFinite(memoryLimitMb) && memoryLimitMb >= 16 ? Math.floor(memoryLimitMb) : 256,
      });

    if (error) return apiError("Unable to save question.", 500, "SERVER_ERROR");
    return apiOk({ saved: true });
  });
}
