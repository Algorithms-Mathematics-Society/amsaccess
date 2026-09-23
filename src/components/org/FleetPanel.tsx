"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Cpu,
  Flame,
  Loader2,
  PowerOff,
  RefreshCw,
  Server,
  Stethoscope,
  Undo2,
  Zap,
} from "lucide-react";
import { formatWhen, relativeWhen } from "@/lib/orgTypes";

/**
 * What is judging, right now.
 *
 * The question this answers is narrow and specific: *are the judges alive,
 * and is anything waiting on them?* It exists because on 2026-09-18 a fleet
 * of workers crash-looped for twenty minutes while every signal anyone could
 * see said healthy — the instances were running, the scaling group was at
 * its target, and nothing was being judged. A count of instances is not a
 * count of judges.
 *
 * So the two numbers that matter here are **live workers** (heartbeating
 * within the last half-minute, as the API reckons it) and **backlog**. Both
 * are reported by the API against its own clock; a console laptop an hour
 * out would otherwise paint the whole fleet as stalled.
 */

type FleetWorker = {
  hostname: string;
  pool: string;
  status: string;
  version: string;
  running_jobs: number;
  idle_seconds: number | null;
};

type FleetOverride = {
  mode: "warm" | "standdown" | string;
  instances: number;
  expires_at: string;
  reason: string;
};

type FleetState = {
  desired: number;
  actual: number;
  ceiling: number;
  per_region: Record<string, number>;
  driver: string;
  last_error: string;
  last_scaled_at: string | null;
  reported_at: string | null;
  // The controller has stopped reporting. The fleet may still be running;
  // nothing is steering it, which instance counts alone cannot show.
  stale: boolean;
};

type FleetRun = {
  uid: string;
  kind: "probe" | "bench" | string;
  status: "running" | "completed" | "failed" | string;
  total: number;
  completed: number;
  failed: number;
  started_at: string | null;
  finished_at: string | null;
  note: string;
  last_error: string;
  requested_by: string;
  throughput: number | null;
  latency_ms: Record<string, number>;
};

type Upcoming = {
  contest_uid: string;
  title: string;
  starts_at: string;
  ends_at: string;
  participants: number;
  instances: number;
  reason: string;
};

type Fleet = {
  workers: FleetWorker[];
  live: number;
  stale: number;
  running_jobs: number;
  queued_jobs: number;
  desired: number;
  driver: string;
  detail: string;
  override: FleetOverride | null;
  state: FleetState | null;
  upcoming: Upcoming[];
  queue_waiting: number | null;
  queue_inflight: number | null;
  queue_error: string;
  ceiling: number;
};

// Staff watch this while a contest is sitting, so it must be current — but
// it is one screen among several, so not aggressively so.
const POLL_MS = 10_000;

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

const WORKER_STATUS_STYLES: Record<string, string> = {
  online: "border-emerald-200 bg-emerald-50 text-emerald-700",
  busy: "border-sky-200 bg-sky-50 text-sky-700",
  draining: "border-amber-200 bg-amber-50 text-amber-700",
  offline: "border-red-200 bg-red-50 text-red-700",
};

function workerStatusClass(status: string): string {
  return WORKER_STATUS_STYLES[status] ?? WORKER_STATUS_STYLES.offline;
}

