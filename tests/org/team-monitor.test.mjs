import test from "node:test";
import assert from "node:assert/strict";
import {
  DEADLINE_GRACE_MS,
  MAX_TEAM_SIZE,
  MAX_TEAMS,
  SLOW_RESULT_MS,
  byAttention,
  parseTeamRoster,
  readErrorMessage,
  scheduledPhase,
  submitDeadline,
  summarize,
  teamView,
  trackPending,
} from "../../src/lib/teamMonitor.ts";

// Shapes follow ams-api routes/teams.py::list_teams and team_board._integration_out.
// last_result is the newest *completed* integration only (integration.latest_completed).
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const member = (n, part = null, assigned_by = part ? "claim" : null) => ({
  user_uid: uid(1000 + n),
  username: `user${n}`,
  display_name: `Tester ${n}`,
  seed_rank: n,
  part_label: part,
  assigned_by,
});
const completed = (revision, extra = {}) => ({
  uid: uid(9000 + revision),
  revision,
  trigger: "vote",
  status: "completed",
  verdict: "AC",
  integration_verdict: "AC",
  passed_count: 5,
  total_count: 5,
  failing_parts: [],
  project_failure: false,
  substitutions: [],
  fallbacks: {},
  parts: {
    1: { verdict: "AC", origin: "submission" },
    2: { verdict: "AC", origin: "submission" },
  },
  error: "",
  ...extra,
});
const team = (n, extra = {}) => ({
  uid: uid(n),
  number: n,
  name: `Team ${n}`,
  revision: 2,
  votes: 1,
  submitted_revision: null,
  submitted_by: null,
  members: [
    member(4 * n, "1"),
    member(4 * n + 1, "2"),
    member(4 * n + 2),
    member(4 * n + 3),
  ],
  last_result: null,
  ...extra,
});
const T0 = Date.parse("2026-12-01T10:00:00Z");
const schedule = (extra = {}) => ({
  selection_opens_at: "2026-12-01T10:00:00+00:00",
  discussion_seconds: 120,
  allocation_locks_at: "2026-12-01T10:15:00+00:00",
  allocation_locked_at: null,
  submit_deadline: "2026-12-01T13:00:00+00:00",
  contest_starts_at: "2026-12-01T09:30:00Z",
  contest_ends_at: "2026-12-01T13:30:00Z",
  ...extra,
});
const MIN = 60_000;

test("readiness preserves true, false and unknown from staff roster rows", () => {
  const [{ members }] = parseTeamRoster([
    team(1, {
      members: [
        { ...member(1), ready: true },
        { ...member(2), ready: false },
        member(3),
        { ...member(4), ready: "false" },
      ],
    }),
  ]);
  assert.deepEqual(
    members.map(({ ready }) => ready),
    [true, false, null, null],
  );
});
test("a realistic roster keeps the monitored fields and drops the rest", () => {
  const input = [
    team(1, {
      submitted_revision: 2,
      submitted_by: "vote",
      last_result: completed(2),
    }),
  ];
  const before = structuredClone(input);
  const [t] = parseTeamRoster(input);
  assert.deepEqual(Object.keys(t).sort(), [
    "last_result",
    "members",
    "name",
    "number",
    "revision",
    "submitted_by",
    "submitted_revision",
    "uid",
    "votes",
  ]);
  assert.deepEqual(t.members[0], {
    ready: null,
    user_uid: uid(1004),
    username: "user4",
    display_name: "Tester 4",
    seed_rank: 4,
    part_label: "1",
    assigned_by: "claim",
  });
  assert.deepEqual(t.last_result, {
    revision: 2,
    verdict: "AC",
    integration_verdict: "AC",
    passed_count: 5,
    total_count: 5,
    notOwnCode: [],
    project_failure: false,
  });
  assert.deepEqual(input, before, "parsing must not mutate the response");
  assert.deepEqual(parseTeamRoster([]), []);
});

