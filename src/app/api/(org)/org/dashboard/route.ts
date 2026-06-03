import type { NextRequest } from "next/server";
import { apiError, apiOkCached, apiRateLimited, safeGoApiError } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiLogging("org.dashboard", async () => {
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const limited = checkRequestRateLimit(request, "privateRead", ["org-dashboard"], auth.uid);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const res = await callGoApi("GET", "/org/dashboard", null, auth.uid);
    if (res.status !== 200) {
      return apiError(
        safeGoApiError(res, "Unable to load dashboard."),
        res.status,
        res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      );
    }

    const payload = res.data as {
      org_id: string;
      org_name: string;
      org_slug: string;
      contests: Array<{
        id: string;
        title: string;
        status: string;
        start_at: string;
        end_at: string;
        question_count: number;
        invite_count: number;
      }>;
    };

    return apiOkCached({
      org: {
        id: payload.org_id,
        name: payload.org_name,
        slug: payload.org_slug,
      },
      contests: payload.contests.map((contest) => ({
        ...contest,
        description: null,
        _invite_count: contest.invite_count,
        _question_count: contest.question_count,
      })),
    });
  });
}
