"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Cpu, Loader2, RefreshCw, Server } from "lucide-react";

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

type Fleet = {
  workers: FleetWorker[];
  live: number;
  stale: number;
  running_jobs: number;
  queued_jobs: number;
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

function idleLabel(seconds: number | null): string {
  if (seconds === null) return "never checked in";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m ago`;
}

export function FleetPanel() {
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setFleet(await json<Fleet>(await fetch("/api/org/fleet", { cache: "no-store" })));
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

  const backlog = fleet?.queue_waiting ?? fleet?.queued_jobs ?? 0;
  // Nothing alive but work waiting is the one state that always needs
  // attention — it is what a crash-looping fleet looks like from here.
  const stalled = Boolean(fleet && fleet.live === 0 && backlog > 0);

  return (
    <div className="space-y-8">
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
            value={fleet ? `${fleet.live}` : "—"}
            hint={fleet ? `${fleet.ceiling} max on this account` : ""}
            tone={fleet && fleet.live === 0 ? "warn" : "normal"}
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

        {fleet?.queue_error && (
          <p className="mt-3 text-xs text-amber-700">
            The queue itself could not be read ({fleet.queue_error}), so &ldquo;waiting&rdquo;
            falls back to the job table. These two disagreeing is itself worth investigating.
          </p>
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
