"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, UserPlus, X } from "lucide-react";

/**
 * Pick people who are already in the Access directory.
 *
 * Retyping a name that already exists minted a second record for the same
 * person, and then "which contests has this student sat" had two half-answers
 * instead of one. Everyone here is added by uid, so the directory entry is
 * reused and the contest history stays whole.
 */

type Student = {
  uid: string;
  display_name: string;
  username: string;
  email: string;
  mailable: boolean;
  college: string;
  external_ref: string;
  contests: { uid: string; title: string }[];
};

type IssuedCredential = {
  login_id: string;
  password: string;
  display_name: string;
  user_uid: string;
};

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

export function AddFromAccess({
  contestUid,
  alreadyOnRoster,
  onAdded,
  onClose,
}: {
  contestUid: string;
  /** User uids already in this contest, so they can be shown as such. */
  alreadyOnRoster: Set<string>;
  onAdded: (rows: IssuedCredential[]) => void;
  onClose: () => void;
}) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (q: string) => {
    try {
      const url = q.trim() ? `/api/org/students?q=${encodeURIComponent(q.trim())}` : "/api/org/students";
      setStudents(await json<Student[]>(await fetch(url, { cache: "no-store" })));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the directory.");
    }
  }, []);

  // Debounced so typing a name does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => void load(query), query ? 250 : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  // Someone already on this roster is shown, greyed, rather than hidden —
  // "why is this person missing from the list" is a worse question than
  // "why are they greyed out".
  const selectable = useMemo(
    () => (students ?? []).filter((s) => !alreadyOnRoster.has(s.uid)),
    [students, alreadyOnRoster],
  );

  function toggle(uid: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const rows = await json<IssuedCredential[]>(
        await fetch(`/api/org/contests/${contestUid}/participants/from-directory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_uids: [...picked] }),
        }),
      );
      onAdded(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add them.");
    } finally {
      setBusy(false);
    }
  }

  const unmailable = selectable.filter((s) => picked.has(s.uid) && !s.mailable).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add participants from Access"
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950">Add from Access</h2>
            <p className="text-xs text-slate-500">
              People already in your directory. They keep the login they already hold.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, college or reference"
              autoFocus
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {students === null ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
          ) : selectable.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {query
                ? "Nobody in the directory matches that."
                : "Everyone in the directory is already on this roster."}
            </p>
          ) : (
            <ul className="space-y-1">
              {selectable.map((s) => {
                const on = picked.has(s.uid);
                return (
                  <li key={s.uid}>
                    <button
                      type="button"
                      onClick={() => toggle(s.uid)}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                        on
                          ? "border-slate-900 bg-slate-50"
                          : "border-transparent hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                          on ? "border-slate-900 bg-slate-900" : "border-slate-300"
                        }`}
                      >
                        {on && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {s.display_name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {s.mailable ? (
                            <span className="font-mono">{s.email}</span>
                          ) : (
                            <span className="text-amber-700">no email — cannot be sent a login</span>
                          )}
                          {s.college && ` · ${s.college}`}
                          {s.contests.length > 0 &&
                            ` · ${s.contests.length} contest${s.contests.length === 1 ? "" : "s"}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <p className="border-t border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
          <p className="text-xs text-slate-500">
            {picked.size} selected
            {unmailable > 0 && (
              <span className="text-amber-700">{` · ${unmailable} cannot be mailed`}</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || picked.size === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {busy ? "Adding…" : `Add ${picked.size || ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
