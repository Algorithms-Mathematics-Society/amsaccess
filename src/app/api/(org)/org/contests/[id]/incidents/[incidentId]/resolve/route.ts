import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; incidentId: string } },
) {
  return withApiLogging("org.contests.incidents.resolve", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["incident-resolve", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) {
      return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    }

    const res = await callGoApi(
      "POST",
      `/org/contests/${params.id}/incidents/${params.incidentId}/resolve`,
      null,
      auth.uid,
    );
    if (res.status === 404) {
      return apiError("Incident not found.", 404, "NOT_FOUND");
    }
    if (res.status !== 200) {
      return apiError("Unable to resolve incident.", res.status, "SERVER_ERROR");
    }
    return apiOk({ resolved: true });
  });
}
