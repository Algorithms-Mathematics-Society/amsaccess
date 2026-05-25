import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiError, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireAdmin, proxyToGoApi } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiLogging("admin.questions.list", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["admin-questions"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    return proxyToGoApi("GET", "/admin/questions", null, auth.uid);
  });
}

export async function POST(request: NextRequest) {
  return withApiLogging("admin.questions.create", async () => {
    const limited = checkRequestRateLimit(request, "adminWrite", ["question-create"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    return proxyToGoApi("POST", "/admin/questions", payload as Record<string, unknown>, auth.uid);
  });
}
