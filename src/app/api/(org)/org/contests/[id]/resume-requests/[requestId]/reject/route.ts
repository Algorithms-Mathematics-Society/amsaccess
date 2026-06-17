import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; requestId: string } }
) {
  return withApiLogging("org.contests.resumeRequests.reject", async () => {
    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) {
      return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");
    }

    let body: Record<string, unknown> | null = null;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = null;
    }

    const res = await callGoApi(
      "POST",
      `/org/contests/${params.id}/resume-requests/${params.requestId}/reject`,
      body,
      auth.uid
    );
    if (res.status !== 200) {
      return apiError("Unable to reject resume request.", res.status, "SERVER_ERROR");
    }
    return apiOk((res.data as Record<string, unknown>) ?? {});
  });
}