test("not-own-code parts: listed, fallback and server-flagged parts, never falsy origins", () => {
  const [t] = parseTeamRoster([
    team(1, {
      last_result: completed(2, {
        substitutions: [
          { label: "4", origin: "reference", reason: "not supplied" },
        ],
        fallbacks: { 3: "reference" },
        parts: {
          1: { verdict: "AC", origin: "submission" },
          2: { verdict: "AC", origin: "reference", substituted: "reference" },
          5: { verdict: "AC", origin: null },
          6: { verdict: "AC", origin: "submission", substituted: [] },
          7: { verdict: "AC", origin: "submission", substituted: true },
        },
      }),
    }),
  ]);
  assert.deepEqual(t.last_result.notOwnCode, ["2", "3", "4", "7"]);
});

test("unusable result counts and verdicts degrade to safe values", () => {
  const [t] = parseTeamRoster([
    team(1, {
      last_result: completed(2, {
        verdict: null,
        integration_verdict: "",
        passed_count: -1,
        total_count: null,
        project_failure: "yes",
      }),
    }),
  ]);
  assert.deepEqual(
    { ...t.last_result, notOwnCode: undefined },
    {
      revision: 2,
      verdict: null,
      integration_verdict: null,
      passed_count: 0,
      total_count: 0,
      notOwnCode: undefined,
      project_failure: false,
    },
  );
});

test("display fields degrade instead of blanking the monitor", () => {
  const astral = "🙂".repeat(120); // 120 characters, 240 UTF-16 units: valid in String(120)
  const t = team(7, { name: "  ", submitted_by: "rejudge" });
  t.members[0].display_name = astral;
  t.members[1].display_name = "";
  t.members[2].display_name = null;
  t.members[2].username = null;
  t.members[3].assigned_by = "staff";
  const big = team(8, {
    name: astral,
    members: Array.from({ length: MAX_TEAM_SIZE }, (_, n) => member(80 + n)),
  });
  const [parsed, wide] = parseTeamRoster([t, big]);
  assert.equal(parsed.name, "Team 7");
  assert.equal(parsed.submitted_by, null);
  assert.deepEqual(
    parsed.members.map((m) => m.display_name),
    [astral, "user29", "(no name)", "Tester 31"],
  );
  assert.equal(parsed.members[3].assigned_by, null);
  assert.equal(wide.name, astral);
  assert.equal(wide.members.length, MAX_TEAM_SIZE);
});

test("a structurally unrecognised team rejects the whole roster and names where", () => {
  for (const value of [null, {}, "teams", 3])
    assert.throws(() => parseTeamRoster(value), /not a list/);
  assert.throws(
    () =>
      parseTeamRoster(
        Array.from({ length: MAX_TEAMS + 1 }, (_, i) => team(i + 1)),
      ),
    /too many teams/,
  );
  const cases = {
    "bad uid": (t) => (t.uid = "team-1"),
    "fractional number": (t) => (t.number = 1.5),
    "negative revision": (t) => (t.revision = -1),
    "string votes": (t) => (t.votes = "1"),
    "missing submitted_revision": (t) => delete t.submitted_revision,
    "more members than the API allows": (t) =>
      (t.members = Array.from({ length: MAX_TEAM_SIZE + 1 }, (_, n) =>
        member(n),
      )),
    "member without uid": (t) => delete t.members[0].user_uid,
    "numeric part label": (t) => (t.members[0].part_label = 1),
    "members object": (t) => (t.members = {}),
    "result without revision": (t) => (t.last_result = { status: "completed" }),
  };
  for (const [name, change] of Object.entries(cases)) {
    const t = team(2);
    change(t);
    assert.throws(() => parseTeamRoster([team(1), t]), /team 2/, name);
  }
  const bad = team(1);
  bad.members[3].part_label = "";
  assert.throws(() => parseTeamRoster([bad]), /team 1, member 4/);
  assert.throws(
    () => parseTeamRoster([team(1), team(1)]),
    /team 2/,
    "duplicate team uid",
  );
});

