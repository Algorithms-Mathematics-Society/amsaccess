import type { NextRequest } from "next/server";
import { apiError, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.chess.testplay.events", async () => {
    const limited = checkRequestRateLimit(request, "orgRead", ["chess-testplay-events", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    const since = request.nextUrl.searchParams.get("since_id") ?? "0";
    const res = await callGoApi("GET", `/org/contests/${params.id}/chess/testplay/events?since_id=${encodeURIComponent(since)}`, null, auth.uid);
    if (res.status !== 200) return apiError("Unable to load events.", res.status, "CHESS_EVENTS_FAILED");
    return new Response(typeof res.data === "string" ? res.data : JSON.stringify(res.data), {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache"
      }
    });
  });
}
