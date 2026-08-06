"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

export function StudentsView() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (q = "") => {
    try {
      setStudents(
        await json<Student[]>(
          await fetch(`/api/org/students?q=${encodeURIComponent(q)}`, { cache: "no-store" }),
        ),
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load students.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Debounced: typing a college name should not fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => void load(query), 300);
    return () => clearTimeout(id);
  }, [query, load]);

  return (
    <div className="px-8 py-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, college, or reference…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
          />
        </div>
        <button
          type="button"
          onClick={() => setImporting((v) => !v)}
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

      {importing && <ImportPanel onDone={() => { setImporting(false); void load(query); }} />}
      {adding && <AddStudent onDone={() => { setAdding(false); void load(query); }} />}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="mb-3 text-sm text-slate-500">
        {students === null ? "Loading…" : `${students.length} student${students.length === 1 ? "" : "s"}`}
      </p>

      {students !== null && students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            {query ? "Nobody matches that search" : "No students yet"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Add them one at a time, or import a CSV. A student lives here across every contest
            they enter.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {students?.map((s) => (
            <StudentCard
              key={s.uid}
              student={s}
              open={expanded === s.uid}
              onToggle={() => setExpanded(expanded === s.uid ? null : s.uid)}
              onChange={() => void load(query)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentCard({
  student,
  open,
  onToggle,
  onChange,
}: {
  student: Student;
  open: boolean;
  onToggle: () => void;
  onChange: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left"
      >
        <span className="min-w-[10rem] font-medium text-slate-900">{student.display_name}</span>

        <span className="text-sm text-slate-500">
          {student.college || <span className="text-slate-300">no college</span>}
          {student.branch && ` · ${student.branch}`}
          {student.graduation_year ? ` · ${student.graduation_year}` : ""}
        </span>

        {student.external_ref && (
          <span className="font-mono text-xs text-slate-400">{student.external_ref}</span>
        )}

        <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          {student.github_url && <Github className="h-3.5 w-3.5" />}
          {student.linkedin_url && <Linkedin className="h-3.5 w-3.5" />}
          {(student.has_resume_file || student.resume_url) && <FileText className="h-3.5 w-3.5" />}
          <span className="tabular-nums">
            {student.contests_entered} contest{student.contests_entered === 1 ? "" : "s"}
          </span>
          <span className="tabular-nums text-emerald-700">{student.problems_solved} solved</span>
        </span>
      </button>

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

function StudentDetail({ student, onChange }: { student: Student; onChange: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      FIELDS.map(([k]) => [k, String((student as unknown as Record<string, unknown>)[k] ?? "")]),
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
      body.graduation_year = draft.graduation_year ? Number(draft.graduation_year) : null;
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
        await fetch(`/api/org/students/${student.uid}/resume`, { method: "POST", body: form }),
      );
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the resume.");
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
      setError(err instanceof Error ? err.message : "Could not open the resume.");
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
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
          {saved ? "Saved" : "Save profile"}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
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
            {student.contests_entered} contests · {student.problems_solved} solved
          </span>
          <RemoveStudent studentUid={student.uid} onDone={onChange} />
        </span>
      </div>

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
      if (draft.graduation_year) body.graduation_year = Number(draft.graduation_year);
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
      setError(err instanceof Error ? err.message : "Could not add the student.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-slate-600">
          Name
          <input
            value={draft.display_name ?? ""}
            onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
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

function ImportPanel({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(
    null,
  );

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      setResult(
        await json<{ created: number; updated: number; errors: string[] }>(
          await fetch("/api/org/students/import", { method: "POST", body: form }),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-800">Import students from CSV</p>
      <p className="mt-1 text-xs text-slate-500">
        Only <code className="rounded bg-slate-100 px-1">display_name</code> is required. Also
        accepted: college, branch, graduation_year, linkedin_url, github_url, resume_url,
        contact_email, phone, location, external_ref.
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Rows are matched on <code className="rounded bg-slate-100 px-1">external_ref</code>, so
        re-importing a corrected export updates people rather than duplicating them.
      </p>

      <input
        type="file"
        accept=".csv,text/csv"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
        className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-slate-700"
      />

      {busy && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Importing…
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-slate-800">
            <strong>{result.created}</strong> added, <strong>{result.updated}</strong> updated
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {result.errors.map((e) => (
                <li key={e} className="text-xs text-amber-700">
                  {e}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={onDone}
            className="mt-2 rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white"
          >
            Done
          </button>
        </div>
      )}
    </div>
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
    contests: { uid: string; title: string; submissions: number; solved: number }[];
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
        const res = await fetch(`/api/org/students/${studentUid}/history`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((body as { error?: string }).error ?? "Could not load.");
        setData(body as typeof data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load history.");
      }
    })();
  }, [studentUid]);

  if (error) return <p className="px-4 pb-4 text-xs text-amber-700">{error}</p>;
  if (!data) return <p className="px-4 pb-4 text-xs text-slate-400">Loading history…</p>;

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
                <td className="px-2 py-1 font-medium text-slate-900">{s.problem_label}</td>
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

function RemoveStudent({ studentUid, onDone }: { studentUid: string; onDone: () => void }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setError("");
    try {
      const res = await fetch(`/api/org/students/${studentUid}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Could not remove.");
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