test("the scheduled phase mirrors the API at every boundary", () => {
  const s = schedule();
  assert.equal(scheduledPhase(s, T0 - 1), "waiting");
  assert.equal(scheduledPhase(s, T0), "discussion");
  assert.equal(scheduledPhase(s, T0 + 2 * MIN - 1), "discussion");
  assert.equal(scheduledPhase(s, T0 + 2 * MIN), "choosing");
  assert.equal(scheduledPhase(s, T0 + 15 * MIN - 1), "choosing");
  assert.equal(scheduledPhase(s, T0 + 15 * MIN), "locked");
  assert.equal(
    scheduledPhase(schedule({ discussion_seconds: 0 }), T0),
    "choosing",
  );
  // A manual or deadline lock wins at any time, even before the lobby opens.
  assert.equal(
    scheduledPhase(
      schedule({ allocation_locked_at: "2026-12-01T09:00:00Z" }),
      T0 - MIN,
    ),
    "locked",
  );
});

test("unset round times fall back to the contest window like the API", () => {
  const s = schedule({
    selection_opens_at: null,
    allocation_locks_at: null,
    submit_deadline: null,
  });
  const start = Date.parse("2026-12-01T09:30:00Z");
  assert.equal(scheduledPhase(s, start - 1), "waiting");
  assert.equal(scheduledPhase(s, start), "discussion");
  assert.equal(scheduledPhase(s, start + 3 * MIN), "choosing");
  assert.equal(submitDeadline(s), Date.parse("2026-12-01T13:30:00Z"));
  assert.equal(submitDeadline(schedule()), Date.parse("2026-12-01T13:00:00Z"));
  const none = schedule({
    selection_opens_at: null,
    contest_starts_at: null,
    submit_deadline: null,
    contest_ends_at: null,
  });
  assert.equal(scheduledPhase(none, T0), "unscheduled");
  assert.equal(submitDeadline(none), null);
});

test("team stage follows submission and the latest completed result", () => {
  const [choosing, working, judging, judged, stale] = parseTeamRoster([
    team(1),
    team(2),
    team(3, { submitted_revision: 2, submitted_by: "vote" }),
    team(4, {
      submitted_revision: 2,
      submitted_by: "deadline",
      last_result: completed(2),
    }),
    team(5, {
      revision: 3,
      submitted_revision: 3,
      submitted_by: "vote",
      last_result: completed(2),
    }),
  ]);
  const deadline = submitDeadline(schedule());
  assert.equal(
    teamView(choosing, "choosing", deadline, T0, undefined).stage,
    "choosing",
  );
  assert.equal(
    teamView(working, "locked", deadline, T0, undefined).stage,
    "working",
  );
  assert.equal(
    teamView(judging, "locked", deadline, T0, undefined).stage,
    "awaiting",
  );
  assert.equal(
    teamView(judged, "locked", deadline, T0, undefined).stage,
    "judged",
  );
  // An older completed result does not count as a result for the submitted revision.
  assert.equal(
    teamView(stale, "locked", deadline, T0, undefined).stage,
    "awaiting",
  );
  assert.equal(
    teamView(choosing, "choosing", deadline, T0, undefined).claimed,
    2,
  );
});

