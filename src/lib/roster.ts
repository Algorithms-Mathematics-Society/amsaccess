/**
 * Reading a contest roster file.
 *
 * A contest roster is a list of people who must already exist in the Access
 * directory, so the only thing worth taking out of the file is the address.
 * Everything else about a person — their name, college, reference, resume —
 * lives in the directory, and taking it from a CSV instead would be building a
 * second, emptier copy of a record that already exists.
 */
/**
 * Every address in a pasted or uploaded roster.
 *
 * Column order is not assumed: a file exported from a spreadsheet puts the
 * address wherever the sheet happened to have it, and a file that is nothing
 * but addresses is equally valid. So every cell is examined and the ones that
 * look like addresses are taken, which also means a "Name,Email,Roll" header
 * needs no special handling here — none of its cells contain an `@`.
 *
 * Duplicates are collapsed, because the same person listed twice is a typo,
 * not two people.
 */
export function extractEmails(text: string): string[] {
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    for (const cell of line.split(/[,;\t]/)) {
      const value = cell.trim().replace(/^["']|["']$/g, "").toLowerCase();
      if (value.includes("@") && !value.includes(" ")) seen.add(value);
    }
  }
  return [...seen];
}
