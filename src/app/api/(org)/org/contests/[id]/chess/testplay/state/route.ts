import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.chess.testplay.state", async () => {
    const limited = checkRequestRateLimit(request, "orgRead", ["chess-testplay-state", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    const res = await callGoApi("GET", `/org/contests/${params.id}/chess/testplay/state`, null, auth.uid);
    if (res.status !== 200) return apiError("Unable to load testplay state.", res.status, "CHESS_STATE_FAILED");
    return apiOk(res.data as Record<string, unknown>);
  });
}
