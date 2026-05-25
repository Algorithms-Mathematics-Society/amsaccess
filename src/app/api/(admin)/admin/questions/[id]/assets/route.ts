import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireAdmin, proxyToGoApi } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("admin.question_assets.upload", async () => {
    const limited = checkRequestRateLimit(request, "upload", ["question-asset", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const formData = await request.formData();
    return proxyToGoApi("POST", `/admin/questions/${params.id}/assets`, formData, auth.uid);
  });
}
