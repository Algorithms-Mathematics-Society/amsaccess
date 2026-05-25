import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string; questionId: string } }) {
  return withApiLogging("org.contest_questions.prejudge.create", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-question-prejudge", params.questionId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi("POST", `/org/contests/${params.id}/questions/${params.questionId}/prejudge`, {}, auth.uid);
    if (res.status !== 201) {
      return apiError("Unable to enqueue prejude job.", res.status, "SERVER_ERROR");
    }
    return apiOk(res.data as Record<string, unknown>, { status: 201 });
  });
}
