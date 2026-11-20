"use client";

import { useEffect, useState } from "react";
import { useContestRead } from "@/lib/client/useContestRead";
import { reportOrgResponse, startOrgPolling } from "@/lib/client/orgPolling";
import { useOrgNotifications } from "@/lib/client/useOrgNotifications";
import { formatWhen } from "@/lib/orgTypes";
import type { ProblemStat } from "./AnalyticsPanel";
import type { AnnouncementRecord } from "./IssueAnnouncementModal";

const OVERVIEW_POLL_MS = 30_000;
const card = "min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5";

function ProblemPulse() {
  const { data, error, load } = useContestRead<{ problems: ProblemStat[] }>(
    "analytics",
  );
  useEffect(() => startOrgPolling(load, OVERVIEW_POLL_MS), [load]);

  return (
    <section aria-label="Problem pulse" className={card}>
      <h2 className="text-base font-semibold text-slate-950">Problem pulse</h2>
      {error && data && (
        <p role="status" className="mt-2 text-sm text-amber-800">
          Showing the last counts. Retrying automatically.
        </p>
      )}
      {!Array.isArray(data?.problems) ? (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {error ||
            (data
              ? "Problem counts are unavailable."
              : "Loading problem counts…")}
        </p>
      ) : data.problems.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No problem counts yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {data.problems.map((problem) => (
            <li key={problem.label} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="min-w-0 break-words text-sm font-medium text-slate-900">
                  <span className="mr-2 font-mono text-slate-600">
                    {problem.label}
                  </span>
                  {problem.title}
                </span>
                <span className="text-xs tabular-nums text-slate-600">
                  {problem.solved.toLocaleString()} solved ·{" "}
                  {problem.attempted.toLocaleString()} tried
                </span>
              </div>
              <div
                aria-hidden="true"
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className="h-full bg-emerald-600"
                  style={{
                    width: `${problem.attempted ? Math.min(100, (problem.solved / problem.attempted) * 100) : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StaffTimeline({
  contestUid,
  notificationsEnabled,
  announcementsEnabled,
}: {
  contestUid: string;
  notificationsEnabled: boolean;
  announcementsEnabled: boolean;
}) {
  const feed = useOrgNotifications(contestUid, notificationsEnabled);
  const [announcements, setAnnouncements] = useState<
    AnnouncementRecord[] | null
  >(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!announcementsEnabled) return;
    const lifetime = new AbortController();
    const stop = startOrgPolling(async () => {
      try {
        const response = await fetch(
          `/api/org/contests/${encodeURIComponent(contestUid)}/announcements`,
          {
            cache: "no-store",
            signal: AbortSignal.any([
              lifetime.signal,
              AbortSignal.timeout(12_000),
            ]),
          },
        );
        if (lifetime.signal.aborted) return;
        reportOrgResponse(response.status);
        if (response.status === 401 || response.status === 403)
          setAnnouncements(null);
        if (!response.ok) throw new Error("Announcements could not be read.");
        const data = (await response.json()) as {
          announcements?: AnnouncementRecord[];
        };
        if (lifetime.signal.aborted) return;
        if (!Array.isArray(data?.announcements))
          throw new Error("Invalid announcement feed.");
        setAnnouncements(data.announcements);
        setError(false);
      } catch {
        if (!lifetime.signal.aborted) setError(true);
        return false;
      }
    }, OVERVIEW_POLL_MS);
    return () => {
      stop();
      lifetime.abort();
    };
  }, [announcementsEnabled, contestUid]);

  const events = [
    ...(announcements ?? []).map((item) => ({
      id: `announcement:${item.uid}`,
      kind: "Announcement issued",
      detail: [item.title, item.issued_by].filter(Boolean).join(" · "),
      at: item.created_at,
    })),
    ...feed.raw.resumes.map((item) => ({
      id: `resume:${item.uid}`,
      kind: "Re-entry requested",
      detail: item.display_name || item.login_id,
      at: item.created_at,
    })),
    ...feed.raw.incidents.flatMap((item) => {
      const detail = item.display_name || item.login_id;
      const resolvedAt =
        "resolved_at" in item && typeof item.resolved_at === "string"
          ? item.resolved_at
          : null;
      return [
        {
          id: `incident:${item.uid}`,
          kind: "Help requested",
          detail,
          at: item.created_at,
        },
        ...(resolvedAt
          ? [
              {
                id: `resolved:${item.uid}`,
                kind: "Help request resolved",
                detail,
                at: resolvedAt,
              },
            ]
          : []),
      ];
    }),
  ]
    .filter((event) => Number.isFinite(Date.parse(event.at)))
    .sort(
      (a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id),
    )
    .slice(0, 8);
  const stale = (announcementsEnabled && error) || feed.errors.length > 0;
  const loading =
    (notificationsEnabled && feed.loading) ||
    (announcementsEnabled && !announcements && !error);

  return (
    <section aria-label="Staff timeline" className={card}>
      <h2 className="text-base font-semibold text-slate-950">Staff timeline</h2>
      {stale && (
        <p role="status" className="mt-2 text-sm text-amber-800">
          Some activity is unavailable. Retrying automatically.
        </p>
      )}
      {events.length > 0 ? (
        <ol className="mt-2 divide-y divide-slate-100">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {event.kind}
                </p>
                {event.detail && (
                  <p className="break-words text-xs text-slate-600">
                    {event.detail}
                  </p>
                )}
              </div>
              <time
                dateTime={event.at}
                className="text-xs tabular-nums text-slate-600"
              >
                {formatWhen(event.at)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {loading
            ? "Loading staff activity…"
            : stale
              ? "No activity could be confirmed."
              : "No announcements or participant requests yet."}
        </p>
      )}
    </section>
  );
}

export function ContestOverview({
  contestUid,
  pulseEnabled,
  timelineEnabled,
  announcementsEnabled,
}: {
  contestUid: string;
  pulseEnabled: boolean;
  timelineEnabled: boolean;
  announcementsEnabled: boolean;
}) {
  if (!pulseEnabled && !timelineEnabled && !announcementsEnabled)
    return (
      <p className="text-sm text-slate-600">
        Problem counts and staff activity require contest staff access.
      </p>
    );
  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      {pulseEnabled && <ProblemPulse />}
      {(timelineEnabled || announcementsEnabled) && (
        <StaffTimeline
          contestUid={contestUid}
          notificationsEnabled={timelineEnabled}
          announcementsEnabled={announcementsEnabled}
        />
      )}
    </div>
  );
}
