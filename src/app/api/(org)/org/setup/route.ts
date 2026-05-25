import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiError, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireOrgUser, proxyToGoApi } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withApiLogging("org.setup", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["setup"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    return proxyToGoApi("POST", "/org/setup", payload as Record<string, unknown>, auth.uid);
  });
}
