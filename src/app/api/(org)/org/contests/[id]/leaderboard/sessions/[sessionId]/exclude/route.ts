import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } },
) {
  return withApiLogging("org.contests.leaderboard.exclude", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", [
      "leaderboard-exclude",
      params.id,
    ]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) {
      return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    }

    const res = await callGoApi(
      "DELETE",
      `/org/contests/${params.id}/leaderboard/sessions/${params.sessionId}`,
      null,
      auth.uid,
    );
    if (res.status === 404) {
      return apiError("Session not found in this contest.", 404, "NOT_FOUND");
    }
    if (res.status !== 200) {
      return apiError("Unable to remove candidate from leaderboard.", res.status, "SERVER_ERROR");
    }
    return apiOk({ removed: true });
  });
}
