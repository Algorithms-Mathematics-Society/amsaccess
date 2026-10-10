"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { CxxprobeReport, DraftDetail, DraftStatus, Package } from "./types";
import { withDefaults } from "./types";
import { ChecksStep, OverviewStep, SolutionStep, StatementStep, StrengthStep, TestsStep } from "./steps";
import { VerifyPane } from "./VerifyPane";

/**
 * The problem editor.
 *
 * Seven steps, each one standing alone. You can verify after writing the
 * solution and come back for the optional parts, because nothing later
 * blocks anything earlier. That is what makes leaving a problem half
 * written and returning to it survivable, which is the normal case.
 *
 * Saving is on a debounce rather than a button. A setter editing C++ for
 * twenty minutes should not be deciding when to save, and the failure mode
 * of forgetting is losing the lot.
 */

const STEPS = [
  { key: "overview", label: "Overview", optional: false },
  { key: "statement", label: "Statement", optional: false },
  { key: "solution", label: "Solution", optional: false },
  { key: "tests", label: "Tests", optional: false },
  { key: "checks", label: "Checkers", optional: true },
  { key: "strength", label: "Test strength", optional: true },
  { key: "verify", label: "Verify and publish", optional: false },
] as const;

const SAVE_DEBOUNCE_MS = 800;
const POLL_MS = 2500;

export function ProblemEditor({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [slug, setSlug] = useState("");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<DraftStatus>("draft");
  const [report, setReport] = useState<CxxprobeReport | null>(null);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Held in a ref as well as state so the debounced save sends the latest
  // edit rather than whatever the closure captured when the timer was set.
  const pending = useRef<{ pkg: Package; slug: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/org/problem-drafts/${uid}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Could not load");
        return r.json() as Promise<DraftDetail>;
      })
      .then((d) => {
        if (cancelled) return;
        setDraft(d);
        setPkg(withDefaults(d.package));
        setSlug(d.slug);
        setStatus(d.status);
        setReport(d.last_report);
        setError(d.last_error ?? "");
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const flush = useCallback(async () => {
    const body = pending.current;
    if (!body) return;
    pending.current = null;
    setSaving(true);
    try {
      const res = await fetch(`/api/org/problem-drafts/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: body.pkg, title: body.pkg.name, slug: body.slug }),
      });
      if (res.ok) {
        setSavedAt(Date.now());
        // An edit invalidates the last verdict, and the API says so too.
        // Mirrored here so the tick disappears the moment you type, not on
        // the next poll.
        setStatus((s) => (s === "verified" || s === "failed" ? "draft" : s));
      }
    } finally {
      setSaving(false);
    }
  }, [uid]);

  const patch = useCallback(
    (next: Partial<Package>, nextSlug?: string) => {
      setPkg((current) => {
        if (!current) return current;
        const merged = { ...current, ...next };
        pending.current = { pkg: merged, slug: nextSlug ?? slug };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
        return merged;
      });
    },
    [flush, slug],
  );

  const changeSlug = useCallback(
    (next: string) => {
      setSlug(next);
      setPkg((current) => {
        if (current) {
          pending.current = { pkg: current, slug: next };
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
        }
        return current;
      });
    },
    [flush],
  );

  // Poll only while a run is in flight. The result arrives through a spool
  // on the judge host, so there is nothing to push from.
  useEffect(() => {
    if (status !== "verifying") return;
    const id = setInterval(() => {
      void fetch(`/api/org/problem-drafts/${uid}/verify`)
        .then((r) => (r.ok ? r.json() : null))
        .then((v) => {
          if (!v) return;
          setStatus(v.status as DraftStatus);
          setReport(v.report ?? null);
          setError(v.error ?? "");
        })
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
  }, [status, uid]);

  const verify = useCallback(async () => {
    // Saved first, always. Verifying the previous text and showing the
    // result next to the current text is the one failure here that looks
    // like success.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await flush();
    setReport(null);
    setError("");
    const res = await fetch(`/api/org/problem-drafts/${uid}/verify`, { method: "POST" });
    if (res.ok) setStatus("verifying");
    else setError((await res.json().catch(() => ({}))).error ?? "Could not start verification.");
  }, [flush, uid]);

  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/org/problem-drafts/${uid}/publish`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("published");
        setDraft((d) => (d ? { ...d, ...data } : d));
      } else {
        setError(data.error ?? "Could not publish.");
      }
    } finally {
      setPublishing(false);
    }
  }, [uid]);

  const savedLabel = useMemo(() => {
    if (saving) return "Saving";
    if (savedAt) return "Saved";
    return "";
  }, [saving, savedAt]);

  if (loadError) {
    return (
      <div className="px-8 py-6">
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900">
          Back to problems
        </button>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      </div>
    );
  }
  if (!pkg || !draft) {
    return <p className="px-8 py-6 text-sm text-slate-500">Loading the draft…</p>;
  }

  const current = STEPS[step];

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Problems
        </button>
        <span className="text-slate-300">/</span>
        <h1 className="text-lg font-semibold tracking-tight text-slate-950">
          {pkg.name || "Untitled problem"}
        </h1>
        <span className="rounded-full border border-slate-200 px-2 py-0.5 font-mono text-xs text-slate-500">
          {slug}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {!saving && savedAt && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          {savedLabel}
        </span>
      </div>

      {/* Steps, as a bar rather than a sidebar: it survives a narrow window,
          and it is the only navigation this screen has. */}
      <nav aria-label="Editor steps" className="mb-6 flex flex-wrap gap-1.5">
        {STEPS.map((s, index) => {
          const active = index === step;
          return (
            <button
              key={s.key}
              onClick={() => setStep(index)}
              aria-current={active ? "step" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="mr-1.5 font-mono text-xs opacity-70">{index + 1}</span>
              {s.label}
              {s.optional && (
                <span className={`ml-1.5 text-xs ${active ? "opacity-70" : "text-slate-400"}`}>
                  optional
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {current.key === "overview" && (
          <OverviewStep pkg={pkg} patch={patch} slug={slug} onSlug={changeSlug} />
        )}
        {current.key === "statement" && <StatementStep pkg={pkg} patch={patch} />}
        {current.key === "solution" && <SolutionStep pkg={pkg} patch={patch} />}
        {current.key === "tests" && <TestsStep pkg={pkg} patch={patch} />}
        {current.key === "checks" && <ChecksStep pkg={pkg} patch={patch} />}
        {current.key === "strength" && <StrengthStep pkg={pkg} patch={patch} />}
        {current.key === "verify" && (
          <VerifyPane
            status={status}
            report={report}
            error={error}
            onVerify={() => void verify()}
            onPublish={() => void publish()}
            publishing={publishing}
          />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Next <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
