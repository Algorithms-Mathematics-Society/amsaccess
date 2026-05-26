import type { NextRequest } from "next/server";
import { apiError, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiLogging("org.settings.get", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["org-settings"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) {
      const status = "status" in auth ? auth.status : 401;
      return apiError(auth.error ?? "Sign in required.", status, "UNAUTHORIZED");
    }
    const res = await callGoApi("GET", "/org/settings", null, auth.uid);
    return Response.json(res.data, { status: res.status });
  });
}
