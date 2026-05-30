import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.chess.testplay.move", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["chess-testplay-move", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    const body = await request.json().catch(() => ({}));
    const res = await callGoApi("POST", `/org/contests/${params.id}/chess/testplay/move`, body as Record<string, unknown>, auth.uid);
    if (res.status !== 200) {
      const msg = typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to post move.";
      const code = typeof res.data === "object" && res.data && "code" in res.data ? String((res.data as { code: unknown }).code) : "CHESS_MOVE_FAILED";
      return apiError(msg, res.status, code);
    }
    return apiOk(res.data as Record<string, unknown>);
  });
}
