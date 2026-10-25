"use client";

/**
 * What the contest looked like, rather than what it scored.
 *
 * Every number here was previously reachable only by exporting a CSV and
 * opening a spreadsheet, which meant in practice that nobody looked at any
 * of them until the contest was over and it was too late for the answer to
 * change anything.
 *
 * Charts are plain markup. A charting library would be the largest thing in
 * this bundle, and none of these need more than a bar.
 */

import { useEffect, useMemo } from "react";
import { useContestRead } from "@/lib/client/useContestRead";
import { RefreshCw } from "lucide-react";
import { SkeletonBlock } from "@/components/org/Skeleton";
import { osLabel } from "@/lib/client/peopleFilter.ts";

type Count = { name: string; count: number };

type ProblemStat = {
  label: string;
  title: string;
  attempted: number;
  solved: number;
  attempts: number;
  solve_rate: number;
};

type Analytics = {
  roster: number;
  entered: number;
  attempted: number;
  solved_any: number;
  os: Count[];
  colleges: Count[];
  problems: ProblemStat[];
  verdicts: Count[];
  solved_distribution: Count[];
};

/** Enough colleges to see the shape, before the tail becomes noise. */
const TOP_COLLEGES = 12;

const VERDICT_TONE: Record<string, string> = {
  AC: "bg-emerald-500",
  WA: "bg-red-400",
  TLE: "bg-amber-400",
  RE: "bg-orange-400",
  CE: "bg-slate-400",
  SE: "bg-fuchsia-500",
};

export function AnalyticsPanel(_props: { contestUid: string }) {
  const { data, error, refreshing: busy, load, open } = useContestRead<Analytics>("analytics");
  useEffect(() => { void open(); }, [open]);

  const colleges = useMemo(() => {
    if (!data) return { shown: [] as Count[], rest: 0 };
    const shown = data.colleges.slice(0, TOP_COLLEGES);
    const rest = data.colleges
      .slice(TOP_COLLEGES)
      .reduce((n, c) => n + c.count, 0);
    return { shown, rest };
  }, [data]);

  if (!data && error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}{" "}
        <button type="button" className="underline" onClick={() => void load()}>
          Retry
        </button>
      </p>
    );
  }
  if (!data) return <SkeletonBlock className="h-64" />;

  const submissionsTotal = data.verdicts.reduce((n, v) => n + v.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Everyone on the roster, how far each got, and how the paper behaved.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <p className="text-xs text-amber-700">{error} Showing the last read.</p>
      )}

      {/* The funnel. Each step is a subset of the one before it, so the bars
          share a scale and the drop-off is the thing you see. */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          How far people got
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <Funnel
            label="On the roster"
            value={data.roster}
            of={data.roster}
            tone="bg-slate-400"
          />
          <Funnel
            label="Entered"
            value={data.entered}
            of={data.roster}
            tone="bg-sky-500"
          />
          <Funnel
            label="Submitted"
            value={data.attempted}
            of={data.roster}
            tone="bg-indigo-500"
          />
          <Funnel
            label="Solved at least one"
            value={data.solved_any}
            of={data.roster}
            tone="bg-emerald-500"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Operating system
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Of the {data.os.reduce((n, o) => n + o.count, 0)} who reached the
            entry checks.
          </p>
          <Bars
            rows={data.os.map((o) => ({
              name: osLabel(o.name),
              count: o.count,
            }))}
            empty="Nobody has checked in yet."
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Colleges</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {data.colleges.length} in all
            {colleges.rest > 0 && `, showing the top ${TOP_COLLEGES}`}.
          </p>
          <Bars rows={colleges.shown} empty="No colleges recorded." />
          {colleges.rest > 0 && (
            <p className="mt-2 text-xs text-slate-400">
              and {colleges.rest} more from{" "}
              {data.colleges.length - TOP_COLLEGES} other colleges
            </p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Problems</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          People, not submissions: a hundred retries by one candidate is not a
          hundred candidates.
        </p>
        {data.problems.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No problems attached yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Problem</th>
                  <th className="px-3 py-2 text-right">Tried</th>
                  <th className="px-3 py-2 text-right">Solved</th>
                  <th className="px-3 py-2 text-right">Submissions</th>
                  <th className="w-48 px-3 py-2">Solve rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.problems.map((problem) => (
                  <tr key={problem.label}>
                    <td className="py-2 pr-3">
                      <span className="font-mono font-medium text-slate-900">
                        {problem.label}
                      </span>
                      <span className="ml-2 text-slate-600">
                        {problem.title}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {problem.attempted}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {problem.solved}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {problem.attempts}
                    </td>
                    <td className="px-3 py-2">
                      <Meter
                        fraction={problem.solve_rate}
                        caption={`${Math.round(problem.solve_rate * 100)}%`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Verdicts</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {submissionsTotal} judged submissions.
          </p>
          {submissionsTotal === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nothing judged yet.</p>
          ) : (
            <>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
                {data.verdicts.map((verdict) => (
                  <div
                    key={verdict.name}
                    className={VERDICT_TONE[verdict.name] ?? "bg-slate-300"}
                    style={{
                      width: `${(verdict.count / submissionsTotal) * 100}%`,
                    }}
                    title={`${verdict.name}: ${verdict.count}`}
                  />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {data.verdicts.map((verdict) => (
                  <li
                    key={verdict.name}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${VERDICT_TONE[verdict.name] ?? "bg-slate-300"}`}
                    />
                    <span className="font-mono">{verdict.name}</span>
                    <span className="tabular-nums text-slate-400">
                      {verdict.count}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Problems solved per person
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Where the paper actually separated people.
          </p>
          <Bars
            rows={data.solved_distribution.map((bucket) => ({
              name:
                bucket.name === "1" ? "1 problem" : `${bucket.name} problems`,
              count: bucket.count,
            }))}
            empty="Nothing solved yet."
          />
        </section>
      </div>
    </div>
  );
}

function Funnel({
  label,
  value,
  of,
  tone,
}: {
  label: string;
  value: number;
  of: number;
  tone: string;
}) {
  const share = of > 0 ? value / of : 0;
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums text-slate-950">
        {value}
      </p>
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${tone}`}
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <p className="mt-1 text-xs tabular-nums text-slate-400">
        {Math.round(share * 100)}%
      </p>
    </div>
  );
}

/** Horizontal bars, scaled to the largest row so the shape is readable even
 *  when every value is small. */
function Bars({ rows, empty }: { rows: readonly Count[]; empty: string }) {
  if (rows.length === 0)
    return <p className="mt-3 text-sm text-slate-500">{empty}</p>;
  const peak = Math.max(...rows.map((row) => row.count), 1);
  return (
    <ul className="mt-3 space-y-1.5">
      {rows.map((row) => (
        <li key={row.name} className="flex items-center gap-2 text-sm">
          <span
            className="w-40 shrink-0 truncate text-slate-700"
            title={row.name}
          >
            {row.name}
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full bg-slate-700"
              style={{ width: `${(row.count / peak) * 100}%` }}
            />
          </span>
          <span className="w-10 shrink-0 text-right tabular-nums text-slate-500">
            {row.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Meter({ fraction, caption }: { fraction: number; caption: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span
          className="block h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        />
      </span>
      <span className="w-10 text-right text-xs tabular-nums text-slate-500">
        {caption}
      </span>
    </div>
  );
}
