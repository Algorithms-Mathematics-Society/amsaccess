import type { NextRequest } from "next/server";
import { apiError, apiRateLimited } from "@/lib/server/http";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi } from "@/lib/server/auth";
import { isAmsAdminAuthenticated } from "@/lib/server/amsAdmin";

export const dynamic = "force-dynamic";

function serviceUid(): string {
  const uid = process.env.AMSADMIN_SERVICE_UID ?? "";
  if (!uid) throw new Error("AMSADMIN_SERVICE_UID env var not set.");
  return uid;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const limited = checkRequestRateLimit(request, "adminWrite", ["amsadmin-org", params.id]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);
  if (!(await isAmsAdminAuthenticated())) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const res = await callGoApi("PATCH", `/admin/orgs/${params.id}`, body, serviceUid());
    return Response.json(res.data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error.";
    return apiError(msg, 500, "SERVER_ERROR");
  }
}
