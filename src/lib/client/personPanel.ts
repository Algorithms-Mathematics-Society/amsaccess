import type { NotificationRaw, SessionRow } from "./orgNotifications";
import { UUID } from "../teamSetup.ts";

/** Only identifiers from a matched roster/session or resolved profile may scope API reads. */
export function personUserUid(
  rosterUid: unknown,
  sessionUid: unknown,
  profileUid: unknown,
): string | null {
  return (
    [rosterUid, sessionUid, profileUid].find(
      (uid): uid is string => typeof uid === "string" && UUID.test(uid),
    ) ?? null
  );
}

export const PERSON_SUBMISSION_LIMIT = 100;
export function personSubmissionsUrl(
  contestUid: string,
  userUid: string,
): string {
  if (!UUID.test(contestUid) || !UUID.test(userUid))
    throw new Error("A valid contest and participant are required.");
  return `/api/org/contests/${encodeURIComponent(contestUid)}/submissions?user_uid=${encodeURIComponent(userUid)}&limit=${PERSON_SUBMISSION_LIMIT}`;
}

/** The roster fields the person panel reads; ParticipantsPanel rows carry more. */
export type RosterPerson = {
  user_uid: string;
  login_id: string;
  display_name: string;
  revoked: boolean;
  last_login_at: string | null;
  has_passphrase: boolean;
  email: string;
  mail_status: string;
};

/** Same wording and order as the roster's status pill. */
export function loginState(row: RosterPerson): string {
  return row.revoked
    ? "revoked"
    : row.last_login_at
      ? "signed in"
      : !row.has_passphrase
        ? "no passphrase"
        : "not yet used";
}

export function idleLabel(seconds: number | null): string {
  if (seconds === null) return "never checked in";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

/**
 * One person's slice of the shared live feed. `handle` is the uid the roster
 * and invigilation lists open with (the drawer may fall back to a login id).
 * Requests and incidents carry no uid, only the contest login id.
 */
export function personContestState(
  raw: NotificationRaw,
  handle: string,
  roster: RosterPerson[] | null,
) {
  const rosterRow =
    roster?.find((r) => r.user_uid === handle || r.login_id === handle) ?? null;
  const matchingSessions = raw.sessions.filter(
    (s) =>
      (s.user_uid !== null && s.user_uid === handle) ||
      s.login_id === handle ||
      (rosterRow !== null && s.login_id === rosterRow.login_id),
  );
  // A repeated live-feed row is one sitting; newest start first, never-started last.
  const sessions = [
    ...new Map(matchingSessions.map((s) => [s.uid, s])).values(),
  ].sort(
    (a, b) =>
      (Date.parse(b.started_at ?? "") || 0) -
      (Date.parse(a.started_at ?? "") || 0),
  );
  const loginId = rosterRow?.login_id || sessions[0]?.login_id || "";
  const sessionUids = new Set(sessions.map((s) => s.uid));
  const mine = (row: { login_id: string }) =>
    loginId !== "" && row.login_id === loginId;
  const session: SessionRow | null = sessions[0] ?? null;
  return {
    rosterRow,
    loginId,
    session,
    sessions,
    resumes: raw.resumes.filter(
      (r) =>
        r.status === "pending" && (sessionUids.has(r.session_uid) || mine(r)),
    ),
    incidents: raw.incidents.filter((i) => i.status !== "resolved" && mine(i)),
  };
}
