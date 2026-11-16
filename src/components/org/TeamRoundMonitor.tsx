"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startOrgPolling } from "@/lib/client/orgPolling";
import {
  ATTENTION_LABEL,
  PHASE_LABEL,
  byAttention,
  parseTeamRoster,
  readErrorMessage,
  scheduledPhase,
  submitDeadline,
  summarize,
  teamView,
  trackPending,
  type MonitorSchedule,
  type MonitorTeam,
  type TeamView,
} from "@/lib/teamMonitor";

/** One staff read per interval, after the previous one completes, only while visible. */
export const MONITOR_POLL_MS = 15_000;
const READ_TIMEOUT_MS = 10_000;
const CLOCK_MS = 5_000;

const button =
  "rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50";
const STAGE_LABEL: Record<TeamView["stage"], string> = {
  choosing: "Choosing parts",
  working: "Working",
  awaiting: "Awaiting result",
  judged: "Judged",
};

function age(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s} s ago` : `${Math.floor(s / 60)} min ago`;
}

function ResultCell({ view }: { view: TeamView }) {
  const r = view.team.last_result;
  if (!r)
    return (
      <span className="text-slate-500">
        {view.stage === "awaiting"
          ? "No result for this revision yet"
          : "None yet"}
      </span>
    );
  const current = r.revision === view.team.submitted_revision;
  return (
    <div>
      <span className="font-medium">
        {r.integration_verdict ?? r.verdict ?? "No verdict"}
      </span>
      <span className="text-slate-600">
        {" "}
        · {r.passed_count}/{r.total_count} checks
      </span>
      {!current && (
        <div className="text-xs text-slate-500">From revision {r.revision}</div>
      )}
      {r.notOwnCode.length > 0 && (
        <div className="text-xs text-amber-800">
          Not the team&apos;s own code: {r.notOwnCode.join(", ")}
        </div>
      )}
      {r.project_failure && (
        <div className="text-xs text-red-800">Project build failed</div>
      )}
    </div>
  );
}

export function TeamRoundMonitor({
  base,
  schedule,
}: {
  base: string;
  schedule: MonitorSchedule;
}) {
  const [teams, setTeams] = useState<MonitorTeam[] | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [readMs, setReadMs] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [reading, setReading] = useState(false);
  const [manual, setManual] = useState(false);
  const pending = useRef(
    new Map<string, { revision: number; since: number }>(),
  );
  const controller = useRef<AbortController | null>(null);
  const flight = useRef(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (flight.current) return;
    flight.current = true;
    setReading(true);
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), READ_TIMEOUT_MS);
    const started = performance.now();
    try {
      const response = await fetch(`${base}/teams`, {
        cache: "no-store",
        signal: abort.signal,
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String(data.error)
            : "";
        throw new Error(
          message || `Team roster read failed (${response.status}).`,
        );
      }
      const roster = parseTeamRoster(data);
      if (!mounted.current) return;
      const at = Date.now();
      pending.current = trackPending(pending.current, roster, at);
      setTeams(roster);
      setUpdatedAt(at);
      setNow(at);
      setReadMs(Math.round(performance.now() - started));
      setError("");
    } catch (e) {
      if (!mounted.current) return;
      setError(readErrorMessage(e, abort.signal.aborted));
      return false;
    } finally {
      clearTimeout(timer);
      if (controller.current === abort) controller.current = null;
      flight.current = false;
      if (mounted.current) setReading(false);
    }
  }, [base]);

  useEffect(() => {
    mounted.current = true;
    const stop = startOrgPolling(load, MONITOR_POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => {
      mounted.current = false;
      // A read aborted here must not block the next mount's first read.
      flight.current = false;
      stop();
      clearInterval(clock);
      controller.current?.abort();
    };
  }, [load]);

  const phase = scheduledPhase(schedule, now);
  const deadline = submitDeadline(schedule);
  const views = useMemo(
    () =>
      (teams ?? [])
        .map((t) =>
          teamView(t, phase, deadline, now, pending.current.get(t.uid)?.since),
        )
        .sort(byAttention),
    [teams, phase, deadline, now],
  );
  const summary = useMemo(() => summarize(views), [views]);
  const shown = onlyAttention ? views.filter((v) => v.attention.length) : views;
  const stale = updatedAt !== null && now - updatedAt > 3 * MONITOR_POLL_MS;

  return (
    <section
      aria-label="Live team monitor"
      className="space-y-3 rounded border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Live monitor</h3>
          <p className="text-sm text-slate-600">
            Read-only. Refreshes every {MONITOR_POLL_MS / 1000} seconds while
            this tab is visible. Scheduled phase:{" "}
            <span className="font-medium text-slate-900">
              {PHASE_LABEL[phase]}
            </span>
            . Teams whose members are all ready can lock earlier; ready flags
            are not shown here.
          </p>
        </div>
        {/* Stays enabled during background reads so keyboard focus is never lost;
            the in-flight guard makes an extra click harmless. */}
        <button
          type="button"
          className={button}
          onClick={() => {
            setManual(true);
            void load().finally(() => {
              if (mounted.current) setManual(false);
            });
          }}
        >
          {manual ? "Reading…" : "Refresh now"}
        </button>
      </div>

      <p className="text-xs text-slate-500">
        {updatedAt === null
          ? reading
            ? "Reading team roster…"
            : "No roster read yet."
          : `Updated ${age(now - updatedAt)}${readMs !== null ? ` · read took ${readMs} ms` : ""}`}
      </p>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">
          {error}
          {teams !== null && " Showing the last successful read."}
        </p>
      )}
      {stale && !error && (
        <p role="status" className="rounded bg-amber-50 p-3 text-sm">
          This data is over {(3 * MONITOR_POLL_MS) / 1000} seconds old. Keep
          this tab visible to refresh it.
        </p>
      )}

      {teams !== null && (
        <>
          <dl className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["Teams", String(summary.teams)],
              ["Parts claimed", `${summary.claimed}/${summary.members}`],
              [
                "Submitted",
                `${summary.submitted}/${summary.teams} (vote ${summary.byVote} · deadline ${summary.byDeadline})`,
              ],
              ["Judged", `${summary.judged}/${summary.submitted}`],
              ["Needs attention", String(summary.attention)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded border border-slate-200 bg-slate-50 p-3"
              >
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyAttention}
              onChange={(e) => setOnlyAttention(e.target.checked)}
            />
            Show only teams needing attention ({summary.attention})
          </label>

          {shown.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              {views.length === 0
                ? "No teams in this round yet."
                : "No team needs attention right now."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table
                aria-label="Live team status"
                className="w-full min-w-[860px] text-sm"
              >
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">
                      Team
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Stage
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Parts
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Approvals
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Submission
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Latest result
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.map((view) => {
                    const t = view.team;
                    return (
                      <tr key={t.uid} className="align-top">
                        <td className="px-4 py-2.5">
                          <div className="break-words font-medium">
                            #{t.number} {t.name}
                          </div>
                          {view.attention.map((a) => (
                            <div
                              key={a}
                              className="mt-1 inline-block rounded bg-red-50 px-2 py-0.5 text-xs text-red-800"
                            >
                              {ATTENTION_LABEL[a]}
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-2.5">
                          {STAGE_LABEL[view.stage]}
                        </td>
                        <td className="px-4 py-2.5">
                          <div>
                            {view.claimed}/{t.members.length} claimed
                          </div>
                          <ul className="text-xs text-slate-600">
                            {t.members.map((m) => (
                              <li key={m.user_uid} className="break-words">
                                {m.display_name}: {m.part_label ?? "not chosen"}
                                {m.assigned_by === "auto" && " (auto)"}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-2.5">
                          {t.votes}/{t.members.length} on revision {t.revision}
                        </td>
                        <td className="px-4 py-2.5">
                          {t.submitted_revision === null
                            ? "Not submitted"
                            : t.submitted_by === "deadline"
                              ? `Revision ${t.submitted_revision} auto-submitted at the deadline`
                              : `Revision ${t.submitted_revision} submitted by team vote`}
                        </td>
                        <td className="px-4 py-2.5">
                          <ResultCell view={view} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
