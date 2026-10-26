"use client";

/**
 * Interrupting everyone sitting a contest, on purpose.
 *
 * On 24 October a round was postponed and candidates kept working for hours,
 * some finishing the whole paper, because the message went out on WhatsApp
 * and email and a locked-down exam app shows neither. This is the console
 * side of the in-app channel that replaced it.
 *
 * Three things shape the interface, all of them consequences of what the
 * action actually does:
 *
 * It is irreversible, so there is a confirmation step that states the
 * consequence in the organizer's own terms rather than asking "are you
 * sure". It is read under pressure by someone who has just realised
 * something has gone wrong, so the audience count is on screen before they
 * commit and the primary button carries it. And a typo reaches a thousand
 * people at once, so the composer shows what the candidate will actually
 * see, not a form that implies one.
 *
 * Afterwards the same panel answers the question nobody could answer on 24
 * October: how many of them have actually read it.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, Megaphone, X } from "lucide-react";

const TITLE_LIMIT = 120;
const BODY_LIMIT = 4000;
/** Reach climbs while staff watch, so the panel refreshes itself. */
const REACH_POLL_MS = 15_000;

export type AnnouncementRecord = {
  uid: string;
  title: string;
  body: string;
  created_at: string;
  issued_by: string;
  acknowledged_count: number;
  session_count: number;
};

type Feed = { sitting: number; announcements: AnnouncementRecord[] };

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(reason(res.status, (data as { error?: string }).error));
  return data as T;
}

/**
 * What went wrong, and what to do about it.
 *
 * The backend's own words are right for a refusal it reasoned about, but a
 * bare "Not Found" from a route the server does not have yet told an
 * organizer nothing they could act on, in the middle of the incident this
 * feature exists for. Each of these names the recovery, and says whether
 * anything was sent.
 */
function reason(status: number, detail?: string): string {
  if (status === 404)
    return "This server does not have announcements yet. It needs the current API deployed before one can be issued.";
  if (status === 401) return "Your session has expired. Sign in again, then retry.";
  if (status === 403) return "Your account cannot issue announcements for this contest.";
  if (status === 422)
    return detail ?? "The headline or message is too long. Shorten it and try again.";
  if (status >= 500)
    return "The server could not accept it. Nothing was sent, so retrying is safe.";
  return detail ?? "Could not issue the announcement. Nothing was sent.";
}

function timeOf(iso: string): string {
  const at = new Date(iso);
  return Number.isFinite(at.getTime())
    ? at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
}

/** "1,236", so a four-figure audience is legible at a glance. */
function count(n: number): string {
  return n.toLocaleString();
}

