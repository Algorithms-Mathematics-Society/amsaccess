import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string; jobId: string } }
) {
  return withApiLogging("org.contest_question_tests.generate_job", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", [
      "generate-job",
      params.jobId,
    ]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid)
      return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi(
      "GET",
      `/org/contests/${params.id}/questions/${params.questionId}/tests/generate/${params.jobId}`,
      null,
      auth.uid
    );

    if (res.status !== 200) {
      return apiError(
        "Unable to fetch generate job.",
        res.status,
        res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR"
      );
    }

    return apiOk(res.data as Record<string, unknown>);
  });
}
