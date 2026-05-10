import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string; assetId: string } }) {
  return withApiLogging("admin.question_assets.update", async () => {
    const limited = checkRequestRateLimit(request, "adminWrite", ["question-asset-update", params.assetId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error === "UNAUTHORIZED") return apiError("Sign in required.", 401, "UNAUTHORIZED");
    if (auth.error === "FORBIDDEN") return apiError("Admin access required.", 403, "FORBIDDEN");

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const record = payload as Record<string, unknown>;
    const { error } = await auth.supabase
      .from("question_assets")
      .update({
        caption: cleanText(record.caption, 500),
        alt_text: cleanText(record.alt_text, 300)
      })
      .eq("id", params.assetId)
      .eq("question_id", params.id);

    if (error) return apiError("Unable to update asset.", 500, "SERVER_ERROR");
    return apiOk({ saved: true });
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; assetId: string } }) {
  return withApiLogging("admin.question_assets.delete", async () => {
    const limited = checkRequestRateLimit(request, "adminWrite", ["question-asset-delete", params.assetId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error === "UNAUTHORIZED") return apiError("Sign in required.", 401, "UNAUTHORIZED");
    if (auth.error === "FORBIDDEN") return apiError("Admin access required.", 403, "FORBIDDEN");

    const { data: asset, error: assetError } = await auth.supabase
      .from("question_assets")
      .select("storage_path")
      .eq("id", params.assetId)
      .eq("question_id", params.id)
      .single();

    if (assetError || !asset) return apiError("Asset not found.", 404, "NOT_FOUND");

    await auth.supabase.storage.from("question-assets").remove([asset.storage_path]);
    const { error } = await auth.supabase
      .from("question_assets")
      .delete()
      .eq("id", params.assetId)
      .eq("question_id", params.id);

    if (error) return apiError("Unable to delete asset.", 500, "SERVER_ERROR");
    return apiOk({ deleted: true });
  });
}
