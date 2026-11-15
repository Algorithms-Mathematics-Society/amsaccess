/** Pure helpers behind the live team monitor. Inputs are the shapes ams-api already returns. */

export type MonitorRound = {
  team_size: number;
  selection_opens_at: string | null;
  discussion_seconds: number;
  allocation_locks_at: string | null;
  allocation_locked_at: string | null;
  submit_deadline: string | null;
  seeded_at: string | null;
  published_at: string | null;
};
export type MonitorMember = { user_uid: string; username: string; display_name: string; seed_rank: number; part_label: string | null; assigned_by: string | null };
export type MonitorTeam = {
  uid: string; number: number; name: string; revision: number; votes: number;
  submitted_revision: number | null; submitted_by: string | null;
  members: MonitorMember[];
  /** The latest *completed* integration run; a newer submission may still be judging. */
  last_result: { revision: number; verdict: string | null; passed_count: number | null; total_count: number | null; substitutions?: unknown[] | null } | null;
};
export type VoiceEvent = { at: string; team: string; username: string; kind: string };
export type SessionLite = { user_uid: string | null; status: string; idle_seconds: number | null };

export type Phase = "drawn" | "waiting" | "discussion" | "choosing" | "building" | "closed";

const t = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

/** Null round times mean "contest start" / "contest end", as the API defines them. */
export function phaseOf(round: MonitorRound, now: number, startsAt: string, endsAt: string): Phase {
  if (!round.published_at) return "drawn";
  const opens = Number.isFinite(t(round.selection_opens_at)) ? t(round.selection_opens_at) : t(startsAt);
  const deadline = Number.isFinite(t(round.submit_deadline)) ? t(round.submit_deadline) : t(endsAt);
  if (now < opens) return "waiting";
  if (now < opens + round.discussion_seconds * 1000) return "discussion";
  if (now >= deadline) return "closed";
  if (round.allocation_locked_at || (Number.isFinite(t(round.allocation_locks_at)) && now >= t(round.allocation_locks_at))) return "building";
  return "choosing";
}

/** Who is in voice now: the latest event per team member wins. */
export function voicePresence(events: VoiceEvent[]): Set<string> {
  const inChannel = new Set<string>();
  for (const e of events) {
    const key = `${e.team}\u0000${e.username}`;
    if (e.kind === "leave" || e.kind === "closed") inChannel.delete(key);
    else inChannel.add(key); // join, mute, unmute all mean connected
  }
  return inChannel;
}
export const voiceKey = (team: string, username: string) => `${team}\u0000${username}`;

/** Online = an active session that has reported within two minutes. */
export function onlineUsers(sessions: SessionLite[]): Set<string> {
  return new Set(
    sessions
      .filter((s) => s.user_uid && (s.status === "active" || s.status === "pending") && s.idle_seconds !== null && s.idle_seconds < 120)
      .map((s) => s.user_uid as string),
  );
}

export type TeamState = { label: string; tone: "ok" | "warn" | "bad" | "neutral"; needsAttention: boolean };

export function teamState(team: MonitorTeam, phase: Phase, size: number, online: number): TeamState {
  const claimed = team.members.filter((m) => m.part_label).length;
  const missing = online < team.members.length;
  if (team.submitted_revision !== null) {
    const r = team.last_result;
    const prefix = `Submitted rev ${team.submitted_revision}${team.submitted_by === "deadline" ? " at deadline" : ""}`;
    if (!r || r.revision !== team.submitted_revision) return { label: `${prefix} · judging`, tone: "neutral", needsAttention: false };
    const passed = r.verdict === "AC" && !(r.substitutions && r.substitutions.length);
    return { label: `${prefix} · ${passed ? "passed" : r.verdict === "AC" ? "passed with stand-ins" : r.verdict ?? "failed"}`, tone: passed ? "ok" : "warn", needsAttention: false };
  }
  if (phase === "drawn") return { label: "Not published", tone: "neutral", needsAttention: false };
  if (phase === "waiting" || phase === "discussion") return { label: missing ? "Member not online" : phase === "waiting" ? "Waiting for lobby" : "Discussing", tone: missing ? "bad" : "neutral", needsAttention: missing };
  if (phase === "choosing") {
    if (missing) return { label: "Member not online", tone: "bad", needsAttention: true };
    return claimed >= size ? { label: "All parts chosen", tone: "ok", needsAttention: false } : { label: `${size - claimed} part${size - claimed === 1 ? "" : "s"} open`, tone: "warn", needsAttention: true };
  }
  if (phase === "building") {
    if (missing) return { label: "Member not online", tone: "bad", needsAttention: true };
    return team.votes > 0 ? { label: `Voting ${team.votes}/${team.members.length} on rev ${team.revision}`, tone: "neutral", needsAttention: false } : { label: team.revision > 0 ? `Working · rev ${team.revision}` : "Working · nothing submitted yet", tone: "neutral", needsAttention: false };
  }
  return { label: "Not submitted", tone: "bad", needsAttention: true };
}
