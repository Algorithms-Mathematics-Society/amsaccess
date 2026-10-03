/**
 * Turning a pasted roster into participants.
 *
 * Shared by the roster form and the proxy route that submits it, so what the
 * organiser is shown as a preview is parsed by the same code that actually
 * runs. A second implementation in the browser would eventually disagree with
 * the one on the server, and the disagreement would show up as participants
 * provisioned differently from how they were previewed.
 */

export type RosterEntry = {
  display_name: string;
  email: string;
  external_ref: string;
};

/**
 * One pasted line → one roster entry.
 *
 * The field order after the name is not fixed, because a roster typed or
 * pasted by a human never is. Whichever part holds an `@` is the address;
 * whatever remains is the organiser's own reference. So these are equivalent:
 *
 *     Asha Rao, asha@example.edu, ROLL-101
 *     Asha Rao, ROLL-101, asha@example.edu
 *
 * and the older two-column form, `Asha Rao, ROLL-101`, still parses as it
 * always did.
 */
export function parseRosterLine(line: string): RosterEntry {
  const parts = line.split(",").map((part) => part.trim());
  const display_name = parts.shift() ?? "";
  const emailAt = parts.findIndex((part) => part.includes("@"));
  const email = emailAt === -1 ? "" : parts.splice(emailAt, 1)[0];
  return { display_name, email, external_ref: parts.filter(Boolean).join(" ") };
}

/** Every non-empty line, parsed. Blank lines are skipped, not errors. */
export function parseRoster(text: string): RosterEntry[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseRosterLine)
    .filter((entry) => entry.display_name.length > 0);
}

/** How many of these can actually be sent their login. */
export function mailableCount(entries: RosterEntry[]): number {
  return entries.filter((e) => e.email.includes("@")).length;
}
