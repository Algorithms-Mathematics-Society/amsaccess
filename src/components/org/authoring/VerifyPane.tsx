"use client";

import { AlertTriangle, CheckCircle2, CircleSlash, Loader2, Play, XCircle } from "lucide-react";
import type { CheckSection, CxxprobeReport, DraftStatus } from "./types";

/**
 * What cxxprobe found, shown as cxxprobe found it.
 *
 * The report is passed through rather than summarised. The useful part of a
 * failure is the compiler output and the failing case, and a verdict on its
 * own sends a setter back to guess. The three check types stay separate
 * because they answer different questions and a problem may use any
 * combination: SKIPPED means not configured, not passed.
 */

function Dot({ status }: { status?: string }) {
  const s = (status ?? "").toUpperCase();
  if (s === "PASS") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (s === "FAIL") return <XCircle className="h-4 w-4 text-red-600" />;
  if (s === "ERROR") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <CircleSlash className="h-4 w-4 text-slate-300" />;
}

function Section({ name, question, section }: { name: string; question: string; section?: CheckSection }) {
  const status = (section?.status ?? "SKIPPED").toUpperCase();
  const counted = typeof section?.total === "number" && section.total > 0;

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2">
        <Dot status={status} />
        <span className="text-sm font-medium text-slate-900">{name}</span>
        <span className="ml-auto font-mono text-xs text-slate-500">
          {status}
          {counted ? ` ${section?.passed ?? 0}/${section?.total}` : ""}
        </span>
      </div>
      <p className="mt-1 pl-6 text-xs text-slate-500">
        {status === "SKIPPED" ? `Not configured. ${question}` : question}
      </p>

      {section?.cases && section.cases.length > 0 && (
        <ul className="mt-2 space-y-1 pl-6">
          {section.cases.map((c, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="text-slate-700">{c.label ?? i + 1}</span>
              <span
                className={
                  (c.verdict ?? "") === "AC" ? "text-emerald-600" : "text-red-600"
                }
              >
                {c.verdict ?? "-"}
              </span>
              {c.wall_time_ms != null && <span className="text-slate-400">{c.wall_time_ms}ms</span>}
              {c.checker_diagnostics && (
                <span className="text-slate-500">{c.checker_diagnostics}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {section?.checks && section.checks.length > 0 && (
        <ul className="mt-2 space-y-1 pl-6">
          {section.checks.map((c, i) => (
            <li key={i} className="font-mono text-xs">
              <span className={c.satisfied ? "text-emerald-600" : "text-red-600"}>
                {c.satisfied ? "ok" : "no"}
              </span>{" "}
              <span className="text-slate-700">{c.rule ?? ""}</span>
              {c.message && <span className="text-slate-500"> {c.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VerifyPane({
  status,
  report,
  error,
  onVerify,
  onPublish,
  publishing,
}: {
  status: DraftStatus;
  report: CxxprobeReport | null;
  error: string;
  onVerify: () => void;
  onPublish: () => void;
  publishing: boolean;
}) {
  const running = status === "verifying";
  const compile = report?.compile ?? {};
  const failedCompiles = Object.entries(compile).filter(([, c]) => c?.ok === false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onVerify}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Running on the judge" : "Run the checks"}
        </button>

        <button
          type="button"
          onClick={onPublish}
          disabled={status !== "verified" || publishing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          title={
            status === "verified"
              ? "Create the problem"
              : "Verify the problem before publishing it"
          }
        >
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Publish
        </button>

        {status === "published" && (
          <span className="text-sm font-medium text-emerald-700">Published.</span>
        )}
      </div>

      <p className="text-sm text-slate-500">
        This runs the real <code>cxxprobe test problem</code> on the judge host, in the same
        sandbox a contest submission gets. Publishing is refused until it passes: a problem that
        has never been run against its own tests is a guess, and the place that finds out
        otherwise is a contest.
      </p>

      {error && (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
          {error}
        </pre>
      )}

      {failedCompiles.map(([name, c]) => (
        <div key={name} className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">{name} did not compile</p>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-red-800">
            {c?.diagnostics ?? "no diagnostics"}
          </pre>
        </div>
      ))}

      {report && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Dot status={report.overall} />
            <span className="text-sm font-medium text-slate-900">
              Overall: {report.overall ?? "unknown"}
            </span>
          </div>
          <Section
            name="Manual tests"
            question="Does it print the right output?"
            section={report.tests?.manual}
          />
          <Section
            name="Symbolic"
            question="Does the source use the required technique?"
            section={report.tests?.symbolic}
          />
          <Section
            name="Behaviour"
            question="Is the code itself right: RAII, move semantics, types?"
            section={report.tests?.behavior}
          />
        </div>
      )}

      {report?.additional_solutions && report.additional_solutions.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-900">Additional solutions</p>
          <p className="mt-0.5 text-xs text-slate-500">
            A mismatch means the tests cannot tell a wrong solution from a right one. It does not
            fail the problem; it tells you the data is weak.
          </p>
          <ul className="mt-2 space-y-1">
            {report.additional_solutions.map((s, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="text-slate-700">{s.file}</span>
                <span className="text-slate-400">expected {s.expected_verdict}</span>
                <span className="text-slate-400">got {s.actual_verdict || "-"}</span>
                <span className={s.matched ? "text-emerald-600" : "text-amber-600"}>
                  {s.matched ? "OK" : "MISMATCH"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
