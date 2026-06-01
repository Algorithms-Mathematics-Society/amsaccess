import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  return withApiLogging("org.contest_question_tests.generate", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", [
      "contest-question-tests-generate",
      params.questionId,
    ]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid)
      return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const res = await callGoApi(
      "POST",
      `/org/contests/${params.id}/questions/${params.questionId}/tests/generate`,
      payload as Record<string, unknown>,
      auth.uid
    );

    if (res.status !== 200) {
      const code =
        typeof res.data === "object" && res.data && "code" in res.data
          ? String((res.data as { code: unknown }).code)
          : res.status === 400
          ? "BAD_REQUEST"
          : res.status === 404
          ? "NOT_FOUND"
          : "SERVER_ERROR";
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data
          ? String((res.data as { error: unknown }).error)
          : "Failed to generate tests.",
        res.status,
        code
      );
    }

    return apiOk(res.data as Record<string, unknown>);
  });
}
