/** Derived views only: no new reads and no change to roster ordering. */
export const ROSTER_VIEWS = [
  ["all", "All"], ["attention", "Needs attention"], ["not-entered", "Not entered"],
  ["missing-passphrase", "Missing passphrase"], ["email-failed", "Email failed"],
  ["email-unsent", "Email unsent"], ["revoked", "Revoked"],
] as const;
export type RosterView = typeof ROSTER_VIEWS[number][0];
type Status = { revoked: boolean; has_passphrase: boolean; email: string; mail_status: string };
export function matchesRosterView(row: Status, entered: boolean, view: RosterView): boolean {
  if (view === "all") return true;
  if (view === "revoked") return row.revoked;
  if (row.revoked) return false;
  const failed = ["failed", "bounced", "complained"].includes(row.mail_status);
  switch (view) {
    case "attention": return !row.has_passphrase || failed;
    case "not-entered": return !entered;
    case "missing-passphrase": return !row.has_passphrase;
    case "email-failed": return failed;
    case "email-unsent": return Boolean(row.email) && !row.mail_status;
  }
}
