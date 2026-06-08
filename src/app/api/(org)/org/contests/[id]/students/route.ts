import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited, safeGoApiError } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contests.students.list", async () => {
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const limited = checkRequestRateLimit(request, "privateRead", ["contest-students", params.id], auth.uid);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const qs = request.nextUrl.searchParams.toString();
    const res = await callGoApi("GET", `/org/contests/${params.id}/students${qs ? `?${qs}` : ""}`, null, auth.uid);
    if (res.status !== 200) {
      return apiError(
        safeGoApiError(res, "Unable to load provisioned students."),
        res.status,
        res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      );
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}
