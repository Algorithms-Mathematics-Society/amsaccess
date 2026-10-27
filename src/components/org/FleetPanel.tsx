"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Moon,
  PowerOff,
  RefreshCw,
  Stethoscope,
  Zap,
} from "lucide-react";
import { formatWhen, relativeWhen } from "@/lib/orgTypes";
import { readFleetJson } from "@/lib/client/fleetRead";
import { useOrgReadTask } from "@/lib/client/useOrgReadTask";
import { canSpend, useOrgRole } from "@/lib/client/useOrgRole";

/**
 * Judging, for someone running a contest.
 *
 * This screen answers exactly one question — **are judges ready?** — and
 * offers only the actions that are relevant to the answer. Everything else
 * (which regions, which workers, past load tests) is operator detail and
 * lives behind Details, because on a contest morning the person looking at
 * this needs a verdict, not a dashboard.
 *
 * The judges normally look after themselves: they start before a contest
 * opens and stop afterwards. So the default state of this page is "nothing
 * to do", and it says so.
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
  stale: boolean;
};

export type Upcoming = {
  contest_uid: string;
  title: string;
  starts_at: string;
  ends_at: string;
  participants: number;
  instances: number;
  reason: string;
  /** True when staff pinned the count rather than a headcount implying it. */
  pinned?: boolean;
  /** Where the number came from: "roster", "expected" or "pinned". */
  source?: "roster" | "expected" | "pinned";
};

