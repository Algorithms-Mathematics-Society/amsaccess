import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireAdmin, proxyToGoApi } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiLogging("admin.sessions.list", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["admin-sessions"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    return proxyToGoApi("GET", `/admin/sessions${qs ? `?${qs}` : ""}`, null, auth.uid);
  });
}
