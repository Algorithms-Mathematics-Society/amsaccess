export const REFERENCE_TITLE_LIMIT = 120;
export const REFERENCE_BODY_LIMIT = 20_000;

export type ReferenceSheetState = {
  draft: { title: string; body: string; version: number };
  published: {
    title: string;
    body: string;
    revision: number;
    published_at: string;
  } | null;
};

export function validateReferenceSheetRequest(
  value: unknown,
  publish: boolean,
): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return "Invalid request body.";
  const body = value as Record<string, unknown>;
  if (!Number.isSafeInteger(body.version) || (body.version as number) < 0)
    return "A saved draft version is required.";
  if (publish) return null;
  if (
    typeof body.title !== "string" ||
    body.title.length > REFERENCE_TITLE_LIMIT * 2 ||
    !body.title.trim() ||
    Array.from(body.title).length > REFERENCE_TITLE_LIMIT
  ) {
    return "Enter a title of 1–120 characters.";
  }
  if (
    typeof body.body !== "string" ||
    body.body.length > REFERENCE_BODY_LIMIT * 2 ||
    Array.from(body.body).length > REFERENCE_BODY_LIMIT
  ) {
    return "The sheet must contain at most 20,000 characters.";
  }
  if (body.title.includes("\0") || body.body.includes("\0"))
    return "Remove unsupported null characters from the sheet.";
  return null;
}
