import test from "node:test";
import assert from "node:assert/strict";
import {
  contestWorkflow,
  workflowContest,
  workflowRoster,
  workflowPending,
} from "../../src/lib/client/contestWorkflow.ts";

const contest = {
  title: "Round 1",
  status: "scheduled",
  starts_at: "2026-11-20T09:00:00Z",
  ends_at: "2026-11-20T10:00:00Z",
  problems: [{}],
};
const facts = {
  contest,
  roster: [{ user_uid: "person", revoked: false, has_passphrase: true }],
  pending: 0,
  openTickets: false,
};
test("seven steps link to existing hash routes without locking later stages", () => {
  const steps = contestWorkflow("contest", facts);
  assert.deepEqual(
    steps.map((s) => s.title),
    [
      "Basics",
      "Problems",
      "Participants",
      "Credentials",
      "Readiness",
      "Live",
      "Wrap-up",
    ],
  );
  assert.equal(steps[2].href, "/org/contests/contest#participants");
  assert.equal(steps[6].href, "/org/contests/contest#leaderboard");
  assert.equal(steps[5].checks[0].state, "todo");
  assert.equal(steps[6].checks[0].state, "todo");
});
test("manual readiness and delivery are never inferred from counts", () => {
  const steps = contestWorkflow("contest", facts);
  assert.equal(steps[3].checks[0].state, "done");
  assert.equal(steps[3].checks[1].state, "review");
  assert.equal(steps[4].checks[0].state, "review");
});
test("empty, revoked and missing credentials are not ready; rows count distinct people", () => {
  for (const roster of [
    [],
    [{ user_uid: "person", revoked: true, has_passphrase: true }],
    [{ user_uid: "person", revoked: false, has_passphrase: false }],
  ])
    assert.equal(
      contestWorkflow("contest", { ...facts, roster })[3].checks[0].state,
      "todo",
    );
  assert.match(
    contestWorkflow("contest", {
      ...facts,
      roster: [...facts.roster, ...facts.roster],
    })[2].checks[0].detail,
    /1 distinct/,
  );
});
test("missing or malformed reads cannot report completion", () => {
  const steps = contestWorkflow("contest", {
    contest: null,
    roster: null,
    pending: null,
    openTickets: null,
  });
  assert.ok(
    steps
      .flatMap((s) => s.checks)
      .every((c) => c.state === "unknown" || c.state === "review"),
  );
  assert.throws(() => workflowContest({}));
  assert.throws(() => workflowRoster([{}]));
  for (const value of [-1, NaN, "0", undefined])
    assert.throws(() => workflowPending({ pending: value }));
  assert.equal(workflowPending({ pending: 0 }), 0);
});
test("wrap-up reflects actual pending judging and open tickets", () => {
  const checks = contestWorkflow("contest", {
    ...facts,
    contest: { ...contest, status: "ended" },
    pending: 2,
    openTickets: true,
  })[6].checks;
  assert.deepEqual(
    checks.map((c) => c.state),
    ["done", "todo", "todo", "review"],
  );
});
