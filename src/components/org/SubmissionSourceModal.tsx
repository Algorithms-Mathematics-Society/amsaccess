"use client";

/**
 * The code a candidate submitted.
 *
 * Shared by every list that shows submissions, so a reviewer reads the same
 * thing wherever they clicked from. Source is fetched when the modal opens
 * rather than with the list: a profile page shows fifty submissions and a
 * reviewer opens one or two, so loading all of them would move megabytes of
 * exam source nobody asked to see.
 */

import { useEffect, useState } from "react";

export type SubmissionRef = {
  uid: string;
  verdict: string;
  language?: string;
  problem_label?: string;
  problem_title?: string;
  created_at?: string;
};

type SourcePayload = {
  uid: string;
  language: string;
  size_bytes: number;
  truncated: boolean;
  source: string;
};

export function SubmissionSourceModal({
  submission,
  onClose,
}: {
  submission: SubmissionRef | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<SourcePayload | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const uid = submission?.uid ?? null;

  useEffect(() => {
    if (!uid) {
      setData(null);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setData(null);
    fetch(`/api/org/submissions/${encodeURIComponent(uid)}/source`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof body.error === "string" ? body.error : "Could not load this submission.");
          return;
        }
        setData(body as SourcePayload);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this submission.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Escape closes. A reviewer reaching for it should not have to find the
  // button, and a modal over a roster is easy to open by accident.
  useEffect(() => {
    if (!uid) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [uid, onClose]);

  useEffect(() => {
    setCopied(false);
  }, [uid]);

  if (!submission) return null;

  const title =
    [submission.problem_label, submission.problem_title].filter(Boolean).join(" ") ||
    "Submission";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Source for ${title}`}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{title}</span>
          {submission.verdict && (
            <span className="text-xs text-slate-500">{submission.verdict}</span>
          )}
          {data && <span className="text-xs text-slate-400">{data.language}</span>}
          {data && (
            <button
              type="button"
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              onClick={() => {
                void navigator.clipboard?.writeText(data.source).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          )}
          <button
            type="button"
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {loading && <p className="px-4 py-6 text-sm text-slate-500">Loading source…</p>}
          {error && <p className="px-4 py-6 text-sm text-rose-600">{error}</p>}
          {data && (
            <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-slate-800">
              {data.source}
            </pre>
          )}
        </div>

        {data?.truncated && (
          <p className="border-t border-slate-200 px-4 py-2 text-xs text-amber-700">
            Showing the first 1 MB of {data.size_bytes.toLocaleString()} bytes.
          </p>
        )}
      </div>
    </div>
  );
}
