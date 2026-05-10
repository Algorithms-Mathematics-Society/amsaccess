import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { requireOrgUser } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

type ContestRow = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

export async function GET(request: NextRequest) {
  return withApiLogging("org.dashboard", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["org-dashboard"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error === "UNAUTHORIZED") return apiError("Sign in required.", 401, "UNAUTHORIZED");
    if (auth.error === "ORG_REQUIRED") return apiError("Organization setup required.", 404, "NOT_FOUND");
    if (auth.error) return apiError("Unable to load organization.", 500, "SERVER_ERROR");

    const { data: contestData, error: contestError } = await auth.supabase
      .from("contests")
      .select("id, title, description, start_at, end_at, status")
      .eq("org_id", auth.org.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (contestError) return apiError("Unable to load contests.", 500, "SERVER_ERROR");

    const contests = (contestData ?? []) as ContestRow[];
    const ids = contests.map((contest) => contest.id);
    const inviteCounts = new Map<string, number>();
    const questionCounts = new Map<string, number>();

    if (ids.length) {
      const [{ data: invites, error: inviteError }, { data: questions, error: questionError }] = await Promise.all([
        auth.supabase.from("contest_invites").select("contest_id").in("contest_id", ids).limit(10_000),
        auth.supabase.from("contest_questions").select("contest_id").in("contest_id", ids).limit(10_000)
      ]);

      if (inviteError || questionError) return apiError("Unable to load contest summaries.", 500, "SERVER_ERROR");

      (invites ?? []).forEach((row) => inviteCounts.set(row.contest_id, (inviteCounts.get(row.contest_id) ?? 0) + 1));
      (questions ?? []).forEach((row) => questionCounts.set(row.contest_id, (questionCounts.get(row.contest_id) ?? 0) + 1));
    }

    return apiOk({
      org: auth.org,
      contests: contests.map((contest) => ({
        ...contest,
        _invite_count: inviteCounts.get(contest.id) ?? 0,
        _question_count: questionCounts.get(contest.id) ?? 0
      }))
    });
  });
}
