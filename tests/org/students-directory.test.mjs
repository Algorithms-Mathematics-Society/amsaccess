import assert from "node:assert/strict";
import test from "node:test";
import {
  mailIneligible,
  studentsCsv,
  runStudentActions,
} from "../../src/lib/studentsDirectory.ts";
const student = (uid, extra = {}) => ({
  uid,
  display_name: uid,
  username: uid,
  mailable: true,
  contests_entered: 1,
  ...extra,
});
test("selected CSV quotes content, neutralizes spreadsheet expressions and includes only selected rows", () => {
  const csv = studentsCsv([
    student("one", {
      display_name: " =SUM(1,2)",
      college: 'A"B',
      external_ref: "\tformula",
    }),
  ]);
  assert.match(csv, /"' =SUM\(1,2\)"/);
  assert.match(csv, /"A""B"/);
  assert.match(csv, /"'\tformula"/);
  assert.equal(csv.split("\r\n").length, 2);
  assert(!csv.includes("password"));
});
test("mail requires deliverable account address and contest membership", () => {
  assert.match(mailIneligible(student("a", { mailable: false })), /email/);
  assert.match(
    mailIneligible(student("b", { contests_entered: 0 })),
    /contest/,
  );
  assert.equal(mailIneligible(student("c")), null);
});
test("bulk requests are sequential, skip ineligible rows, retain individual failures, and never read returned passwords", async () => {
  const rows = [
    student("a"),
    student("b", { mailable: false }),
    student("c"),
    student("d"),
  ];
  let active = 0,
    peak = 0;
  const paths = [],
    updates = [];
  const send = async (path) => {
    paths.push(path);
    active++;
    peak = Math.max(active, peak);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active--;
    return path.includes("/c/")
      ? new Response(JSON.stringify({ error: "SES unavailable" }), {
          status: 503,
        })
      : {
          ok: true,
          json: () => {
            throw new Error("Password body must not be read");
          },
        };
  };
  await runStudentActions(rows, "mail", "", (row) => updates.push(row), send);
  assert.equal(peak, 1);
  assert.equal(paths.length, 3);
  assert(paths.every((path) => path.endsWith("/credential/mail")));
  const failures = updates.filter((row) => row.status === "failed");
  assert.deepEqual(
    failures.map((row) => row.student.uid),
    ["c"],
  );
  paths.length = 0;
  await runStudentActions(
    failures.map((row) => row.student),
    "mail",
    "",
    () => {},
    send,
  );
  assert.equal(paths.length, 1);
});
test("add skips known roster members and delete uses plain DELETE, never force", async () => {
  const calls = [],
    updates = [];
  const send = async (path, options) => {
    calls.push([path, options.method]);
    return { ok: true };
  };
  await runStudentActions(
    [student("a", { contests: [{ uid: "contest" }] }), student("b")],
    "add",
    "contest",
    (row) => updates.push(row),
    send,
  );
  assert.equal(updates[0].status, "skipped");
  assert.deepEqual(calls, [["/api/org/students/b/contests/contest", "POST"]]);
  await runStudentActions([student("a")], "delete", "", () => {}, send);
  assert.deepEqual(calls[1], ["/api/org/students/a", "DELETE"]);
});

test("session cancellation stops queued writes and ignores an in-flight response", async () => {
  const controller = new AbortController();
  const updates = [],
    calls = [];
  await runStudentActions(
    [student("a"), student("b")],
    "delete",
    "",
    (row) => updates.push(row),
    async (path, options) => {
      calls.push(path);
      assert.equal(options.signal, controller.signal);
      controller.abort();
      return { ok: true };
    },
    controller.signal,
  );
  assert.equal(calls.length, 1);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].status, "working");
});
