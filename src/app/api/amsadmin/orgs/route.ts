import type { NextRequest } from "next/server";
import { apiError } from "@/lib/server/http";
import { callGoApi } from "@/lib/server/auth";
import { isAmsAdminAuthenticated } from "@/lib/server/amsAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAmsAdminAuthenticated())) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  const res = await callGoApi("GET", "/admin/orgs", null, null);
  return Response.json(res.data, { status: res.status });
}

export async function POST(request: NextRequest) {
  if (!(await isAmsAdminAuthenticated())) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  const body = (await request.json()) as Record<string, unknown>;
  const res = await callGoApi("POST", "/admin/orgs", body, null);
  return Response.json(res.data, { status: res.status });
}
