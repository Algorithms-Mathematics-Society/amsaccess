/**
 * Everything the Dashboard says, derived from three reads.
 *
 * Kept free of React so the rules that decide "does anything need the
 * organizer" live in one readable place. Each rule is deliberately narrow:
 * an item only appears when it is either broken now or will cause trouble
 * soon, so the default state of the page is calm.
 */
import type { Contest, Problem } from "@/lib/orgTypes";
import { relativeWhen } from "@/lib/orgTypes";
import {
  situationOf,
  type Fleet,
  type Situation,
} from "@/components/org/FleetPanel";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** How far ahead a draft or an empty contest is worth flagging. */
export const SOON_MS = 7 * DAY;

export type Severity = "error" | "warning" | "live" | "info";

export type AttentionItem = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  href: string;
  action: string;
};

const SEVERITY_ORDER: Record<Severity, number> = {
  error: 0,
  warning: 1,
  live: 2,
  info: 3,
};

/**
 * Whether judges are wanted now: a contest is running or inside its
 * verification window. The fleet's `upcoming` list is the backend's own
 * answer (services/fleet.py demand); the contest's window is a fallback.
 */
function judgesWanted(fleet: Fleet, contests: Contest[] | null, now: number): boolean {
  if (fleet.upcoming.length > 0) return true;
  return (contests ?? []).some((c) => {
    if (c.is_practice || c.status !== "scheduled") return false;
    const windowMin = (c as Contest & { verification_window_minutes?: number }).verification_window_minutes ?? 0;
    return startMs(c) - windowMin * 60_000 <= now && now < endMs(c);
  });
}

function startMs(c: Contest): number {
  return new Date(c.starts_at).getTime();
}

function endMs(c: Contest): number {
  return new Date(c.ends_at).getTime();
}

/**
 * A contest that is live in the timed sense. The backend reports a published
 * practice contest as "running" for as long as it exists, and judges are not
 * scheduled for practice, so practice never counts as live here: not in
 * Needs attention, not for judging, not in Running now, not in the Live filter.
 */
export function isLive(c: Contest): boolean {
  return c.status === "running" && !c.is_practice;
}

export function hasPackage(p: Problem): boolean {
  return p.versions.some((v) => v.has_package);
}

/** Scheduled, timed contests that open within the next 24 hours. */
export function startingWithinDay(contests: Contest[], now: number): Contest[] {
  return contests.filter((c) => {
    if (c.status !== "scheduled" || c.is_practice) return false;
    const s = startMs(c);
    return s > now && s - now <= DAY;
  });
}

export type Stats = {
  running: number;
  next24h: number;
  drafts: number;
};

export function contestStats(contests: Contest[], now: number): Stats {
  return {
    running: contests.filter(isLive).length,
    next24h: startingWithinDay(contests, now).length,
    drafts: contests.filter((c) => c.status === "draft").length,
  };
}

/**
 * One judging verdict for the whole page. The Judging card and Needs
 * attention both read this, so their tone and wording can never disagree.
 *
 * - `error`: submissions are queued and no judge is live. Always shown,
 *   whatever the schedule: someone is submitting and nothing answers.
 * - `warning`: something that will bite while a contest is live or about
 *   to start (switched off, unsteered, no judge ready during a live contest).
 * - `ok`: judges are ready.
 * - `quiet`: nothing worth flagging right now.
 */
export type JudgingSeverity = "error" | "warning" | "ok" | "quiet";

export type JudgingStatus = {
  kind: Situation["kind"];
  severity: JudgingSeverity;
  headline: string;
  detail: string;
  /** Present only when the state belongs in Needs attention. */
  attention: { title: string; detail: string } | null;
};

export function judgingStatus(fleet: Fleet, contests: Contest[] | null, now: number): JudgingStatus {
  const status = judgingVerdict(fleet, contests, now);
  // The queue depth could not be read. Say so quietly; never guess a count.
  if (fleet.queue_waiting == null)
    return { ...status, detail: `${status.detail} The submission queue could not be read.` };
  return status;
}

