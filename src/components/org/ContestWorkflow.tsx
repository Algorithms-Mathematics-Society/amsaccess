"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import {
  contestWorkflow,
  workflowContest,
  workflowRoster,
  workflowPending,
  type WorkflowFacts,
} from "@/lib/client/contestWorkflow";
import { loadSupportInbox } from "@/lib/client/support";
import {
  reportOrgResponse,
  ORG_SIGNED_OUT_EVENT,
} from "@/lib/client/orgPolling";

const EMPTY: WorkflowFacts = {
  contest: null,
  roster: null,
  pending: null,
  openTickets: null,
};
const labels = {
  done: "Verified",
  todo: "Needs attention",
  review: "Manual review",
  unknown: "Unavailable",
};

export function ContestWorkflow({ contestUid }: { contestUid: string }) {
  const [facts, setFacts] = useState<WorkflowFacts>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    const reset = () => {
      stopped = true;
      controller.abort();
      setFacts(EMPTY);
      setCheckedAt(null);
      setLoading(false);
      setErrors(["Your session changed. Sign in and refresh the checklist."]);
    };
    window.addEventListener(ORG_SIGNED_OUT_EVENT, reset);
    window.addEventListener("ams:org-session-reset", reset);
    setFacts(EMPTY);
    setCheckedAt(null);
    setErrors([]);
    setLoading(true);
    const timer = setTimeout(() => controller.abort(), 15000);
    const read = async (suffix: string) => {
      const response = await fetch(
        `/api/org/contests/${encodeURIComponent(contestUid)}${suffix}`,
        { cache: "no-store", signal: controller.signal },
      );
      if (stopped) throw new Error("Read cancelled.");
      reportOrgResponse(response.status);
      const value = await response.json();
      if (!response.ok)
        throw new Error(
          typeof value?.error === "string"
            ? value.error
            : "Could not load checklist data.",
        );
      return value;
    };
    void Promise.allSettled([
      read("").then(workflowContest),
      read("/participants").then(workflowRoster),
      read("/submissions/summary").then(workflowPending),
      loadSupportInbox("open", undefined, controller.signal, contestUid).then(
        (page) => page.items.length > 0,
      ),
    ])
      .then(([contest, roster, pending, support]) => {
        if (stopped) return;
        const failures = [contest, roster, pending, support].filter(
          (result) => result.status === "rejected",
        );
        setFacts({
          contest: contest.status === "fulfilled" ? contest.value : null,
          roster: roster.status === "fulfilled" ? roster.value : null,
          pending: pending.status === "fulfilled" ? pending.value : null,
          openTickets: support.status === "fulfilled" ? support.value : null,
        });
        setErrors(
          failures.map((result) =>
            result.reason instanceof Error
              ? result.reason.message
              : "A checklist check is unavailable.",
          ),
        );
        setCheckedAt(new Date().toLocaleTimeString());
        setLoading(false);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener(ORG_SIGNED_OUT_EVENT, reset);
      window.removeEventListener("ams:org-session-reset", reset);
    };
  }, [contestUid, refresh]);

  const steps = contestWorkflow(contestUid, facts);
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:px-8">
      <Link
        href={`/org/contests/${encodeURIComponent(contestUid)}`}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm text-slate-700 underline underline-offset-4"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" /> Back to contest
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold text-slate-950">
            Contest workflow
          </h1>
          {facts.contest && (
            <p className="mt-1 break-words text-slate-700">
              {facts.contest.title}
            </p>
          )}
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Work through Steps 1–7 in any order. Verified checks reflect the
            latest read; manual reviews still need a staff decision. This
            checklist does not publish or change the contest.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-400 px-3 text-sm text-slate-800 disabled:opacity-60"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          {loading ? "Checking…" : "Refresh checks"}
        </button>
      </div>
      <p role="status" className="mt-4 text-sm text-slate-600">
        {loading
          ? "Loading checklist evidence…"
          : checkedAt
            ? `Last checked at ${checkedAt}. Refresh after making changes.`
            : "Checks unavailable."}
      </p>
      {errors.length > 0 && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
          Some checks could not be verified.{" "}
          {Array.from(new Set(errors)).join(" ")} Use Refresh checks to retry.
        </div>
      )}
      <ol
        aria-label="Contest workflow steps"
        className="mt-6 divide-y divide-slate-200 border-y border-slate-200"
      >
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="py-6 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {index + 1}. {step.title}
              </h2>
              <Link
                href={step.href}
                className="mt-1 inline-flex min-h-[44px] items-center text-sm font-medium text-slate-800 underline underline-offset-4"
              >
                {step.action}
              </Link>
            </div>
            <ul className="mt-3 space-y-4 sm:mt-0">
              {step.checks.map((check) => (
                <li key={check.label}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-sm font-medium text-slate-900">
                      {check.label}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${check.state === "done" ? "text-emerald-800" : check.state === "todo" ? "text-amber-800" : "text-slate-600"}`}
                    >
                      {check.state === "done" && (
                        <Check aria-hidden className="h-4 w-4" />
                      )}
                      {labels[check.state]}
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">
                    {check.detail}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </main>
  );
}
