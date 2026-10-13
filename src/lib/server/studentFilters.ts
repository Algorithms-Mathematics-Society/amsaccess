/**
 * The query parameters the participant directory understands.
 *
 * Shared rather than duplicated because the listing, the facet counts and
 * the export must narrow by exactly the same thing: a filter honoured by two
 * of the three produces a count that describes a different set from the rows
 * it sits above.
 *
 * It also allowlists. The proxy used to forward `q` alone with the limit
 * pinned at 500, which is how a directory of 2,500 came to report itself as
 * 500; widening it must not turn into forwarding whatever a caller invents.
 */
const FILTERS = [
  "q",
  "college",
  "branch",
  "graduation_year",
  "mailable",
  "sort",
  "limit",
  "offset",
] as const;

export function allowedQuery(request: Request): string {
  const from = new URL(request.url).searchParams;
  const out = new URLSearchParams();
  for (const key of FILTERS) {
    const value = from.get(key);
    if (value) out.set(key, value);
  }
  return out.toString();
}
