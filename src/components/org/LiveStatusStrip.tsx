"use client";

import { useOrgNotifications } from "@/lib/client/useOrgNotifications";
import { useNow } from "@/components/org/dashboard/useClock";

type Target = "invigilation" | "submissions";

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Pending re-entries and unresolved help requests, from the shared notification store. */
function useWaitingOnStaff(contestUid: string, enabled: boolean) {
  const feed = useOrgNotifications(contestUid, enabled);
  return {
    feed,
    waiting: feed.raw.resumes.filter((r) => r.status === "pending").length,
    openHelp: feed.raw.incidents.filter((i) => i.status !== "resolved").length,
  };
}

/** Its own component so feed refreshes re-render the badge, not the whole console. */
export function WaitingOnStaffBadge({ contestUid, enabled }: { contestUid: string; enabled: boolean }) {
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
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
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
  notificationsEnabled,
  judgingPending,
  onNavigate,
}: {
  contestUid: string;
  startsAt: string;
  endsAt: string;
  notificationsEnabled: boolean;
  judgingPending: number | null;
  onNavigate: (tab: Target) => void;
}) {
  const now = useNow(1000);
  const { feed, waiting, openHelp } = useWaitingOnStaff(contestUid, notificationsEnabled);
  const { sessions } = feed.raw;
  const sitting = sessions.filter((s) => s.status === "active" || s.status === "pending").length;
  const started = new Date(startsAt).getTime() <= now;
  const remaining = new Date(endsAt).getTime() - now;
  const loaded = !feed.loading;
  const ago = feed.updatedAt === null ? null : Math.max(0, Math.round((now - feed.updatedAt) / 1000));

  const cell = "min-w-0 px-4 py-2.5 text-left";
  const button = `${cell} transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-600`;
  const label = "block text-xs text-slate-500";
  const value = "mt-0.5 block text-lg font-semibold tabular-nums text-slate-950";
  const unknown = notificationsEnabled ? (loaded ? null : "…") : "—";

  return (
    <section aria-label="Live contest status" className="mt-4">
      <div className="grid grid-cols-2 divide-slate-200 overflow-hidden rounded-xl border border-slate-200 sm:grid-cols-5 sm:divide-x">
        <div className={cell}>
          <span className={label}>{started ? "Time left" : "Starts in"}</span>
          <span className={`${value} font-mono`}>
            {clock(started ? remaining : new Date(startsAt).getTime() - now)}
          </span>
          <span className="block text-xs text-slate-500">Ends {endTime(endsAt)}</span>
        </div>
        <button type="button" onClick={() => onNavigate("invigilation")} className={button}>
          <span className={label}>In the room</span>
          <span className={value}>{unknown ?? sitting}</span>
          <span className="block text-xs text-slate-500">{unknown ? " " : `${sessions.length} started`}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate("invigilation")}
          className={`${button} ${waiting > 0 ? "bg-red-50 hover:bg-red-100" : ""}`}
        >
          <span className={`${label} ${waiting > 0 ? "text-red-700" : ""}`}>Waiting to re-enter</span>
          <span className={`${value} ${waiting > 0 ? "text-red-700" : ""}`}>{unknown ?? waiting}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate("invigilation")}
          className={`${button} ${openHelp > 0 ? "bg-amber-50 hover:bg-amber-100" : ""}`}
        >
          <span className={`${label} ${openHelp > 0 ? "text-amber-800" : ""}`}>Help requests open</span>
          <span className={`${value} ${openHelp > 0 ? "text-amber-800" : ""}`}>{unknown ?? openHelp}</span>
        </button>
        <button type="button" onClick={() => onNavigate("submissions")} className={button}>
          <span className={label}>Waiting to be judged</span>
          <span className={value}>{judgingPending ?? "…"}</span>
          <span className="block text-xs text-slate-500">Open submissions</span>
        </button>
      </div>
      <p role="status" className="mt-1.5 min-h-4 text-xs text-slate-500">
        {!notificationsEnabled
          ? "Re-entry and help counts are shown to contest staff roles. Ask an admin if you need them."
          : feed.errors.length > 0
            ? <span className="text-amber-800">Live updates are failing; retrying. Counts may be out of date{ago !== null ? ` (last update ${ago}s ago)` : ""}.</span>
            : ago !== null && `Live · updated ${ago}s ago`}
      </p>
    </section>
  );
}
