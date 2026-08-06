"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileArchive,
  Trash2,
} from "lucide-react";
import type { PackageInspection, Problem } from "@/lib/orgTypes";
import { TopicPicker } from "./TopicPicker";
import { formatWhen } from "@/lib/orgTypes";

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

export function ProblemsView() {
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setProblems(await json<Problem[]>(await fetch("/api/org/problems", { cache: "no-store" })));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load problems.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {problems === null ? "Loading…" : `${problems.length} problem${problems.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          New problem
        </button>
      </div>

      {creating && (
        <NewProblemForm
          onDone={() => {
            setCreating(false);
            void load();
          }}
        />
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {problems !== null && problems.length === 0 && !creating && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <FileArchive className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">No problems yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Create one, then upload a <code className="rounded bg-slate-100 px-1">.cxxpkg</code>{" "}
            built with <code className="rounded bg-slate-100 px-1">cxxprobe package</code>.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {problems?.map((p) => (
          <ProblemCard key={p.uid} problem={p} onChange={load} />
        ))}
      </div>
    </div>
  );
}

function NewProblemForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await json(
        await fetch("/api/org/problems", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }),
      );
      setTitle("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the problem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <label className="block text-sm font-medium text-slate-700">Title</label>
      <p className="mb-2 text-xs text-slate-500">
        The slug is derived from this; you can upload the package next.
      </p>
      <div className="flex gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Beet Cast"
          autoFocus
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}

function ProblemCard({ problem, onChange }: { problem: Problem; onChange: () => void }) {
  const latest = problem.versions[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-950">{problem.title}</h3>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{problem.slug}</p>
          <div className="mt-2">
            <TopicPicker
              problemUid={problem.uid}
              selected={problem.tags ?? []}
              onSaved={onChange}
            />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <PackageUploader problemUid={problem.uid} onUploaded={onChange} />
          <DeleteButton
            label={`Delete “${problem.title}”`}
            url={`/api/org/problems/${problem.uid}`}
            onDone={onChange}
          />
        </div>
      </div>

      {problem.versions.length === 0 ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No package yet — this problem cannot be added to a contest.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {problem.versions.map((v) => (
            <div
              key={v.uid}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-slate-700">v{v.version}</span>
              {v === latest && (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                  latest
                </span>
              )}
              <span className="text-slate-500">
                {v.time_limit_ms ? `${v.time_limit_ms} ms` : "default limit"}
                {" · "}
                {v.memory_limit_mb ? `${v.memory_limit_mb} MB` : "default memory"}
              </span>
              <span className="ml-auto text-xs text-slate-400">{formatWhen(v.created_at)}</span>
              <DeleteButton
                label={`Delete v${v.version}`}
                url={`/api/org/problems/${problem.uid}/versions/${v.uid}`}
                onDone={onChange}
                compact
              />
              {v.notes && (
                <p className="w-full text-xs text-amber-700" title={v.notes}>
                  {v.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Upload with a dry-run preview first.
 *
 * The preview is the point: a setter sees the platform's reading of their
 * package — testcase count, checker, symbolic rules — *before* committing a
 * version. Getting that wrong is otherwise discovered mid-contest.
 */
function PackageUploader({
  problemUid,
  onUploaded,
}: {
  problemUid: string;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PackageInspection | null>(null);
  const [phase, setPhase] = useState<"idle" | "inspecting" | "uploading">("idle");
  const [error, setError] = useState("");

  async function choose(f: File | null) {
    setFile(f);
    setPreview(null);
    setError("");
    if (!f) return;

    setPhase("inspecting");
    try {
      const form = new FormData();
      form.append("package", f);
      setPreview(
        await json<PackageInspection>(
          await fetch("/api/org/problems/inspect", { method: "POST", body: form }),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that package.");
      setFile(null);
    } finally {
      setPhase("idle");
    }
  }

  async function commit() {
    if (!file) return;
    setPhase("uploading");
    setError("");
    try {
      const form = new FormData();
      form.append("package", file);
      await json(
        await fetch(`/api/org/problems/${problemUid}/versions`, { method: "POST", body: form }),
      );
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="w-full max-w-md">
      <input
        ref={inputRef}
        type="file"
        accept=".cxxpkg,.zip"
        onChange={(e) => void choose(e.target.files?.[0] ?? null)}
        className="hidden"
        id={`pkg-${problemUid}`}
      />
      <label
        htmlFor={`pkg-${problemUid}`}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-900"
      >
        {phase === "inspecting" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {phase === "inspecting" ? "Reading…" : "Upload package"}
      </label>

      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {preview && file && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">{preview.problem_name || file.name}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
            <Fact label="Testcases" value={String(preview.testcase_count)} />
            <Fact
              label="Limits"
              value={
                preview.time_limit_ms || preview.memory_limit_mb
                  ? `${preview.time_limit_ms || "default"} ms · ${preview.memory_limit_mb || "default"} MB`
                  : "cxxprobe defaults"
              }
            />
            <Fact label="Checker" value={preview.has_checker ? "yes" : "none"} />
            <Fact label="Validator" value={preview.has_validator ? "yes" : "none"} />
            {preview.symbolic_rules > 0 && (
              <Fact label="Symbolic rules" value={String(preview.symbolic_rules)} />
            )}
            {preview.has_generator && <Fact label="Generators" value="yes" />}
          </dl>

          {preview.warnings.length > 0 && (
            <ul className="mt-3 space-y-1">
              {preview.warnings.map((w) => (
                <li key={w} className="flex gap-2 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={commit}
              disabled={phase === "uploading"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {phase === "uploading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {phase === "uploading" ? "Uploading…" : "Create version"}
            </button>
            <button
              type="button"
              onClick={() => void choose(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </>
  );
}


/** Destructive actions confirm in place rather than through `window.confirm`.
 *
 * The server refuses anything still in use and says why, so the danger here
 * is a mis-click rather than data loss — a two-step button is proportionate,
 * and the refusal message is worth showing rather than swallowing.
 */
function DeleteButton({
  label,
  url,
  onDone,
  compact = false,
}: {
  label: string;
  url: string;
  onDone: () => void;
  compact?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Could not delete.");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setArmed(false);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <span className="max-w-xs text-xs text-amber-700" title={error}>
        {error}
      </span>
    );
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        title={label}
        className={`rounded text-slate-400 transition hover:bg-red-50 hover:text-red-600 ${
          compact ? "p-1" : "p-2"
        }`}
      >
        <Trash2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
      >
        {busy ? "Deleting…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded px-1.5 py-1 text-xs text-slate-500"
      >
        Cancel
      </button>
    </span>
  );
}
