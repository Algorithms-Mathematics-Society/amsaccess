import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireAdmin, proxyToGoApi } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  return withApiLogging("admin.sessions.detail", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["admin-session-detail", params.sessionId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    return proxyToGoApi("GET", `/admin/sessions/${params.sessionId}`, null, auth.uid);
  });
}

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  return withApiLogging("admin.sessions.review", async () => {
    const limited = checkRequestRateLimit(request, "adminWrite", ["review", params.sessionId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    return proxyToGoApi("PATCH", `/admin/sessions/${params.sessionId}`, body, auth.uid);
  });
}
