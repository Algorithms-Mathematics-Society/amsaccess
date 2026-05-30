import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiLogging("org.chess.rulesets.list", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["chess-rulesets-list"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    const res = await callGoApi("GET", "/org/chess/rulesets", null, auth.uid);
    if (res.status !== 200) return apiError("Unable to list rulesets.", res.status, "CHESS_RULESETS_LIST_FAILED");
    return apiOk(res.data as unknown[]);
  });
}

export async function POST(request: NextRequest) {
  return withApiLogging("org.chess.rulesets.create", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["chess-rulesets-create"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    const body = await request.json().catch(() => ({}));
    const res = await callGoApi("POST", "/org/chess/rulesets", body as Record<string, unknown>, auth.uid);
    if (res.status !== 201) {
      const msg = typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to create ruleset.";
      const code = typeof res.data === "object" && res.data && "code" in res.data ? String((res.data as { code: unknown }).code) : "CHESS_RULESET_CREATE_FAILED";
      return apiError(msg, res.status, code);
    }
    return apiOk(res.data as Record<string, unknown>, { status: 201 });
  });
}