test("attention flags appear exactly at their thresholds", () => {
  const deadline = submitDeadline(schedule());
  const [open, pending] = parseTeamRoster([
    team(1),
    team(2, { submitted_revision: 2, submitted_by: "vote" }),
  ]);
  assert.deepEqual(
    teamView(open, "choosing", deadline, T0, undefined).attention,
    [],
    "unclaimed is normal while choosing",
  );
  assert.deepEqual(
    teamView(open, "locked", deadline, T0, undefined).attention,
    ["unassigned"],
  );
  assert.deepEqual(
    teamView(
      open,
      "locked",
      deadline,
      deadline + DEADLINE_GRACE_MS - 1,
      undefined,
    ).attention,
    ["unassigned"],
    "the deadline sweeper gets its grace period",
  );
  assert.deepEqual(
    teamView(open, "locked", deadline, deadline + DEADLINE_GRACE_MS, undefined)
      .attention,
    ["unassigned", "unsubmitted"],
  );
  assert.deepEqual(
    teamView(open, "locked", null, deadline + MIN, undefined).attention,
    ["unassigned"],
  );
  const since = T0;
  assert.deepEqual(
    teamView(pending, "choosing", deadline, since + SLOW_RESULT_MS - 1, since)
      .attention,
    [],
  );
  assert.deepEqual(
    teamView(pending, "choosing", deadline, since + SLOW_RESULT_MS, since)
      .attention,
    ["slow-result"],
  );
  assert.deepEqual(
    teamView(pending, "choosing", deadline, since + 60 * MIN, undefined)
      .attention,
    [],
    "unknown wait is not flagged",
  );
  const full = parseTeamRoster([
    team(3, { members: [member(1, "1"), member(2, "2", "auto")] }),
  ])[0];
  assert.deepEqual(
    teamView(full, "locked", deadline, T0, undefined).attention,
    [],
  );
});

test("pending tracking keeps the first sighting per revision and forgets resolved teams", () => {
  const roster = (rev, result = null) =>
    parseTeamRoster([
      team(1, {
        revision: rev,
        submitted_revision: rev,
        submitted_by: "vote",
        last_result: result,
      }),
      team(2),
    ]);
  let seen = trackPending(new Map(), roster(2), T0);
  assert.deepEqual([...seen], [[uid(1), { revision: 2, since: T0 }]]);
  seen = trackPending(seen, roster(2), T0 + 5 * MIN);
  assert.equal(
    seen.get(uid(1)).since,
    T0,
    "a later poll keeps the first sighting",
  );
  seen = trackPending(seen, roster(3), T0 + 6 * MIN);
  assert.equal(
    seen.get(uid(1)).since,
    T0 + 6 * MIN,
    "a new submitted revision restarts the wait",
  );
  seen = trackPending(seen, roster(3, completed(3)), T0 + 7 * MIN);
  assert.equal(seen.size, 0);
});

test("attention sorts first and the summary counts every team", () => {
  const deadline = submitDeadline(schedule());
  const now = deadline + MIN;
  const views = parseTeamRoster([
    team(1, {
      submitted_revision: 2,
      submitted_by: "vote",
      last_result: completed(2),
      members: [member(1, "1"), member(2, "2")],
    }),
    team(2),
    team(3, {
      submitted_revision: 2,
      submitted_by: "deadline",
      members: [member(5, "1"), member(6, "2", "auto")],
    }),
    // Re-submitted after an earlier result: still judging, so not counted as judged.
    team(4, {
      revision: 3,
      submitted_revision: 3,
      submitted_by: "vote",
      last_result: completed(2),
    }),
  ])
    .map((t) => teamView(t, "locked", deadline, now, undefined))
    .sort(byAttention);
  assert.deepEqual(
    views.map((v) => v.team.number),
    [2, 4, 1, 3],
  );
  assert.deepEqual(summarize(views), {
    teams: 4,
    members: 12,
    claimed: 8,
    submitted: 3,
    byVote: 2,
    byDeadline: 1,
    judged: 1,
    attention: 2,
  });
  assert.deepEqual(summarize([]), {
    teams: 0,
    members: 0,
    claimed: 0,
    submitted: 0,
    byVote: 0,
    byDeadline: 0,
    judged: 0,
    attention: 0,
  });
});

test("a 2000-team roster parses, classifies and summarizes in under 100 ms", (t) => {
  const roster = Array.from({ length: MAX_TEAMS }, (_, i) =>
    team(
      i + 1,
      i % 2
        ? {
            submitted_revision: 2,
            submitted_by: "vote",
            last_result: completed(2),
          }
        : {},
    ),
  );
  const deadline = submitDeadline(schedule());
  const run = () =>
    summarize(
      parseTeamRoster(roster)
        .map((t) => teamView(t, "locked", deadline, T0, undefined))
        .sort(byAttention),
    );
  run();
  const started = performance.now();
  const rounds = 5;
  for (let i = 0; i < rounds; i++) run();
  const perRound = (performance.now() - started) / rounds;
  // 2000 teams is 15 times the 136-player event; the 1 Dec round has 34 teams.
  assert.ok(
    perRound < 100,
    `${MAX_TEAMS} teams took ${perRound.toFixed(1)} ms`,
  );
  t.diagnostic(
    `${MAX_TEAMS} teams: ${perRound.toFixed(2)} ms per parse + view + summary`,
  );
});

