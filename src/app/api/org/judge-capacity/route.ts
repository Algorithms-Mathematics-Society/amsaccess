import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { withApiLogging } from "@/lib/server/logger";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = checkRequestRateLimit(request, "privateRead", ["judge-capacity"]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);
  return withApiLogging("org.judge_capacity.get", async () => {
    if (!process.env.GO_API_URL) {
      return apiError("GO_API_URL is not configured on web deployment.", 503, "SERVER_ERROR");
    }
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    let res;
    try {
      res = await callGoApi("GET", "/org/judge-capacity", null, auth.uid);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown upstream error";
      return apiError(`Judge capacity upstream unavailable: ${message}`, 503, "SERVER_ERROR");
    }
    if (res.status !== 200) {
      const code =
        typeof res.data === "object" && res.data && "code" in res.data
          ? String((res.data as { code: unknown }).code)
          : "SERVER_ERROR";
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to fetch judge capacity.",
        res.status,
        code
      );
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}
