import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited, safeGoApiError } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string; jobId: string } }) {
  return withApiLogging("org.contests.emails.retry", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-email-job-retry", params.id, params.jobId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi("POST", `/org/contests/${params.id}/emails/jobs/${params.jobId}/retry`, {}, auth.uid);
    if (res.status !== 200) {
      return apiError(
        safeGoApiError(res, "Unable to retry failed emails."),
        res.status,
        res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      );
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}
