"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { elapsedLabel, gapMinutes } from "@/lib/invigilation-timeline";

/**
 * Did the same person sit the whole paper?
 *
 * Entry and exit alone cannot answer that: a stand-in only has to be absent
 * for the two moments that get photographed. The proctor takes a frame every
 * half hour instead, and this is where a human reads them.
 *
 * The design follows from the task. The frames are laid out as one
 * horizontal strip per contest, in capture order, at a size where faces are
 * comparable side by side — because the judgement is a comparison, not a
 * lookup, and the eye makes it in a single sweep rather than by opening
 * seven dialogs. Elapsed time is printed under each frame rather than the
 * wall clock, since "01:30 into the paper" is what a reader is reasoning
 * about.
 *
 * A gap in the timer is drawn, not omitted. A missing half hour is the most
 * interesting thing this screen can show, and a strip that silently closed
 * up would hide exactly the sitting worth investigating.
 */

export type SessionPhoto = {
  uid: string;
  kind: string;
  sequence: number;
  captured_at: string;
  available: boolean;
};

export type ContestInvigilation = {
  contest_uid: string;
  contest_title: string;
  starts_at: string | null;
  session_uid: string | null;
  session_status: string;
  started_at: string | null;
  ended_at: string | null;
  violation_count: number;
  photos: SessionPhoto[];
  flags?: InvigilationFlag[];
};

/** Something the proctor thought worth recording: a phone-shaped object, a
 *  missing face, more than one face. Never a verdict -- the image is what
 *  settles it, which is why these are shown rather than counted. */
export type InvigilationFlag = {
  uid: string;
  kind: string;
  detail: string;
  created_at: string;
  has_image: boolean;
};

const FLAG_LABEL: Record<string, string> = {
  face_missing: "No face",
  multiple_faces: "Two faces",
  object_suspected: "Possible phone",
};

