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

function startMs(c: Contest): number {
  return new Date(c.starts_at).getTime();
}

function endMs(c: Contest): number {
  return new Date(c.ends_at).getTime();
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
    running: contests.filter((c) => c.status === "running").length,
    next24h: startingWithinDay(contests, now).length,
    drafts: contests.filter((c) => c.status === "draft").length,
  };
}

/**
 * Judging items. Submissions waiting with nobody to judge them is real
 * breakage and always shows. The softer situations only matter while a
 * contest is live or about to start; otherwise they are not worth a line.
 */
function judgingItems(
  fleet: Fleet,
  situation: Situation,
  contests: Contest[] | null,
  now: number,
): AttentionItem[] {
  const running = (contests ?? []).filter((c) => c.status === "running");
  const soon = contests ? startingWithinDay(contests, now) : [];
  const fleetSoon = fleet.upcoming.some(
    (u) => new Date(u.starts_at).getTime() - now <= DAY,
  );
  const relevant = running.length > 0 || soon.length > 0 || fleetSoon;
  const base = { href: "/org/fleet", action: "Open Judging" };

  switch (situation.kind) {
    case "waiting": {
      const waiting = fleet.queue_waiting ?? fleet.queued_jobs ?? 0;
      return [
        {
          ...base,
          id: "judging-waiting",
          severity: "error",
          title: "Submissions are waiting and no judge is answering",
          detail: `${waiting} waiting. Judges may still be starting. If this does not clear in a few minutes, open Judging.`,
        },
      ];
    }
    case "standdown":
      return relevant
        ? [
            {
              ...base,
              id: "judging-off",
              severity: "warning",
              title: "Judging is switched off",
              detail: "Nothing will be judged until it is turned back on.",
            },
          ]
        : [];
    case "stale":
      return relevant
        ? [
            {
              ...base,
              id: "judging-stale",
              severity: "warning",
              title: "Judges are running, but nothing is steering them",
              detail:
                "They keep judging, but will not grow for a rush or stop afterwards.",
            },
          ]
        : [];
    case "idle":
      return running.length > 0
        ? [
            {
              ...base,
              id: "judging-idle",
              severity: "warning",
              title: "No judges are running during a live contest",
              detail: "Submissions will wait until a judge starts.",
            },
          ]
        : [];
    case "starting":
      return running.length > 0
        ? [
            {
              ...base,
              id: "judging-starting",
              severity: "info",
              title: "Judges are still starting",
              detail: "They take about 90 seconds to be ready.",
            },
          ]
        : [];
    default:
      return [];
  }
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
    items.push(...judgingItems(fleet, situationOf(fleet), contests, now));

  if (contests) {
    for (const c of contests) {
      if (c.status === "running") {
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
      if (!(s > now && s - now <= SOON_MS)) continue;
      const empty = c.problems.length === 0;
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
  ended: 3,
};

/** Running, then scheduled by start, then drafts by start, then ended by most recent end. */
export function orderContests(contests: Contest[]): Contest[] {
  return [...contests].sort((a, b) => {
    const ga = GROUP[a.status] ?? 4;
    const gb = GROUP[b.status] ?? 4;
    if (ga !== gb) return ga - gb;
    if (ga === 3) return endMs(b) - endMs(a);
    return startMs(a) - startMs(b);
  });
}

export function filterContests(
  contests: Contest[],
  filter: ContestFilter,
): Contest[] {
  switch (filter) {
    case "live":
      return contests.filter((c) => c.status === "running");
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
