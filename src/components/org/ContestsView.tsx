"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Plus, Users } from "lucide-react";
import type { Contest } from "@/lib/orgTypes";
import { formatWhen, relativeWhen, statusClass } from "@/lib/orgTypes";

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

/** Local wall-clock time in the format `datetime-local` expects. */
function localInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ContestsView() {
  const [contests, setContests] = useState<Contest[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setContests(await json<Contest[]>(await fetch("/api/org/contests", { cache: "no-store" })));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load contests.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {contests === null
            ? "Loading…"
            : `${contests.length} contest${contests.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          New contest
        </button>
      </div>

      {creating && (
        <NewContestForm
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

      {contests !== null && contests.length === 0 && !creating && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">No contests yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Schedule one, add problems, and share the invite code.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {contests?.map((c) => (
          <Link
            key={c.uid}
            href={`/org/contests/${c.uid}`}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-400"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 truncate text-base font-semibold text-slate-950">{c.title}</h3>
              <span
                className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusClass(c.status)}`}
              >
                {c.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              {formatWhen(c.starts_at)}{" "}
              <span className="text-slate-400">({relativeWhen(c.starts_at)})</span>
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {c.problems.length} problem{c.problems.length === 1 ? "" : "s"}
              </span>
              {c.invite_code && (
                <span className="font-mono tracking-widest text-slate-700">{c.invite_code}</span>
              )}
              {c.is_practice && <span className="text-slate-400">practice</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewContestForm({ onDone }: { onDone: () => void }) {
  // Default to a two-hour contest starting tomorrow — the shape of almost
  // every contest here, so most of the form is already right.
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(localInputValue(tomorrow));
  const [endsAt, setEndsAt] = useState(
    localInputValue(new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000)),
  );
  const [freeze, setFreeze] = useState(0);
  const [practice, setPractice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const invalidRange = Boolean(startsAt && endsAt) && new Date(endsAt) <= new Date(startsAt);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await json(
        await fetch("/api/org/contests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            // The inputs are local wall-clock; send an absolute instant so
            // the server never has to guess a timezone.
            starts_at: new Date(startsAt).toISOString(),
            ends_at: new Date(endsAt).toISOString(),
            freeze_minutes_before_end: freeze,
            is_practice: practice,
          }),
        }),
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the contest.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <label className="block text-sm font-medium text-slate-700">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Monthly Round 1"
          autoFocus
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Starts</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Ends</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-900 ${
              invalidRange ? "border-red-400" : "border-slate-300"
            }`}
          />
          {invalidRange && (
            <p className="mt-1 text-xs text-red-600">Must be after the start time.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Freeze scoreboard (minutes before end)
          </label>
          <input
            type="number"
            min={0}
            value={freeze}
            onChange={(e) => setFreeze(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <p className="mt-1 text-xs text-slate-500">0 means the scoreboard never freezes.</p>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={practice}
            onChange={(e) => setPractice(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Practice contest
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim() || invalidRange}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create contest"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
