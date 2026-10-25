"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useContestRead } from "@/lib/client/useContestRead";
import { useOrgSessions } from "@/lib/client/useOrgSessions";
import {
  groupLeaderboardByEntry,
} from "@/lib/client/orgEntry";
import { startOrgPolling } from "@/lib/client/orgPolling";
import { SkeletonTable } from "@/components/org/Skeleton";
import { PeopleFilters } from "@/components/org/PeopleFilters";
import {
  NO_FILTER,
  applyPeopleFilter,
  optionsFrom,
  type PeopleFilter,
} from "@/lib/client/peopleFilter.ts";
import { ParticipantModal } from "@/components/org/ParticipantModal";
import { Download, Lock, RefreshCw } from "lucide-react";

/**
 * Where the contest actually stands.
 *
 * The console could tell you a thousand submissions had been judged and not
 * who was winning. The scoreboard existed — contestants see it — but staff
 * had only the submissions firehose and a CSV, and a CSV is not something
 * you watch.
 *
 * Staff see through a freeze, deliberately: a frozen board is for the hall,
 * and the person who has to spot a broken problem in the last half hour
 * needs the real one. It says so rather than quietly showing a different
 * board from the one everybody else is looking at.
 */

type Cell = {
  label: string;
  attempts: number;
  solved: boolean;
  partial: number;
  penalty_minutes: number;
  solved_at_minutes: number | null;
};

type Row = {
  rank: number;
  user_uid: string;
  username: string;
  display_name: string;
  solved: number;
  penalty: number;
  score: number;
  partial: number;
  cells: Record<string, Cell>;
};

type Scoreboard = {
  contest_uid: string;
  frozen: boolean;
  generated_at: string;
  rows: Row[];
};

const POLL_MS = 20_000;

type LeaderboardProps = {
  contestUid: string;
  problemLabels: string[];
  live: boolean;
};

export function LeaderboardPanel(props: LeaderboardProps) {
  return <LeaderboardContent key={props.contestUid} {...props} />;
}

