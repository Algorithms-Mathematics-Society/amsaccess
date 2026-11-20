import test from "node:test";
import assert from "node:assert/strict";
import {
  countWaitingOnStaff,
  loadContestTickets,
  mergeIssues,
} from "../../src/lib/client/issuesInbox.ts";

const t = (minutes) =>
  new Date(Date.parse("2026-11-16T10:00:00Z") + minutes * 60_000).toISOString();
const now = Date.parse(t(60));
const resume = (uid, status, at) => ({
  uid,
  status,
  reason: "",
  device_fingerprint: "d",
  created_at: at,
  session_uid: "s",
  display_name: uid,
  login_id: uid,
  resume_count: 0,
});
const incident = (uid, status, at) => ({
  uid,
  status,
  category: "technical",
  message: "help",
  contact: "",
  created_at: at,
  display_name: uid,
  login_id: uid,
});
const report = (uid, device, passed, failed, at) => ({
  uid,
  device_fingerprint: device,
  os_name: "macos",
  app_version: "1",
  passed,
  failed_checks: failed,
  display_name: uid,
  created_at: at,
});
const ticket = (uid, contest_uid, status, at) => ({
  uid,
  contest_uid,
  email: "e@example.test",
  phone: "",
  name: uid,
  category: "LOGIN_ISSUE",
  status,
  updated_at: at,
});

test("open items come first by urgency then longest waiting; resolved newest first", () => {
  const raw = {
    resumes: [
      resume("r-new", "pending", t(20)),
      resume("r-old", "pending", t(5)),
      resume("r-done", "approved", t(1)),
    ],
    incidents: [
      incident("i-open", "open", t(0)),
      incident("i-done", "resolved", t(30)),
    ],
    sessions: [],
  };
  const items = mergeIssues({
    raw,
    now,
    readiness: [report("gate", "dev1", false, ["camera"], t(2))],
    overrides: [],
    tickets: [
      ticket("tk", "c", "open", t(-10)),
      ticket("tk-done", "c", "resolved", t(40)),
    ],
  });
  assert.deepEqual(
    items.map((i) => i.id),
    [
      "resume:r-old",
      "resume:r-new",
      "incident:i-open",
      "entry:gate",
      "ticket:tk",
      "ticket:tk-done",
      "incident:i-done",
      "resume:r-done",
    ],
  );
  assert.deepEqual(
    items.map((i) => i.open),
    [true, true, true, true, true, false, false, false],
  );
});

test("open re-entry and help counts match the status strip count", () => {
  const raw = {
    resumes: [
      resume("a", "pending", t(0)),
      resume("b", "rejected", t(0)),
      resume("c", "pending", t(1)),
    ],
    incidents: [
      incident("x", "open", t(0)),
      incident("y", "in_progress", t(0)),
      incident("z", "resolved", t(0)),
    ],
    sessions: [],
  };
  const open = mergeIssues({
    raw,
    readiness: [],
    overrides: [],
    tickets: [],
    now,
  }).filter((i) => i.open);
  const strip = countWaitingOnStaff(raw);
  assert.equal(open.filter((i) => i.kind === "resume").length, strip.waiting);
  assert.equal(
    open.filter((i) => i.kind === "incident").length,
    strip.openHelp,
  );
  assert.deepEqual(strip, { waiting: 2, openHelp: 2 });
});

