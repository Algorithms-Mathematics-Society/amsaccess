import test from "node:test";
import assert from "node:assert/strict";

import { parseRosterLine, parseRoster, mailableCount, stripHeaderRow } from "./roster.ts";

// The field order after the name is deliberately not fixed: a roster typed or
// pasted by a human never is. These pin that, and pin the older two-column
// form still working — a roster someone saved last month must not change
// meaning.

test("name, email and reference", () => {
  assert.deepEqual(parseRosterLine("Asha Rao, asha@example.edu, ROLL-101"), {
    display_name: "Asha Rao",
    email: "asha@example.edu",
    external_ref: "ROLL-101",
  });
});

test("order after the name does not matter", () => {
  assert.deepEqual(parseRosterLine("Asha Rao, ROLL-101, asha@example.edu"), {
    display_name: "Asha Rao",
    email: "asha@example.edu",
    external_ref: "ROLL-101",
  });
});

test("the old two-column form still parses the way it did", () => {
  assert.deepEqual(parseRosterLine("Asha Rao, ROLL-101"), {
    display_name: "Asha Rao",
    email: "",
    external_ref: "ROLL-101",
  });
});

test("a name on its own is a valid roster entry", () => {
  assert.deepEqual(parseRosterLine("Asha Rao"), {
    display_name: "Asha Rao",
    email: "",
    external_ref: "",
  });
});

test("blank lines are skipped rather than failing the paste", () => {
  assert.equal(parseRoster("A, a@x.com\n\n   \nB, b@x.com").length, 2);
});

test("a line with no name is dropped, not provisioned nameless", () => {
  assert.equal(parseRoster(", orphan@x.com\nReal Name, real@x.com").length, 1);
});

test("mailable counts only real addresses", () => {
  const rows = parseRoster("A, a@x.com\nB, ROLL-2\nC, c@x.com");
  assert.equal(rows.length, 3);
  assert.equal(mailableCount(rows), 2);
});

// ── CSV header rows ───────────────────────────────────────────────────────
//
// Dropping the first line whenever it has no "@" would eat a real person from
// a roster of names and roll numbers. The word check is what makes it safe.



test("a header row is dropped", () => {
  const csv = "Name,Email,Roll\nAsha Rao,asha@x.edu,R-1";
  assert.equal(parseRoster(stripHeaderRow(csv)).length, 1);
});

test("a first row that is a real person is kept, even with no email", () => {
  const csv = "Asha Rao,R-101\nBen Ortiz,R-102";
  const rows = parseRoster(stripHeaderRow(csv));
  assert.equal(rows.length, 2, "a header check must not eat a real participant");
  assert.equal(rows[0].display_name, "Asha Rao");
});

test("a first row with an address is never treated as a header", () => {
  const csv = "Name Person,name@x.edu\nOther,other@x.edu";
  assert.equal(parseRoster(stripHeaderRow(csv)).length, 2);
});
