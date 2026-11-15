/**
 * Read-only team-round monitor model. Parses the staff `GET .../team-round/teams`
 * roster (ams-api `routes/teams.py::list_teams`) and derives what organizers watch
 * during a round. The API stays authoritative: phases here are the schedule, and
 * per-team early locks and ready flags are not part of this response.
 *
 * Only structural problems reject the roster. Display fields degrade instead,
 * because one odd name must never blank the monitor during a live round.
 */

export type MonitorMember = {
  user_uid: string;
  display_name: string;
  part_label: string | null;
  assigned_by: "claim" | "auto" | null;
};
export type MonitorResult = {
  revision: number;
  verdict: string | null;
  integration_verdict: string | null;
  passed_count: number;
  total_count: number;
  /** Parts not built from the team's own source: listed substitutions, fallbacks, or
   * parts the judge flagged. Any of them withholds integration credit; flagged parts
   * also earn no part credit (ams-api `team_board.compute`). */
  notOwnCode: string[];
  project_failure: boolean;
};
export type MonitorTeam = {
  uid: string;
  number: number;
  name: string;
  revision: number;
  votes: number;
  submitted_revision: number | null;
  submitted_by: "vote" | "deadline" | null;
  members: MonitorMember[];
  last_result: MonitorResult | null;
};
export type MonitorSchedule = {
  selection_opens_at: string | null;
  discussion_seconds: number;
  allocation_locks_at: string | null;
  allocation_locked_at: string | null;
  submit_deadline: string | null;
  contest_starts_at: string | null;
  contest_ends_at: string | null;
};
export type Phase =
  "unscheduled" | "waiting" | "discussion" | "choosing" | "locked";
export type Attention = "unassigned" | "unsubmitted" | "slow-result";
export type TeamView = {
  team: MonitorTeam;
  claimed: number;
  stage: "choosing" | "working" | "awaiting" | "judged";
  attention: Attention[];
};
export type MonitorSummary = {
  teams: number;
  members: number;
  claimed: number;
  submitted: number;
  byVote: number;
  byDeadline: number;
  judged: number;
  attention: number;
};

/** Teams per round are bounded far below this; larger means a wrong response. */
export const MAX_TEAMS = 2000;
/** A submitted revision without a completed result for this long needs a look. */
export const SLOW_RESULT_MS = 10 * 60_000;
/** The API allows teams of up to 20 (`team_size between 1 and 20`). */
export const MAX_TEAM_SIZE = 20;
/** The deadline sweeper runs every 30 s; do not flag a team before it has had a turn. */
export const DEADLINE_GRACE_MS = 60_000;

const UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const count = (v: unknown): v is number =>
  Number.isSafeInteger(v) && (v as number) >= 0;
const text = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const optionalText = (v: unknown, max: number): string | null =>
  text(v, max) ? v : null;
/** A display string, or the fallback when it is missing or blank. */
const label = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() ? v : fallback;
/** Python truthiness of a JSON value, as ams-api `team_board.substituted()` uses. */
const truthy = (v: unknown): boolean =>
  Array.isArray(v)
    ? v.length > 0
    : object(v)
      ? Object.keys(v).length > 0
      : Boolean(v);
const time = (v: string | null): number | null => {
  if (v === null) return null;
  const at = Date.parse(v);
  return Number.isFinite(at) ? at : null;
};

class RosterError extends Error {
  constructor(where: string) {
    super(
      `The team roster response was not recognised (${where}). Refresh, or report this.`,
    );
  }
}

function member(v: unknown, at: string): MonitorMember {
  // part_label decides the claimed count, so it stays structural.
  if (
    !object(v) ||
    !text(v.user_uid, 64) ||
    !(v.part_label === null || text(v.part_label, 256))
  )
    throw new RosterError(at);
  return {
    user_uid: v.user_uid,
    display_name: label(v.display_name, label(v.username, "(no name)")),
    part_label: v.part_label,
    assigned_by:
      v.assigned_by === "claim" || v.assigned_by === "auto" ? v.assigned_by : null,
  };
}

function result(v: unknown, at: string): MonitorResult | null {
  if (v === null) return null;
  if (!object(v) || !count(v.revision)) throw new RosterError(at);
  const substituted = new Set<string>();
  if (Array.isArray(v.substitutions))
    for (const sub of v.substitutions)
      if (object(sub) && text(sub.label, 256)) substituted.add(sub.label);
  if (object(v.fallbacks))
    for (const key of Object.keys(v.fallbacks)) substituted.add(key);
  if (object(v.parts))
    for (const [label, part] of Object.entries(v.parts))
      if (
        object(part) &&
        (truthy(part.substituted) ||
          (truthy(part.origin) && part.origin !== "submission"))
      )
        substituted.add(label);
  return {
    revision: v.revision,
    verdict: optionalText(v.verdict, 16),
    integration_verdict: optionalText(v.integration_verdict, 16),
    passed_count: count(v.passed_count) ? v.passed_count : 0,
    total_count: count(v.total_count) ? v.total_count : 0,
    notOwnCode: [...substituted].sort(),
    project_failure: v.project_failure === true,
  };
}