const RUN_STATUS_STYLES: Record<string, string> = {
  running: "border-sky-200 bg-sky-50 text-sky-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

function runStatusClass(status: string): string {
  return RUN_STATUS_STYLES[status] ?? RUN_STATUS_STYLES.running;
}

function idleLabel(seconds: number | null): string {
  if (seconds === null) return "never checked in";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m ago`;
}

export function FleetPanel({ inset = false }: { inset?: boolean } = {}) {
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [runs, setRuns] = useState<FleetRun[]>([]);
  const [benchCount, setBenchCount] = useState(100);

  const load = useCallback(async () => {
    try {
      // Two independent fetches: a runs endpoint the deployed API does not
      // serve yet must not take the whole screen down with it.
      const [f, r] = await Promise.all([
        json<Fleet>(await fetch("/api/org/fleet", { cache: "no-store" })),
        fetch("/api/org/fleet/runs", { cache: "no-store" })
          .then((res) => json<FleetRun[]>(res))
          .catch(() => null),
      ]);
      setFleet(f);
      if (r) setRuns(r);
      setError("");
    } catch (err) {
      // Deliberately does not blank the table: a fleet view that vanishes on
      // one failed poll is worse than a slightly stale one, and this screen
      // is read precisely when things are going wrong.
      setError(err instanceof Error ? err.message : "Could not load the fleet.");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  /** Both of these spend money, so the API gates them on owner/admin and a
   * 403 comes back as a readable message rather than a silent no-op. */
  async function act(key: string, run: () => Promise<Response>) {
    setBusy(key);
    setError("");
    try {
      setFleet(await json<Fleet>(await run()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the fleet.");
    } finally {
      setBusy(null);
    }
  }

  const warm = (instances: number) =>
    act("warm", () =>
      fetch("/api/org/fleet?action=warm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instances, minutes: 240 }),
      }),
    );

  const standDown = () =>
    act("standdown", () =>
      fetch("/api/org/fleet?action=stand-down", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: 240 }),
      }),
    );

  const release = () => act("clear", () => fetch("/api/org/fleet", { method: "DELETE" }));

  /** Probe and bench return a run rather than the fleet, so they refresh
   * rather than replacing state. */
  async function run(key: string, url: string, body?: unknown) {
    setBusy(key);
    setError("");
    try {
      await json(
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the run.");
    } finally {
      setBusy(null);
    }
  }

  const backlog = fleet?.queue_waiting ?? fleet?.queued_jobs ?? 0;
  // Nothing alive but work waiting is the one state that always needs
  // attention — it is what a crash-looping fleet looks like from here.
  const stalled = Boolean(fleet && fleet.live === 0 && backlog > 0);

  return (
    <div className={inset ? "space-y-8 px-8 py-6" : "space-y-8"}>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {stalled && (
        <div className="flex gap-3 rounded-xl border border-red-300 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-900">
              Work is waiting and no judge is answering
            </p>
            <p className="mt-1 text-sm text-red-800">
              {backlog} submission{backlog === 1 ? "" : "s"} queued with zero live workers.
              Instances can be running and still not judging — check the fleet controller before
              assuming capacity is the problem.
            </p>
          </div>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Cpu className="h-4 w-4" />
            Judging capacity
          </h3>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900 disabled:opacity-40"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="Live judges"
            value={fleet ? `${fleet.live} / ${fleet.desired}` : "—"}
            hint={fleet ? `${fleet.ceiling} max on this account` : ""}
            tone={fleet && fleet.desired > 0 && fleet.live < fleet.desired ? "warn" : "normal"}
          />
          <Tile
            label="Judging now"
            value={fleet ? `${fleet.running_jobs}` : "—"}
            hint="submissions in flight"
          />
          <Tile
            label="Waiting"
            value={fleet ? `${backlog}` : "—"}
            hint={fleet?.queue_error ? "queue unreadable" : "in the queue"}
            tone={backlog > 0 && fleet?.live === 0 ? "warn" : "normal"}
          />
          <Tile
            label="Not responding"
            value={fleet ? `${fleet.stale}` : "—"}
            hint="stopped heartbeating"
            tone={fleet && fleet.stale > 0 ? "warn" : "normal"}
          />
        </div>

        {fleet && (
          <p className="mt-3 text-xs text-slate-500">
            Wanted: <strong className="text-slate-700">{fleet.desired}</strong>{" "}
            {fleet.driver && `(${fleet.driver}${fleet.detail ? ` — ${fleet.detail}` : ""})`}
            {fleet.state?.reported_at && !fleet.state.stale && (
              <> · controller last spoke {relativeWhen(fleet.state.reported_at)}</>
            )}
          </p>
        )}

        {fleet?.state?.stale && (
          <div className="mt-3 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Nothing is steering the fleet
              </p>
              <p className="mt-1 text-sm text-amber-800">
                The autoscaler last reported{" "}
                {fleet.state.reported_at ? relativeWhen(fleet.state.reported_at) : "never"}. Judges
                already running will keep judging, but the fleet will not grow for a spike or come
                down afterwards.
                {fleet.state.last_error && ` Last error: ${fleet.state.last_error}`}
              </p>
            </div>
          </div>
        )}

        {fleet?.queue_error && (
          <p className="mt-3 text-xs text-amber-700">
            The queue itself could not be read ({fleet.queue_error}), so &ldquo;waiting&rdquo;
            falls back to the job table. These two disagreeing is itself worth investigating.
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CalendarClock className="h-4 w-4" />
          Coming up
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Judges start on their own before a contest opens — there is nothing to remember on the
          morning. Practice contests are deliberately excluded.
        </p>

        {fleet === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : fleet.upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-6 text-center text-sm text-slate-500">
            No contest is running or about to start, so no judges are being held.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Contest</th>
                  <th className="px-4 py-2.5">Starts</th>
                  <th className="px-4 py-2.5 text-right">On the roster</th>
                  <th className="px-4 py-2.5 text-right">Judges held</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fleet.upcoming.map((c) => (
                  <tr key={c.contest_uid}>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-slate-900">{c.title}</span>
                      <span className="ml-2 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500">
                        {c.reason}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {formatWhen(c.starts_at)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                      {c.participants}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">
                      {c.instances}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Flame className="h-4 w-4" />
          Override
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          For a rehearsal, or a contest scheduled by mistake. Owner and admin only — these spend
          money. Every override expires on its own, in both directions.
        </p>

        {fleet?.override ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3">
            <div>
              <p className="text-sm text-slate-900">
                {fleet.override.mode === "standdown" ? (
                  <>
                    Stood down — <strong>no judges</strong> even if a contest wants them
                  </>
                ) : (
                  <>
                    Held warm at <strong>{fleet.override.instances}</strong> judges
                  </>
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Lapses {relativeWhen(fleet.override.expires_at)} ·{" "}
                {formatWhen(fleet.override.expires_at)}
                {fleet.override.reason && ` · ${fleet.override.reason}`}
              </p>
            </div>
            <button
              type="button"
              onClick={release}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900 disabled:opacity-40"
            >
              {busy === "clear" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Undo2 className="h-3.5 w-3.5" />
              )}
              Back to the schedule
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => warm(8)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {busy === "warm" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Flame className="h-3.5 w-3.5" />
              )}
              Warm 8 judges for 4 hours
            </button>
            <button
              type="button"
              onClick={standDown}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900 disabled:opacity-40"
            >
              {busy === "standdown" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PowerOff className="h-3.5 w-3.5" />
              )}
              Stand down
            </button>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Stethoscope className="h-4 w-4" />
          Test bench
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          A <strong>probe</strong> is one synthetic submission through the real judging path — the
          only check that catches a fleet whose instances are up but whose workers are not judging.
          A <strong>load test</strong> is the same thing many times over. Neither ever becomes a
          real submission, so nothing reaches a scoreboard.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => run("probe", "/api/org/fleet?action=probe")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900 disabled:opacity-40"
          >
            {busy === "probe" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Stethoscope className="h-3.5 w-3.5" />
            )}
            Probe once
          </button>

          <span className="ml-2 text-xs text-slate-400">|</span>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            Load test
            <input
              type="number"
              min={1}
              max={2000}
              value={benchCount}
              onChange={(e) => setBenchCount(Number(e.target.value))}
              className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs tabular-nums"
            />
            submissions
          </label>
          <button
            type="button"
            onClick={() =>
              run("bench", "/api/org/fleet?action=bench", { count: benchCount })
            }
            disabled={busy !== null || benchCount < 1}
            title="Refused while a contest is running or about to start"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {busy === "bench" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Run it
          </button>
        </div>

        {runs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-6 text-center text-sm text-slate-500">
            Nothing has been run against the fleet yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Run</th>
                  <th className="px-4 py-2.5">Result</th>
                  <th className="px-4 py-2.5 text-right">Throughput</th>
                  <th className="px-4 py-2.5 text-right">p50 / p90</th>
                  <th className="px-4 py-2.5">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr key={r.uid} className={r.status === "failed" ? "bg-red-50/40" : undefined}>
                    <td className="px-4 py-2.5">
                      <span className="capitalize text-slate-900">{r.kind}</span>
                      <span className="ml-2 text-xs text-slate-500">{r.total} job{r.total === 1 ? "" : "s"}</span>
                      {r.note && <p className="text-xs text-slate-400">{r.note}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${runStatusClass(r.status)}`}>
                        {r.status}
                      </span>
                      {r.failed > 0 && (
                        <span className="ml-2 text-xs text-red-600">{r.failed} failed</span>
                      )}
                      {r.last_error && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                          {r.last_error}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                      {r.throughput === null ? "—" : `${r.throughput}/s`}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                      {r.latency_ms.p50 === undefined
                        ? "—"
                        : `${r.latency_ms.p50} / ${r.latency_ms.p90} ms`}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {r.started_at ? relativeWhen(r.started_at) : "—"}
                      {r.requested_by && <span className="text-slate-400"> · {r.requested_by}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Server className="h-4 w-4" />
          Workers
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          A worker is shown offline once it stops heartbeating, whatever it last reported about
          itself.
        </p>

        {fleet === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : fleet.workers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">
            No judges have registered. The always-on worker and the contest-day fleet both appear
            here once they start.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Worker</th>
                  <th className="px-4 py-2.5">Pool</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Judging</th>
                  <th className="px-4 py-2.5">Last heard from</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fleet.workers.map((w) => {
                  const offline = w.status === "offline";
                  return (
                    <tr key={w.hostname} className={offline ? "bg-red-50/40" : undefined}>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-slate-900">{w.hostname}</span>
                        {w.version && (
                          <span className="ml-2 text-xs text-slate-400">{w.version}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{w.pool}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${workerStatusClass(w.status)}`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                        {w.running_jobs}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {idleLabel(w.idle_seconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  tone = "normal",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "normal" | "warn";
}) {
  return (
    <div
      className={`rounded-xl border bg-white px-4 py-3 ${
        tone === "warn" ? "border-amber-300" : "border-slate-200"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "warn" ? "text-amber-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
