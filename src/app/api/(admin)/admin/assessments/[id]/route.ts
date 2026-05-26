import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiError, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireAdmin, proxyToGoApi } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("admin.assessments.get", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["admin-assessment", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);
    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    return proxyToGoApi("GET", `/admin/assessments/${params.id}`, null, auth.uid);
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("admin.assessments.patch", async () => {
    const limited = checkRequestRateLimit(request, "adminWrite", ["admin-assessment-patch", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);
    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }
    return proxyToGoApi("PATCH", `/admin/assessments/${params.id}`, payload as Record<string, unknown>, auth.uid);
  });
}
