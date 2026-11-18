import test from "node:test";
import assert from "node:assert/strict";
import {
  studentCsvHeaders,
  studentImportResult,
  importErrorsCsv,
} from "../../src/lib/studentImport.ts";

test("CSV header reader preserves exact mapped names, BOM, quotes and embedded newlines", () => {
  assert.deepEqual(
    studentCsvHeaders('\uFEFF"Full, name","E""mail","School\nname"\r\nA,B,C'),
    ["Full, name", 'E"mail', "School\nname"],
  );
  assert.deepEqual(studentCsvHeaders(" Name ,Email\rA,B"), [" Name ", "Email"]);
  assert.deepEqual(studentCsvHeaders("display_name,email"), [
    "display_name",
    "email",
  ]);
});
test("ambiguous or malformed headers cannot be mapped", () => {
  for (const text of [
    "",
    "name,",
    "name,name\nA,B",
    '"name',
    '"name"junk,email',
    'na"me,email',
  ])
    assert.throws(() => studentCsvHeaders(text));
});
const preview = {
  created: 1,
  updated: 0,
  total_rows: 1,
  skipped: 0,
  error_count: 0,
  row_errors: [],
  sample_rows: [{ line: 2, action: "create", values: { display_name: "A" } }],
  preview_token: "token",
  dry_run: true,
};
test("preview requires a consistent result and token before enabling commit", () => {
  assert.equal(studentImportResult(preview, true), preview);
  for (const bad of [
    null,
    {},
    { ...preview, preview_token: null },
    { ...preview, dry_run: false },
    { ...preview, total_rows: 2 },
    { ...preview, error_count: 1 },
    { ...preview, sample_rows: [{ line: 2, action: "create", values: null }] },
    {
      ...preview,
      sample_rows: [
        { line: 2, action: "create", values: { display_name: 42 } },
      ],
    },
  ])
    assert.throws(() => studentImportResult(bad, true));
  assert.equal(
    studentImportResult(
      { ...preview, preview_token: null, dry_run: false },
      false,
    ).created,
    1,
  );
  assert.throws(() => studentImportResult(preview, false));
});
test("error export retains every diagnostic and escapes spreadsheet formulas", () => {
  const errors = Array.from({ length: 60 }, (_, i) => ({
    line: i + 2,
    field: "email",
    message: i ? `bad, row "${i}"` : ' =HYPERLINK("bad")',
  }));
  const csv = importErrorsCsv(errors);
  assert.equal(csv.split("\n").length, 61);
  assert(csv.includes('"\' =HYPERLINK(""bad"")"'));
  assert(csv.includes('"61","email","bad, row ""59"""'));
});
