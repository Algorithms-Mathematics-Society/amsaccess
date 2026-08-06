"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Plus,
  Activity,
  Send,
  Loader2,
  CalendarClock,
  RefreshCw,
  Download,
  Trash2,
} from "lucide-react";
import type { Contest, ContestSubmission, Problem } from "@/lib/orgTypes";
import { formatWhen, relativeWhen, statusClass } from "@/lib/orgTypes";
import { verdictClass } from "@/lib/contestTypes";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { InvigilationPanel } from "./InvigilationPanel";

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

// Judging usually settles in seconds, so poll quickly while anything is
// pending and back right off when nothing is. A setter watching an idle
// contest should not generate steady load for hours.
const POLL_BUSY_MS = 2_000;
const POLL_IDLE_MS = 20_000;

export function ContestConsole({ contestUid }: { contestUid: string }) {
  const [contest, setContest] = useState<Contest | null>(null);
  const [submissions, setSubmissions] = useState<ContestSubmission[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<
    "problems" | "participants" | "submissions" | "invigilation"
  >("problems");

  const loadContest = useCallback(async () => {
    try {
      setContest(
        await json<Contest>(
          await fetch(`/api/org/contests/${contestUid}`, { cache: "no-store" }),
        ),
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the contest.");
    }
  }, [contestUid]);

  const loadSubmissions = useCallback(async () => {
    try {
      setSubmissions(
        await json<ContestSubmission[]>(
          await fetch(`/api/org/contests/${contestUid}/submissions?limit=200`, {
            cache: "no-store",
          }),
        ),
      );
    } catch {
      // A failed poll is not worth replacing the table with an error; the
      // next tick usually succeeds and the stale rows stay readable.
    }
  }, [contestUid]);

  useEffect(() => {
    void loadContest();
    void loadSubmissions();
  }, [loadContest, loadSubmissions]);

  const pending = useMemo(
    () => submissions.some((s) => s.status === "queued" || s.status === "running"),
    [submissions],
  );

  useEffect(() => {
    const id = setInterval(() => void loadSubmissions(), pending ? POLL_BUSY_MS : POLL_IDLE_MS);
    return () => clearInterval(id);
  }, [pending, loadSubmissions]);

  if (error && !contest) {
    return (
      <div className="px-8 py-6">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }
  if (!contest) return <div className="px-8 py-6 text-sm text-slate-500">Loading…</div>;

  const counts = submissions.reduce<Record<string, number>>((acc, s) => {
    const key = s.verdict ?? s.status;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <Link
          href="/org/contests"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Contests
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                {contest.title}
              </h1>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusClass(contest.status)}`}
              >
                {contest.status}
              </span>
              {contest.frozen && (
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                  scoreboard frozen
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>
                {formatWhen(contest.starts_at)} → {formatWhen(contest.ends_at)}{" "}
                <span className="text-slate-400">({relativeWhen(contest.starts_at)})</span>
              </span>
              <Reschedule contest={contest} onChanged={loadContest} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {contest.status === "draft" && (
              <PublishButton contestUid={contest.uid} onPublished={loadContest} />
            )}
            {contest.invite_code && <InviteCode code={contest.invite_code} />}
          </div>
        </div>

        {contest.status === "draft" && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            This contest is a <strong>draft</strong>. Nobody can join with the invite code until
            you publish it
            {contest.problems.length === 0 && " — and it needs at least one problem first"}.
          </p>
        )}
      </header>

      <div className="border-b border-slate-200 bg-white px-8">
        <nav className="flex gap-6">
          {(["problems", "participants", "submissions", "invigilation"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`border-b-2 px-1 py-3 text-sm font-medium capitalize transition ${
                tab === t
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t}
              {t === "submissions" && submissions.length > 0 && (
                <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  {submissions.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-8 py-3">
        <RejudgeButton contestUid={contest.uid} onDone={loadSubmissions} />
        <a
          href={`/api/org/contests/${contest.uid}/export?kind=standings`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900"
        >
          <Download className="h-3.5 w-3.5" />
          Standings CSV
        </a>
        <a
          href={`/api/org/contests/${contest.uid}/export?kind=submissions`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900"
        >
          <Download className="h-3.5 w-3.5" />
          Submissions CSV
        </a>
      </div>

      <div className="px-8 py-6">
        {tab === "problems" ? (
          <ProblemsTab contest={contest} onChange={loadContest} />
        ) : tab === "participants" ? (
          <ParticipantsPanel contestUid={contest.uid} contestTitle={contest.title} />
        ) : tab === "submissions" ? (
          <SubmissionsTab submissions={submissions} counts={counts} pending={pending} />
        ) : (
          <InvigilationPanel contestUid={contest.uid} />
        )}
      </div>
    </div>
  );
}

/** Move the contest window.
 *
 * Reached for constantly while testing: a contest created with tomorrow's
 * default start cannot be exercised today, and without this the only remedy
 * is creating another one — orphaning the invite code, the roster, and any
 * problems already attached.
 */
function Reschedule({ contest, onChanged }: { contest: Contest; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [starts, setStarts] = useState(toLocalInput(contest.starts_at));
  const [ends, setEnds] = useState(toLocalInput(contest.ends_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const invalid = new Date(ends) <= new Date(starts);

  async function save(startISO: string, endISO: string) {
    setBusy(true);
    setError("");
    try {
      await json(
        await fetch(`/api/org/contests/${contest.uid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ starts_at: startISO, ends_at: endISO }),
        }),
      );
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reschedule.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        Reschedule
      </button>
    );
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-600">
          Starts
          <input
            type="datetime-local"
            value={starts}
            onChange={(e) => setStarts(e.target.value)}
            className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs"
          />
        </label>
        <label className="text-xs text-slate-600">
          Ends
          <input
            type="datetime-local"
            value={ends}
            onChange={(e) => setEnds(e.target.value)}
            className={`mt-0.5 w-full rounded border px-2 py-1 text-xs ${
              invalid ? "border-red-400" : "border-slate-300"
            }`}
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => save(new Date(starts).toISOString(), new Date(ends).toISOString())}
          disabled={busy || invalid}
          className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {/* The reason this control exists: making a contest testable now. */}
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            save(
              new Date(now.getTime() - 60_000).toISOString(),
              new Date(now.getTime() + 3 * 60 * 60_000).toISOString(),
            );
          }}
          disabled={busy}
          className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-700 disabled:opacity-40"
        >
          Start now (3h)
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1 text-xs text-slate-500"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** `datetime-local` wants local wall-clock, not an ISO instant. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Draft → live.
 *
 * A contest is created as a draft on purpose: problems are added before
 * anyone can get in. But that only works if there is a way out of draft, and
 * without this the invite code silently refused everyone with "contest has
 * not been published yet".
 */
function PublishButton({
  contestUid,
  onPublished,
}: {
  contestUid: string;
  onPublished: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function publish() {
    setBusy(true);
    setError("");
    try {
      await json(
        await fetch(`/api/org/contests/${contestUid}/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
      );
      onPublished();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={publish}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {busy ? "Publishing…" : "Publish"}
      </button>
      {error && <p className="mt-1 max-w-xs text-xs text-red-600">{error}</p>}
    </div>
  );
}

function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is blocked in some contexts; the code is on screen anyway.
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Invite code</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="font-mono text-lg font-semibold tracking-[0.2em] text-slate-900">
          {code}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy invite code"
          className="rounded p-1 text-slate-400 transition hover:bg-white hover:text-slate-900"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ProblemsTab({ contest, onChange }: { contest: Contest; onChange: () => void }) {
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {contest.problems.length} problem{contest.problems.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-900"
        >
          <Plus className="h-4 w-4" />
          Add problem
        </button>
      </div>

      {adding && (
        <AddProblemForm
          contestUid={contest.uid}
          usedLabels={contest.problems.map((p) => p.label)}
          onDone={() => {
            setAdding(false);
            onChange();
          }}
        />
      )}

      {contest.problems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          No problems yet. A contest with no problems cannot be taken.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Label</th>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Limits</th>
                <th className="px-4 py-2.5 text-right">Score</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contest.problems.map((p) => (
                <tr key={p.uid}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.label}</td>
                  <td className="px-4 py-3 text-slate-700">{p.title}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {p.time_limit_ms ? `${p.time_limit_ms} ms` : "default"} ·{" "}
                    {p.memory_limit_mb ? `${p.memory_limit_mb} MB` : "default"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{p.score}</td>
                  <td className="px-4 py-3 text-right">
                    <RemoveProblem contestUid={contest.uid} cpUid={p.uid} onDone={onChange} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddProblemForm({
  contestUid,
  usedLabels,
  onDone,
}: {
  contestUid: string;
  usedLabels: string[];
  onDone: () => void;
}) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [versionUid, setVersionUid] = useState("");
  // Suggest the next free letter rather than making the setter work it out.
  const nextLabel =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((l) => !usedLabels.includes(l)) ?? "";
  const [label, setLabel] = useState(nextLabel);
  const [score, setScore] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        setProblems(await json<Problem[]>(await fetch("/api/org/problems", { cache: "no-store" })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load problems.");
      }
    })();
  }, []);

  // Only versions with a package can actually judge anything.
  const options = problems.flatMap((p) =>
    p.versions.filter((v) => v.has_package).map((v) => ({ problem: p, version: v })),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await json(
        await fetch(`/api/org/contests/${contestUid}/problems`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ problem_version_uid: versionUid, label, score }),
        }),
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the problem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <label className="block text-sm font-medium text-slate-700">Problem version</label>
        <select
          value={versionUid}
          onChange={(e) => setVersionUid(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        >
          <option value="">Choose…</option>
          {options.map(({ problem, version }) => (
            <option key={version.uid} value={version.uid}>
              {problem.title} — v{version.version}
            </option>
          ))}
        </select>
        {options.length === 0 && (
          <p className="mt-1 text-xs text-amber-700">
            No problem has an uploaded package yet. Upload one under Problems first.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value.toUpperCase().slice(0, 8))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          {usedLabels.includes(label) && (
            <p className="mt-1 text-xs text-red-600">That label is already used.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Score</label>
          <input
            type="number"
            min={0}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !versionUid || !label || usedLabels.includes(label)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SubmissionsTab({
  submissions,
  counts,
  pending,
}: {
  submissions: ContestSubmission[];
  counts: Record<string, number>;
  pending: boolean;
}) {
  if (submissions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        No submissions yet.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {pending && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            judging
          </span>
        )}
        {Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([key, n]) => (
            <span
              key={key}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${verdictClass(key)}`}
            >
              {key} · {n}
            </span>
          ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">When</th>
              <th className="px-4 py-2.5">Who</th>
              <th className="px-4 py-2.5">Problem</th>
              <th className="px-4 py-2.5">Verdict</th>
              <th className="px-4 py-2.5 text-right">Tests</th>
              <th className="px-4 py-2.5 text-right">Time</th>
              <th className="px-4 py-2.5 text-right">Memory</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {submissions.map((s) => (
              <tr key={s.uid} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                  {new Date(s.created_at).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2.5 text-slate-700">{s.display_name || s.username}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{s.problem_label}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${verdictClass(s.verdict ?? s.status)}`}
                  >
                    {s.verdict ?? s.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {s.total_count ? `${s.passed_count}/${s.total_count}` : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {s.max_runtime_ms ? `${s.max_runtime_ms} ms` : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {s.max_memory_kb ? `${Math.round(s.max_memory_kb / 1024)} MB` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/** Re-run judging.
 *
 * Defaults to `SE` only, because that is the case worth repairing: a
 * System Error is the judge having failed, not the contestant. Re-running
 * an entire contest disturbs results that were already correct, so the
 * broader option is deliberately one click further away.
 */
function RejudgeButton({ contestUid, onDone }: { contestUid: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function run(verdict: string) {
    setBusy(true);
    setResult("");
    try {
      const query = verdict ? `?verdict=${verdict}` : "";
      const res = await fetch(`/api/org/contests/${contestUid}/rejudge${query}`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        queued?: number;
        error?: string;
        detail?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not rejudge.");
      setResult(
        data.queued ? `${data.queued} queued — verdicts update as they finish` : "nothing matched",
      );
      setOpen(false);
      onDone();
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Could not rejudge.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
        Rejudge
      </button>

      {open && (
        <span className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => run("SE")}
            disabled={busy}
            className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
          >
            Failed only (SE)
          </button>
          <button
            type="button"
            onClick={() => run("")}
            disabled={busy}
            className="rounded border border-amber-400 px-2.5 py-1 text-xs text-amber-800 disabled:opacity-40"
          >
            Everything
          </button>
        </span>
      )}

      {result && <span className="text-xs text-slate-500">{result}</span>}
    </span>
  );
}

function RemoveProblem({
  contestUid,
  cpUid,
  onDone,
}: {
  contestUid: string;
  cpUid: string;
  onDone: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setError("");
    try {
      const res = await fetch(`/api/org/contests/${contestUid}/problems/${cpUid}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Could not remove.");
      onDone();
    } catch (err) {
      // The server refuses once anyone has submitted, and the reason is the
      // useful part — showing it beats a generic failure.
      setError(err instanceof Error ? err.message : "Could not remove.");
      setArmed(false);
    }
  }

  if (error) return <span className="text-xs text-amber-700">{error}</span>;

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        title="Remove from this contest"
        className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <span className="inline-flex gap-1">
      <button
        type="button"
        onClick={remove}
        className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white"
      >
        Remove
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded px-1.5 text-xs text-slate-500"
      >
        Cancel
      </button>
    </span>
  );
}