/** Throws on a structurally unrecognised team so the monitor never silently hides one. */
export function parseTeamRoster(value: unknown): MonitorTeam[] {
  if (!Array.isArray(value)) throw new RosterError("not a list");
  if (value.length > MAX_TEAMS) throw new RosterError("too many teams");
  const seen = new Set<string>();
  return value.map((v, i) => {
    const at = `team ${i + 1}`;
    if (
      !object(v) ||
      typeof v.uid !== "string" ||
      !UID.test(v.uid) ||
      seen.has(v.uid) ||
      !count(v.number) ||
      !count(v.revision) ||
      !count(v.votes) ||
      !(v.submitted_revision === null || count(v.submitted_revision)) ||
      !Array.isArray(v.members) ||
      v.members.length > MAX_TEAM_SIZE
    )
      throw new RosterError(at);
    seen.add(v.uid);
    return {
      uid: v.uid,
      number: v.number,
      name: label(v.name, `Team ${v.number}`),
      revision: v.revision,
      votes: v.votes,
      submitted_revision: v.submitted_revision,
      submitted_by:
        v.submitted_by === "vote" || v.submitted_by === "deadline"
          ? v.submitted_by
          : null,
      members: v.members.map((m, j) => member(m, `${at}, member ${j + 1}`)),
      last_result: result(v.last_result, `${at}, result`),
    };
  });
}

/** Mirrors ams-api `teams.phase()` at round level, including its contest-time fallbacks. */
export function scheduledPhase(s: MonitorSchedule, now: number): Phase {
  const locksAt = time(s.allocation_locks_at);
  if (
    time(s.allocation_locked_at) !== null ||
    (locksAt !== null && now >= locksAt)
  )
    return "locked";
  const opens = time(s.selection_opens_at) ?? time(s.contest_starts_at);
  if (opens === null) return "unscheduled";
  if (now < opens) return "waiting";
  if (now < opens + s.discussion_seconds * 1000) return "discussion";
  return "choosing";
}

/** Mirrors ams-api `teams.deadline()`: the round deadline, else the contest end. */
export function submitDeadline(s: MonitorSchedule): number | null {
  return time(s.submit_deadline) ?? time(s.contest_ends_at);
}

/**
 * `pendingSince` holds when this monitor first saw each team's submitted revision
 * without a completed result; the roster has no submission time of its own.
 */
export function teamView(
  team: MonitorTeam,
  phase: Phase,
  deadline: number | null,
  now: number,
  pendingSince: number | undefined,
): TeamView {
  const claimed = team.members.filter((m) => m.part_label !== null).length;
  const attention: Attention[] = [];
  if (phase === "locked" && claimed < team.members.length)
    attention.push("unassigned");
  let stage: TeamView["stage"];
  if (team.submitted_revision === null) {
    stage = phase === "locked" ? "working" : "choosing";
    if (deadline !== null && now >= deadline + DEADLINE_GRACE_MS)
      attention.push("unsubmitted");
  } else if (team.last_result?.revision === team.submitted_revision) {
    stage = "judged";
  } else {
    // Includes a revision whose runs all failed: the roster only carries completed runs.
    stage = "awaiting";
    if (pendingSince !== undefined && now - pendingSince >= SLOW_RESULT_MS)
      attention.push("slow-result");
  }
  return { team, claimed, stage, attention };
}

/** Needs-attention first, then by team number, so the top of the list is the work. */
export function byAttention(a: TeamView, b: TeamView): number {
  return (
    Number(b.attention.length > 0) - Number(a.attention.length > 0) ||
    a.team.number - b.team.number
  );
}

export function summarize(views: TeamView[]): MonitorSummary {
  const s: MonitorSummary = {
    teams: views.length,
    members: 0,
    claimed: 0,
    submitted: 0,
    byVote: 0,
    byDeadline: 0,
    judged: 0,
    attention: 0,
  };
  for (const v of views) {
    s.members += v.team.members.length;
    s.claimed += v.claimed;
    if (v.team.submitted_revision !== null) s.submitted++;
    if (v.team.submitted_by === "vote") s.byVote++;
    if (v.team.submitted_by === "deadline") s.byDeadline++;
    if (v.stage === "judged") s.judged++;
    if (v.attention.length) s.attention++;
  }
  return s;
}

/**
 * Carries first-seen-pending times across polls: keeps the earliest time for a
 * team still pending the same revision and forgets teams that are no longer pending.
 */
export function trackPending(
  previous: ReadonlyMap<string, { revision: number; since: number }>,
  teams: MonitorTeam[],
  now: number,
): Map<string, { revision: number; since: number }> {
  const next = new Map<string, { revision: number; since: number }>();
  for (const t of teams) {
    if (
      t.submitted_revision === null ||
      t.last_result?.revision === t.submitted_revision
    )
      continue;
    const prior = previous.get(t.uid);
    next.set(t.uid, {
      revision: t.submitted_revision,
      since:
        prior && prior.revision === t.submitted_revision ? prior.since : now,
    });
  }
  return next;
}

/** Staff-facing wording for a failed roster read; every case retries on its own. */
export function readErrorMessage(error: unknown, timedOut: boolean): string {
  if (timedOut) return "The team roster read timed out. It will retry automatically.";
  // fetch() rejects with a TypeError when the network or server cannot be reached.
  if (error instanceof TypeError)
    return "Could not reach the server. Check the connection; it will retry automatically.";
  if (error instanceof Error && error.message) return error.message;
  return "The team roster read failed. It will retry automatically.";
}

export const PHASE_LABEL: Record<Phase, string> = {
  unscheduled: "Not scheduled",
  waiting: "Waiting for the lobby",
  discussion: "Discussion",
  choosing: "Choosing parts",
  locked: "Allocation locked",
};
export const ATTENTION_LABEL: Record<Attention, string> = {
  unassigned: "Part unassigned after lock",
  unsubmitted: "Not submitted 1+ min after the deadline",
  "slow-result": "No result 10+ min after submission",
};
