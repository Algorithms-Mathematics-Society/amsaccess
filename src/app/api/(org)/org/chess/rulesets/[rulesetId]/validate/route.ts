import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { rulesetId: string } }) {
  return withApiLogging("org.chess.rulesets.validate", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["chess-ruleset-validate", params.rulesetId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    const res = await callGoApi("POST", `/org/chess/rulesets/${params.rulesetId}/validate`, {}, auth.uid);
    if (res.status !== 200) {
      const msg = typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to validate ruleset.";
      const code = typeof res.data === "object" && res.data && "code" in res.data ? String((res.data as { code: unknown }).code) : "CHESS_RULESET_VALIDATE_FAILED";
      return apiError(msg, res.status, code);
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}
