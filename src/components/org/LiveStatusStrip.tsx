"use client";

import { Megaphone, RefreshCw } from "lucide-react";
import { useOrgNotifications } from "@/lib/client/useOrgNotifications";
import { useNow } from "@/components/org/dashboard/useClock";
import { countWaitingOnStaff } from "@/lib/client/issuesInbox";

type Target = "invigilation" | "submissions" | "judging";

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Pending re-entries and unresolved help requests, from the shared notification store. */
export function useWaitingOnStaff(contestUid: string, enabled: boolean) {
  const feed = useOrgNotifications(contestUid, enabled);
  return { feed, ...countWaitingOnStaff(feed.raw) };
}

/** Its own component so feed refreshes re-render the badge, not the whole console. */
export function WaitingOnStaffBadge({
  contestUid,
  enabled,
}: {
  contestUid: string;
  enabled: boolean;
}) {
  const { waiting, openHelp } = useWaitingOnStaff(contestUid, enabled);
  if (waiting + openHelp === 0) return null;
  return (
    <span className="ml-2 rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700">
      {waiting + openHelp}
      <span className="sr-only"> waiting on staff</span>
    </span>
  );
}

function endTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * What an organizer needs at a glance while a contest runs: time left, who is
 * in the room, who is waiting on staff, and whether judging keeps up.
 *
 * Reads the same notification store the drawer already polls, so it adds no
 * requests of its own.
 */
export function LiveStatusStrip({
  contestUid,
  startsAt,
  endsAt,
  isPractice,
  notificationsEnabled,
  judgingPending,
  judgingEnabled,
  onNavigate,
  onAnnounce,
  onRefresh,
}: {
  contestUid: string;
  startsAt: string;
  endsAt: string;
  isPractice: boolean;
  notificationsEnabled: boolean;
  judgingPending: number | null;
  judgingEnabled: boolean;
  onNavigate: (tab: Target) => void;
  onAnnounce?: () => void;
  onRefresh: () => void;
}) {
  const now = useNow(1000);
  const { feed, waiting, openHelp } = useWaitingOnStaff(
    contestUid,
    notificationsEnabled,
  );
  const { sessions } = feed.raw;
  const sitting = sessions.filter(
    (s) => s.status === "active" || s.status === "pending",
  ).length;
  const started = new Date(startsAt).getTime() <= now;
  const remaining = new Date(endsAt).getTime() - now;
  const loaded = !feed.loading;
  const ago =
    feed.updatedAt === null
      ? null
      : Math.max(0, Math.round((now - feed.updatedAt) / 1000));

  const cell = "min-w-0 px-4 py-2.5 text-left";
  const button = `${cell} enabled:transition enabled:hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-600`;
  const label = "block text-xs text-slate-500";
  const value =
    "mt-0.5 block text-lg font-semibold tabular-nums text-slate-950";
  const unknown = notificationsEnabled ? (loaded ? null : "…") : "—";
  const action =
    "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-violet-600";

  return (
    <section aria-label="Live contest status">
      <div className="grid grid-cols-2 divide-slate-200 overflow-hidden rounded-xl border border-slate-200 sm:grid-cols-5 sm:divide-x">
        <div className={cell}>
          {isPractice ? (
            <>
              <span className={label}>Contest window</span>
              <span className={value}>Untimed</span>
            </>
          ) : (
            <>
              <span className={label}>
                {started ? "Time left" : "Starts in"}
              </span>
              <span className={`${value} font-mono`}>
                {clock(
                  started ? remaining : new Date(startsAt).getTime() - now,
                )}
              </span>
              <span className="block text-xs text-slate-500">
                Ends {endTime(endsAt)}
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          disabled={!notificationsEnabled}
          onClick={() => onNavigate("invigilation")}
          className={button}
        >
          <span className={label}>In the room</span>
          <span className={value}>{unknown ?? sitting}</span>
          <span className="block text-xs text-slate-500">
            {unknown ? " " : `${sessions.length} started`}
          </span>
        </button>
        <button
          type="button"
          disabled={!notificationsEnabled}
          onClick={() => onNavigate("invigilation")}
          className={`${button} ${waiting > 0 ? "bg-red-50 hover:bg-red-100" : ""}`}
        >
          <span className={`${label} ${waiting > 0 ? "text-red-700" : ""}`}>
            Waiting to re-enter
          </span>
          <span className={`${value} ${waiting > 0 ? "text-red-700" : ""}`}>
            {unknown ?? waiting}
          </span>
        </button>
        <button
          type="button"
          disabled={!notificationsEnabled}
          onClick={() => onNavigate("invigilation")}
          className={`${button} ${openHelp > 0 ? "bg-amber-50 hover:bg-amber-100" : ""}`}
        >
          <span className={`${label} ${openHelp > 0 ? "text-amber-800" : ""}`}>
            Help requests open
          </span>
          <span className={`${value} ${openHelp > 0 ? "text-amber-800" : ""}`}>
            {unknown ?? openHelp}
          </span>
        </button>
        <button
          type="button"
          disabled={!judgingEnabled}
          onClick={() => onNavigate("submissions")}
          className={button}
        >
          <span className={label}>Waiting to be judged</span>
          <span className={value}>
            {judgingEnabled ? (judgingPending ?? "…") : "—"}
          </span>
          {judgingEnabled && (
            <span className="block text-xs text-slate-500">
              Open submissions
            </span>
          )}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <p className="text-xs text-slate-500">
          {!notificationsEnabled ? (
            "Room and issue counts require contest staff access."
          ) : feed.errors.length > 0 ? (
            <span role="status" className="text-amber-800">
              Live updates are failing. Counts may be out of date.
            </span>
          ) : (
            ago !== null && `Live · updated ${ago}s ago`
          )}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {onAnnounce && (
            <button type="button" className={action} onClick={onAnnounce}>
              <Megaphone aria-hidden className="h-4 w-4" /> Issue announcement
            </button>
          )}
          {notificationsEnabled && (
            <button
              type="button"
              className={action}
              onClick={() => onNavigate("judging")}
            >
              Open judging
            </button>
          )}
          <button type="button" className={action} onClick={onRefresh}>
            <RefreshCw aria-hidden className="h-4 w-4" /> Refresh status
          </button>
        </div>
      </div>
    </section>
  );
}
