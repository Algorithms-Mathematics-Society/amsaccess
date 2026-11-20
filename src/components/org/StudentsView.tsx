"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reportOrgResponse } from "@/lib/client/orgPolling";
import { useConfirm } from "./ConfirmDialog";
import {
  mailIneligible,
  runStudentActions,
  studentsCsv,
  type DirectoryAction,
  type StudentActionResult,
} from "@/lib/studentsDirectory";
import { StudentImportPanel } from "./StudentImportPanel";
import { SkeletonText } from "@/components/org/Skeleton";
import Link from "next/link";
import { statusClass } from "@/lib/orgTypes";
import {
  Download,
  Upload,
  Plus,
  Search,
  Loader2,
  Github,
  Linkedin,
  FileText,
  GraduationCap,
  Users,
  Check,
  History,
  Trash2,
} from "lucide-react";
import type { Student } from "@/lib/orgTypes";

async function json<T>(res: Response): Promise<T> {
  reportOrgResponse(res.status);
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

const PAGE = 200;

/** Everything narrowing the directory right now. One object so the listing
 *  and the facet counts cannot drift apart. */
type Filters = {
  q: string;
  college: string;
  branch: string;
  graduation_year: string;
  mailable: string;
  sort: string;
};

const NO_FILTERS: Filters = {
  q: "",
  college: "",
  branch: "",
  graduation_year: "",
  mailable: "",
  sort: "name",
};

type Facet = { value: string; count: number };
type Facets = {
  total: number;
  colleges: Facet[];
  branches: Facet[];
  graduation_years: Facet[];
};

function queryString(
  filters: Filters,
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra })) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function StudentsView() {
  const [dialog, confirm] = useConfirm();
  const session = useRef(new AbortController());
  const [sessionActive, setSessionActive] = useState(true);
  useEffect(() => {
    session.current = new AbortController();
    return () => session.current.abort();
  }, []);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Map<string, Student>>(new Map());
  const [action, setAction] = useState<DirectoryAction>("add");
  const [contests, setContests] = useState<{ uid: string; title: string }[]>(
    [],
  );
  const [contestUid, setContestUid] = useState("");
  const [contestError, setContestError] = useState("");
  const [contestAttempt, setContestAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<StudentActionResult[]>([]);
  const [retryAction, setRetryAction] = useState<{
    action: DirectoryAction;
    contestUid: string;
  } | null>(null);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (active: Filters, start = offset) => {
      if (session.current.signal.aborted) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setRefreshing(true);
      try {
        // The page and the counts go together. The page alone cannot say what
        // it left out, which is how "500 students" came to be printed on a
        // directory holding two and a half thousand.
        const [rows, totals] = await Promise.all([
          fetch(
            `/api/org/students?${queryString(active, { limit: String(PAGE), offset: String(start) })}`,
            {
              cache: "no-store",
              signal: controller.signal,
            },
          ).then((res) => json<Student[]>(res)),
          fetch(`/api/org/students/facets?${queryString(active)}`, {
            cache: "no-store",
            signal: controller.signal,
          })
            .then((res) => json<Facets>(res))
            // An API without the facets route yet must not blank the list.
            .catch(() => null),
        ]);
        if (controller.signal.aborted || request.current !== controller) return;
        if (rows.length === 0 && start > 0) {
          setOffset(Math.max(0, start - PAGE));
          return;
        }
        setStudents(rows);
        setSelected((previous) => {
          const next = new Map(previous);
          for (const row of rows) if (next.has(row.uid)) next.set(row.uid, row);
          return next;
        });
        setFacets(totals);
        setError("");
      } catch (err) {
        if (controller.signal.aborted || request.current !== controller) return;
        setError(
          err instanceof Error ? err.message : "Could not load students.",
        );
      } finally {
        if (!controller.signal.aborted && request.current === controller)
          setRefreshing(false);
      }
    },
    [offset],
  );

  // Only typing waits; initial load, selects and Clear start immediately.
  const debounceSearch = useRef(false);
  useEffect(() => {
    const id = debounceSearch.current
      ? setTimeout(() => void load(filters), 300)
      : undefined;
    if (id === undefined) void load(filters);
    return () => {
      clearTimeout(id);
      request.current?.abort();
    };
  }, [filters, load, revision]);

  const needsContests = selected.size > 0 && action === "add";
  useEffect(() => {
    if (!needsContests || contests.length > 0 || session.current.signal.aborted)
      return;
    const controller = new AbortController();
    setContestError("");
    void fetch("/api/org/contests", { signal: controller.signal })
      .then((response) => json<{ uid: string; title: string }[]>(response))
      .then((rows) => {
        if (
          !Array.isArray(rows) ||
          rows.some(
            (row) =>
              !row ||
              typeof row.uid !== "string" ||
              !row.uid.trim() ||
              typeof row.title !== "string" ||
              !row.title.trim(),
          )
        )
          throw new Error(
            "The contest list could not be read. Retry loading contests.",
          );
        if (!session.current.signal.aborted && !controller.signal.aborted)
          setContests(rows);
      })
      .catch((failure) => {
        if (!session.current.signal.aborted && !controller.signal.aborted)
          setContestError(
            failure instanceof Error
              ? failure.message
              : "Could not load contests.",
          );
      });
    return () => controller.abort();
  }, [needsContests, contests.length, contestAttempt]);

  useEffect(() => {
    const stop = () => {
      session.current.abort();
      request.current?.abort();
      setSessionActive(false);
      setSelected(new Map());
      setStudents(null);
      setFacets(null);
      setResults([]);
      setRetryAction(null);
      setContests([]);
      setContestError("");
      setContestUid("");
      setExpanded(null);
      setAdding(false);
      setImporting(false);
      setFilters(NO_FILTERS);
      setOffset(0);
      setBusy(false);
      setError("Session changed. Reload the directory after signing in.");
    };
    window.addEventListener("ams:org-session-reset", stop);
    window.addEventListener("ams:org-signed-out", stop);
    return () => {
      session.current.abort();
      request.current?.abort();
      window.removeEventListener("ams:org-session-reset", stop);
      window.removeEventListener("ams:org-signed-out", stop);
    };
  }, []);

  const set = (patch: Partial<Filters>) => {
    debounceSearch.current = Object.keys(patch).length === 1 && "q" in patch;
    // Invalidate now: an older response can arrive during the debounce delay.
    request.current?.abort();
    setRefreshing(true);
    setOffset(0);
    setFilters((f) => ({ ...f, ...patch }));
  };
  const narrowed = Object.entries(filters).some(
    ([key, value]) => key !== "sort" && value !== "",
  );

  const toggle = (student: Student) =>
    setSelected((previous) => {
      const next = new Map(previous);
      if (next.has(student.uid)) next.delete(student.uid);
      else next.set(student.uid, student);
      return next;
    });
  const visibleSelected =
    students?.filter((student) => selected.has(student.uid)).length ?? 0;
  const allPageSelected = Boolean(
    students?.length && visibleSelected === students.length,
  );
  const failed = results.filter((result) => result.status === "failed");
  async function execute(
    rows: Student[],
    chosenAction = action,
    chosenContest = contestUid,
  ) {
    const operation = session.current;
    if (
      operation.signal.aborted ||
      !rows.length ||
      busy ||
      (chosenAction === "add" && !chosenContest)
    )
      return;
    const eligible = rows.filter((student) => !mailIneligible(student)).length;
    if (
      !(await confirm({
        title:
          chosenAction === "delete"
            ? `Remove ${rows.length} selected students?`
            : chosenAction === "mail"
              ? `Email ${eligible} selected students?`
              : `Add ${rows.length} selected students to contest?`,
        body:
          chosenAction === "delete"
            ? "Students without history are deleted. Students with submissions are disabled and their history is preserved. This applies to selected students on other pages and under other filters too."
            : chosenAction === "mail"
              ? `${eligible} eligible students will have their permanent login queued for email. ${rows.length - eligible} will be skipped because they lack a deliverable login email or contest. Delivery is not guaranteed by queuing.`
              : `Add selected students to ${contests.find((contest) => contest.uid === chosenContest)?.title ?? "the selected contest"}, including selections on other pages. Existing logins stay the same; students already on this roster are skipped.`,
        confirmLabel:
          chosenAction === "delete"
            ? "Confirm remove students"
            : chosenAction === "mail"
              ? "Confirm queue login emails"
              : "Confirm add students",
        danger: chosenAction === "delete",
      }))
    )
      return;
    if (operation.signal.aborted) return;
    setBusy(true);
    setRetryAction({ action: chosenAction, contestUid: chosenContest });
    setResults(
      rows.map((student) => ({
        student,
        status: "pending",
        message: "Waiting…",
      })),
    );
    await runStudentActions(
      rows,
      chosenAction,
      chosenContest,
      (result) => {
        if (operation.signal.aborted) return;
        setResults((previous) =>
          previous.map((row) =>
            row.student.uid === result.student.uid ? result : row,
          ),
        );
        if (result.status === "success" && chosenAction !== "mail")
          setSelected((previous) => {
            const next = new Map(previous);
            if (chosenAction === "delete") next.delete(result.student.uid);
            else {
              const current = next.get(result.student.uid);
              if (current)
                next.set(current.uid, {
                  ...current,
                  contests_entered: current.contests_entered + 1,
                  contests: [
                    ...(current.contests ?? []),
                    {
                      uid: chosenContest,
                      title:
                        contests.find(
                          (contest) => contest.uid === chosenContest,
                        )?.title ?? "Contest",
                      starts_at: "",
                      status: "",
                      is_practice: false,
                    },
                  ],
                });
            }
            return next;
          });
      },
      async (path, options) => {
        const response = await fetch(path, options);
        reportOrgResponse(response.status);
        return response;
      },
      operation.signal,
    );
    if (operation.signal.aborted) return;
    setBusy(false);
    debounceSearch.current = false;
    setRevision((value) => value + 1);
  }
  function exportSelected() {
    if (session.current.signal.aborted) return;
    const url = URL.createObjectURL(
      new Blob([studentsCsv([...selected.values()])], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "selected-students.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="px-8 py-6">
      {sessionActive && dialog}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search by name, email, college, or reference…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
          />
        </div>
        <button
          type="button"
          onClick={() => setImporting(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-900"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </button>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add student
        </button>
      </div>

      {facets && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FacetSelect
            label="College"
            value={filters.college}
            options={facets.colleges}
            onChange={(college) => set({ college })}
          />
          <FacetSelect
            label="Branch"
            value={filters.branch}
            options={facets.branches}
            onChange={(branch) => set({ branch })}
          />
          <FacetSelect
            label="Graduating"
            value={filters.graduation_year}
            options={facets.graduation_years}
            onChange={(graduation_year) => set({ graduation_year })}
          />
          <select
            value={filters.mailable}
            onChange={(e) => set({ mailable: e.target.value })}
            aria-label="Whether they can be emailed"
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700"
          >
            <option value="">Anyone</option>
            <option value="true">Can be emailed</option>
            <option value="false">No usable address</option>
          </select>
          <select
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value })}
            aria-label="Sort order"
            className="ml-auto rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700"
          >
            <option value="name">Name</option>
            <option value="newest">Most recently added</option>
            <option value="college">College</option>
            <option value="year">Graduation year</option>
          </select>
          {narrowed && (
            <button
              type="button"
              onClick={() => set({ ...NO_FILTERS, sort: filters.sort })}
              className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:text-slate-900"
            >
              Clear
            </button>
          )}
          <a
            href={`/api/org/students/export.csv?${queryString(filters)}`}
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 transition hover:border-slate-900"
          >
            <Download className="h-4 w-4" />
            Export
          </a>
        </div>
      )}

      {importing && (
        <StudentImportPanel
          onDone={() => {
            setImporting(false);
            void load(filters);
          }}
          onImported={() => void load(filters)}
        />
      )}
      {adding && (
        <AddStudent
          onDone={() => {
            setAdding(false);
            void load(filters);
          }}
        />
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <p
        className="mb-3 text-sm text-slate-500"
        aria-live="polite"
        aria-busy={refreshing}
      >
        {students === null ? (
          <SkeletonText className="w-28" />
        ) : facets === null ? (
          `Showing ${offset + 1}–${offset + students.length}; total unavailable`
        ) : facets.total > students.length ? (
          `Showing ${offset + 1}–${offset + students.length} of ${facets.total.toLocaleString()}${narrowed ? " matching" : ""}`
        ) : (
          `${facets.total.toLocaleString()} student${facets.total === 1 ? "" : "s"}${narrowed ? " match" : ""}`
        )}
        {refreshing && students !== null && (
          <span className="ml-2">Updating…</span>
        )}
      </p>

      <div className="mb-4 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label="Select current page"
              checked={allPageSelected}
              disabled={refreshing || busy || !students?.length}
              ref={(element) => {
                if (element)
                  element.indeterminate =
                    visibleSelected > 0 && !allPageSelected;
              }}
              onChange={() =>
                setSelected((previous) => {
                  const next = new Map(previous);
                  for (const student of students ?? []) {
                    if (allPageSelected) next.delete(student.uid);
                    else next.set(student.uid, student);
                  }
                  return next;
                })
              }
            />
            Select current page
          </label>
          <span aria-live="polite">
            {selected.size} selected · {selected.size - visibleSelected} on
            other pages or filters
          </span>
          <button
            type="button"
            disabled={busy || !selected.size}
            onClick={() => setSelected(new Map())}
          >
            Clear selection
          </button>
          <button
            type="button"
            disabled={!selected.size || busy}
            onClick={exportSelected}
          >
            Export selected CSV
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Selection stays across pages and filters. Actions include every
          selected student; clear selection to start again.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Selected student action"
            value={action}
            disabled={busy}
            onChange={(event) =>
              setAction(event.target.value as DirectoryAction)
            }
            className="rounded border p-2"
          >
            <option value="add">Add to contest</option>
            <option value="mail">Email permanent login</option>
            <option value="delete">Remove or disable students</option>
          </select>
          {action === "add" && (
            <select
              aria-label="Destination contest"
              disabled={busy}
              value={contestUid}
              onChange={(event) => setContestUid(event.target.value)}
              className="rounded border p-2"
            >
              <option value="">Choose contest</option>
              {contests.map((contest) => (
                <option key={contest.uid} value={contest.uid}>
                  {contest.title}
                </option>
              ))}
            </select>
          )}
          {needsContests && contestError && (
            <div role="alert" className="text-red-700">
              <p>{contestError}</p>
              <button
                type="button"
                onClick={() => setContestAttempt((attempt) => attempt + 1)}
                className="underline"
              >
                Retry loading contests
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={
              busy ||
              refreshing ||
              !selected.size ||
              (action === "add" && !contestUid)
            }
            onClick={() => void execute([...selected.values()])}
            className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-40"
          >
            {busy ? "Processing students…" : "Review selected action"}
          </button>
        </div>
        {results.length > 0 && (
          <div aria-live="polite">
            <p>
              {
                results.filter(
                  (result) => !["pending", "working"].includes(result.status),
                ).length
              }{" "}
              of {results.length} processed ·{" "}
              {results.filter((result) => result.status === "success").length}{" "}
              succeeded · {failed.length} failed ·{" "}
              {results.filter((result) => result.status === "skipped").length}{" "}
              skipped
            </p>
            <ul className="max-h-48 overflow-auto">
              {results.map((result) => (
                <li key={result.student.uid}>
                  {result.student.display_name}: {result.message}
                </li>
              ))}
            </ul>
            {!!failed.length && !busy && retryAction && (
              <button
                type="button"
                className="mt-2 underline"
                onClick={() =>
                  void execute(
                    failed.map((result) => result.student),
                    retryAction.action,
                    retryAction.contestUid,
                  )
                }
              >
                Retry {failed.length} failed students
              </button>
            )}
          </div>
        )}
      </div>
      <nav
        aria-label="Student pages"
        className="mb-3 flex items-center gap-3 text-sm"
      >
        <button
          type="button"
          disabled={refreshing || offset === 0}
          onClick={() => {
            debounceSearch.current = false;
            setOffset(Math.max(0, offset - PAGE));
          }}
        >
          Previous page
        </button>
        <span>Page {Math.floor(offset / PAGE) + 1}</span>
        <button
          type="button"
          disabled={
            refreshing ||
            !students?.length ||
            (facets
              ? offset + students.length >= facets.total
              : students.length < PAGE)
          }
          onClick={() => {
            debounceSearch.current = false;
            setOffset(offset + PAGE);
          }}
        >
          Next page
        </button>
      </nav>
      {students !== null && students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            {narrowed ? "Nobody matches that" : "No students yet"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Add them one at a time, or import a CSV. A student lives here across
            every contest they enter.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {students?.map((s) => (
            <StudentCard
              key={s.uid}
              student={s}
              selected={selected.has(s.uid)}
              selectionDisabled={refreshing || busy}
              onSelect={() => toggle(s)}
              open={expanded === s.uid}
              onToggle={() => setExpanded(expanded === s.uid ? null : s.uid)}
              onChange={() => void load(filters)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One filter, with the count each choice would leave.
 *
 * Counted under the filters already applied, so a college that would return
 * nothing alongside the current branch is simply not in the list. A dropdown
 * that offers a dead end is worse than a shorter dropdown.
 */
function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Facet[];
  onChange: (value: string) => void;
}) {
  if (options.length === 0 && !value) return null;
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className={`rounded-lg border px-2.5 py-1.5 text-sm ${
        value
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700"
      }`}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.value} ({option.count})
        </option>
      ))}
    </select>
  );
}

function StudentCard({
  student,
  selected,
  selectionDisabled,
  onSelect,
  open,
  onToggle,
  onChange,
}: {
  student: Student;
  selected: boolean;
  selectionDisabled: boolean;
  onSelect: () => void;
  open: boolean;
  onToggle: () => void;
  onChange: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left">
        <input
          type="checkbox"
          aria-label={`Select ${student.display_name}`}
          checked={selected}
          disabled={selectionDisabled}
          onChange={onSelect}
        />
        {/* The name opens the profile; the row still expands from anywhere
            else, so the accordion keeps working for a quick look. */}
        <Link
          href={`/org/participants/${student.username}`}
          onClick={(event) => event.stopPropagation()}
          className="min-w-[10rem] font-medium text-slate-900 hover:underline"
        >
          {student.display_name}
        </Link>

        <span className="text-sm text-slate-500">
          {student.college || (
            <span className="text-slate-300">no college</span>
          )}
          {student.branch && ` · ${student.branch}`}
          {student.graduation_year ? ` · ${student.graduation_year}` : ""}
        </span>

        {student.external_ref && (
          <span className="font-mono text-xs text-slate-400">
            {student.external_ref}
          </span>
        )}

        <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          {student.github_url && <Github className="h-3.5 w-3.5" />}
          {student.linkedin_url && <Linkedin className="h-3.5 w-3.5" />}
          {(student.has_resume_file || student.resume_url) && (
            <FileText className="h-3.5 w-3.5" />
          )}
          <span className="tabular-nums">
            {student.contests_entered} contest
            {student.contests_entered === 1 ? "" : "s"}
          </span>
          <span className="tabular-nums text-emerald-700">
            {student.problems_solved} solved
          </span>
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} details for ${student.display_name}`}
          className="rounded border px-2 py-1 text-xs"
        >
          {open ? "Hide details" : "Details"}
        </button>
      </div>

      {open && (
        <>
          <StudentDetail student={student} onChange={onChange} />
          <StudentHistory studentUid={student.uid} />
        </>
      )}
    </div>
  );
}

const FIELDS = [
  ["college", "College"],
  ["branch", "Branch"],
  ["graduation_year", "Graduation year"],
  ["external_ref", "Reference (roll no.)"],
  ["contact_email", "Email"],
  ["phone", "Phone"],
  ["location", "Location"],
  ["linkedin_url", "LinkedIn"],
  ["github_url", "GitHub"],
  ["resume_url", "Resume link"],
] as const;

function StudentDetail({
  student,
  onChange,
}: {
  student: Student;
  onChange: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      FIELDS.map(([k]) => [
        k,
        String((student as unknown as Record<string, unknown>)[k] ?? ""),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = { ...draft };
      // The API wants a number or nothing; an empty box means "unset".
      body.graduation_year = draft.graduation_year
        ? Number(draft.graduation_year)
        : null;
      await json(
        await fetch(`/api/org/students/${student.uid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadResume(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("resume", file);
      await json(
        await fetch(`/api/org/students/${student.uid}/resume`, {
          method: "POST",
          body: form,
        }),
      );
      onChange();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not upload the resume.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function openResume() {
    try {
      const { url } = await json<{ url: string }>(
        await fetch(`/api/org/students/${student.uid}/resume`),
      );
      window.open(url, "_blank", "noopener");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open the resume.",
      );
    }
  }

  return (
    <div className="border-t border-slate-100 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map(([key, label]) => (
          <label key={key} className="text-xs text-slate-600">
            {label}
            <input
              value={draft[key] ?? ""}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900"
            />
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
          {saved ? "Saved" : "Save profile"}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = ""; // so picking the same file again fires onChange
            if (f) void uploadResume(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900"
        >
          <Upload className="h-3.5 w-3.5" />
          {student.has_resume_file ? "Replace resume PDF" : "Upload resume PDF"}
        </button>

        {student.has_resume_file && (
          <button
            type="button"
            onClick={openResume}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900"
          >
            <FileText className="h-3.5 w-3.5" />
            Open resume
          </button>
        )}

        <span className="ml-auto inline-flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            {student.contests_entered} contests · {student.problems_solved}{" "}
            solved
          </span>
          <RemoveStudent studentUid={student.uid} onDone={onChange} />
        </span>
      </div>

      {/* Which contests, not just how many. "Has this person sat anything with
          us" is the question the directory exists to answer, and a count
          cannot answer it. */}
      {(student.contests?.length ?? 0) > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Contests</p>
          <ul className="flex flex-wrap gap-1.5">
            {student.contests!.map((contest) => (
              <li key={contest.uid}>
                <Link
                  href={`/org/contests/${contest.uid}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition hover:border-slate-400 ${statusClass(contest.status)}`}
                >
                  <span className="max-w-[16rem] truncate font-medium">
                    {contest.title}
                  </span>
                  {contest.is_practice && (
                    <span className="opacity-60">practice</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {student.email && !student.mailable && (
        <p className="mt-2 text-xs text-amber-700">
          No email on record — this person cannot be sent their login.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function AddStudent({ onDone }: { onDone: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = { ...draft };
      if (draft.graduation_year)
        body.graduation_year = Number(draft.graduation_year);
      else delete body.graduation_year;
      await json(
        await fetch("/api/org/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      onDone();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not add the student.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-slate-600">
          Name
          <input
            value={draft.display_name ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, display_name: e.target.value })
            }
            autoFocus
            className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900"
          />
        </label>
        {FIELDS.map(([key, label]) => (
          <label key={key} className="text-xs text-slate-600">
            {label}
            <input
              value={draft[key] ?? ""}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900"
            />
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy || !(draft.display_name ?? "").trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Adding…" : "Add student"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/** What a student has actually done, and what it says about them.
 *
 * The topic table is the reason problems are tagged at all. A verdict list
 * says someone failed problem C; "0 of 4 attempts on move-semantics"
 * says what to teach them.
 */
function StudentHistory({ studentUid }: { studentUid: string }) {
  const [data, setData] = useState<{
    contests: {
      uid: string;
      title: string;
      submissions: number;
      solved: number;
    }[];
    submissions: {
      uid: string;
      contest: string;
      problem_label: string;
      verdict: string | null;
      status: string;
      passed_count: number;
      total_count: number;
      created_at: string;
      tags: string[];
    }[];
    topics: { tag: string; attempted: number; solved: number; rate: number }[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/org/students/${studentUid}/history`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            (body as { error?: string }).error ?? "Could not load.",
          );
        setData(body as typeof data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load history.",
        );
      }
    })();
  }, [studentUid]);

  if (error) return <p className="px-4 pb-4 text-xs text-amber-700">{error}</p>;
  if (!data)
    return <p className="px-4 pb-4 text-xs text-slate-400">Loading history…</p>;

  if (data.submissions.length === 0) {
    return (
      <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
        Nothing submitted yet.
      </p>
    );
  }

  return (
    <div className="border-t border-slate-100 px-4 py-4">
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <History className="h-3.5 w-3.5" />
        History
      </p>

      {data.topics.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-400">
            By topic — attempts on problems carrying each tag
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.topics.map((t) => (
              <span
                key={t.tag}
                title={`${t.solved} solved of ${t.attempted} attempts`}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  t.rate >= 0.75
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : t.rate > 0
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {t.tag} {t.solved}/{t.attempted}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {data.contests.map((c) => (
          <span
            key={c.uid}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
          >
            {c.title} · {c.solved} solved / {c.submissions} submissions
          </span>
        ))}
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-100">
            {data.submissions.map((s) => (
              <tr key={s.uid}>
                <td className="px-2 py-1 text-slate-400">
                  {new Date(s.created_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-2 py-1 text-slate-600">{s.contest}</td>
                <td className="px-2 py-1 font-medium text-slate-900">
                  {s.problem_label}
                </td>
                <td className="px-2 py-1">
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono ${
                      s.verdict === "AC"
                        ? "bg-emerald-50 text-emerald-700"
                        : s.verdict
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.verdict ?? s.status}
                  </span>
                </td>
                <td className="px-2 py-1 text-right tabular-nums text-slate-500">
                  {s.total_count ? `${s.passed_count}/${s.total_count}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RemoveStudent({
  studentUid,
  onDone,
}: {
  studentUid: string;
  onDone: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setError("");
    try {
      const res = await fetch(`/api/org/students/${studentUid}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Could not remove.",
        );
      }
      onDone();
    } catch (err) {
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
        // Someone with submissions is disabled rather than deleted: their
        // attempts sit on a scoreboard others were ranked against.
        title="Remove, or disable if they have submitted"
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
        Confirm
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
