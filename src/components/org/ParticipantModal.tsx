"use client";

/**
 * A participant, opened from inside a contest.
 *
 * Navigating to /org/participants/{id} from a contest was a one-way door:
 * that route belongs to the Students section, so Back landed the reviewer
 * on the roster rather than on the contest they were working through. An
 * invigilator checking twenty sittings had to re-enter the contest, find
 * their place and scroll to where they were, twenty times.
 *
 * So the contest keeps its page and the person opens over it. Same profile
 * body as the full page, so there is one description of a participant and
 * not two that drift.
 */

import { useEffect } from "react";
import { X } from "lucide-react";
import { ParticipantProfile } from "./ParticipantProfile";

export function ParticipantModal({
  handle,
  onClose,
}: {
  /** Username or uid; the profile route accepts either. */
  handle: string | null;
  onClose: () => void;
}) {
  // Escape closes, matching SubmissionSourceModal. A reviewer reaching for
  // it should not have to find the button.
  useEffect(() => {
    if (!handle) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handle, onClose]);

  // The page behind must not scroll while this is open: a long profile and a
  // long roster scrolling together is disorienting and loses the reviewer's
  // place in the contest, which is the whole reason this is a modal.
  useEffect(() => {
    if (!handle) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [handle]);

  if (!handle) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative my-4 w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Participant"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-lg border border-slate-200 bg-white/90 p-1.5 text-slate-500 backdrop-blur hover:bg-slate-50 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
        {/* `inModal` drops the back link and the page's outer padding: both
            belong to the standalone route, and a "Back to students" inside a
            dialog over a contest points at the wrong place entirely. */}
        <ParticipantProfile handle={handle} inModal />
      </div>
    </div>
  );
}
