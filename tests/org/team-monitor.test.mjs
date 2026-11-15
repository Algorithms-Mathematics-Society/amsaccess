import test from "node:test";
import assert from "node:assert/strict";
import { phaseOf, voicePresence, voiceKey, onlineUsers, teamState } from "../../src/lib/teamMonitor.ts";

const round = { team_size: 2, selection_opens_at: "2026-11-29T09:00:00Z", discussion_seconds: 120, allocation_locks_at: "2026-11-29T09:15:00Z", allocation_locked_at: null, submit_deadline: null, seeded_at: "x", published_at: "x" };
const at = (iso) => Date.parse(iso);
const S = "2026-11-29T08:30:00Z", E = "2026-11-29T12:00:00Z";

test("phase follows the round timeline, with null deadline meaning contest end", () => {
  assert.equal(phaseOf({ ...round, published_at: null }, at("2026-11-29T10:00:00Z"), S, E), "drawn");
  assert.equal(phaseOf(round, at("2026-11-29T08:59:00Z"), S, E), "waiting");
  assert.equal(phaseOf(round, at("2026-11-29T09:01:00Z"), S, E), "discussion");
  assert.equal(phaseOf(round, at("2026-11-29T09:05:00Z"), S, E), "choosing");
  assert.equal(phaseOf(round, at("2026-11-29T09:16:00Z"), S, E), "building");
  assert.equal(phaseOf({ ...round, allocation_locked_at: "x" }, at("2026-11-29T09:05:00Z"), S, E), "building");
  assert.equal(phaseOf(round, at("2026-11-29T12:00:00Z"), S, E), "closed");
});

test("voice presence uses each member's latest event", () => {
  const live = voicePresence([
    { team: "Team 1", username: "a", kind: "join", at: "" },
    { team: "Team 1", username: "b", kind: "join", at: "" },
    { team: "Team 1", username: "b", kind: "leave", at: "" },
    { team: "Team 1", username: "a", kind: "mute", at: "" },
  ]);
  assert.ok(live.has(voiceKey("Team 1", "a")));
  assert.ok(!live.has(voiceKey("Team 1", "b")));
});

test("online needs an active, recently seen session", () => {
  const ids = onlineUsers([
    { user_uid: "u1", status: "active", idle_seconds: 10 },
    { user_uid: "u2", status: "active", idle_seconds: 600 },
    { user_uid: "u3", status: "submitted", idle_seconds: 1 },
    { user_uid: null, status: "active", idle_seconds: 1 },
  ]);
  assert.deepEqual([...ids], ["u1"]);
});

test("team state flags what needs staff", () => {
  const m = (part) => ({ user_uid: "u", username: "u", display_name: "U", seed_rank: 1, part_label: part, assigned_by: null });
  const team = { uid: "t", number: 1, name: "Team 1", revision: 0, votes: 0, submitted_revision: null, submitted_by: null, members: [m("P1"), m(null)], last_result: null };
  assert.equal(teamState(team, "choosing", 2, 1).label, "Member not online");
  assert.deepEqual(teamState(team, "choosing", 2, 2), { label: "1 part open", tone: "warn", needsAttention: true });
  const submitted = { ...team, submitted_revision: 3, submitted_by: "vote" };
  assert.equal(teamState(submitted, "building", 2, 2).label, "Submitted rev 3 · judging");
  assert.equal(teamState({ ...submitted, last_result: { revision: 3, verdict: "AC", passed_count: 5, total_count: 5, substitutions: [] } }, "building", 2, 2).label, "Submitted rev 3 · passed");
  assert.equal(teamState({ ...submitted, last_result: { revision: 3, verdict: "AC", passed_count: 5, total_count: 5, substitutions: ["P2"] } }, "closed", 2, 2).label, "Submitted rev 3 · passed with stand-ins");
});