function judgingVerdict(fleet: Fleet, contests: Contest[] | null, now: number): JudgingStatus {
  // `queued_jobs` still counts job rows whose queue message expired long ago
  // (ams-api api/routes/fleet.py), so it must never raise "submissions are
  // waiting". Only the real queue depth can; when it is unknown, so is waiting.
  const situation = situationOf(
    fleet.queue_waiting == null ? { ...fleet, queued_jobs: 0 } : fleet,
  );
  const live = (contests ?? []).some(isLive);
  const soon = contests ? startingWithinDay(contests, now).length > 0 : false;
  const fleetSoon = fleet.upcoming.some((u) => new Date(u.starts_at).getTime() - now <= DAY);
  const relevant = live || soon || fleetSoon;
  const kind = situation.kind;

  switch (kind) {
    case "waiting": {
      const waiting = fleet.queue_waiting ?? 0;
      return {
        kind,
        severity: "error",
        headline: "Submissions are waiting",
        detail: `${waiting} waiting and no judge is answering.`,
        attention: {
          title: "Submissions are waiting and no judge is answering",
          detail: `${waiting} waiting. Judges may still be starting. If this does not clear in a few minutes, open Judging.`,
        },
      };
    }
    case "standdown":
      return {
        kind,
        severity: relevant ? "warning" : "quiet",
        headline: "Judging is switched off",
        detail: "Nothing is judged until it is turned back on.",
        attention: relevant
          ? { title: "Judging is switched off", detail: "Nothing will be judged until it is turned back on." }
          : null,
      };
    case "stale":
      // Nothing is steering the fleet, so with no judge up none will start:
      // the first submission of a live contest would wait forever.
      if (fleet.live === 0)
        return live
          ? {
              kind,
              severity: "error",
              headline: "No judges, and none will start on their own",
              detail: "A contest is live and nothing is steering the judges. Start judges from Judging.",
              attention: {
                title: "A contest is live and judges will not start on their own",
                detail: "No judge is running and nothing is steering the fleet. Start judges from Judging before participants submit.",
              },
            }
          : judgesWanted(fleet, contests, now)
            ? {
                kind,
                severity: "warning",
                headline: "Judges will not start on their own",
                detail: "A contest is about to open and nothing is steering the judges, so none will start.",
                attention: {
                  title: "Judges will not start on their own",
                  detail: "A contest is about to open and nothing is steering the judges. Start them from Judging before it begins.",
                },
              }
            : {
                // Nothing wants judges yet, so this is a note, not an alarm.
                kind,
                severity: "quiet",
                headline: "Judges are not being steered",
                detail: "No judges are running. Until this is fixed they will not start on their own before a contest.",
                attention: null,
              };
      return {
        kind,
        severity: relevant ? "warning" : "quiet",
        headline: "Judges are not being steered",
        detail: "They keep judging, but will not scale up or stop on their own.",
        attention: relevant
          ? {
              title: "Judges are running, but nothing is steering them",
              detail: "They keep judging, but will not grow for a rush or stop afterwards.",
            }
          : null,
      };
    case "ready":
      return {
        kind,
        severity: "ok",
        headline: `Ready · ${fleet.live} ${fleet.live === 1 ? "judge" : "judges"} available`,
        detail:
          fleet.running_jobs > 0
            ? `${fleet.running_jobs} ${fleet.running_jobs === 1 ? "submission" : "submissions"} being judged now.`
            : "Judges stop on their own after a contest.",
        attention: null,
      };
    case "starting":
      return live
        ? {
            kind,
            severity: "warning",
            headline: "Judges are still starting",
            detail: "A contest is live. Submissions wait until a judge is ready, usually within 90 seconds.",
            attention: {
              title: "Judges are still starting during a live contest",
              detail: "Submissions wait until a judge is ready, usually within 90 seconds.",
            },
          }
        : {
            kind,
            severity: "quiet",
            headline: "Judges are starting up",
            detail: "They take about 90 seconds to be ready.",
            attention: null,
          };
    default:
      // "idle", plus "checking" which cannot happen once a fleet has loaded.
      return live
        ? {
            kind,
            severity: "warning",
            headline: "No judges are running",
            detail: "A contest is live, so submissions wait until a judge starts.",
            attention: {
              title: "No judges are running during a live contest",
              detail: "Submissions will wait until a judge starts.",
            },
          }
        : {
            kind,
            severity: "quiet",
            headline: "No judges running",
            detail: "They start on their own about half an hour before a contest.",
            attention: null,
          };
  }
}

function judgingItems(fleet: Fleet, contests: Contest[] | null, now: number): AttentionItem[] {
  const j = judgingStatus(fleet, contests, now);
  if (!j.attention || (j.severity !== "error" && j.severity !== "warning")) return [];
  return [
    {
      id: `judging-${j.kind}`,
      severity: j.severity,
      title: j.attention.title,
      detail: j.attention.detail,
      href: "/org/fleet",
      action: "Open Judging",
    },
  ];
}

