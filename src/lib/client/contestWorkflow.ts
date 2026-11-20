export type WorkflowCheck = {
  label: string;
  state: "done" | "todo" | "review" | "unknown";
  detail: string;
};
export type WorkflowStep = {
  title: string;
  href: string;
  action: string;
  checks: WorkflowCheck[];
};
type ContestFacts = {
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  problems: unknown[];
};
type RosterFact = {
  user_uid: string;
  revoked: boolean;
  has_passphrase: boolean;
};
export type WorkflowFacts = {
  contest: ContestFacts | null;
  roster: RosterFact[] | null;
  pending: number | null;
  openTickets: boolean | null;
};
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function workflowContest(value: unknown): ContestFacts {
  if (
    !record(value) ||
    !["title", "status", "starts_at", "ends_at"].every(
      (key) => typeof value[key] === "string",
    ) ||
    !Array.isArray(value.problems)
  )
    throw new Error("Contest details are incomplete.");
  return value as ContestFacts;
}
export function workflowRoster(value: unknown): RosterFact[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (row) =>
        record(row) &&
        typeof row.user_uid === "string" &&
        row.user_uid.length > 0 &&
        typeof row.revoked === "boolean" &&
        typeof row.has_passphrase === "boolean",
    )
  )
    throw new Error("Roster details are incomplete.");
  return value;
}
export function workflowPending(value: unknown): number {
  if (
    !record(value) ||
    typeof value.pending !== "number" ||
    !Number.isSafeInteger(value.pending) ||
    value.pending < 0
  )
    throw new Error("Judging summary is incomplete.");
  return value.pending;
}

/** These are observed facts, never a claim that manual operational checks passed. */
export function contestWorkflow(
  uid: string,
  facts: WorkflowFacts,
): WorkflowStep[] {
  const root = `/org/contests/${encodeURIComponent(uid)}`;
  const { contest, roster, pending, openTickets } = facts;
  const count =
    roster === null ? null : new Set(roster.map((row) => row.user_uid)).size;
  const active = roster?.filter((row) => !row.revoked) ?? [];
  const ready = new Set(
    active.filter((row) => row.has_passphrase).map((row) => row.user_uid),
  ).size;
  const ended = contest?.status === "ended" || contest?.status === "archived";
  const check = (
    label: string,
    pass: boolean | null,
    detail: string,
  ): WorkflowCheck => ({
    label,
    state: pass === null ? "unknown" : pass ? "done" : "todo",
    detail,
  });
  const review = (label: string, detail: string): WorkflowCheck => ({
    label,
    detail,
    state: "review",
  });
  return [
    {
      title: "Basics",
      href: root,
      action: "Review contest settings",
      checks: [
        check(
          "Title and schedule",
          contest
            ? Boolean(contest.title.trim()) &&
                Number.isFinite(Date.parse(contest.starts_at)) &&
                Date.parse(contest.ends_at) > Date.parse(contest.starts_at)
            : null,
          "Review the timezone, duration, format and freeze settings in the contest.",
        ),
      ],
    },
    {
      title: "Problems",
      href: `${root}#problems`,
      action: "Review problems",
      checks: [
        check(
          "Problems attached",
          contest ? contest.problems.length > 0 : null,
          contest
            ? `${contest.problems.length} problems attached.`
            : "Contest details unavailable.",
        ),
        review(
          "Packages and candidate preview",
          "Verify package versions, labels, scores and the candidate view; attachment alone does not verify a package.",
        ),
      ],
    },
    {
      title: "Participants",
      href: `${root}#participants`,
      action: "Review roster",
      checks: [
        check(
          "Roster populated",
          count === null ? null : count > 0,
          count === null
            ? "Roster unavailable."
            : `${count} distinct people in the credential-backed roster. Review the source roster for missing entries.`,
        ),
      ],
    },
    {
      title: "Credentials",
      href: `${root}#participants`,
      action: "Review credentials and delivery",
      checks: [
        check(
          "Active logins have credentials",
          count === null ? null : count > 0 && ready === count,
          count === null
            ? "Credential state unavailable."
            : `${ready} of ${count} people have an active login with a passphrase. Revoked logins are not ready.`,
        ),
        review(
          "Delivery confirmed",
          "Check email failures and printed slips. A stored passphrase does not confirm delivery.",
        ),
      ],
    },
    {
      title: "Readiness",
      href: `${root}#judging`,
      action: "Review judging readiness",
      checks: [
        review(
          "Operational preflight",
          "Verify judging capacity, reference material, lockdown policy, a mock round and a test submission. Confirm staff and hall coverage before publishing.",
        ),
      ],
    },
    {
      title: "Live",
      href: `${root}#invigilation`,
      action: "Open live operations",
      checks: [
        check(
          "Contest opened",
          contest ? contest.status === "running" || ended : null,
          contest
            ? `Current contest status: ${contest.status}.`
            : "Contest state unavailable.",
        ),
        review(
          "Requests and incidents",
          "Monitor the issues inbox, attendance and participant requests throughout the contest.",
        ),
      ],
    },
    {
      title: "Wrap-up",
      href: `${root}#leaderboard`,
      action: "Review results and exports",
      checks: [
        check(
          "Contest ended",
          contest ? ended : null,
          "Wait for the contest to finish before finalizing results.",
        ),
        check(
          "Judging queue clear",
          pending === null ? null : pending === 0,
          pending === null
            ? "Judging summary unavailable."
            : `${pending} submissions waiting for judging. A clear queue alone does not verify results.`,
        ),
        check(
          "Support tickets resolved",
          openTickets === null ? null : !openTickets,
          openTickets === null
            ? "Support state unavailable."
            : openTickets
              ? "Open support tickets remain in this contest."
              : "No open support tickets in this contest.",
        ),
        review(
          "Final review",
          "Resolve incidents, review flags, confirm leaderboard visibility and export results. Record follow-up notes with your team.",
        ),
      ],
    },
  ];
}
