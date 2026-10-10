"use client";

import { useCallback, useEffect, useState } from "react";
import { FilePlus2, Loader2, Trash2 } from "lucide-react";
import type { DraftStatus, DraftSummary } from "./types";
import { ProblemEditor } from "./ProblemEditor";

/**
 * The problemsetting pane: drafts in progress, and the editor over them.
 *
 * Separate from the published catalogue because they are different things.
 * A draft has no version, frequently does not compile, and should never
 * turn up in a contest; mixing them into one list would mean every screen
 * that shows problems learning to tell them apart.
 */

const LABEL: Record<DraftStatus, { text: string; className: string }> = {
  draft: { text: "In progress", className: "border-slate-200 text-slate-600" },
  verifying: { text: "Verifying", className: "border-violet-200 bg-violet-50 text-violet-700" },
  verified: { text: "Passing", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  failed: { text: "Failing", className: "border-red-200 bg-red-50 text-red-700" },
  published: { text: "Published", className: "border-sky-200 bg-sky-50 text-sky-700" },
};

export function ProblemSetting() {
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/org/problem-drafts");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not load drafts.");
      setDrafts(data as DraftSummary[]);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setDrafts([]);
    }
  }, []);

  useEffect(() => {
    if (!open) void load();
  }, [open, load]);

  const create = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/org/problem-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled problem" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setOpen(data.uid as string);
      else setError(data.error ?? "Could not create a draft.");
    } finally {
      setCreating(false);
    }
  }, []);

  const discard = useCallback(
    async (uid: string) => {
      await fetch(`/api/org/problem-drafts/${uid}`, { method: "DELETE" });
      void load();
    },
    [load],
  );

  if (open) return <ProblemEditor uid={open} onClose={() => setOpen(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Problemsetting</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
            Write a problem here instead of on a laptop: statement, solution, tests and whichever
            checkers it needs, then run the real cxxprobe checks on the judge before it becomes a
            problem anyone can use.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void create()}
          disabled={creating}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FilePlus2 className="h-4 w-4" />
          )}
          New problem
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {drafts === null && <p className="text-sm text-slate-500">Loading…</p>}

      {drafts?.length === 0 && !error && (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          No drafts yet. A new problem starts as a working one that already passes, so the first
          failure you see is yours.
        </p>
      )}

      {drafts && drafts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Problem</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => {
                const label = LABEL[d.status] ?? LABEL.draft;
                return (
                  <tr key={d.uid} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setOpen(d.uid)}
                        className="text-left font-medium text-slate-900 hover:text-violet-700"
                      >
                        {d.title || "Untitled problem"}
                      </button>
                      <div className="font-mono text-xs text-slate-400">{d.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${label.className}`}
                      >
                        {label.text}
                        {d.status === "published" && d.published_version
                          ? ` v${d.published_version}`
                          : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(d.updated_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void discard(d.uid)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Discard ${d.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