export function attentionItems({
  contests,
  problems,
  fleet,
  now,
}: {
  contests: Contest[] | null;
  problems: Problem[] | null;
  fleet: Fleet | null;
  now: number;
}): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (fleet)
    items.push(...judgingItems(fleet, contests, now));

  if (contests) {
    for (const c of contests) {
      if (isLive(c)) {
        const ends = endMs(c);
        items.push({
          id: `live-${c.uid}`,
          severity: "live",
          title: `${c.title} is live`,
          detail:
            ends > now
              ? `Ends ${relativeWhen(c.ends_at)}.`
              : "Past its end time.",
          href: `/org/contests/${c.uid}`,
          action: "Open contest",
        });
        continue;
      }

      if (c.is_practice || (c.status !== "draft" && c.status !== "scheduled"))
        continue;
      const s = startMs(c);
      const empty = c.problems.length === 0;
      // A draft whose window has opened can never be joined, so it stays here
      // until it is published or its window closes.
      if (c.status === "draft" && s <= now && now < endMs(c)) {
        items.push({
          id: `draft-${c.uid}`,
          severity: "warning",
          title: `${c.title} started without being published`,
          detail: empty
            ? `It started ${relativeWhen(c.starts_at)} and is still a draft with no problems, so participants cannot join.`
            : `It started ${relativeWhen(c.starts_at)} and is still a draft, so participants cannot join. Publish it now.`,
          href: `/org/contests/${c.uid}`,
          action: "Open contest",
        });
        continue;
      }
      if (!(s > now && s - now <= SOON_MS)) continue;
      const when = `Starts ${relativeWhen(c.starts_at)}.`;
      if (c.status === "draft") {
        items.push({
          id: `draft-${c.uid}`,
          severity: "warning",
          title: empty
            ? `${c.title} is a draft with no problems`
            : `${c.title} is still a draft`,
          detail: empty
            ? `${when} Add problems, then publish it.`
            : `${when} Publish it so participants can join.`,
          href: `/org/contests/${c.uid}`,
          action: "Open contest",
        });
      } else if (empty) {
        items.push({
          id: `empty-${c.uid}`,
          severity: "warning",
          title: `${c.title} has no problems yet`,
          detail: `${when} Add problems before it opens.`,
          href: `/org/contests/${c.uid}`,
          action: "Add problems",
        });
      }
    }
  }

  if (problems) {
    const missing = problems.filter((p) => !hasPackage(p)).length;
    if (missing > 0) {
      items.push({
        id: "problems-unpackaged",
        severity: "info",
        title:
          missing === 1
            ? "1 problem has no package"
            : `${missing} problems have no package`,
        detail:
          "A problem can join a contest once its cxxprobe package is uploaded.",
        href: "/org/problems",
        action: "Open problems",
      });
    }
  }

  // Stable sort keeps contest order inside each severity.
  return items
    .map((item, i) => ({ item, i }))
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.item.severity] - SEVERITY_ORDER[b.item.severity] ||
        a.i - b.i,
    )
    .map(({ item }) => item);
}

export type ContestFilter = "all" | "live" | "upcoming" | "drafts" | "ended";

const GROUP: Record<string, number> = {
  running: 0,
  scheduled: 1,
  draft: 2,
  ended: 4,
};

/** Open practice contests sit after drafts: always available, never urgent. */
function groupOf(c: Contest): number {
  if (c.status === "running" && c.is_practice) return 3;
  return GROUP[c.status] ?? 5;
}

/** Live, then scheduled by start, then drafts by start, then open practice, then ended by most recent end. */
export function orderContests(contests: Contest[]): Contest[] {
  return [...contests].sort((a, b) => {
    const ga = groupOf(a);
    const gb = groupOf(b);
    if (ga !== gb) return ga - gb;
    if (ga === 4) return endMs(b) - endMs(a);
    return startMs(a) - startMs(b);
  });
}

export function filterContests(
  contests: Contest[],
  filter: ContestFilter,
): Contest[] {
  switch (filter) {
    case "live":
      return contests.filter(isLive);
    case "upcoming":
      return contests.filter((c) => c.status === "scheduled");
    case "drafts":
      return contests.filter((c) => c.status === "draft");
    case "ended":
      return contests.filter(
        (c) => c.status === "ended" || c.status === "archived",
      );
    default:
      return contests;
  }
}

/** The next timed contest that has not started yet, for the Judging card. */
export function nextContest(contests: Contest[], now: number): Contest | null {
  return (
    contests
      .filter(
        (c) => c.status === "scheduled" && !c.is_practice && startMs(c) > now,
      )
      .sort((a, b) => startMs(a) - startMs(b))[0] ?? null
  );
}