test("read failures get staff-facing wording that says they retry", () => {
  assert.match(
    readErrorMessage(new DOMException("aborted", "AbortError"), true),
    /timed out.*retry/,
  );
  assert.match(
    readErrorMessage(new TypeError("Failed to fetch"), false),
    /Could not reach the server.*retry/,
  );
  assert.equal(
    readErrorMessage(
      new Error("Your organization role cannot perform this team operation."),
      false,
    ),
    "Your organization role cannot perform this team operation.",
  );
  for (const odd of [new Error(""), "boom", null, undefined])
    assert.match(readErrorMessage(odd, false), /read failed.*retry/);
});

test("seed_rank is carried for the setup panel and degrades to null when invalid", () => {
  const [t] = parseTeamRoster([
    team(1, {
      members: [
        member(1),
        { ...member(2), seed_rank: "2" },
        { ...member(3), seed_rank: -1 },
        { ...member(4), seed_rank: undefined },
      ],
    }),
  ]);
  assert.deepEqual(
    t.members.map((m) => m.seed_rank),
    [1, null, null, null],
  );
});

test("optional feeds: standings, voice presence and online members degrade to null", async () => {
  const { parseStandings, voicePresence, voiceKey, onlineUsers } = await import(
    "../../src/lib/teamMonitor.ts"
  );
  // ams-api teams.py::_board_out; rows without a usable uid/rank/score are skipped.
  const board = parseStandings({
    teams: [
      { uid: uid(1), rank: 1, score: 140.5 },
      { uid: uid(2), rank: "x", score: 1 },
      null,
    ],
  });
  assert.deepEqual([...board], [[uid(1), { rank: 1, score: 140.5 }]]);
  assert.equal(
    parseStandings([]),
    null,
    "the mocks' default [] is not a board",
  );
  // assist.py voice_events, oldest first: the latest event per member wins.
  const voice = voicePresence([
    { team: "Team 1", username: "a", kind: "join" },
    { team: "Team 1", username: "b", kind: "join" },
    { team: "Team 1", username: "a", kind: "mute" },
    { team: "Team 1", username: "b", kind: "leave" },
    { team: "Team 2", username: "c", kind: "join" },
    { team: "Team 2", username: "c", kind: "closed" },
    { kind: "join" },
  ]);
  assert.deepEqual([...voice], [voiceKey("Team 1", "a")]);
  assert.equal(voicePresence({ error: "denied" }), null);
  const online = onlineUsers([
    { user_uid: "u1", status: "active", idle_seconds: 30 },
    { user_uid: "u2", status: "active", idle_seconds: 120 },
    { user_uid: "u3", status: "finished", idle_seconds: 1 },
    { user_uid: "u4", status: "pending", idle_seconds: 0 },
    { user_uid: null, status: "active", idle_seconds: 0 },
  ]);
  assert.deepEqual([...online].sort(), ["u1", "u4"]);
});

test("live feed freshness distinguishes empty success from failed, missing and stale reads", async () => {
  const { feedIsCurrent, onlineUsers, voicePresence } = await import(
    "../../src/lib/teamMonitor.ts"
  );
  assert.equal(feedIsCurrent(null, "", 100_000, 30_000), false);
  assert.equal(feedIsCurrent(99_000, "failed", 100_000, 30_000), false);
  assert.equal(feedIsCurrent(50_000, "", 100_000, 30_000), false);
  assert.equal(feedIsCurrent(99_000, "", 100_000, 30_000), true);
  assert.equal(onlineUsers([]).size, 0);
  assert.equal(voicePresence([]).size, 0);
});
