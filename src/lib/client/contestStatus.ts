type ContestWindow = {
  status: string;
  is_practice: boolean;
  starts_at: string;
  ends_at: string;
};

export const CONTEST_STATUS_POLL_MS = 30_000;

/** Polling handles distant dates and server-side edits. Arm a separate read
 * only when the next known transition is sooner than an ordinary poll. */
export function contestStatusRefreshDelay(contest: ContestWindow, now: number) {
  if (contest.is_practice) return null;
  const at =
    contest.status === "scheduled"
      ? contest.starts_at
      : contest.status === "running"
        ? contest.ends_at
        : null;
  if (!at) return null;
  const delay = Date.parse(at) - now;
  return delay > 0 && delay < CONTEST_STATUS_POLL_MS ? delay : null;
}
