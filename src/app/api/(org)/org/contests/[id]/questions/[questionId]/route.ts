import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string; questionId: string } }) {
  return withApiLogging("org.contest_questions.update", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-question-update", params.questionId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const res = await callGoApi("PUT", `/org/contests/${params.id}/questions/${params.questionId}`, payload as Record<string, unknown>, auth.uid);
    if (res.status !== 200) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to update question.",
        res.status,
        res.status === 400 ? "BAD_REQUEST" : res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      );
    }

    return apiOk({ saved: true });
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; questionId: string } }) {
  return withApiLogging("org.contest_questions.delete", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-question-delete", params.questionId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi("DELETE", `/org/contests/${params.id}/questions/${params.questionId}`, null, auth.uid);
    if (res.status !== 204) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to delete question.",
        res.status,
        res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      );
    }

    return apiOk({ deleted: true });
  });
}
