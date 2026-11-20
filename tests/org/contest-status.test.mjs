import assert from "node:assert/strict";
import test from "node:test";
import { contestStatusRefreshDelay } from "../../src/lib/client/contestStatus.ts";

const now = Date.parse("2026-11-20T10:00:00Z");
const contest = {
  status: "scheduled",
  is_practice: false,
  starts_at: "2026-11-20T10:00:10Z",
  ends_at: "2026-11-20T10:00:25Z",
};

test("status refresh targets the next live boundary and lets ordinary polling handle distant dates", () => {
  assert.equal(contestStatusRefreshDelay(contest, now), 10_000);
  assert.equal(
    contestStatusRefreshDelay({ ...contest, status: "running" }, now),
    25_000,
  );
  assert.equal(contestStatusRefreshDelay(contest, now - 30_000), null);
  assert.equal(contestStatusRefreshDelay(contest, now + 10_000), null);
  for (const status of ["draft", "ended", "archived"])
    assert.equal(contestStatusRefreshDelay({ ...contest, status }, now), null);
  assert.equal(
    contestStatusRefreshDelay({ ...contest, is_practice: true }, now),
    null,
  );
  assert.equal(
    contestStatusRefreshDelay({ ...contest, starts_at: "bad date" }, now),
    null,
  );
});
