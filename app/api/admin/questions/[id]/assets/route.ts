import type { NextRequest } from "next/server";
import { sanitizeStorageName } from "@/lib/cms";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("admin.question_assets.upload", async () => {
    const limited = checkRequestRateLimit(request, "upload", ["question-asset", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error === "UNAUTHORIZED") return apiError("Sign in required.", 401, "UNAUTHORIZED");
    if (auth.error === "FORBIDDEN") return apiError("Admin access required.", 403, "FORBIDDEN");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return apiError("Image file is required.", 400, "BAD_REQUEST");

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return apiError("Upload a PNG, JPEG, WebP, GIF, or SVG image.", 400, "BAD_REQUEST");
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
      return apiError("Image must be smaller than 5 MB.", 400, "BAD_REQUEST");
    }

    const filename = sanitizeStorageName(file.name || "asset");
    if (!filename) return apiError("Invalid filename.", 400, "BAD_REQUEST");

    const storagePath = `${params.id}/${Date.now()}-${filename}`;
    const { error: uploadError } = await auth.supabase.storage.from("question-assets").upload(storagePath, file, {
      upsert: false,
      contentType: file.type
    });

    if (uploadError) return apiError("Unable to upload image.", 500, "SERVER_ERROR");

    const { data, error: insertError } = await auth.supabase
      .from("question_assets")
      .insert({
        question_id: params.id,
        storage_path: storagePath,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        alt_text: file.name,
        caption: ""
      })
      .select("*")
      .single();

    if (insertError) {
      await auth.supabase.storage.from("question-assets").remove([storagePath]);
      return apiError("Unable to save image metadata.", 500, "SERVER_ERROR");
    }

    const publicUrl = auth.supabase.storage.from("question-assets").getPublicUrl(storagePath).data.publicUrl;
    return apiOk({ asset: data, publicUrl });
  });
}
