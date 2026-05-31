import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contests.sessionCodes.list", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["contest-session-codes", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi("GET", `/org/contests/${params.id}/session-codes`, null, auth.uid);
    if (res.status !== 200) {
      return apiError("Unable to list session codes.", res.status, res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR");
    }
    return apiOk(Array.isArray(res.data) ? res.data : []);
  });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contests.sessionCodes.create", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-session-codes-create", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi("POST", `/org/contests/${params.id}/session-codes`, {}, auth.uid);
    if (res.status !== 201) {
      return apiError("Unable to create session code.", res.status, res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR");
    }
    return apiOk(res.data as Record<string, unknown>, { status: 201 });
  });
}

