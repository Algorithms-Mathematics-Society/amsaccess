import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireAdmin } from "@/lib/server/supabase";
import type { Answer, ProctorEvent, Question, Review, Session } from "@/lib/types";

export const dynamic = "force-dynamic";

const DECISIONS = new Set(["ADVANCE", "HOLD", "REJECT"]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) return undefined;
  return score;
}

function cleanRubricScores(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 200)
      .map(([key, item]) => {
        if (item === null || item === "") return [key.slice(0, 180), null];
        const score = Number(item);
        return [key.slice(0, 180), Number.isFinite(score) ? score : null];
      })
  );
}

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  return withApiLogging("admin.sessions.detail", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["admin-session-detail", params.sessionId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error === "UNAUTHORIZED") return apiError("Sign in required.", 401, "UNAUTHORIZED");
    if (auth.error === "FORBIDDEN") return apiError("Admin access required.", 403, "FORBIDDEN");

    const { data: sessionData, error: sessionError } = await auth.supabase
      .from("sessions")
      .select("*")
      .eq("id", params.sessionId)
      .single();

    if (sessionError) return apiError("Session not found.", 404, "NOT_FOUND");

    const [{ data: answerData, error: answerError }, { data: eventData, error: eventError }, { data: reviewData }] =
      await Promise.all([
        auth.supabase.from("answers").select("*").eq("session_id", params.sessionId).limit(200),
        auth.supabase.from("proctor_events").select("*").eq("session_id", params.sessionId).order("created_at", { ascending: true }).limit(1000),
        auth.supabase.from("reviews").select("*").eq("session_id", params.sessionId).maybeSingle()
      ]);

    if (answerError || eventError) return apiError("Unable to load session detail.", 500, "SERVER_ERROR");

    const answers = (answerData ?? []) as Answer[];
    const questionIds = Array.from(new Set(answers.map((answer) => answer.question_id)));
    const [{ data: questionData }, { data: assetData }] = questionIds.length
      ? await Promise.all([
          auth.supabase.from("questions").select("*").in("id", questionIds),
          auth.supabase.from("question_assets").select("*").in("question_id", questionIds)
        ])
      : [{ data: [] }, { data: [] }];

    const assets = (assetData ?? []) as Array<{ question_id: string } & Record<string, unknown>>;
    const questions = ((questionData ?? []) as Question[]).map((question) => ({
      ...question,
      assets: assets.filter((asset) => asset.question_id === question.id)
    }));

    return apiOk({
      session: sessionData as Session,
      answers: answers.map((answer) => ({
        ...answer,
        question: questions.find((question) => question.id === answer.question_id)
      })),
      events: (eventData ?? []) as ProctorEvent[],
      review: (reviewData as Review | null) ?? {}
    });
  });
}

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  return withApiLogging("admin.sessions.review", async () => {
    const limited = checkRequestRateLimit(request, "adminWrite", ["review", params.sessionId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error === "UNAUTHORIZED") return apiError("Sign in required.", 401, "UNAUTHORIZED");
    if (auth.error === "FORBIDDEN") return apiError("Admin access required.", 403, "FORBIDDEN");

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const record = payload as Record<string, unknown>;
    const score = cleanScore(record.score);
    if (score === undefined) return apiError("Score must be between 0 and 100.", 400, "BAD_REQUEST");

    const decision = cleanText(record.decision, 20);
    if (decision && !DECISIONS.has(decision)) return apiError("Invalid review decision.", 400, "BAD_REQUEST");

    const { error } = await auth.supabase.from("reviews").upsert(
      {
        session_id: params.sessionId,
        score,
        comments: cleanText(record.comments, 4000) || null,
        decision: decision || null,
        rubric_scores: cleanRubricScores(record.rubric_scores)
      },
      { onConflict: "session_id" }
    );

    if (error) return apiError("Unable to save review.", 500, "SERVER_ERROR");
    return apiOk({ saved: true });
  });
}
