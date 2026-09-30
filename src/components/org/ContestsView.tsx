"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, CalendarDays, Plus, Square, Trash2, Undo2, Users } from "lucide-react";
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
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    try {
      const url = showArchived ? "/api/org/contests?archived=1" : "/api/org/contests";
      setContests(await json<Contest[]>(await fetch(url, { cache: "no-store" })));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load contests.");
    }
  }, [showArchived]);

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              showArchived ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "Showing archived" : "Show archived"}
          </button>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New contest
          </button>
        </div>
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
          <ContestCard key={c.uid} contest={c} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

/**
 * One contest, with the two or three things you can do to it.
 *
 * Deliberately not a menu. Only a couple of actions make sense for any given
 * contest — you end a live one, you file a finished one, you delete one nobody
 * sat — and a menu would hide that behind a click while making every option
 * look equally reasonable.
 *
 * Deleting asks twice, and it asks using the server's own refusal: the first
 * attempt goes without `purge`, comes back naming how many submissions would
 * be destroyed, and only then offers to do it anyway. That count cannot be
 * known here, and a vague invented warning is the kind people learn to click
 * straight through.
 */
function ContestCard({ contest: c, onChanged }: { contest: Contest; onChanged: () => void }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmPurge, setConfirmPurge] = useState(false);

  async function act(action: string, url: string, method: "POST" | "DELETE") {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(url, { method });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Request failed.");
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
      if (method === "DELETE") setConfirmPurge(true);
    } finally {
      setBusy("");
    }
  }

  const archived = c.status === "archived";
  // A practice contest reports "running" for ever by design — its window is
  // whatever the organiser happened to type. Treating that as live would leave
  // the contests most in need of clearing out as the only ones with no
  // actions at all.
  const live = c.status === "running" && !c.is_practice;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-400">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/org/contests/${c.uid}`}
          className="min-w-0 truncate text-base font-semibold text-slate-950 hover:underline"
        >
          {c.title}
        </Link>
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

      {error && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3">
        {live && (
          <CardAction
            icon={<Square className="h-3.5 w-3.5" />}
            label={busy === "end" ? "Ending…" : "End now"}
            hint="Stop the contest at this moment. Nothing is deleted."
            disabled={Boolean(busy)}
            onClick={() => act("end", `/api/org/contests/${c.uid}/lifecycle?action=end`, "POST")}
          />
        )}

        {archived ? (
          <CardAction
            icon={<Undo2 className="h-3.5 w-3.5" />}
            label={busy === "unarchive" ? "Restoring…" : "Restore"}
            hint="Put it back in the working list."
            disabled={Boolean(busy)}
            onClick={() =>
              act("unarchive", `/api/org/contests/${c.uid}/lifecycle?action=unarchive`, "POST")
            }
          />
        ) : (
          !live && (
            <CardAction
              icon={<Archive className="h-3.5 w-3.5" />}
              label={busy === "archive" ? "Archiving…" : "Archive"}
              hint="File it away, keeping every result. Reversible."
              disabled={Boolean(busy)}
              onClick={() =>
                act("archive", `/api/org/contests/${c.uid}/lifecycle?action=archive`, "POST")
              }
            />
          )
        )}

        {!live && (
          <CardAction
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label={busy === "delete" ? "Deleting…" : confirmPurge ? "Delete anyway" : "Delete"}
            hint={
              confirmPurge
                ? "Destroy the contest and every result in it. There is no undo."
                : "Delete a contest nobody sat."
            }
            danger
            disabled={Boolean(busy)}
            onClick={() =>
              act("delete", `/api/org/contests/${c.uid}${confirmPurge ? "?purge=1" : ""}`, "DELETE")
            }
          />
        )}
      </div>
    </div>
  );
}

function CardAction({
  icon,
  label,
  hint,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </button>
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
