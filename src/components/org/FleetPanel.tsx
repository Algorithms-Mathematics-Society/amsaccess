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

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

/**
 * The whole screen in one value.
 *
 * Deliberately a small set of named situations rather than a pile of
 * booleans in the JSX — there are only ever five things worth saying, and
 * naming them keeps the wrong combination from being renderable.
 */
type Situation = {
  tone: "good" | "warn" | "bad" | "idle";
  headline: string;
  detail: string;
};

function situationOf(fleet: Fleet | null): Situation {
  if (!fleet) return { tone: "idle", headline: "Checking…", detail: "" };

  const waiting = fleet.queue_waiting ?? fleet.queued_jobs ?? 0;

  // Work with nobody to do it. Always the most urgent thing on the page:
  // instances can be running and still not judging.
  if (fleet.live === 0 && waiting > 0) {
    return {
      tone: "bad",
      headline: "Submissions are waiting and no judge is answering",
      detail: `${waiting} waiting. Judges may be starting up — if this does not clear in a couple of minutes, something is wrong.`,
    };
  }

  if (fleet.override?.mode === "standdown") {
    return {
      tone: "warn",
      headline: "Judging is switched off",
      detail: `Nothing will be judged until this is lifted — automatically ${relativeWhen(fleet.override.expires_at)}, or now with the button below.`,
    };
  }

  if (fleet.state?.stale) {
    return {
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
      tone: "good",
      headline: `Ready — ${fleet.live} judge${fleet.live === 1 ? "" : "s"} available${busy}`,
      detail: starting.trim() || "Judges will stop on their own when the contest ends.",
    };
  }

  if (fleet.upcoming.length > 0) {
    const next = fleet.upcoming[0];
    return {
      tone: "warn",
      headline: "Judges are starting up",
      detail: `${next.title} needs ${next.instances}. They take about 90 seconds to be ready.`,
    };
  }

  return {
    tone: "idle",
    headline: "No judges running",
    detail: "Nothing is scheduled. They start on their own about half an hour before a contest.",
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

export function FleetPanel({ inset = false }: { inset?: boolean } = {}) {
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [runs, setRuns] = useState<FleetRun[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
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
      // Deliberately does not blank the page: a stale answer beats no answer
      // on the screen you read when things are going wrong.
      setError(err instanceof Error ? err.message : "Could not load judging status.");
    }
  }, []);

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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
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
    <div className={inset ? "max-w-3xl space-y-4 px-8 py-6" : "max-w-3xl space-y-4"}>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* The answer. Everything else on this page is optional reading. */}
      <div className={`flex gap-3 rounded-xl border p-5 ${tone.box}`}>
        <tone.Icon className={`mt-0.5 h-6 w-6 flex-shrink-0 ${tone.icon}`} />
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-900">{situation.headline}</p>
          {situation.detail && <p className="mt-1 text-sm text-slate-600">{situation.detail}</p>}

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

      {/* Only the actions that make sense right now. */}
      <div className="flex flex-wrap items-center gap-2">
        {standingDown ? (
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
              onClick={() => act("warm", () => post("/api/org/fleet?action=warm", { instances: 8, minutes: 240 }))}
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

      {/* Everything an operator might want when the answer above looks wrong. */}
      <div>
        <button
          type="button"
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

            {!standingDown && (
              <div className="border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    act("standdown", () =>
                      post("/api/org/fleet?action=stand-down", { minutes: 240 }),
                    )
                  }
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
