import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  return withApiLogging("org.prejudge_jobs.cancel", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["prejudge-job-cancel", params.jobId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi("POST", `/org/prejudge-jobs/${params.jobId}/cancel`, null, auth.uid);
    if (res.status !== 200) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to cancel prejudge job.",
        res.status,
        res.status === 404 ? "NOT_FOUND" : res.status === 409 ? "BAD_REQUEST" : "SERVER_ERROR"
      );
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}