export type Fleet = {
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

type FleetRun = {
  uid: string;
  kind: string;
  status: string;
  total: number;
  completed: number;
  failed: number;
  started_at: string | null;
  note: string;
  last_error: string;
  requested_by: string;
  throughput: number | null;
  latency_ms: Record<string, number>;
};

const POLL_MS = 10_000;


/**
 * The whole screen in one value.
 *
 * Deliberately a small set of named situations rather than a pile of
 * booleans in the JSX — there are only ever five things worth saying, and
 * naming them keeps the wrong combination from being renderable.
 */
export type Situation = {
  /** Which of the named situations this is, for screens that word it themselves. */
  kind: "checking" | "waiting" | "standdown" | "stale" | "ready" | "starting" | "idle";
  tone: "good" | "warn" | "bad" | "idle";
  headline: string;
  detail: string;
};

export function situationOf(fleet: Fleet | null): Situation {
  if (!fleet) return { kind: "checking", tone: "idle", headline: "Checking…", detail: "" };

  const waiting = fleet.queue_waiting ?? fleet.queued_jobs ?? 0;

  // Work with nobody to do it. Always the most urgent thing on the page:
  // instances can be running and still not judging.
  if (fleet.live === 0 && waiting > 0) {
    return {
      kind: "waiting",
      tone: "bad",
      headline: "Submissions are waiting and no judge is answering",
      detail: `${waiting} waiting. Judges may be starting up — if this does not clear in a couple of minutes, something is wrong.`,
    };
  }

  if (fleet.override?.mode === "standdown") {
    return {
      kind: "standdown",
      tone: "warn",
      headline: "Judging is switched off",
      detail: `Nothing will be judged until this is lifted — automatically ${relativeWhen(fleet.override.expires_at)}, or now with the button below.`,
    };
  }

  if (fleet.state?.stale) {
    return {
      kind: "stale",
      tone: "warn",
      headline: "Judges are running, but nothing is steering them",
      detail:
        "Whatever is already running keeps judging. The fleet will not grow for a rush or stop afterwards until this is fixed.",
    };
  }

  if (fleet.live > 0) {
    const busy = fleet.running_jobs > 0 ? `, ${fleet.running_jobs} judging now` : "";
    const starting =
      fleet.desired > fleet.live ? ` (${fleet.desired - fleet.live} more starting up)` : "";
    return {
      kind: "ready",
      tone: "good",
      headline: `Ready — ${fleet.live} judge${fleet.live === 1 ? "" : "s"} available${busy}`,
      detail: starting.trim() || "Judges will stop on their own when the contest ends.",
    };
  }

  if (fleet.upcoming.length > 0) {
    const next = fleet.upcoming[0];
    return {
      kind: "starting",
      tone: "warn",
      headline: "Judges are starting up",
      detail: `${next.title} needs ${next.instances}. They take about 90 seconds to be ready.`,
    };
  }

  return {
    kind: "idle",
    tone: "idle",
    headline: "No judges running",
    detail: "Nothing is scheduled. They start on their own an hour before a contest.",
  };
}

const TONE: Record<Situation["tone"], { box: string; icon: string; Icon: typeof CheckCircle2 }> = {
  good: {
    box: "border-emerald-200 bg-emerald-50",
    icon: "text-emerald-600",
    Icon: CheckCircle2,
  },
  warn: { box: "border-amber-300 bg-amber-50", icon: "text-amber-600", Icon: Clock },
  bad: { box: "border-red-300 bg-red-50", icon: "text-red-600", Icon: AlertTriangle },
  idle: { box: "border-slate-200 bg-white", icon: "text-slate-400", Icon: Moon },
};

/**
 * The API's wording, turned into something a person can act on.
 *
 * `insufficient role` is accurate and useless: it is what the gate is
 * called, not what happened. Only the handful of messages that a staff
 * member can genuinely run into are translated; everything else is passed
 * through, because inventing friendly text for an unknown failure is how a
 * real error becomes invisible.
 */
function readable(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  if (/insufficient role|not a member/i.test(raw))
    return "Only an owner or admin can change the size of the fleet. Ask one of them, or watch from here.";
  return raw || "That did not work.";
}

export function FleetPanel({ inset = false, onFleetChange, contestContext }: {
  inset?: boolean;
  contestContext?: { isPractice: boolean };
  onFleetChange?: (fleet: Fleet) => void;
} = {}) {
  const { role, known } = useOrgRole();
  // Watching the fleet is open to any staff member; changing its size is
  // not. The buttons used to render for everyone and fail on click with the
  // API's own `insufficient role`, which reads like a bug rather than a
  // boundary.
  const spender = canSpend(role, known);
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [runs, setRuns] = useState<FleetRun[]>([]);
  const [historyStatus, setHistoryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [benchCount, setBenchCount] = useState(100);

  const readFleet = useCallback(async (signal: AbortSignal) => {
    try {
      const value = await readFleetJson<Fleet>("/api/org/fleet", signal);
      if (signal.aborted) return;
      setFleet(value);
      onFleetChange?.(value);
      setError("");
    } catch (err) {
      if (!signal.aborted)
        setError(err instanceof Error ? err.message : "Could not load judging status.");
    }
  }, [onFleetChange]);
  const readRuns = useCallback(async (signal: AbortSignal) => {
    try {
      const value = await readFleetJson<FleetRun[]>("/api/org/fleet/runs", signal);
      if (!signal.aborted) { setRuns(value); setHistoryStatus("ready"); }
    } catch {
      // Retain history, but make its freshness explicit in diagnostics.
      if (!signal.aborted) setHistoryStatus("error");
    }
  }, []);
  const { load: loadFleet, refreshAfterWrite: refreshFleet } = useOrgReadTask(readFleet);
  const { load: loadRuns, refreshAfterWrite: refreshRuns } = useOrgReadTask(readRuns);
  const load = useCallback(async () => {
    await Promise.all([loadFleet(), loadRuns()]);
  }, [loadFleet, loadRuns]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function act(key: string, run: () => Promise<Response>) {
    setBusy(key);
    setError("");
    try {
      await run();
      await Promise.all([refreshFleet(), refreshRuns()]);
    } catch (err) {
      setError(readable(err));
    } finally {
      setBusy(null);
    }
  }

  const post = (url: string, body?: unknown) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Request failed.");
      return r;
    });

  const situation = useMemo(() => situationOf(fleet), [fleet]);
  const tone = TONE[situation.tone];
  const standingDown = fleet?.override?.mode === "standdown";
  const lastProbe = runs.find((r) => r.kind === "probe");

  return (
    <div className={contestContext ? "grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : ""}>
    <div className={inset ? "min-w-0 max-w-3xl space-y-4 px-8 py-6" : "min-w-0 max-w-3xl space-y-4"}>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {contestContext && (
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">Shared judging status</h2>
          <p className="text-sm text-slate-600">Workers and queue counts below are shared across contests, not totals for this contest alone.</p>
          {contestContext.isPractice && <p className="text-sm text-slate-600">This practice contest uses the always-on judge and does not request extra fleet capacity. A zero shared-worker count alone does not establish whether that judge is healthy; use Test judging for a fresh check.</p>}
          {error && fleet && <p className="text-xs text-amber-800">An operation failed. Values below are the last successfully received status snapshot.</p>}
        </div>
      )}

      {/* The answer. Everything else on this page is optional reading. */}
      <div className={`flex gap-3 rounded-xl border p-5 ${tone.box}`}>
        <tone.Icon className={`mt-0.5 h-6 w-6 flex-shrink-0 ${tone.icon}`} />
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-900">{contestContext && situation.kind === "idle" ? "No shared fleet workers reporting" : situation.headline}</p>
          {situation.detail && <p className="mt-1 text-sm text-slate-600">{contestContext?.isPractice && situation.kind === "idle" ? "No shared fleet workers are currently reporting. This is separate from the always-on judging path used by practice contests." : situation.detail}</p>}

          {fleet?.upcoming.length ? (
            <p className="mt-3 text-sm text-slate-600">
              Next: <strong className="text-slate-900">{fleet.upcoming[0].title}</strong>
              {fleet.upcoming[0].reason === "running"
                ? " is running now"
                : ` starts ${relativeWhen(fleet.upcoming[0].starts_at)}`}
            </p>
          ) : null}
        </div>
      </div>

      {contestContext && fleet && (
        <>
          <dl className="grid gap-3 sm:grid-cols-3" aria-label="Shared judging metrics">
            <Metric label="Workers reporting" value={String(fleet.live)} detail={`${fleet.desired} requested · ${fleet.stale} stale reports`} />
            <Metric label="Waiting in shared queue" value={fleet.queue_error ? "Unknown" : String(fleet.queue_waiting ?? fleet.queued_jobs)} detail={fleet.queue_error ? "Queue reading unavailable; this does not mean zero waiting." : "Waiting work across contests; not an estimated completion time."} />
            <Metric label="Jobs running on workers" value={String(fleet.running_jobs)} detail="Reported worker activity; queue delivery counts can differ." />
          </dl>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600">
            <p>Refreshes every 10 seconds while this panel is open. Refresh checks again now.</p>
            {fleet.state?.reported_at && <p className="mt-1">Controller last reported: <time dateTime={fleet.state.reported_at}>{formatWhen(fleet.state.reported_at)}</time>{fleet.state.stale ? " · Report is stale" : ""}.</p>}
            {fleet.override && <p className="mt-1 font-medium">Manual override: {fleet.override.mode === "standdown" ? "stand-down" : fleet.override.mode} until {formatWhen(fleet.override.expires_at)}. This applies to the shared fleet.</p>}
          </div>
          <p className="text-xs text-slate-600">Test judging sends one test submission. Start judges now requests shared capacity for 4 hours and may incur costs; it is not limited to this contest.</p>
        </>
      )}

      {/* Only the actions that make sense right now, for someone allowed to
          take them. Watching is open to all staff; spending is not. */}
      <div className="flex flex-wrap items-center gap-2">
        {!spender ? null : standingDown ? (
          <button
            type="button"
            onClick={() => act("clear", () => fetch("/api/org/fleet", { method: "DELETE" }))}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {busy === "clear" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Switch judging back on
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                // Was a hardcoded 8 against a ceiling of 4 — asking for twice
                // what the same panel prints as "Most we can run", left over
                // from when a judge was a 2 vCPU box. Ask for what exists.
                const wanted = fleet?.ceiling ?? 1;
                if (
                  !window.confirm(
                    `Start ${wanted} judge${wanted === 1 ? "" : "s"} now and hold them for 4 hours? They run until then whether or not a contest needs them.`,
                  )
                )
                  return;
                void act("warm", () =>
                  post("/api/org/fleet?action=warm", { instances: wanted, minutes: 240 }),
                );
              }}
              disabled={busy !== null}
              title="Start judges now instead of waiting for the contest. They stop on their own after 4 hours."
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {busy === "warm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Start judges now
            </button>
            <button
              type="button"
              onClick={() => act("probe", () => post("/api/org/fleet?action=probe"))}
              disabled={busy !== null}
              title="Send one test submission through and check it comes back judged."
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-slate-900 disabled:opacity-40"
            >
              {busy === "probe" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Stethoscope className="h-4 w-4" />
              )}
              Test judging
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-500 hover:text-slate-900"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {lastProbe && (
        <p className="text-xs text-slate-500">
          Last test:{" "}
          {lastProbe.status === "completed" ? (
            <span className="text-emerald-700">
              passed in {lastProbe.latency_ms.p50 ?? "—"} ms
            </span>
          ) : lastProbe.status === "running" ? (
            <span className="text-sky-700">running…</span>
          ) : (
            <span className="text-red-700">failed — {lastProbe.last_error || "see details"}</span>
          )}
          {lastProbe.started_at && ` · ${relativeWhen(lastProbe.started_at)}`}
        </p>
      )}

      {contestContext && (
        <p className="text-xs text-slate-500">
          {lastProbe ? "The last test is a historical result, not a live health guarantee." : "No test result is available in the loaded history."}
          {lastProbe?.started_at && <> Test started: <time dateTime={lastProbe.started_at}>{formatWhen(lastProbe.started_at)}</time>.</>}
          {" "}Details contains worker reports, manual controls and load-test history.
        </p>
      )}

      {/* Everything an operator might want when the answer above looks wrong. */}
      <div>
        <button
          type="button"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          {showDetails ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Details
        </button>

        {showDetails && fleet && (
          <div className="mt-3 space-y-5 rounded-xl border border-slate-200 bg-white p-5">
            <Row label="Judges running" value={`${fleet.live} of ${fleet.desired} wanted`} />
            <Row label="Most we can run" value={`${fleet.ceiling}`} />
            <Row
              label="Waiting to be judged"
              value={fleet.queue_error ? "unknown" : `${fleet.queue_waiting ?? fleet.queued_jobs}`}
            />
            {fleet.state && (
              <Row
                label="Autoscaler last spoke"
                value={
                  fleet.state.reported_at
                    ? `${relativeWhen(fleet.state.reported_at)}${fleet.state.stale ? " — stalled" : ""}`
                    : "never"
                }
              />
            )}
            {fleet.override && (
              <Row
                label="Manual override"
                value={`${fleet.override.mode === "standdown" ? "judging off" : `held at ${fleet.override.instances}`} until ${formatWhen(fleet.override.expires_at)}`}
              />
            )}
            {fleet.state?.last_error && <Row label="Last error" value={fleet.state.last_error} />}

            {!standingDown && spender && (
              <div className="border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Stop all judging for 4 hours? Every contest in that window is affected, including ones already running.",
                      )
                    )
                      return;
                    void act("standdown", () =>
                      post("/api/org/fleet?action=stand-down", { minutes: 240 }),
                    );
                  }}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  {busy === "standdown" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PowerOff className="h-3.5 w-3.5" />
                  )}
                  Switch judging off
                </button>
                <span className="ml-2 text-xs text-slate-400">
                  Stops all judging for 4 hours. Only for a contest scheduled by mistake.
                </span>
              </div>
            )}

            {spender && (
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Load test
              </p>
              <p className="mb-2 text-xs text-slate-400">
                Sends many test submissions at once to see how fast judging keeps up. Refused
                while a contest needs the judges.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={benchCount}
                  onChange={(e) => setBenchCount(Number(e.target.value))}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs tabular-nums"
                />
                <button
                  type="button"
                  onClick={() =>
                    act("bench", () => post("/api/org/fleet?action=bench", { count: benchCount }))
                  }
                  disabled={busy !== null || benchCount < 1}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900 disabled:opacity-40"
                >
                  {busy === "bench" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  Run load test
                </button>
              </div>
              {runs.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {runs.slice(0, 5).map((r) => (
                    <li key={r.uid} className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-slate-600">
                        {r.kind} · {r.total} job{r.total === 1 ? "" : "s"}
                        {r.started_at && (
                          <span className="text-slate-400">
                            {" · "}
                            {relativeWhen(r.started_at)}
                          </span>
                        )}
                      </span>
                      <span className={r.status === "failed" ? "text-red-600" : "text-slate-500"}>
                        {r.status}
                        {r.throughput !== null && ` · ${r.throughput}/s`}
                        {r.latency_ms.p50 !== undefined && ` · p50 ${r.latency_ms.p50}ms`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            )}

            {fleet.workers.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Workers
                </p>
                <ul className="space-y-1">
                  {fleet.workers.map((w) => (
                    <li key={w.hostname} className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="truncate font-mono text-slate-700">{w.hostname}</span>
                      <span className={w.status === "offline" ? "text-red-600" : "text-slate-500"}>
                        {w.status}
                        {w.running_jobs > 0 && ` · ${w.running_jobs} judging`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    {contestContext && <JudgingDiagnostics fleet={fleet} runs={runs} historyStatus={historyStatus} snapshotUncertain={Boolean(error)} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="flex-shrink-0 text-slate-500">{label}</span>
      {/* AWS error strings run to several hundred characters. Without
          min-w-0 and a wrap they overflow the card and the interesting end of
          the message — which region, which permission — is the part that
          disappears. */}
      <span className="min-w-0 break-words text-right text-slate-900">{value}</span>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4">
    <dt className="text-xs font-medium text-slate-600">{label}</dt>
    <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</dd>
    <dd className="mt-1 text-xs text-slate-500">{detail}</dd>
  </div>;
}


function DiagnosticMessage({ title, message }: { title: string; message: string }) {
  return <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
    <p className="text-sm font-medium text-amber-900">{title}</p>
    <details className="mt-2 text-xs text-slate-700">
      <summary className="cursor-pointer rounded focus-visible:outline focus-visible:outline-2">Show reported message</summary>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono [overflow-wrap:anywhere]">{message}</pre>
    </details>
  </div>;
}

function JudgingDiagnostics({ fleet, runs, historyStatus, snapshotUncertain }: {
  fleet: Fleet | null; runs: FleetRun[]; historyStatus: "loading" | "ready" | "error"; snapshotUncertain: boolean;
}) {
  const recent = runs.slice(0, 5);
  return <aside aria-label="Judging diagnostics" className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-base font-semibold text-slate-900">Judging diagnostics</h2>
    <p className="mt-1 text-sm text-slate-600">Reported errors and recent tests for the shared judging service, across contests.</p>
    <p className="mt-2 text-xs text-slate-500">Uses the existing 10-second refresh. These are status reports, not raw judge logs.</p>
    <section className="mt-5 space-y-3" aria-label="Latest status reports">
      <h3 className="text-sm font-semibold text-slate-900">Latest status reports</h3>
      {!fleet ? <p className="text-sm text-slate-500">Judging status is not available yet.</p> : <>
        {snapshotUncertain && <p className="text-xs text-amber-800">An operation failed. These reports are from the last successfully loaded snapshot.</p>}
        {fleet.state?.reported_at && <p className="text-xs text-slate-500">Controller reported: {formatWhen(fleet.state.reported_at)}</p>}
        {fleet.state?.last_error && <DiagnosticMessage title="The controller reported a problem managing judges" message={fleet.state.last_error} />}
        {fleet.queue_error && <DiagnosticMessage title="Queue status could not be read" message={fleet.queue_error} />}
        {fleet.state?.stale && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The controller report is out of date. Current judge capacity may differ from this snapshot.</p>}
        {!fleet.state && <p className="text-sm text-slate-500">No controller report is available.</p>}
        {!fleet.state?.last_error && !fleet.queue_error && <p className="text-sm text-slate-600">No error message in the available status reports. This does not confirm that judging is healthy.</p>}
      </>}
    </section>
    <section className="mt-5 border-t border-slate-100 pt-4" aria-label="Recent judging tests">
      <h3 className="text-sm font-semibold text-slate-900">Recent judging tests</h3>
      <p className="mt-1 text-xs text-slate-500">Latest five available results. Past tests do not guarantee current health.</p>
      {historyStatus === "loading" && <p className="mt-3 text-sm text-slate-500">Loading test history…</p>}
      {historyStatus === "error" && <p className="mt-3 text-sm text-amber-800">Test history could not be refreshed. Any results below are from an earlier successful read.</p>}
      {historyStatus === "ready" && recent.length === 0 && <p className="mt-3 text-sm text-slate-500">No tests in the available history. Use Test judging for a fresh check.</p>}
      <ul className="mt-3 space-y-3">
        {recent.map(run => {
          const hasFailure = run.status === "failed" || run.failed > 0 || Boolean(run.last_error);
          const label = hasFailure ? "Problem reported" : run.status === "completed" ? "Completed" : run.status === "running" ? "Running" : run.status;
          return <li key={run.uid} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-900">{run.kind === "probe" ? "Judging check" : run.kind === "bench" ? "Load test" : run.kind}</span>
              <span className={hasFailure ? "text-xs font-medium text-red-700" : "text-xs text-slate-600"}>{label}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{run.started_at ? `Started ${formatWhen(run.started_at)}` : "Start time unavailable"}</p>
            <p className="mt-2 text-xs text-slate-600">{run.completed} completed · {run.failed} failed · {run.total} total</p>
            {run.last_error && <div className="mt-3"><DiagnosticMessage title="Test reported an error" message={run.last_error} /></div>}
          </li>;
        })}
      </ul>
    </section>
  </aside>;
}
