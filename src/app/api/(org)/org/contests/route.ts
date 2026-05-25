import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiLogging("org.contests.create", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-create"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const res = await callGoApi("POST", "/org/contests", payload as Record<string, unknown>, auth.uid);
    if (res.status !== 201) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to create contest.",
        res.status,
        res.status === 400 ? "BAD_REQUEST" : "SERVER_ERROR",
      );
    }

    const data = res.data as { id: string };
    return apiOk({ id: data.id, redirectTo: `/org/contests/${data.id}` }, { status: 201 });
  });
}
