import type { NotificationRaw, SessionRow } from "./orgNotifications";

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
  return row.revoked ? "revoked" : row.last_login_at ? "signed in" : !row.has_passphrase ? "no passphrase" : "not yet used";
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
export function personContestState(raw: NotificationRaw, handle: string, roster: RosterPerson[] | null) {
  const rosterRow = roster?.find((r) => r.user_uid === handle || r.login_id === handle) ?? null;
  const sessions = raw.sessions.filter((s) => (s.user_uid !== null && s.user_uid === handle) || s.login_id === handle || (rosterRow !== null && s.login_id === rosterRow.login_id));
  const loginId = rosterRow?.login_id || sessions[0]?.login_id || "";
  const sessionUids = new Set(sessions.map((s) => s.uid));
  const mine = (row: { login_id: string }) => loginId !== "" && row.login_id === loginId;
  // Latest sitting first; a never-started session sorts last.
  const started = (s: SessionRow) => Date.parse(s.started_at ?? "") || 0;
  const session: SessionRow | null = [...sessions].sort((a, b) => started(b) - started(a))[0] ?? null;
  return {
    rosterRow,
    loginId,
    session,
    resumes: raw.resumes.filter((r) => r.status === "pending" && (sessionUids.has(r.session_uid) || mine(r))),
    incidents: raw.incidents.filter((i) => i.status !== "resolved" && mine(i)),
  };
}
