import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string; questionId: string } }) {
  return withApiLogging("org.contest_questions.assets.presign", async () => {
    const limited = checkRequestRateLimit(request, "upload", ["contest-question-cp-asset", params.questionId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const res = await callGoApi("POST", `/org/contests/${params.id}/questions/${params.questionId}/assets/presign`, payload as Record<string, unknown>, auth.uid);
    if (res.status !== 200) {
      return apiError("Unable to presign upload.", res.status, res.status === 400 ? "BAD_REQUEST" : "SERVER_ERROR");
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}
