/**
 * Reading an invigilation strip.
 *
 * The two judgements a reader makes about a sitting, kept out of the
 * component that draws it: how far into the paper a frame was taken, and
 * whether the timer missed one. Both decide what a staff member concludes
 * about a candidate, so both are tested rather than eyeballed.
 */

/** Expected spacing between frames, mirroring the proctor's timer. */
export const INTERVAL_MINUTES = 30;

/**
 * How late a frame may be before the gap counts as one.
 *
 * A capture can slip: the upload retries, the machine sleeps for a moment,
 * the timer fires behind a busy main thread. Flagging those would cry wolf
 * on almost every sitting and teach staff to ignore the warning, which is
 * worse than not having it.
 */
export const GAP_GRACE_MINUTES = 10;

/** `1:30` into the paper, measured from the first frame. */
export function elapsedLabel(fromIso: string | null, atIso: string): string {
  if (!fromIso) return "";
  const minutes = Math.max(
    0,
    Math.round((Date.parse(atIso) - Date.parse(fromIso)) / 60000),
  );
  const hours = Math.floor(minutes / 60);
  return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Minutes unaccounted for between two frames, or 0 when the timer kept up.
 *
 * A number rather than a boolean, because the number is what tells a reader
 * whether to care: 41 minutes is a hiccup, 70 is somebody leaving the room.
 */
export function gapMinutes(previousIso: string, nextIso: string): number {
  const minutes = Math.round((Date.parse(nextIso) - Date.parse(previousIso)) / 60000);
  return minutes > INTERVAL_MINUTES + GAP_GRACE_MINUTES ? minutes : 0;
}
