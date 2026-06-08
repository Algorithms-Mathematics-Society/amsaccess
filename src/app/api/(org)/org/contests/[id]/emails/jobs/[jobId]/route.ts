import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited, safeGoApiError } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string; jobId: string } }) {
  return withApiLogging("org.contests.emails.job", async () => {
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const limited = checkRequestRateLimit(request, "privateRead", ["contest-email-job", params.id, params.jobId], auth.uid);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const res = await callGoApi("GET", `/org/contests/${params.id}/emails/jobs/${params.jobId}`, null, auth.uid);
    if (res.status !== 200) {
      return apiError(
        safeGoApiError(res, "Unable to load email dispatch job."),
        res.status,
        res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      );
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}
