import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: { id: string; inviteId: string } }) {
  return withApiLogging("org.contest_invites.delete", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-invite-delete", params.inviteId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    const res = await callGoApi("DELETE", `/org/contests/${params.id}/invites/${params.inviteId}`, null, auth.uid);
    if (res.status !== 204) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to delete invite.",
        res.status,
        res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      );
    }

    return apiOk({ deleted: true });
  });
}
