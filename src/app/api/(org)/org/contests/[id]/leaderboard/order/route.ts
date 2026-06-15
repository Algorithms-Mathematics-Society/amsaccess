import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contests.leaderboard.reorder", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["leaderboard-order", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) {
      return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const res = await callGoApi(
      "PUT",
      `/org/contests/${params.id}/leaderboard/order`,
      payload as Record<string, unknown>,
      auth.uid,
    );
    if (res.status !== 200) {
      return apiError("Unable to save leaderboard order.", res.status, "SERVER_ERROR");
    }
    return apiOk({ saved: true });
  });
}
