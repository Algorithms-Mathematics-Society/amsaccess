import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { parsePositiveInt } from "@/lib/server/request";
import { requireAdmin } from "@/lib/server/supabase";
import type { ProctorEvent, Session } from "@/lib/types";

export const dynamic = "force-dynamic";

function cleanSearch(value: string | null) {
  return (value ?? "").trim().replace(/[,%()]/g, "").slice(0, 120);
}

export async function GET(request: NextRequest) {
  return withApiLogging("admin.sessions.list", async () => {
    const limited = checkRequestRateLimit(request, "privateRead", ["admin-sessions"]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireAdmin();
    if (auth.error === "UNAUTHORIZED") return apiError("Sign in required.", 401, "UNAUTHORIZED");
    if (auth.error === "FORBIDDEN") return apiError("Admin access required.", 403, "FORBIDDEN");

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1, 10_000);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 25, 50);
    const search = cleanSearch(searchParams.get("q"));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = auth.supabase
      .from("sessions")
      .select("id, assessment_id, candidate_name, candidate_email, started_at, submitted_at, status, risk_score, user_agent", { count: "exact" })
      .order("started_at", { ascending: false })
      .range(from, to);

    if (search) {
      query = query.or(`candidate_name.ilike.%${search}%,candidate_email.ilike.%${search}%`);
    }

    const { data: sessionData, error: sessionError, count } = await query;
    if (sessionError) return apiError("Unable to load sessions.", 500, "SERVER_ERROR");

    const sessions = (sessionData ?? []) as Session[];
    const ids = sessions.map((session) => session.id);
    const eventCounts = new Map<string, { events: number; fullscreenExits: number; tabSwitches: number }>();

    if (ids.length) {
      const { data: eventData, error: eventError } = await auth.supabase
        .from("proctor_events")
        .select("session_id, event_type")
        .in("session_id", ids);

      if (eventError) return apiError("Unable to load session event summaries.", 500, "SERVER_ERROR");

      ((eventData ?? []) as Pick<ProctorEvent, "session_id" | "event_type">[]).forEach((event) => {
        const current = eventCounts.get(event.session_id) ?? { events: 0, fullscreenExits: 0, tabSwitches: 0 };
        current.events += 1;
        if (event.event_type === "FULLSCREEN_EXIT") current.fullscreenExits += 1;
        if (event.event_type === "TAB_HIDDEN") current.tabSwitches += 1;
        eventCounts.set(event.session_id, current);
      });
    }

    return apiOk({
      sessions: sessions.map((session) => ({
        ...session,
        eventSummary: eventCounts.get(session.id) ?? { events: 0, fullscreenExits: 0, tabSwitches: 0 }
      })),
      page,
      pageSize,
      total: count ?? sessions.length
    });
  });
}
