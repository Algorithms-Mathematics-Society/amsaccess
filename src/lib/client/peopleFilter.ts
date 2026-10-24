/**
 * The search-and-filter state the Participants and Leaderboard tabs share.
 *
 * Both tabs answer the same two questions during a contest -- "where is this
 * one person" and "who is on Windows / from this college" -- so the logic
 * lives here once rather than drifting apart in two tables.
 */

import { fuzzyRank } from "./fuzzy.ts";

export type PeopleFilter = {
  needle: string;
  /** "" means every OS. Matched case-insensitively against the reported name. */
  os: string;
  /** "" means every college. */
  college: string;
};

export const NO_FILTER: PeopleFilter = { needle: "", os: "", college: "" };

export function filterIsActive(filter: PeopleFilter): boolean {
  return Boolean(filter.needle.trim() || filter.os || filter.college);
}

/**
 * The distinct values a column offers, most common first.
 *
 * Frequency order rather than alphabetical because these lists are read to be
 * clicked, not scanned: the OS most of the hall is on belongs at the top.
 * Blanks are dropped -- "filter by nothing" is what the "All" option is.
 */
export function optionsFrom<T>(
  rows: readonly T[],
  pick: (row: T) => string,
): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = (pick(row) ?? "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value]) => value);
}

/**
 * Apply the filter, then rank what survives by the search.
 *
 * Order matters: narrowing first means the search ranks only rows the staff
 * member can actually act on, and an empty search leaves the caller's order
 * untouched -- which both tabs depend on, having already sorted entrants to
 * the top for their own reasons.
 */
export function applyPeopleFilter<T>(
  rows: readonly T[],
  filter: PeopleFilter,
  read: {
    fields: (row: T) => readonly (string | null | undefined)[];
    os?: (row: T) => string;
    college?: (row: T) => string;
  },
): T[] {
  let kept = [...rows];

  if (filter.os && read.os) {
    const want = filter.os.toLowerCase();
    kept = kept.filter((row) => (read.os?.(row) ?? "").toLowerCase() === want);
  }
  if (filter.college && read.college) {
    const want = filter.college.toLowerCase();
    kept = kept.filter(
      (row) => (read.college?.(row) ?? "").toLowerCase() === want,
    );
  }

  return fuzzyRank(kept, filter.needle, read.fields);
}

/** `windows` on the wire, "Windows" on screen. Anything unknown is shown as
 *  it arrived, so a new platform reads as new rather than as one of these. */
export function osLabel(os: string): string {
  const known: Record<string, string> = {
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
  };
  return known[os.toLowerCase()] ?? os;
}
