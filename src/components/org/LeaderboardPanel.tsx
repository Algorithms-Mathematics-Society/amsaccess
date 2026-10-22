"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SkeletonTable } from "@/components/org/Skeleton";
import { ParticipantModal } from "@/components/org/ParticipantModal";
import { Download, Lock, RefreshCw, Search } from "lucide-react";

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

export function LeaderboardPanel({
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
  const [board, setBoard] = useState<Scoreboard | null>(null);
  // Opened over the contest instead of navigating away: /org/participants
  // belongs to the Students section, so Back from there abandons the contest.
  const [openParticipant, setOpenParticipant] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [needle, setNeedle] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/contests/${contestUid}/scoreboard`, {
        cache: "no-store",
      });
      const data = (await res.json()) as Scoreboard & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not load the leaderboard.");
      setBoard(data);
      setError("");
    } catch (err) {
      // A failed poll keeps the previous standings on screen. Replacing a
      // readable board with an error during a contest helps nobody.
      setError(err instanceof Error ? err.message : "Could not load the leaderboard.");
    }
  }, [contestUid]);

  useEffect(() => {
    void load();
    if (!live) return;
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load, live]);

  const rows = useMemo(() => {
    const term = needle.trim().toLowerCase();
    if (!term) return board?.rows ?? [];
    return (board?.rows ?? []).filter(
      (row) =>
        row.display_name.toLowerCase().includes(term) ||
        row.username.toLowerCase().includes(term),
    );
  }, [board, needle]);

  if (board === null && error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (board === null) {
    return <SkeletonTable rows={8} />;
  }

  return (
    <div>
      <ParticipantModal handle={openParticipant} onClose={() => setOpenParticipant(null)} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={needle}
            onChange={(event) => setNeedle(event.target.value)}
            placeholder="Find a candidate…"
            aria-label="Find a candidate on the leaderboard"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
          />
        </div>

        {board.frozen && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">
            <Lock className="h-3.5 w-3.5" />
            Frozen for everyone else — you are seeing it live
          </span>
        )}

        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-500 hover:text-slate-900"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
        <a
          href={`/api/org/contests/${contestUid}/export?kind=standings`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-900"
        >
          <Download className="h-4 w-4" />
          Export standings
        </a>
      </div>

      {error && <p className="mb-3 text-xs text-amber-700">{error} Showing the last board.</p>}

      {board.rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Nobody has solved anything yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-14 px-4 py-2.5 text-right">#</th>
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
              {rows.map((row) => (
                <tr key={row.user_uid} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-500">
                    {row.rank}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setOpenParticipant(row.username)}
                      className="text-left font-medium text-slate-900 hover:underline"
                    >
                      {row.display_name}
                    </button>
                    <span className="ml-2 font-mono text-xs text-slate-400">{row.username}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.solved}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{row.score}</td>
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
        {needle && `${rows.length} of ${board.rows.length} shown · `}
        Updated {new Date(board.generated_at).toLocaleTimeString()}
        {live && ", refreshing every 20 seconds"}
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
