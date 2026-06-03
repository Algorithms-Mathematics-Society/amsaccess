import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited, safeGoApiError } from "@/lib/server/http";
import { checkRequestRateLimitAsync } from "@/lib/server/rateLimit";
import { callGoApi } from "@/lib/server/auth";
import { isAmsAdminAuthenticated } from "@/lib/server/amsAdmin";
import { logger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

function serviceUid(): string {
  const uid = process.env.AMSADMIN_SERVICE_UID ?? "";
  if (!uid) throw new Error("AMSADMIN_SERVICE_UID env var not set.");
  return uid;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const limited = await checkRequestRateLimitAsync(request, "adminWrite", ["amsadmin-org", params.id]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);
  if (!(await isAmsAdminAuthenticated())) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  try {
    const body = (await request.json()) as Record<string, unknown>;
    let svcUid: string;
    try {
      svcUid = serviceUid();
    } catch (err) {
      logger.error("amsadmin.orgs.patch.service_uid_missing", { message: err instanceof Error ? err.message : String(err) });
      return apiError("Server configuration error.", 500, "SERVER_ERROR");
    }
    const res = await callGoApi("PATCH", `/admin/orgs/${params.id}`, body, svcUid);
    if (res.status >= 400) {
      return apiError(safeGoApiError(res, "Unable to update organization."), res.status, res.status === 404 ? "NOT_FOUND" : res.status === 400 ? "BAD_REQUEST" : "SERVER_ERROR");
    }
    return apiOk(res.data);
  } catch (err) {
    logger.error("amsadmin.orgs.patch_failed", { message: err instanceof Error ? err.message : String(err) });
    return apiError("Unable to update organization.", 500, "SERVER_ERROR");
  }
}
