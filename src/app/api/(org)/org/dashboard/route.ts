import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiLogging("org.dashboard", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["org-dashboard"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi("GET", "/org/dashboard", null, auth.uid);
    if (res.status !== 200) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to load dashboard.",
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

    return apiOk({
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
