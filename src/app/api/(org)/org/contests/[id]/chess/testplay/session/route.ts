import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.chess.testplay.session.start", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["chess-testplay-session", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    const body = await request.json().catch(() => ({}));
    const res = await callGoApi("POST", `/org/contests/${params.id}/chess/testplay/session`, body as Record<string, unknown>, auth.uid);
    if (res.status !== 200) return apiError("Unable to start testplay session.", res.status, "CHESS_TESTPLAY_START_FAILED");
    return apiOk(res.data as Record<string, unknown>);
  });
}
