/**
 * Fuzzy matching for finding one person in a roster of a few thousand.
 *
 * Substring search was what we had, and it fails the way staff actually
 * type: "ayush shukla" finds nothing when the roster says "Ayush Kumar
 * Shukla", and a handle typed as "ayushs" matches no name at all. Mid-exam
 * that reads as "this person is not on the roster", which is the one
 * conclusion that must never be reached by accident.
 *
 * So: every character of the query must appear, in order, somewhere in the
 * candidate. Position is what scores. A run of characters together beats the
 * same characters scattered, a match at the start of a word beats one in the
 * middle, and an outright substring beats both, because when someone types a
 * whole surname they mean that surname.
 */

/** Word starts, for the bonus that makes initials work. */
function isBoundary(text: string, at: number): boolean {
  if (at === 0) return true;
  return /[\s\-_.@]/.test(text[at - 1]);
}

/**
 * How well `needle` matches `haystack`, or null for no match at all.
 *
 * Higher is better. The scale is arbitrary and only meaningful against other
 * scores from this same function.
 */
export function fuzzyScore(haystack: string, needle: string): number | null {
  const hay = haystack.toLowerCase();
  const query = needle.toLowerCase().trim();
  if (!query) return 0;
  if (!hay) return null;

  // Shorter candidates are the better answer to the same query: "Ayush
  // Dutta" over "Ayush Kumar Shukla Dutta" when both match equally well.
  const verbosity = Math.min(Math.floor(hay.length / 8), 10);

  // An outright substring is not a guess, so it starts far above anything
  // the character walk below can reach.
  const direct = hay.indexOf(query);
  if (direct >= 0) {
    return (
      1000 +
      (isBoundary(hay, direct) ? 100 : 0) -
      Math.min(direct, 60) -
      verbosity
    );
  }

  let score = 0;
  let at = 0;
  let previous = -1;
  for (const char of query) {
    const found = hay.indexOf(char, at);
    if (found < 0) return null;
    if (found === previous + 1) score += 15;
    if (isBoundary(hay, found)) score += 12;
    // Distance from where we were looking, so scattered letters score less
    // than tight ones. Capped: one long gap should not sink an otherwise
    // good match.
    score -= Math.min(found - at, 8);
    previous = found;
    at = found + 1;
  }
  return score - verbosity;
}

/** The best score across several fields, or null if none match. */
export function fuzzyBest(
  fields: readonly (string | null | undefined)[],
  needle: string,
): number | null {
  let best: number | null = null;
  for (const field of fields) {
    if (!field) continue;
    const score = fuzzyScore(field, needle);
    if (score !== null && (best === null || score > best)) best = score;
  }
  return best;
}

/**
 * Filter and rank a list by a query over the chosen fields.
 *
 * Stable within equal scores, so an empty query leaves the caller's order
 * exactly as it was -- which matters because both places this is used have
 * already sorted their rows for a reason.
 */
export function fuzzyRank<T>(
  items: readonly T[],
  needle: string,
  fieldsOf: (item: T) => readonly (string | null | undefined)[],
): T[] {
  const query = needle.trim();
  if (!query) return [...items];
  const scored: { item: T; score: number; at: number }[] = [];
  items.forEach((item, at) => {
    const score = fuzzyBest(fieldsOf(item), query);
    if (score !== null) scored.push({ item, score, at });
  });
  scored.sort((a, b) => b.score - a.score || a.at - b.at);
  return scored.map((entry) => entry.item);
}