function LeaderboardContent({
  contestUid,
  problemLabels,
  live,
}: {
  contestUid: string;
  /** In contest order, so columns match the problems tab rather than sorting
   *  themselves alphabetically and putting K before B. */
  problemLabels: string[];
  /** Polls only while there is something to poll for. */
  live: boolean;
}) {
  const { entered, loaded: entryLoaded, error: entryError, refresh: refreshEntry } = useOrgSessions(contestUid, live);
  const { data: board, error, refreshing: boardRefreshing, load: loadBoard, open: openBoard } = useContestRead<Scoreboard>("scoreboard");
  const { data: roster, refreshing: rosterRefreshing, load: loadRoster, open: openRoster } = useContestRead<{ user_uid: string; college?: string; device_os?: string }[]>("participants");
  const refreshing = boardRefreshing || rosterRefreshing;
  // Opened over the contest instead of navigating away: /org/participants
  // belongs to the Students section, so Back from there abandons the contest.
  const [openParticipant, setOpenParticipant] = useState<string | null>(null);
  const [filter, setFilter] = useState<PeopleFilter>(NO_FILTER);
  // The standings carry scores, not people. College and OS live on the
  // roster, so they are fetched alongside and joined by uid -- without them
  // the two tabs would offer different filters over the same candidates.
  const people = useMemo(() => new Map((roster ?? []).map(row => [row.user_uid, { college: row.college ?? "", os: row.device_os ?? "" }])), [roster]);
  const load = useCallback(async () => {
    await Promise.all([loadBoard(), loadRoster()]);
  }, [loadBoard, loadRoster]);
  useEffect(() => {
    void openBoard();
    void openRoster();
    return startOrgPolling(load, live ? POLL_MS : null, { immediate: false });
  }, [load, openBoard, openRoster, live]);

  const grouped = useMemo(
    () => groupLeaderboardByEntry(board?.rows ?? [], entered),
    [board, entered],
  );

  /**
   * Standing among the people who actually sat the contest.
   *
   * The API ranks every name on the roster, all 1321 of them, and this board
   * then moves the entrants to the top. Printing the API's rank down a list
   * that has been reordered reads as broken numbering: 72, 74, 88, 91, where
   * the missing numbers are entrants lifted above. Nobody can tell that from
   * a mis-sort.
   *
   * So the number is recomputed over the entrants, in the order the board
   * already has them, which is score order. Someone who never entered has no
   * standing to show and gets none. Computed from `grouped` rather than the
   * filtered rows, so searching for one person still shows their real
   * position instead of "1".
   */
  const standing = useMemo(() => {
    const places = new Map<string, number>();
    let place = 0;
    for (const { row, entered: hasEntered } of grouped) {
      if (!hasEntered) continue;
      place += 1;
      places.set(row.user_uid, place);
    }
    return places;
  }, [grouped]);
  const osOptions = useMemo(
    () => optionsFrom([...people.values()], (entry) => entry.os),
    [people],
  );
  const collegeOptions = useMemo(
    () => optionsFrom([...people.values()], (entry) => entry.college),
    [people],
  );

  const rows = useMemo(
    () =>
      applyPeopleFilter(grouped, filter, {
        fields: ({ row }) => [row.display_name, row.username],
        os: ({ row }) => people.get(row.user_uid)?.os ?? "",
        college: ({ row }) => people.get(row.user_uid)?.college ?? "",
      }),
    [grouped, filter, people],
  );

  if (board === null && error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}{" "}
        <button
          type="button"
          disabled={refreshing}
          className="underline"
          onClick={() => { void load(); void refreshEntry().catch(() => {}); }}
        >
          Retry
        </button>
      </p>
    );
  }
  if (board === null) {
    return <SkeletonTable rows={8} />;
  }

  return (
    <div>
      <ParticipantModal
        handle={openParticipant}
        onClose={() => setOpenParticipant(null)}
      />
      <PeopleFilters
        value={filter}
        onChange={setFilter}
        osOptions={osOptions}
        collegeOptions={collegeOptions}
        showing={rows.length}
        total={grouped.length}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {board.frozen && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">
            <Lock className="h-3.5 w-3.5" />
            Frozen for everyone else — you are seeing it live
          </span>
        )}

        <button
          type="button"
          onClick={() => { void load(); void refreshEntry().catch(() => {}); }}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-500 hover:text-slate-900"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        <a
          href={`/api/org/contests/${contestUid}/export?kind=standings`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-900"
        >
          <Download className="h-4 w-4" />
          Export standings
        </a>
      </div>

      {error && (
        <p className="mb-3 text-xs text-amber-700">
          {error} Showing the last board.
        </p>
      )}

      <p role="status" className="mb-3 text-xs text-slate-500">
        Green names have entered this contest and appear first, numbered by
        their standing among them. The rest are on the roster but never sat it,
        so they are listed without a position.
        {!entryLoaded && !entryError && " Checking entry status…"}
        {entryError && (
          <>
            {" "}
            {entryError}{" "}
            {entryLoaded
              ? "Showing last confirmed entries."
              : "Entry is unconfirmed; showing scoring order."}{" "}
            Use Refresh to retry.
          </>
        )}
      </p>

      {board.rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          No leaderboard entries yet.
        </p>
      ) : rows.length === 0 ? (
        /* Said separately from "no entries": one means the contest has not
           started and the other means you filtered everyone out, and reading
           the first when you meant the second wastes real time. */
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Nobody matches that. {board.rows.length} candidates are on the board.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th
                  className="w-14 px-4 py-2.5 text-right"
                  title="Scoring rank; entrants are grouped first"
                >
                  Rank
                </th>
                <th className="px-4 py-2.5">Candidate</th>
                <th className="px-3 py-2.5 text-right">Solved</th>
                <th className="px-3 py-2.5 text-right">Score</th>
                <th className="px-3 py-2.5 text-right">Penalty</th>
                {problemLabels.map((label) => (
                  <th key={label} className="px-3 py-2.5 text-center">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ row, entered: hasEntered }) => (
                <tr key={row.user_uid} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-500">
                    {standing.get(row.user_uid) ?? ""}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setOpenParticipant(row.username)}
                      className={`text-left font-medium hover:underline ${hasEntered ? "text-emerald-700" : "text-slate-900"}`}
                    >
                      {row.display_name}
                      {hasEntered && (
                        <span className="sr-only"> — Entered this contest</span>
                      )}
                    </button>
                    <span className="ml-2 font-mono text-xs text-slate-400">
                      {row.username}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.solved}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {row.score}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                    {row.penalty}
                  </td>
                  {problemLabels.map((label) => (
                    <td key={label} className="px-3 py-2 text-center">
                      <ProblemCell cell={row.cells[label]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Updated {new Date(board.generated_at).toLocaleTimeString()}
        {live && ", refreshing about every 20 seconds while visible"}
      </p>
    </div>
  );
}

/**
 * One candidate on one problem.
 *
 * Solved shows the minute it landed, because when somebody solved a problem
 * is most of what a standings cell is for. Attempts without a solve show the
 * count, so a row of 7s on one column says the problem is wrong long before
 * anybody files a complaint.
 */
function ProblemCell({ cell }: { cell: Cell | undefined }) {
  if (!cell || (cell.attempts === 0 && !cell.solved)) {
    return <span className="text-slate-300">·</span>;
  }
  if (cell.solved) {
    return (
      <span className="inline-flex flex-col leading-tight">
        <span className="font-medium text-emerald-700">
          +{cell.attempts > 1 ? cell.attempts - 1 : ""}
        </span>
        {cell.solved_at_minutes !== null && (
          <span className="text-[11px] text-slate-400 tabular-nums">
            {cell.solved_at_minutes}m
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="font-medium text-red-600">−{cell.attempts}</span>
      {cell.partial > 0 && (
        <span className="text-[11px] text-slate-400 tabular-nums">
          {Math.round(cell.partial * 100)}%
        </span>
      )}
    </span>
  );
}
