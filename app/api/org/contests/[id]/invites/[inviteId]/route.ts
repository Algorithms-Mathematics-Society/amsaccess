import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireOrgUser } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: { id: string; inviteId: string } }) {
  return withApiLogging("org.contest_invites.delete", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-invite-delete", params.inviteId]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error === "UNAUTHORIZED") return apiError("Sign in required.", 401, "UNAUTHORIZED");
    if (auth.error) return apiError("Organization access required.", auth.error === "ORG_REQUIRED" ? 404 : 500, auth.error === "ORG_REQUIRED" ? "NOT_FOUND" : "SERVER_ERROR");

    const { error } = await auth.supabase
      .from("contest_invites")
      .delete()
      .eq("id", params.inviteId)
      .eq("contest_id", params.id);

    if (error) return apiError("Unable to remove invite.", 500, "SERVER_ERROR");
    return apiOk({ deleted: true });
  });
}
