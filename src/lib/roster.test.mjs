import test from "node:test";
import assert from "node:assert/strict";

import { extractEmails } from "./roster.ts";

// ── pulling addresses out of a file ───────────────────────────────────────
//
// A contest roster is now a list of people who must already be in Access, so
// the only column that matters is the address. Column order varies by whoever
// exported the sheet, so every cell is examined rather than a position assumed.

test("addresses are found wherever the column happens to be", () => {
  assert.deepEqual(extractEmails("Asha Rao,asha@x.edu,R-1"), ["asha@x.edu"]);
  assert.deepEqual(extractEmails("R-1,asha@x.edu,Asha Rao"), ["asha@x.edu"]);
  assert.deepEqual(extractEmails("asha@x.edu"), ["asha@x.edu"]);
});

test("a header row needs no special case", () => {
  // None of its cells contain an "@", so it contributes nothing.
  assert.deepEqual(extractEmails("Name,Email,Roll\nAsha Rao,asha@x.edu,R-1"), ["asha@x.edu"]);
});

test("the same person listed twice is one address", () => {
  assert.deepEqual(extractEmails("a@x.edu\nA@X.edu\na@x.edu"), ["a@x.edu"]);
});

test("semicolon and tab separated files work too", () => {
  assert.deepEqual(extractEmails("Asha;asha@x.edu\nBen\tben@x.edu"), ["asha@x.edu", "ben@x.edu"]);
});

test("a row with no address contributes nothing rather than junk", () => {
  assert.deepEqual(extractEmails("Asha Rao,R-101"), []);
});
