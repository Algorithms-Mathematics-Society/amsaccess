import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited, safeGoApiError } from "@/lib/server/http";
import { checkRequestRateLimitAsync } from "@/lib/server/rateLimit";
import { withApiLogging } from "@/lib/server/logger";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = await checkRequestRateLimitAsync(request, "orgWrite", ["judge-capacity-start"]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);
  return withApiLogging("org.judge_capacity.start", async () => {
    if (!process.env.GO_API_URL) {
      return apiError("GO_API_URL is not configured on web deployment.", 503, "SERVER_ERROR");
    }
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    // Forward the optional body (contest_id) so the judge can size the auto-stop
    // safety timer to the contest being started for.
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    let res;
    try {
      res = await callGoApi("POST", "/org/judge-capacity/start", body, auth.uid);
    } catch {
      return apiError("Judge capacity service unavailable.", 503, "SERVER_ERROR");
    }
    if (res.status !== 200) {
      const code =
        typeof res.data === "object" && res.data && "code" in res.data
          ? String((res.data as { code: unknown }).code)
          : "SERVER_ERROR";
      return apiError(safeGoApiError(res, "Unable to start judge capacity."), res.status, code);
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}