test("entry-gate block uses the latest report per device and is resolved once every failed check is waived", () => {
  const raw = { resumes: [], incidents: [], sessions: [] };
  const readiness = [
    report("old", "dev", false, ["camera", "vm"], t(0)),
    report("new", "dev", false, ["camera", "vm"], t(5)),
    report("fixed", "dev2", false, ["vm"], t(0)),
    report("fixed2", "dev2", true, [], t(6)),
  ];
  const grant = (check, extra = {}) => ({
    uid: check,
    device_fingerprint: "dev",
    check_kind: check,
    reason: "ok",
    expires_at: t(120),
    revoked: false,
    granted_by: "staff",
    ...extra,
  });
  const run = (overrides) =>
    mergeIssues({ raw, readiness, overrides, tickets: [], now });
  assert.deepEqual(
    run([]).map((i) => [i.id, i.open, i.detail]),
    [["entry:new", true, "Failed camera, vm"]],
  );
  assert.deepEqual(
    run([grant("camera")]).map((i) => [i.open, i.detail]),
    [[true, "Failed vm"]],
  );
  assert.deepEqual(
    run([grant("camera"), grant("vm")]).map((i) => [i.open, i.status]),
    [[false, "waived"]],
  );
  assert.equal(
    run([grant("camera"), grant("vm", { revoked: true })])[0].open,
    true,
    "revoked waiver does not count",
  );
  assert.equal(
    run([grant("camera"), grant("vm", { expires_at: t(30) })])[0].open,
    true,
    "expired waiver does not count",
  );
});

test("contest tickets use the scoped API and traverse more than 20 pages", async (context) => {
  const contestUid = "d364cd25-61df-402a-949a-d169afcc1741";
  const calls = [];
  context.mock.method(globalThis, "fetch", async (url) => {
    const { searchParams } = new URL(url, "https://example.test");
    const offset = Number(searchParams.get("cursor") || 0);
    calls.push(Object.fromEntries(searchParams));
    const uid = `11111111-1111-4111-8111-${String(offset).padStart(12, "0")}`;
    return Response.json({
      items: [ticket(uid, contestUid, "resolved", t(0))],
      has_more: offset < 21,
      next_cursor: offset < 21 ? String(offset + 1) : null,
    });
  });

  const tickets = await loadContestTickets(contestUid, "resolved");
  assert.deepEqual(
    calls,
    Array.from({ length: 22 }, (_, offset) => ({
      status: "resolved",
      pagination: "cursor",
      ...(offset ? { cursor: String(offset) } : {}),
      contest_uid: contestUid,
    })),
  );
  assert.equal(tickets.length, 22);
});

test("a contest ticket read fails when a page cannot advance", async (context) => {
  const fetch = context.mock.method(globalThis, "fetch", async () =>
    Response.json({ items: [], has_more: true }),
  );
  await assert.rejects(loadContestTickets("c", "open"), /incomplete/);
  assert.equal(fetch.mock.callCount(), 1);
});

test("a contest ticket read fails when the server ignores the contest filter", async (context) => {
  context.mock.method(globalThis, "fetch", async () =>
    Response.json({
      items: [
        ticket(
          "11111111-1111-4111-8111-111111111111",
          "elsewhere",
          "open",
          t(0),
        ),
      ],
      has_more: false,
    }),
  );
  await assert.rejects(loadContestTickets("c", "open"), /incomplete/);
});

test("cursor traversal keeps all tickets when replies change updated timestamps", async (context) => {
  const contest = "d364cd25-61df-402a-949a-d169afcc1741";
  const ids = [1, 2, 3].map(
    (n) => `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`,
  );
  const calls = [];
  context.mock.method(globalThis, "fetch", async (url) => {
    const query = new URL(url, "https://example.test").searchParams;
    calls.push(Object.fromEntries(query));
    const index = query.has("cursor") ? Number(query.get("cursor")) : 0;
    return Response.json({
      items: [ticket(ids[index], contest, "open", t(99 - index))],
      has_more: index < 2,
      next_cursor: index < 2 ? String(index + 1) : null,
    });
  });
  const items = await loadContestTickets(contest, "open");
  assert.deepEqual(
    items.map((item) => item.uid),
    ids,
  );
  assert(
    calls.every(
      (query) => query.pagination === "cursor" && !("offset" in query),
    ),
  );
});

test("fresh cursor tokens cannot hide duplicate ticket pages", async (context) => {
  let page = 0;
  context.mock.method(globalThis, "fetch", async () =>
    Response.json({
      items: [
        ticket("11111111-1111-4111-8111-111111111111", "c", "open", t(page++)),
      ],
      has_more: true,
      next_cursor: String(page),
    }),
  );
  await assert.rejects(loadContestTickets("c", "open"), /incomplete/);
  assert.equal(page, 2);
});
