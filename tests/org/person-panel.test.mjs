import test from "node:test";
import assert from "node:assert/strict";
import {
  idleLabel,
  loginState,
  personContestState,
  personUserUid,
  personSubmissionsUrl,
} from "../../src/lib/client/personPanel.ts";

const person = (extra = {}) => ({
  user_uid: "u1",
  login_id: "p1",
  display_name: "Person 1",
  revoked: false,
  last_login_at: null,
  has_passphrase: true,
  email: "p1@example.test",
  mail_status: "sent",
  ...extra,
});
const session = (uid, extra = {}) => ({
  uid,
  user_uid: "u1",
  login_id: "p1",
  display_name: "Person 1",
  status: "active",
  started_at: "2026-11-16T09:00:00Z",
  last_seen_at: null,
  violation_count: 0,
  resume_count: 0,
  idle_seconds: 5,
  resume_pending: false,
  ...extra,
});
const resume = (uid, extra = {}) => ({
  uid,
  status: "pending",
  reason: "Crash",
  device_fingerprint: "",
  created_at: "2026-11-16T09:30:00Z",
  session_uid: "s1",
  display_name: "Person 1",
  login_id: "p1",
  resume_count: 0,
  ...extra,
});
const incident = (uid, extra = {}) => ({
  uid,
  category: "tech",
  message: "Help",
  contact: "",
  status: "open",
  created_at: "2026-11-16T09:30:00Z",
  display_name: "Person 1",
  login_id: "p1",
  ...extra,
});

test("selects only this person, and only open requests and incidents", () => {
  const raw = {
    sessions: [
      session("s0", { started_at: "2026-11-16T08:00:00Z" }),
      session("s1"),
      session("s9", { user_uid: "u2", login_id: "p2" }),
    ],
    resumes: [
      resume("r1"),
      resume("r2", { status: "approved" }),
      resume("r3", { session_uid: "s9", login_id: "p2" }),
    ],
    incidents: [
      incident("i1"),
      incident("i2", { status: "resolved" }),
      incident("i3", { login_id: "p2" }),
    ],
  };
  const state = personContestState(raw, "u1", [
    person(),
    person({ user_uid: "u2", login_id: "p2" }),
  ]);
  assert.equal(state.rosterRow.login_id, "p1");
  assert.equal(state.session.uid, "s1", "latest sitting wins");
  assert.deepEqual(
    state.resumes.map((r) => r.uid),
    ["r1"],
  );
  assert.deepEqual(
    state.incidents.map((i) => i.uid),
    ["i1"],
  );
});

test("works without a roster (opened from invigilation) and by login id (drawer fallback)", () => {
  const raw = {
    sessions: [session("s1", { started_at: null })],
    resumes: [],
    incidents: [incident("i1")],
  };
  const byUid = personContestState(raw, "u1", null);
  assert.equal(byUid.rosterRow, null);
  assert.equal(byUid.loginId, "p1");
  assert.deepEqual(
    byUid.incidents.map((i) => i.uid),
    ["i1"],
  );
  const byLogin = personContestState(
    { ...raw, sessions: [session("s1", { user_uid: null })] },
    "p1",
    null,
  );
  assert.equal(byLogin.session.uid, "s1");
});

test("unknown person matches nothing, even rows with an empty login id", () => {
  const raw = {
    sessions: [],
    resumes: [resume("r1", { login_id: "" })],
    incidents: [incident("i1", { login_id: "" })],
  };
  const state = personContestState(raw, "nobody", []);
  assert.equal(state.session, null);
  assert.deepEqual([state.resumes, state.incidents], [[], []]);
});

test("roster login wording matches the roster pill", () => {
  assert.equal(
    loginState(person({ revoked: true, last_login_at: "x" })),
    "revoked",
  );
  assert.equal(loginState(person({ last_login_at: "x" })), "signed in");
  assert.equal(loginState(person({ has_passphrase: false })), "no passphrase");
  assert.equal(loginState(person()), "not yet used");
  assert.equal(idleLabel(null), "never checked in");
  assert.equal(idleLabel(3725), "1h 2m ago");
});

const trustedUid = "6b0c8f0e-6a0e-4c7e-9d7e-2f4a3c1b9e11";
test("submission reads use only valid identifiers from matched roster/session/profile records", () => {
  assert.equal(personUserUid("person1", null, "invalid"), null);
  assert.equal(personUserUid(trustedUid, null, null), trustedUid);
  assert.equal(personUserUid(null, trustedUid, null), trustedUid);
  assert.equal(personUserUid(null, null, trustedUid), trustedUid);
  assert.throws(() => personSubmissionsUrl(trustedUid, "person1"));
  assert.throws(() => personSubmissionsUrl("invalid", trustedUid));
  const url = new URL(
    personSubmissionsUrl(trustedUid, trustedUid),
    "https://test",
  );
  assert.equal(url.searchParams.get("user_uid"), trustedUid);
  assert.equal(url.searchParams.get("limit"), "100");
});

test("keeps distinct sittings newest first, deduplicates session IDs, and excludes other people", () => {
  const latest = session("latest", { status: "completed", resume_count: 2 });
  const raw = {
    sessions: [
      session("older", {
        status: "terminated",
        started_at: "2026-11-15T09:00:00Z",
      }),
      latest,
      { ...latest },
      session("pending", { status: "pending", started_at: null }),
      session("other", { user_uid: "u2", login_id: "p2" }),
    ],
    resumes: [],
    incidents: [],
  };
  const state = personContestState(raw, "u1", [person()]);
  assert.deepEqual(
    state.sessions.map((s) => s.uid),
    ["latest", "older", "pending"],
  );
  assert.equal(state.session.uid, "latest");
  assert.equal(state.sessions[0].resume_count, 2);
});
