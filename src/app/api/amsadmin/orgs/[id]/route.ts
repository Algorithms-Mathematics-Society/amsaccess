import type { NextRequest } from "next/server";
import { apiError } from "@/lib/server/http";
import { callGoApi, requireAdmin } from "@/lib/server/auth";
import { isAmsAdminAuthenticated } from "@/lib/server/amsAdmin";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAmsAdminAuthenticated())) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  const auth = await requireAdmin();
  if (auth.error || !auth.uid) {
    const status = "status" in auth ? auth.status : 401;
    return apiError(auth.error ?? "Sign in required.", status, "UNAUTHORIZED");
  }
  const body = (await request.json()) as Record<string, unknown>;
  const res = await callGoApi("PATCH", `/admin/orgs/${params.id}`, body, auth.uid);
  return Response.json(res.data, { status: res.status });
}
