export const STUDENT_IMPORT_FIELDS = [
  ["display_name", "Name (required)"],
  ["email", "Email"],
  ["external_ref", "External reference"],
  ["college", "College"],
  ["branch", "Branch"],
  ["graduation_year", "Graduation year"],
  ["linkedin_url", "LinkedIn URL"],
  ["github_url", "GitHub URL"],
  ["resume_url", "Resume URL"],
  ["contact_email", "Contact email"],
  ["phone", "Phone"],
  ["location", "Location"],
] as const;
export const MAX_STUDENT_IMPORT_BYTES = 10 * 1024 * 1024;
export type StudentImportResult = {
  created: number;
  updated: number;
  total_rows: number;
  skipped: number;
  error_count: number;
  row_errors: { line: number; field: string; message: string }[];
  sample_rows: {
    line: number;
    action: "create" | "update" | "skip";
    values: Record<string, string>;
  }[];
  preview_token: string | null;
  dry_run: boolean;
};

/** Read only the header; the API validates all records with its import parser. */
export function studentCsvHeaders(source: string): string[] {
  const text = source.replace(/^\uFEFF/, "");
  const headers: string[] = [];
  let cell = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else cell += c;
    } else if (c === "," || c === "\n" || c === "\r") {
      headers.push(cell);
      cell = "";
      closed = false;
      if (c !== ",") return validateHeaders(headers);
    } else if (c === '"' && cell === "" && !closed) quoted = true;
    else {
      if (closed || c === '"')
        throw new Error("The CSV header has invalid quotes.");
      cell += c;
    }
  }
  if (quoted) throw new Error("The CSV header has an unclosed quote.");
  headers.push(cell);
  return validateHeaders(headers);
}
function validateHeaders(headers: string[]): string[] {
  if (
    headers.some((header) => !header.trim()) ||
    new Set(headers).size !== headers.length
  )
    throw new Error("CSV column names must be unique and nonempty.");
  return headers;
}

export function studentImportResult(
  value: unknown,
  preview: boolean,
): StudentImportResult {
  const result = value as StudentImportResult | null;
  const count = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0;
  if (
    !result ||
    ![
      result.created,
      result.updated,
      result.total_rows,
      result.skipped,
      result.error_count,
    ].every(count) ||
    result.created + result.updated + result.skipped !== result.total_rows ||
    result.dry_run !== preview ||
    (preview
      ? typeof result.preview_token !== "string" || !result.preview_token
      : result.preview_token !== null) ||
    !Array.isArray(result.row_errors) ||
    result.row_errors.length !== result.error_count ||
    result.row_errors.some(
      (row) =>
        !row ||
        !count(row.line) ||
        row.line < 1 ||
        typeof row.field !== "string" ||
        typeof row.message !== "string",
    ) ||
    !Array.isArray(result.sample_rows) ||
    result.sample_rows.length > 10 ||
    result.sample_rows.some(
      (row) =>
        !row ||
        !count(row.line) ||
        row.line < 1 ||
        !["create", "update", "skip"].includes(row.action) ||
        !row.values ||
        typeof row.values !== "object" ||
        Array.isArray(row.values) ||
        !Object.values(row.values).every((v) => typeof v === "string"),
    )
  )
    throw new Error("The import response was not recognised.");
  return result;
}

export function importErrorsCsv(
  errors: StudentImportResult["row_errors"],
): string {
  const cell = (value: string) =>
    `"${(/^\s*[=+\-@]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;
  return [
    "line,field,error",
    ...errors.map((row) =>
      [String(row.line), row.field, row.message].map(cell).join(","),
    ),
  ].join("\n");
}