function Frame({
  contestUid,
  sessionUid,
  photo,
  firstAt,
  onOpen,
}: {
  contestUid: string;
  sessionUid: string;
  photo: SessionPhoto;
  firstAt: string | null;
  onOpen: () => void;
}) {
  const label =
    photo.kind === "entry"
      ? "Arrived"
      : photo.kind === "exit"
        ? "Left"
        : elapsedLabel(firstAt, photo.captured_at);

  return (
    <figure className="shrink-0">
      {photo.available ? (
        <button
          type="button"
          onClick={onOpen}
          title={`${label} · ${new Date(photo.captured_at).toLocaleTimeString()}`}
          className="block h-24 w-24 overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-2 hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/org/contests/${contestUid}/invigilation/photo/${sessionUid}/${photo.sequence}`}
            alt={`Candidate at ${label}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </button>
      ) : (
        <div
          title="This frame was captured but the image is no longer stored."
          className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-slate-300 px-2 text-center text-[10px] leading-tight text-slate-400"
        >
          image gone
        </div>
      )}
      <figcaption className="mt-1 text-center text-[11px] tabular-nums text-slate-500">
        {label}
      </figcaption>
    </figure>
  );
}

function Lightbox({
  contestUid,
  sessionUid,
  photos,
  index,
  firstAt,
  onClose,
  onMove,
}: {
  contestUid: string;
  sessionUid: string;
  photos: SessionPhoto[];
  index: number;
  firstAt: string | null;
  onClose: () => void;
  onMove: (next: number) => void;
}) {
  const photo = photos[index];

  // Arrow keys step along the strip. Comparing frame four with frame five is
  // the whole task, and reopening a dialog between each pair would make the
  // comparison impossible to hold in your head.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && index > 0) onMove(index - 1);
      if (event.key === "ArrowRight" && index < photos.length - 1) onMove(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onClose, onMove, photos.length]);

  if (!photo) return null;
  const label =
    photo.kind === "entry"
      ? "Arrived"
      : photo.kind === "exit"
        ? "Left"
        : `${elapsedLabel(firstAt, photo.captured_at)} into the paper`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Invigilation frame"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            <p className="text-xs tabular-nums text-slate-500">
              {new Date(photo.captured_at).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="aspect-[4/3] overflow-hidden bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/org/contests/${contestUid}/invigilation/photo/${sessionUid}/${photo.sequence}`}
            alt={`Candidate at ${label}`}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
            className="rounded-lg px-2 py-1 transition enabled:hover:bg-slate-100 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="tabular-nums">
            {index + 1} of {photos.length}
          </span>
          <button
            type="button"
            disabled={index === photos.length - 1}
            onClick={() => onMove(index + 1)}
            className="rounded-lg px-2 py-1 transition enabled:hover:bg-slate-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export function InvigilationTimeline({ studentUid }: { studentUid: string }) {
  const [rows, setRows] = useState<ContestInvigilation[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<{ contest: string; session: string; index: number } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/org/students/${encodeURIComponent(studentUid)}/invigilation`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not load invigilation photos.");
      setRows(data as ContestInvigilation[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load invigilation photos.");
    }
  }, [studentUid]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error)
    return <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>;
  if (rows === null)
    return <p className="text-sm text-slate-500">Loading…</p>;
  if (rows.length === 0)
    return (
      <p className="rounded-xl border border-dashed border-slate-300 px-6 py-8 text-center text-sm text-slate-500">
        This student has not been added to a contest yet.
      </p>
    );

  const openRow = open ? rows.find((r) => r.contest_uid === open.contest) : null;

  return (
    <div className="space-y-5">
      {rows.map((row) => {
        const first = row.photos[0]?.captured_at ?? null;
        return (
          <div key={row.contest_uid}>
            <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-sm font-medium text-slate-900">{row.contest_title}</h3>
              {row.photos.length > 0 && (
                <span className="text-xs tabular-nums text-slate-400">
                  {row.photos.length} frames
                </span>
              )}
              {row.violation_count > 0 && (
                <span className="text-xs text-amber-700">{row.violation_count} flagged</span>
              )}
            </div>

            {(row.flags ?? []).length > 0 && (
              /* Red, and above the strip. These are the frames a reviewer
                 opened the page for; burying them after sixty routine
                 photographs would mean scrolling past the evidence to reach
                 the evidence. */
              <div className="mb-3 flex items-start gap-3 overflow-x-auto pb-2">
                {(row.flags ?? []).map((flag) => (
                  <figure key={flag.uid} className="shrink-0">
                    {flag.has_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/org/students/${encodeURIComponent(studentUid)}/invigilation/flag/${encodeURIComponent(flag.uid)}`}
                        alt={flag.detail || flag.kind}
                        className="h-24 w-20 rounded-lg border-2 border-rose-400 object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-rose-300 bg-rose-50 px-2 text-center">
                        <span className="text-[10px] leading-tight text-rose-700">no image</span>
                      </div>
                    )}
                    <figcaption className="mt-1 w-20 text-center text-[10px] leading-tight text-rose-700">
                      {FLAG_LABEL[flag.kind] ?? flag.kind}
                      <span className="block text-slate-500">
                        {elapsedLabel(row.started_at, flag.created_at)}
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            {row.photos.length === 0 ? (
              /* Said plainly rather than left blank: a sitting with no
                 photographs is itself worth seeing, and an empty row would
                 read as "nothing to report". */
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                {row.session_uid
                  ? "They sat this contest, but no photographs were captured."
                  : "They never started this contest."}
              </p>
            ) : (
              <div className="flex items-start gap-3 overflow-x-auto pb-2">
                {row.photos.map((photo, index) => {
                  const previous = row.photos[index - 1];
                  const gap = previous ? gapMinutes(previous.captured_at, photo.captured_at) : 0;
                  return (
                    <div key={photo.uid} className="flex items-start gap-3">
                      {gap > 0 && (
                        <div
                          title={`No frame was captured for ${gap} minutes.`}
                          className="flex h-24 w-20 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50 px-2 text-center"
                        >
                          <span className="text-xs font-medium tabular-nums text-amber-800">
                            {gap}m
                          </span>
                          <span className="text-[10px] leading-tight text-amber-700">
                            no frame
                          </span>
                        </div>
                      )}
                      <Frame
                        contestUid={row.contest_uid}
                        sessionUid={row.session_uid ?? ""}
                        photo={photo}
                        firstAt={first}
                        onOpen={() =>
                          setOpen({
                            contest: row.contest_uid,
                            session: row.session_uid ?? "",
                            index,
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {open && openRow && (
        <Lightbox
          contestUid={open.contest}
          sessionUid={open.session}
          photos={openRow.photos}
          index={open.index}
          firstAt={openRow.photos[0]?.captured_at ?? null}
          onClose={() => setOpen(null)}
          onMove={(next) => setOpen({ ...open, index: next })}
        />
      )}
    </div>
  );
}
