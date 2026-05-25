import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireAdmin, proxyToGoApi } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: { id: string; assetId: string } }) {
  return withApiLogging("admin.question_assets.delete", async () => {
    const limited = checkRequestRateLimit(request, "adminWrite", ["question-asset-delete", params.assetId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    return proxyToGoApi("DELETE", `/admin/questions/${params.id}/assets/${params.assetId}`, null, auth.uid);
  });
}