export function IssueAnnouncementModal({
  contestUid,
  contestTitle,
  onClose,
}: {
  contestUid: string;
  contestTitle: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"compose" | "confirm">("compose");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feed, setFeed] = useState<Feed | null>(null);
  const [justIssued, setJustIssued] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const ready = title.trim().length > 0 && body.trim().length > 0;
  const sitting = feed?.sitting ?? null;

  const load = useCallback(async () => {
    try {
      setFeed(await json<Feed>(await fetch(`/api/org/contests/${contestUid}/announcements`)));
    } catch {
      // The composer still works without the history. Leaving the audience
      // count unknown is honest; inventing one would not be.
    }
  }, [contestUid]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REACH_POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Escape steps back rather than discarding. Someone who has typed a
  // postponement and reached the confirmation should not lose it by
  // reaching for the key that normally closes a dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      if (step === "confirm") setStep("compose");
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, busy, onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (step === "compose") titleRef.current?.focus();
  }, [step]);

  async function issue() {
    setBusy(true);
    setError("");
    try {
      const created = await json<AnnouncementRecord>(
        await fetch(`/api/org/contests/${contestUid}/announcements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), body: body.trim() }),
        }),
      );
      setJustIssued(created.uid);
      setTitle("");
      setBody("");
      setStep("compose");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue the announcement.");
      setStep("compose");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6"
      onClick={() => !busy && onClose()}
      role="presentation"
    >
      <div
        className="relative my-4 w-full max-w-2xl rounded-xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-announcement-title"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="border-b border-slate-200 px-6 py-5">
          <h2
            id="issue-announcement-title"
            className="flex items-center gap-2 text-lg font-semibold text-slate-900"
          >
            <Megaphone className="h-5 w-5 text-slate-400" aria-hidden />
            Issue announcement
          </h2>
          <p className="mt-1.5 max-w-prose text-sm text-slate-500">
            Everyone sitting <span className="text-slate-700">{contestTitle}</span> is interrupted
            immediately and must acknowledge this before they can keep working. It reaches them
            within a minute and cannot be unsent.
          </p>
        </header>

        {step === "compose" ? (
          <Compose
            title={title}
            body={body}
            onTitle={setTitle}
            onBody={setBody}
            titleRef={titleRef}
            sitting={sitting}
            ready={ready}
            error={error}
            justIssued={justIssued}
            feed={feed}
            onCancel={onClose}
            onReview={() => {
              setError("");
              setJustIssued(null);
              setStep("confirm");
            }}
          />
        ) : (
          <Confirm
            title={title}
            body={body}
            sitting={sitting}
            busy={busy}
            onBack={() => setStep("compose")}
            onIssue={() => void issue()}
          />
        )}
      </div>
    </div>
  );
}

function Compose({
  title,
  body,
  onTitle,
  onBody,
  titleRef,
  sitting,
  ready,
  error,
  justIssued,
  feed,
  onCancel,
  onReview,
}: {
  title: string;
  body: string;
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
  sitting: number | null;
  ready: boolean;
  error: string;
  justIssued: string | null;
  feed: Feed | null;
  onCancel: () => void;
  onReview: () => void;
}) {
  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition placeholder:text-slate-500 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900";
  return (
    <>
      <div className="space-y-5 px-6 py-5">
        {justIssued && (
          <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <Check className="h-4 w-4 shrink-0" aria-hidden />
            Issued. Acknowledgements appear below as candidates read it.
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="announcement-title" className="block text-sm font-medium text-slate-700">
            Headline
          </label>
          <input
            id="announcement-title"
            ref={titleRef}
            value={title}
            maxLength={TITLE_LIMIT}
            onChange={(event) => onTitle(event.target.value)}
            placeholder="Round 1 is postponed"
            className={field}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="announcement-body" className="block text-sm font-medium text-slate-700">
              Message
            </label>
            {/* Only near the ceiling. A counter that is always on teaches
                people to write to a limit instead of to the reader. */}
            {body.length > BODY_LIMIT - 400 && (
              <span className="text-xs tabular-nums text-slate-500">
                {count(BODY_LIMIT - body.length)} left
              </span>
            )}
          </div>
          <textarea
            id="announcement-body"
            value={body}
            rows={4}
            maxLength={BODY_LIMIT}
            onChange={(event) => onBody(event.target.value)}
            placeholder="Say what happened, what it means for their work, and what to do next."
            className={`${field} resize-y`}
          />
        </div>

        {(title.trim() || body.trim()) && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              What each candidate sees
            </p>
            <CandidatePreview title={title} body={body} />
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        {feed && feed.announcements.length > 0 && (
          <section className="space-y-3 border-t border-slate-200 pt-5">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Already issued
            </h3>
            <ul className="space-y-3">
              {feed.announcements.slice(0, 4).map((row) => (
                <Reach key={row.uid} row={row} highlighted={row.uid === justIssued} />
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
        <p className="text-sm text-slate-500">
          {sitting === null ? (
            "Counting who is sitting…"
          ) : sitting === 0 ? (
            "Nobody is sitting this contest yet."
          ) : (
            <>
              <span className="font-medium tabular-nums text-slate-900">{count(sitting)}</span>{" "}
              {sitting === 1 ? "candidate is" : "candidates are"} sitting now
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReview}
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-40"
          >
            Review
          </button>
        </div>
      </footer>
    </>
  );
}

function Confirm({
  title,
  body,
  sitting,
  busy,
  onBack,
  onIssue,
}: {
  title: string;
  body: string;
  sitting: number | null;
  busy: boolean;
  onBack: () => void;
  onIssue: () => void;
}) {
  return (
    <>
      <div className="space-y-5 px-6 py-5">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div className="space-y-1 text-sm text-amber-900">
            <p className="font-medium">This cannot be unsent.</p>
            <p>
              {sitting === null || sitting === 0
                ? "Everyone sitting this contest"
                : `All ${count(sitting)} ${sitting === 1 ? "candidate" : "candidates"} sitting right now`}{" "}
              will be interrupted mid-question and must acknowledge it before they can keep
              working. To correct a mistake you would have to interrupt them a second time.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            What each candidate sees
          </p>
          <CandidatePreview title={title} body={body} />
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onIssue}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {busy
            ? "Issuing…"
            : sitting === null || sitting === 0
              ? "Issue announcement"
              : `Issue to ${count(sitting)} ${sitting === 1 ? "candidate" : "candidates"}`}
        </button>
      </footer>
    </>
  );
}

/**
 * What the exam app will put on screen.
 *
 * Deliberately styled like the candidate's dialog rather than like this
 * console: the organizer is checking copy that a thousand people read under
 * stress, and a form field does not show them whether it reads well.
 */
function CandidatePreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden />
        Announcement from the organizers
      </p>
      <p className="mt-2 text-base font-semibold text-slate-900">
        {title.trim() || "Your headline"}
      </p>
      <p className="mt-1.5 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {body.trim() || "Your message."}
      </p>
      <div className="mt-3 flex justify-end">
        <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
          I understand
        </span>
      </div>
    </div>
  );
}

/** One issued announcement, and how far it has actually reached. */
function Reach({ row, highlighted }: { row: AnnouncementRecord; highlighted: boolean }) {
  const total = row.session_count;
  const read = Math.min(row.acknowledged_count, total || row.acknowledged_count);
  const share = total > 0 ? read / total : 0;
  const complete = total > 0 && read >= total;
  return (
    <li
      className={`rounded-lg border px-3 py-2.5 transition ${
        highlighted ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium text-slate-900">{row.title}</p>
        <p className="shrink-0 text-xs tabular-nums text-slate-500">
          {total > 0 ? (
            <>
              <span className={complete ? "text-emerald-700" : "text-slate-900"}>
                {count(read)}
              </span>{" "}
              of {count(total)} read
            </>
          ) : (
            `${count(read)} read`
          )}
        </p>
      </div>
      {total > 0 && (
        <div
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={read}
          aria-label={`${row.title}: ${read} of ${total} acknowledged`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              complete ? "bg-emerald-600" : "bg-slate-900"
            }`}
            style={{ width: `${Math.max(share * 100, read > 0 ? 2 : 0)}%` }}
          />
        </div>
      )}
      <p className="mt-1.5 text-xs text-slate-500">
        {timeOf(row.created_at)}
        {row.issued_by ? ` by ${row.issued_by}` : ""}
      </p>
    </li>
  );
}
