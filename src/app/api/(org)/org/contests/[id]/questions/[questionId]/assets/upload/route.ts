import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { withApiLogging } from "@/lib/server/logger";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string; questionId: string } }) {
  const limited = checkRequestRateLimit(request, "upload", ["question-asset", params.id, params.questionId]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);
  return withApiLogging("org.contest_questions.assets.upload", async () => {
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const formData = await request.formData();
    const assetKind = String(formData.get("asset_kind") ?? "").trim();
    const file = formData.get("file");
    if (!assetKind || !(file instanceof File)) {
      return apiError("asset_kind and file are required.", 400, "BAD_REQUEST");
    }

    const contentType = file.type || "text/plain";
    const presignRes = await callGoApi(
      "POST",
      `/org/contests/${params.id}/questions/${params.questionId}/assets/presign`,
      {
        asset_kind: assetKind,
        filename: file.name,
        content_type: contentType,
        size_bytes: file.size,
      },
      auth.uid
    );
    if (presignRes.status !== 200 || typeof presignRes.data !== "object" || !presignRes.data) {
      const message =
        typeof presignRes.data === "object" && presignRes.data && "error" in presignRes.data
          ? String((presignRes.data as { error: unknown }).error)
          : "Unable to presign upload.";
      const code =
        typeof presignRes.data === "object" && presignRes.data && "code" in presignRes.data
          ? String((presignRes.data as { code: unknown }).code)
          : "SERVER_ERROR";
      return apiError(message, presignRes.status || 500, code);
    }

    const presign = presignRes.data as { upload_url?: string; object_path?: string };
    if (!presign.upload_url || !presign.object_path) {
      return apiError("Presign response missing upload_url/object_path.", 500, "SERVER_ERROR");
    }

    const uploadRes = await fetch(presign.upload_url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: Buffer.from(await file.arrayBuffer()),
    });
    if (!uploadRes.ok) {
      return apiError(`Cloud upload failed (${uploadRes.status}).`, 502, "SERVER_ERROR");
    }

    return apiOk({
      ok: true,
      object_path: presign.object_path,
      filename: file.name,
      content_type: contentType,
      size_bytes: file.size,
      upload_status: uploadRes.status,
    });
  });
}
