"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SkeletonTable } from "@/components/org/Skeleton";
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

type Filters = {
  q: string;
  college: string;
  branch: string;
  graduation_year: string;
};
type Facets = {
  total: number;
  colleges: { value: string; count: number }[];
  branches: { value: string; count: number }[];
  graduation_years: { value: string; count: number }[];
};
const PAGE = 200;
function directoryQuery(filters: Filters, limit?: number, offset = 0) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (limit !== undefined) {
    params.set("limit", String(limit));
    params.set("offset", String(offset));
  }
  return params.toString();
}

type IssuedCredential = {
  login_id: string;
  password: string;
  display_name: string;
  user_uid: string;
};

/** What `from-directory` answers with. `credentials` is empty unless slips
 *  were asked for, without revealing existing passwords in a bulk roster operation. */
type RosterAdd = {
  added: number;
  already_on_roster: number;
  credentials: IssuedCredential[];
};

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((data as { error?: string }).error ?? "Request failed.");
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
  onAdded: (result: RosterAdd, finished: boolean) => void;
  onClose: () => void;
}) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [filters, setFilters] = useState<Filters>({
    q: "",
    college: "",
    branch: "",
    graduation_year: "",
  });
  const [facets, setFacets] = useState<Facets | null>(null);
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<Map<string, Student>>(new Map());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const selectionRequest = useRef<AbortController | null>(null);
  const load = useCallback(async (active: Filters, pageOffset: number) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const [next, totals] = await Promise.all([
        fetch(`/api/org/students?${directoryQuery(active, PAGE, pageOffset)}`, {
          cache: "no-store",
          signal: controller.signal,
        }).then(json<Student[]>),
        fetch(`/api/org/students/facets?${directoryQuery(active)}`, {
          cache: "no-store",
          signal: controller.signal,
        }).then(json<Facets>),
      ]);
      if (controller.signal.aborted || request.current !== controller) return;
      setStudents(next);
      setFacets(totals);
      setError("");
    } catch (err) {
      if (!controller.signal.aborted && request.current === controller)
        setError(
          err instanceof Error ? err.message : "Could not load the directory.",
        );
    } finally {
      if (!controller.signal.aborted && request.current === controller)
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(filters, offset), filters.q ? 250 : 0);
    return () => {
      clearTimeout(t);
      request.current?.abort();
      selectionRequest.current?.abort();
    };
  }, [filters, offset, load]);

  function change(patch: Partial<Filters>, pageOffset = 0) {
    request.current?.abort();
    selectionRequest.current?.abort();
    setSelecting(false);
    setLoading(true);
    setStudents(null);
    setFacets(null);
    setOffset(pageOffset);
    setFilters((previous) => ({ ...previous, ...patch }));
  }

  function toggle(student: Student) {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(student.uid)) next.delete(student.uid);
      else next.set(student.uid, student);
      return next;
    });
  }

  async function selectAll() {
    const controller = new AbortController();
    selectionRequest.current?.abort();
    selectionRequest.current = controller;
    setSelecting(true);
    setError("");
    try {
      const matches = new Map<string, Student>();
      let pageOffset = 0;
      while (true) {
        const rows = await json<Student[]>(
          await fetch(
            `/api/org/students?${directoryQuery(filters, 1000, pageOffset)}`,
            { cache: "no-store", signal: controller.signal },
          ),
        );
        if (controller.signal.aborted) return;
        for (const row of rows) matches.set(row.uid, row);
        pageOffset += rows.length;
        if (rows.length < 1000) break;
      }
      if (controller.signal.aborted) return;
      if (matches.size !== facets?.total)
        throw new Error(
          "The directory changed. Refresh the results before selecting all.",
        );
      setPicked((previous) => {
        const next = new Map(previous);
        for (const [uid, student] of matches)
          if (!alreadyOnRoster.has(uid)) next.set(uid, student);
        return next;
      });
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Could not select matching people.",
        );
    } finally {
      if (!controller.signal.aborted) setSelecting(false);
    }
  }

  async function submit() {
    const uids = [...picked.keys()].filter((uid) => !alreadyOnRoster.has(uid));
    setBusy(true);
    setError("");
    setProgress({ completed: 0, total: uids.length });
    const cumulative: RosterAdd = {
      added: 0,
      already_on_roster: 0,
      credentials: [],
    };
    try {
      // The directory endpoint accepts at most 2,000 UIDs per request.
      for (let offset = 0; offset < uids.length; offset += 2000) {
        if (!mounted.current) return;
        const batch = uids.slice(offset, offset + 2000);
        const result = await json<RosterAdd>(
          await fetch(
            `/api/org/contests/${contestUid}/participants/from-directory`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ student_uids: batch }),
            },
          ),
        );
        if (!mounted.current) return;
        cumulative.added += result.added;
        cumulative.already_on_roster += result.already_on_roster;
        cumulative.credentials.push(...result.credentials);
        setPicked((previous) => {
          const next = new Map(previous);
          for (const uid of batch) next.delete(uid);
          return next;
        });
        const completed = offset + batch.length;
        setProgress({ completed, total: uids.length });
        onAdded(
          { ...cumulative, credentials: [...cumulative.credentials] },
          completed === uids.length,
        );
      }
    } catch (err) {
      if (mounted.current)
        setError(
          `${err instanceof Error ? err.message : "Could not add them."} Retry the remaining selection.`,
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  const selected = [...picked.values()].filter(
    (s) => !alreadyOnRoster.has(s.uid),
  );
  const unmailable = selected.filter((s) => !s.mailable).length;

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
            <h2 className="text-base font-semibold text-slate-950">
              Add from Access
            </h2>
            <p className="text-xs text-slate-500">
              People already in your directory. They keep the login they already
              hold. Existing roster members are excluded from selection.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
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
              value={filters.q}
              onChange={(e) => change({ q: e.target.value })}
              placeholder="Search by name, college or reference"
              autoFocus
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
          {(
            [
              ["College", "college", facets?.colleges],
              ["Branch", "branch", facets?.branches],
              ["Graduation year", "graduation_year", facets?.graduation_years],
            ] as const
          ).map(([label, key, options]) => (
            <select
              key={key}
              aria-label={label}
              value={filters[key]}
              onChange={(e) => change({ [key]: e.target.value })}
              className="min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              <option value="">All {label.toLowerCase()}s</option>
              {filters[key] &&
                !options?.some((o) => o.value === filters[key]) && (
                  <option value={filters[key]}>{filters[key]}</option>
                )}
              {options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value} ({option.count})
                </option>
              ))}
            </select>
          ))}
          <button
            type="button"
            disabled={loading || selecting || busy || !facets?.total}
            onClick={() => void selectAll()}
            className="text-sm underline disabled:opacity-40"
          >
            {selecting
              ? "Selecting…"
              : `Select all ${facets?.total ?? 0} matching`}
          </button>
          <button
            type="button"
            disabled={selecting || busy}
            onClick={() => setPicked(new Map())}
            className="text-sm underline disabled:opacity-40"
          >
            Clear selection
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 py-3"
          aria-busy={loading}
        >
          {loading ? (
            <SkeletonTable rows={6} bare />
          ) : students?.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nobody in the directory matches that.
            </p>
          ) : (
            <ul className="space-y-1">
              {(students ?? []).map((s) => {
                const existing = alreadyOnRoster.has(s.uid);
                const on = !existing && picked.has(s.uid);
                return (
                  <li key={s.uid}>
                    <button
                      type="button"
                      onClick={() => toggle(s)}
                      disabled={existing || selecting || busy}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition disabled:opacity-50 ${
                        on
                          ? "border-slate-900 bg-slate-50"
                          : "border-transparent hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                          on
                            ? "border-slate-900 bg-slate-900"
                            : "border-slate-300"
                        }`}
                      >
                        {on && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {s.display_name}
                          {existing && " · Already on roster"}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {s.mailable ? (
                            <span className="font-mono">{s.email}</span>
                          ) : (
                            <span className="text-amber-700">
                              no email — cannot be sent a login
                            </span>
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

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-2 text-xs text-slate-500">
          <button
            type="button"
            disabled={loading || selecting || offset === 0}
            onClick={() => change({}, Math.max(0, offset - PAGE))}
          >
            Previous page
          </button>
          <span>
            {facets
              ? `${facets.total === 0 ? 0 : offset + 1}–${Math.min(offset + (students?.length ?? 0), facets.total)} of ${facets.total} matching`
              : "Directory results"}
          </span>
          <button
            type="button"
            disabled={
              loading || selecting || !facets || offset + PAGE >= facets.total
            }
            onClick={() => change({}, offset + PAGE)}
          >
            Next page
          </button>
        </div>
        {progress && (
          <p
            role="status"
            className="border-t border-slate-200 px-5 py-2 text-xs text-slate-600"
          >
            {progress.completed} of {progress.total} selected processed
          </p>
        )}
        {error && (
          <p className="border-t border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
          <p className="text-xs text-slate-500">
            {selected.length} selected
            {unmailable > 0 && (
              <span className="text-amber-700">{` · ${unmailable} cannot be mailed`}</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || selecting || selected.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {busy ? "Adding…" : `Add ${selected.length || ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
