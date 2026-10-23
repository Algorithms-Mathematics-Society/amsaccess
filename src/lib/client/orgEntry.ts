/** Pending check-in and credential login alone do not prove contest entry. */
export type EntrySession = { user_uid?: string | null; login_id?: string | null; started_at: string | null };
export function enteredParticipantKeys(sessions: EntrySession[]): Set<string> {
  const keys = new Set<string>();
  for (const session of sessions) {
    if (!session.started_at || !Number.isFinite(Date.parse(session.started_at))) continue;
    if (session.user_uid) keys.add(`uid:${session.user_uid}`);
    // Older session responses expose the unique login handle but not the user UID.
    else if (session.login_id) keys.add(`login:${session.login_id}`);
  }
  return keys;
}
export function participantEntered(keys: Set<string>, participant: { user_uid: string; login_id: string }): boolean {
  return keys.has(`uid:${participant.user_uid}`) || keys.has(`login:${participant.login_id}`);
}

/** Stable, linear partition: preserve the server's scoring order within each group. */
export function groupLeaderboardByEntry<T extends { user_uid: string; username: string }>(
  rows: readonly T[], keys: Set<string>,
): { row: T; entered: boolean }[] {
  const entered: { row: T; entered: boolean }[] = [];
  const unconfirmed: { row: T; entered: boolean }[] = [];
  for (const row of rows) {
    const confirmed = participantEntered(keys, { user_uid: row.user_uid, login_id: row.username });
    (confirmed ? entered : unconfirmed).push({ row, entered: confirmed });
  }
  return entered.concat(unconfirmed);
}
