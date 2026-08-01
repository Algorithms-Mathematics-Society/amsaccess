"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Contest,
  ContestProblem,
  Scoreboard,
  Submission,
} from "@/lib/contestTypes";
import { verdictClass, VERDICT_LABELS } from "@/lib/contestTypes";

type Tab = "problem" | "submissions" | "scoreboard";

const STARTER = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
`;

/** Draft code is kept per contest+problem so switching tabs — or reloading
 *  mid-contest — never loses what someone typed. */
function draftKey(contestUid: string, label: string) {
  return `ams:draft:${contestUid}:${label}`;
}

function useCountdown(endsAt: string) {
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, new Date(endsAt).getTime() - Date.now()),
  );
  useEffect(() => {
    const id = setInterval(
      () => setRemaining(Math.max(0, new Date(endsAt).getTime() - Date.now())),
      1000,
    );
    return () => clearInterval(id);
  }, [endsAt]);

  const total = Math.floor(remaining / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return { text: `${h}:${m}:${s}`, expired: remaining <= 0, remaining };
}

export default function ContestRoom({ initial }: { initial: Contest }) {
  const [contest, setContest] = useState(initial);
  const [tab, setTab] = useState<Tab>("problem");
  const [active, setActive] = useState<ContestProblem | null>(
    initial.problems[0] ?? null,
  );
  const [source, setSource] = useState(STARTER);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const countdown = useCountdown(contest.ends_at);
  const running = contest.status === "running" && !countdown.expired;

  // Any submission not yet in a terminal state is a reason to keep polling.
  const pending = useMemo(
    () => submissions.some((s) => s.status !== "completed" && s.status !== "failed"),
    [submissions],
  );

  const loadSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/contest/submissions?contest_uid=${contest.uid}`);
      if (res.ok) setSubmissions(await res.json());
    } catch {
      /* a dropped poll is not worth interrupting the contest for */
    }
  }, [contest.uid]);

  const loadScoreboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/contest/${contest.uid}/scoreboard`);
      if (res.ok) setScoreboard(await res.json());
    } catch {
      /* ditto */
    }
  }, [contest.uid]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  // Poll fast while a verdict is outstanding, slowly otherwise. A contestant
  // watching for a result wants it now; an idle tab shouldn't hammer the API
  // with 10,000 others doing the same.
  useEffect(() => {
    const period = pending ? 1500 : 15000;
    const id = setInterval(() => void loadSubmissions(), period);
    return () => clearInterval(id);
  }, [pending, loadSubmissions]);

  useEffect(() => {
    if (tab !== "scoreboard") return;
    void loadScoreboard();
    const id = setInterval(() => void loadScoreboard(), 20000);
    return () => clearInterval(id);
  }, [tab, loadScoreboard]);

  // Restore the draft whenever the selected problem changes.
  useEffect(() => {
    if (!active) return;
    const saved = window.localStorage.getItem(draftKey(contest.uid, active.label));
    setSource(saved ?? STARTER);
  }, [active, contest.uid]);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(
      () => window.localStorage.setItem(draftKey(contest.uid, active.label), source),
      400,
    );
    return () => clearTimeout(id);
  }, [source, active, contest.uid]);

  async function submit() {
    if (!active || busy || !running) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/contest/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contest_uid: contest.uid,
          problem_label: active.label,
          language: "cpp",
          source,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed.");
        return;
      }
      setNotice(`Submitted ${active.label}. Judging…`);
      setSubmissions((prev) => [data as Submission, ...prev]);
      setTab("submissions");
    } catch {
      setError("Network problem — your code was not submitted.");
    } finally {
      setBusy(false);
    }
  }

  const solved = useMemo(() => {
    const set = new Set<string>();
    for (const s of submissions) if (s.verdict === "AC") set.add(s.problem_label);
    return set;
  }, [submissions]);

  return (
    <div className="min-h-screen bg-ams-bg text-ams-ink">
      <header className="border-b border-ams-border bg-ams-panel/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-ams-heading">
              {contest.title}
            </h1>
            <p className="text-xs text-ams-muted">
              {contest.is_practice ? "Practice run · unrated" : "Rated contest"}
              {contest.frozen && " · scoreboard frozen"}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div
              className={`rounded-md border px-3 py-1.5 font-mono text-sm tabular-nums ${
                countdown.remaining < 5 * 60 * 1000 && running
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  : "border-ams-border bg-ams-field text-ams-heading"
              }`}
              aria-label="Time remaining"
            >
              {running ? countdown.text : contest.status.toUpperCase()}
            </div>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 px-6" aria-label="Contest sections">
          {(["problem", "submissions", "scoreboard"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-current={tab === t ? "page" : undefined}
              className={`rounded-t-md px-4 py-2 text-sm capitalize transition ${
                tab === t
                  ? "bg-ams-surface text-ams-heading"
                  : "text-ams-muted hover:text-ams-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {!running && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {contest.status === "ended" || countdown.expired
              ? "This contest has ended. You can review problems and results, but not submit."
              : "This contest is not running yet."}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {contest.problems.map((p) => (
            <button
              key={p.uid}
              onClick={() => {
                setActive(p);
                setTab("problem");
              }}
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition ${
                active?.uid === p.uid
                  ? "border-ams-accent bg-ams-accent/10 text-ams-heading"
                  : "border-ams-border bg-ams-field text-ams-muted hover:text-ams-ink"
              }`}
            >
              <span className="font-mono font-semibold">{p.label}</span>
              <span className="max-w-[14rem] truncate">{p.title}</span>
              {solved.has(p.label) && (
                <span aria-label="solved" className="text-emerald-400">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "problem" && active && (
            <ProblemPane
              problem={active}
              source={source}
              onSource={setSource}
              onSubmit={submit}
              busy={busy}
              running={running}
              error={error}
              notice={notice}
            />
          )}
          {tab === "submissions" && <SubmissionsPane submissions={submissions} />}
          {tab === "scoreboard" && (
            <ScoreboardPane
              scoreboard={scoreboard}
              problems={contest.problems}
              frozen={contest.frozen}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProblemPane({
  problem,
  source,
  onSource,
  onSubmit,
  busy,
  running,
  error,
  notice,
}: {
  problem: ContestProblem;
  source: string;
  onSource: (s: string) => void;
  onSubmit: () => void;
  busy: boolean;
  running: boolean;
  error: string | null;
  notice: string | null;
}) {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Ctrl/Cmd+Enter submits — the shortcut every judge has, and the one people
  // reach for without thinking during the last five minutes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSubmit]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-ams-border bg-ams-surface p-5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-2xl font-bold text-ams-accent">
            {problem.label}
          </span>
          <h2 className="text-xl font-semibold text-ams-heading">{problem.title}</h2>
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ams-muted">
          <div className="flex gap-1">
            <dt>Time limit</dt>
            <dd className="text-ams-ink">{problem.time_limit_ms} ms</dd>
          </div>
          <div className="flex gap-1">
            <dt>Memory limit</dt>
            <dd className="text-ams-ink">{problem.memory_limit_mb} MB</dd>
          </div>
          <div className="flex gap-1">
            <dt>Score</dt>
            <dd className="text-ams-ink">{problem.score}</dd>
          </div>
        </dl>

        <div className="mt-5 rounded-md border border-ams-border bg-ams-field p-4 text-sm text-ams-muted">
          The full statement ships inside the problem package. Open the
          attachment your organiser provided, or read it in the contest
          briefing.
        </div>
      </section>

      <section className="flex flex-col rounded-lg border border-ams-border bg-ams-surface">
        <div className="flex items-center justify-between border-b border-ams-border px-4 py-2">
          <span className="text-sm text-ams-muted">
            Solution · <span className="font-mono">C++23</span>
          </span>
          <span className="text-xs text-ams-muted">⌘/Ctrl + ↵ to submit</span>
        </div>
        <label htmlFor="editor" className="sr-only">
          Your solution
        </label>
        <textarea
          id="editor"
          ref={editorRef}
          value={source}
          onChange={(e) => onSource(e.target.value)}
          spellCheck={false}
          className="min-h-[24rem] flex-1 resize-none bg-transparent p-4 font-mono text-sm
                     leading-relaxed text-ams-ink outline-none"
        />
        <div className="border-t border-ams-border p-3">
          {error && (
            <p role="alert" className="mb-2 text-sm text-rose-400">
              {error}
            </p>
          )}
          {notice && !error && (
            <p role="status" className="mb-2 text-sm text-emerald-400">
              {notice}
            </p>
          )}
          <button
            onClick={onSubmit}
            disabled={busy || !running}
            className="w-full rounded-md bg-ams-accent px-4 py-2.5 font-semibold text-ams-dark
                       transition hover:brightness-110 disabled:cursor-not-allowed
                       disabled:opacity-40"
          >
            {busy ? "Submitting…" : running ? `Submit ${problem.label}` : "Contest closed"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SubmissionsPane({ submissions }: { submissions: Submission[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (submissions.length === 0) {
    return (
      <p className="rounded-lg border border-ams-border bg-ams-surface p-8 text-center text-ams-muted">
        No submissions yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ams-border">
      <table className="w-full text-sm">
        <thead className="bg-ams-panel text-left text-xs uppercase tracking-wide text-ams-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Problem</th>
            <th className="px-4 py-2 font-medium">Verdict</th>
            <th className="px-4 py-2 font-medium">Tests</th>
            <th className="px-4 py-2 font-medium">Time</th>
            <th className="px-4 py-2 font-medium">Memory</th>
            <th className="px-4 py-2 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ams-border bg-ams-surface">
          {submissions.map((s) => {
            const settled = s.status === "completed" || s.status === "failed";
            return (
              <>
                <tr
                  key={s.uid}
                  onClick={() => setOpen(open === s.uid ? null : s.uid)}
                  className="cursor-pointer hover:bg-ams-field/50"
                >
                  <td className="px-4 py-2 font-mono font-semibold">{s.problem_label}</td>
                  <td className="px-4 py-2">
                    {settled && s.verdict ? (
                      <span
                        className={`inline-block rounded border px-2 py-0.5 font-mono text-xs ${verdictClass(s.verdict)}`}
                        title={VERDICT_LABELS[s.verdict] ?? s.verdict}
                      >
                        {s.verdict}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-ams-muted">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ams-accent" />
                        {s.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-ams-muted">
                    {settled ? `${s.passed_count}/${s.total_count}` : "—"}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-ams-muted">
                    {settled ? `${s.max_runtime_ms} ms` : "—"}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-ams-muted">
                    {settled ? `${Math.round(s.max_memory_kb / 1024)} MB` : "—"}
                  </td>
                  <td className="px-4 py-2 text-ams-muted">
                    {new Date(s.created_at).toLocaleTimeString()}
                  </td>
                </tr>
                {open === s.uid && (
                  <tr key={`${s.uid}-detail`} className="bg-ams-field/40">
                    <td colSpan={6} className="px-4 py-3">
                      {s.compile_output && (
                        <pre className="mb-3 max-h-56 overflow-auto whitespace-pre-wrap rounded border border-ams-border bg-ams-bg p-3 font-mono text-xs text-rose-300">
                          {s.compile_output}
                        </pre>
                      )}
                      {s.testcases.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {s.testcases.map((tc) => (
                            <span
                              key={tc.testcase_no}
                              title={`#${tc.testcase_no} ${tc.verdict} · ${tc.runtime_ms} ms${tc.checker_message ? ` · ${tc.checker_message}` : ""}`}
                              className={`rounded border px-2 py-0.5 font-mono text-xs ${verdictClass(tc.verdict)}`}
                            >
                              {tc.testcase_no}
                            </span>
                          ))}
                        </div>
                      ) : (
                        !s.compile_output && (
                          <p className="text-xs text-ams-muted">No per-test detail.</p>
                        )
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ScoreboardPane({
  scoreboard,
  problems,
  frozen,
}: {
  scoreboard: Scoreboard | null;
  problems: ContestProblem[];
  frozen: boolean;
}) {
  if (!scoreboard) {
    return (
      <p className="rounded-lg border border-ams-border bg-ams-surface p-8 text-center text-ams-muted">
        Loading scoreboard…
      </p>
    );
  }

  return (
    <div>
      {frozen && (
        <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          The scoreboard is frozen — results from the final minutes are hidden
          until the contest ends.
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-ams-border">
        <table className="w-full text-sm">
          <thead className="bg-ams-panel text-left text-xs uppercase tracking-wide text-ams-muted">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Who</th>
              <th className="px-3 py-2 font-medium">Solved</th>
              <th className="px-3 py-2 font-medium">Penalty</th>
              {problems.map((p) => (
                <th key={p.uid} className="px-3 py-2 text-center font-mono font-medium">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ams-border bg-ams-surface">
            {scoreboard.rows.map((row) => (
              <tr key={row.user_uid}>
                <td className="px-3 py-2 tabular-nums text-ams-muted">{row.rank}</td>
                <td className="px-3 py-2">
                  <span className="text-ams-heading">{row.display_name}</span>
                  <span className="ml-2 text-xs text-ams-muted">@{row.username}</span>
                </td>
                <td className="px-3 py-2 tabular-nums font-semibold text-ams-heading">
                  {row.solved}
                </td>
                <td className="px-3 py-2 tabular-nums text-ams-muted">{row.penalty}</td>
                {problems.map((p) => {
                  const cell = row.cells[p.label];
                  if (!cell || cell.attempts === 0) {
                    return (
                      <td key={p.uid} className="px-3 py-2 text-center text-ams-muted/40">
                        ·
                      </td>
                    );
                  }
                  return (
                    <td key={p.uid} className="px-3 py-2 text-center">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs tabular-nums ${
                          cell.solved
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/10 text-rose-300"
                        }`}
                        title={
                          cell.solved
                            ? `Solved at +${cell.solved_at_minutes} min, ${cell.attempts} attempt(s)`
                            : `${cell.attempts} attempt(s), unsolved`
                        }
                      >
                        {cell.solved ? `+${cell.solved_at_minutes}` : `−${cell.attempts}`}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {scoreboard.rows.length === 0 && (
        <p className="mt-3 text-center text-sm text-ams-muted">
          Nobody has joined yet.
        </p>
      )}
    </div>
  );
}
