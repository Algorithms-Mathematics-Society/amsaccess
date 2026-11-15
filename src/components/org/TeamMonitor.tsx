"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { startOrgPolling } from "@/lib/client/orgPolling";
import { useOrgNotifications } from "@/lib/client/useOrgNotifications";
import { useNow } from "@/components/org/dashboard/useClock";
import {
  onlineUsers, phaseOf, teamState, voiceKey, voicePresence,
  type MonitorRound, type MonitorTeam, type Phase, type VoiceEvent,
} from "@/lib/teamMonitor";

type BoardTeam = { uid: string; rank: number; score: number; integration_passed: boolean };
type Feed = { round: MonitorRound | null; teams: MonitorTeam[]; board: BoardTeam[] | null; voice: VoiceEvent[] | null };

const POLL_MS = 10_000;
const PHASE_LABEL: Record<Phase, string> = {
  drawn: "Teams drawn, not published",
  waiting: "Published · lobby not open yet",
  discussion: "Discussion",
  choosing: "Choosing parts",
  building: "Building and voting",
  closed: "Deadline passed",
};
const TONE = {
  ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  bad: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-300",
};

async function get<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { cache: "no-store", signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status}).`);
  return data as T;
}

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Live, read-only view of a team round built only on existing endpoints:
 * the round, the teams, the team board and the voice log, plus the session
 * roster the console already polls (staff roles only).
 */
export function TeamMonitor({ contestUid, startsAt, endsAt, notificationsEnabled }: { contestUid: string; startsAt: string; endsAt: string; notificationsEnabled: boolean }) {
  const sessionFeed = useOrgNotifications(contestUid, notificationsEnabled);
  const sessions = notificationsEnabled && !sessionFeed.loading ? sessionFeed.raw.sessions : null;
  const base = `/api/org/contests/${encodeURIComponent(contestUid)}`;
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "attention" | "submitted">("all");
  const [open, setOpen] = useState<string | null>(null);
  const now = useNow(1000);

  const load = useCallback(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const [round, teams, board, voice] = await Promise.allSettled([
        get<MonitorRound>(`${base}/team-round`, controller.signal),
        get<MonitorTeam[]>(`${base}/team-round/teams`, controller.signal),
        get<{ teams: BoardTeam[] }>(`${base}/team-round/board`, controller.signal),
        // shortcut: the voice log returns every event of the round; add a `since` cursor to ams-api if rounds get long.
        get<VoiceEvent[]>(`${base}/team-round/voice-events`, controller.signal),
      ]);
      if (round.status === "rejected" || teams.status === "rejected") {
        const reason = (round.status === "rejected" ? round.reason : teams.status === "rejected" ? teams.reason : null) as Error | null;
        setError(reason?.message ?? "Could not load the team round.");
        return;
      }
      setFeed((previous) => ({
        round: round.value,
        teams: teams.value,
        // Optional feeds keep their last good value when one read fails.
        board: board.status === "fulfilled" ? board.value.teams : previous?.board ?? null,
        voice: voice.status === "fulfilled" ? voice.value : previous?.voice ?? null,
      }));
      setError("");
      setUpdatedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the team round.");
    } finally {
      clearTimeout(timer);
    }
  }, [base]);

  useEffect(() => startOrgPolling(load, POLL_MS), [load]);

  const view = useMemo(() => {
    if (!feed?.round) return null;
    const round = feed.round;
    const phase = phaseOf(round, now, startsAt, endsAt);
    const online = sessions ? onlineUsers(sessions) : null;
    const voice = feed.voice ? voicePresence(feed.voice) : null;
    const board = new Map((feed.board ?? []).map((b) => [b.uid, b]));
    const rows = feed.teams.map((team) => {
      const onlineCount = online ? team.members.filter((m) => online.has(m.user_uid)).length : team.members.length;
      const voiceCount = voice ? team.members.filter((m) => voice.has(voiceKey(team.name, m.username))).length : null;
      return { team, onlineCount, voiceCount, state: teamState(team, phase, round.team_size, onlineCount), standing: board.get(team.uid) ?? null };
    });
    const opens = round.selection_opens_at ? Date.parse(round.selection_opens_at) : Date.parse(startsAt);
    const nextAt =
      phase === "waiting" ? { label: "Lobby opens in", at: opens }
      : phase === "discussion" ? { label: "Choosing opens in", at: opens + round.discussion_seconds * 1000 }
      : phase === "choosing" && round.allocation_locks_at ? { label: "Parts lock in", at: Date.parse(round.allocation_locks_at) }
      : phase === "building" ? { label: "Deadline in", at: Date.parse(round.submit_deadline ?? endsAt) }
      : null;
    return { round, phase, rows, online, voice, nextAt };
  }, [feed, sessions, now, startsAt, endsAt]);

  if (!feed) {
    return error
      ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      : <p className="text-sm text-slate-500">Loading team monitor…</p>;
  }
  if (!view) return null;

  const { round, phase, rows, online, voice, nextAt } = view;
  const total = rows.length;
  const membersTotal = rows.reduce((n, r) => n + r.team.members.length, 0);
  const tiles = [
    { label: "Teams", value: `${total}`, sub: `${round.team_size} per team` },
    { label: "Fully online", value: online ? `${rows.filter((r) => r.onlineCount === r.team.members.length).length}/${total}` : "—", sub: online ? `${membersTotal - rows.reduce((n, r) => n + r.onlineCount, 0)} members offline` : "Session feed unavailable", bad: online !== null && rows.some((r) => r.onlineCount < r.team.members.length) },
    { label: "All parts chosen", value: `${rows.filter((r) => r.team.members.every((m) => m.part_label)).length}/${total}`, sub: `${rows.reduce((n, r) => n + r.team.members.filter((m) => m.assigned_by === "auto").length, 0)} auto-assigned` },
    { label: "In voice", value: voice ? `${rows.reduce((n, r) => n + (r.voiceCount ?? 0), 0)}/${membersTotal}` : "—", sub: voice ? "members connected" : "Voice log unavailable" },
    { label: "Submitted", value: `${rows.filter((r) => r.team.submitted_revision !== null).length}/${total}`, sub: `${rows.filter((r) => r.state.needsAttention).length} need attention` },
  ];
  const shown = rows.filter((r) => filter === "all" || (filter === "attention" ? r.state.needsAttention : r.team.submitted_revision !== null));
  const ago = updatedAt === null ? null : Math.max(0, Math.round((now - updatedAt) / 1000));

  return (
    <section aria-labelledby="team-monitor" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="team-monitor" className="text-lg font-semibold text-slate-950">Live teams</h2>
        <span className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-800">{PHASE_LABEL[phase]}</span>
        {nextAt && Number.isFinite(nextAt.at) && (
          <span className="text-sm text-slate-600">{nextAt.label} <span className="font-mono tabular-nums text-slate-950">{countdown(nextAt.at - now)}</span></span>
        )}
        <span className="ml-auto text-xs text-slate-500">
          Drawn {when(round.seeded_at)} · Published {when(round.published_at)}{round.allocation_locked_at ? ` · Parts locked ${when(round.allocation_locked_at)}` : ""}
        </span>
      </div>

      <p role="status" className="min-h-4 text-xs text-slate-500">
        {error ? <span className="text-amber-800">Refresh failed: {error} Showing the last data{ago !== null ? ` from ${ago}s ago` : ""}.</span> : ago !== null && `Updates every 10 s · last ${ago}s ago`}
      </p>

      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-5 sm:divide-x sm:divide-slate-200">
        {tiles.map((tile) => (
          <div key={tile.label} className={`px-4 py-3 ${tile.bad ? "bg-red-50" : ""}`}>
            <p className={`text-xs ${tile.bad ? "text-red-700" : "text-slate-500"}`}>{tile.label}</p>
            <p className={`mt-0.5 text-lg font-semibold tabular-nums ${tile.bad ? "text-red-700" : "text-slate-950"}`}>{tile.value}</p>
            <p className="text-xs text-slate-500">{tile.sub}</p>
          </div>
        ))}
      </div>

      <div role="group" aria-label="Filter teams" className="flex flex-wrap gap-2">
        {([["all", `All ${total}`], ["attention", `Needs attention ${rows.filter((r) => r.state.needsAttention).length}`], ["submitted", `Submitted ${rows.filter((r) => r.team.submitted_revision !== null).length}`]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`rounded-full border bg-white px-3 py-1 text-xs ${filter === key ? "border-slate-900 font-semibold text-slate-950" : "border-slate-300 text-slate-700 hover:border-slate-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th scope="col" className="px-4 py-2 font-medium">Team</th>
              <th scope="col" className="px-2 py-2 font-medium">Members and parts</th>
              <th scope="col" className="px-2 py-2 font-medium">Online</th>
              <th scope="col" className="px-2 py-2 font-medium">Voice</th>
              <th scope="col" className="px-2 py-2 font-medium">Standing</th>
              <th scope="col" className="px-2 py-2 font-medium">Status</th>
              <th scope="col" className="px-4 py-2"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ team, onlineCount, voiceCount, state, standing }) => (
              <Fragment key={team.uid}>
                <tr className="border-b border-slate-100 align-top">
                  <td className="px-4 py-2.5 font-medium text-slate-950">{team.name}</td>
                  <td className="px-2 py-2.5">
                    <ul className="flex flex-wrap gap-1.5">
                      {team.members.map((m) => (
                        <li key={m.user_uid} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-700">
                          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${online && !online.has(m.user_uid) ? "bg-red-600" : "bg-emerald-600"}`} />
                          {m.display_name}
                          <span className="font-mono text-slate-500">{m.part_label ?? "·"}{m.assigned_by === "auto" ? "*" : ""}</span>
                          {online && !online.has(m.user_uid) && <span className="sr-only"> (offline)</span>}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className={`px-2 py-2.5 tabular-nums ${online && onlineCount < team.members.length ? "font-semibold text-red-700" : "text-slate-700"}`}>{online ? `${onlineCount}/${team.members.length}` : "—"}</td>
                  <td className="px-2 py-2.5 tabular-nums text-slate-700">{voiceCount === null ? "—" : `${voiceCount}/${team.members.length}`}</td>
                  <td className="px-2 py-2.5 tabular-nums text-slate-700">{standing ? `#${standing.rank} · ${standing.score}` : "—"}</td>
                  <td className="px-2 py-2.5"><span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[state.tone]}`}>{state.label}</span></td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      aria-expanded={open === team.uid}
                      onClick={() => setOpen(open === team.uid ? null : team.uid)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      {open === team.uid ? "Hide" : "Details"}<span className="sr-only"> for {team.name}</span>
                    </button>
                  </td>
                </tr>
                {open === team.uid && (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={7} className="px-4 py-3">
                      <dl className="grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-3">
                        <div><dt className="inline font-medium text-slate-800">Revision </dt><dd className="inline">{team.revision} · votes {team.votes}/{team.members.length}</dd></div>
                        <div><dt className="inline font-medium text-slate-800">Submitted </dt><dd className="inline">{team.submitted_revision === null ? "not yet" : `rev ${team.submitted_revision} by ${team.submitted_by}`}</dd></div>
                        <div><dt className="inline font-medium text-slate-800">Last integration </dt><dd className="inline">{team.last_result ? `rev ${team.last_result.revision} · ${team.last_result.verdict ?? "—"} · ${team.last_result.passed_count ?? 0}/${team.last_result.total_count ?? 0} tests` : "none yet"}</dd></div>
                      </dl>
                      <table className="mt-3 w-full text-xs">
                        <thead><tr className="text-left text-slate-500"><th scope="col" className="py-1 font-medium">Member</th><th scope="col" className="py-1 font-medium">Seed rank</th><th scope="col" className="py-1 font-medium">Part</th><th scope="col" className="py-1 font-medium">Online</th><th scope="col" className="py-1 font-medium">Voice</th></tr></thead>
                        <tbody>
                          {team.members.map((m) => (
                            <tr key={m.user_uid} className="border-t border-slate-200">
                              <td className="py-1 text-slate-900">{m.display_name} <span className="text-slate-500">@{m.username}</span></td>
                              <td className="py-1 tabular-nums">{m.seed_rank}</td>
                              <td className="py-1">{m.part_label ? `${m.part_label}${m.assigned_by === "auto" ? " (auto-assigned)" : " (chose)"}` : "not chosen"}</td>
                              <td className="py-1">{online ? (online.has(m.user_uid) ? "online" : "offline") : "—"}</td>
                              <td className="py-1">{voice ? (voice.has(voiceKey(team.name, m.username)) ? "in channel" : "not connected") : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">{total === 0 ? "No teams drawn yet. Use Draw teams below." : "No teams match this filter."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">* auto-assigned at the part lock. Online means an active session seen in the last 2 minutes.</p>
    </section>
  );
}
