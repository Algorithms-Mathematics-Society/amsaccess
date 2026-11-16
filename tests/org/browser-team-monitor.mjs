// Production bundle, mocked API only. Never use real participant data or credentials.
// Run: start `next start -p 3124`, then node tests/org/browser-team-monitor.mjs
// (PLAYWRIGHT_MODULE / CHROMIUM_PATH as for browser-team-setup.mjs).
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import path from "node:path";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://127.0.0.1:3124";
const shot = path.join(
  process.env.MONITOR_EVIDENCE_DIR || tmpdir(),
  "amsaccess-team-monitor.png",
);
const contest = "3fbf9cee-8b6e-4872-947f-c52b46bb572e";
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const CLOCK = Date.parse("2026-12-01T13:05:00Z");
const POLL = 15_000;

// 34 teams of 4, five minutes past a 13:00 deadline: the 1 December shape.
const member = (t, i, part) => ({
  user_uid: uid(1000 + t * 10 + i),
  username: `t${t}m${i}`,
  display_name: `Team ${t} Member ${i}`,
  seed_rank: t * 4 + i,
  part_label: part,
  assigned_by: part === null ? null : i === 4 ? "auto" : "claim",
});
const done = (revision, extra = {}) => ({
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
  parts: {},
  error: "",
  ...extra,
});
function team(n) {
  const t = {
    uid: uid(n),
    number: n,
    name: `Team ${n}`,
    revision: 2,
    votes: 4,
    submitted_revision: 2,
    submitted_by: n % 2 ? "vote" : "deadline",
    members: [1, 2, 3, 4].map((i) => member(n, i, String(i))),
    last_result: done(2),
  };
  if (n === 31)
    Object.assign(
      t,
      {
        votes: 1,
        submitted_revision: null,
        submitted_by: null,
        last_result: null,
      },
      {
        members: [1, 2, 3, 4].map((i) =>
          member(n, i, i === 4 ? null : String(i)),
        ),
      },
    );
  if (n === 32) Object.assign(t, { revision: 3, submitted_revision: 3 });
  if (n === 33)
    t.last_result = done(2, {
      integration_verdict: "WA",
      passed_count: 3,
      fallbacks: { 3: "reference" },
    });
  if (n === 34) t.last_result = null;
  return t;
}
const roster = Array.from({ length: 34 }, (_, i) => team(i + 1));
const round = {
  uid: uid(77),
  team_size: 4,
  integration_score: 100,
  selection_opens_at: "2026-12-01T10:00:00+00:00",
  discussion_seconds: 120,
  allocation_locks_at: "2026-12-01T10:15:00+00:00",
  allocation_locked_at: null,
  submit_deadline: "2026-12-01T13:00:00+00:00",
  seeded_at: "2026-11-30T12:00:00+00:00",
  published_at: "2026-11-30T12:05:00+00:00",
  rank_sum_spread: 2,
  project: { uid: uid(55), slug: "r2", name: "R2 synthetic" },
  parts: [1, 2, 3, 4].map((n) => ({ label: String(n) })),
};

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
const realWait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(check, what, ms = 5000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await realWait(20);
  }
}
async function untilAsync(check, what, ms = 5000) {
  const end = Date.now() + ms;
  while (!(await check())) {
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await realWait(20);
  }
}
try {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  await context.addCookies([
    {
      name: "ams_session",
      value: `synthetic.${Math.floor(Date.now() / 1000) + 3600}.synthetic`,
      url: base,
    },
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  let teamReads = 0;
  let optionalFailure = false;
  let emptyPresence = false;
  const mutations = [];
  let next = null; // optional override for the next /teams response
  await page.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== base) return route.abort();
    if (!u.pathname.startsWith("/api/")) return route.continue();
    const ok = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    // The monitor is read-only: record any write and fail at the end instead of hanging.
    if (route.request().method() !== "GET") {
      mutations.push(`${route.request().method()} ${u.pathname}`);
      return route.fulfill({ status: 405, body: "" });
    }
    if (u.pathname === "/api/auth/me") return ok({ role: "admin" });
    if (u.pathname === `/api/org/contests/${contest}`)
      return ok({
        uid: contest,
        title: "Round 2 test",
        slug: "r2-test",
        status: "live",
        starts_at: "2026-12-01T10:00:00Z",
        ends_at: "2026-12-01T13:30:00Z",
        invite_code: "TEST",
        is_practice: true,
        problems: [],
        joined: false,
        frozen: false,
      });
    if (u.pathname.endsWith("/submissions/summary"))
      return ok({ total: 0, pending: 0, verdicts: {} });
    if (u.pathname.endsWith("/team-round")) return ok(round);
    if (u.pathname.endsWith("/team-round/teams")) {
      teamReads++;
      const override = next;
      next = null;
      if (override?.hold) await override.hold;
      // A held read may have been abandoned by the page's timeout; answering it is moot.
      const answer = override?.status
        ? ok({ error: override.error }, override.status)
        : ok(roster);
      return answer.catch((e) => {
        if (!override?.hold) throw e;
      });
    }
    if (
      optionalFailure &&
      (u.pathname.endsWith("/team-round/board") ||
        u.pathname.endsWith("/team-round/voice-events") ||
        (u.pathname.endsWith("/invigilation") &&
          u.searchParams.get("view") === "sessions"))
    )
      return ok({ error: "Unavailable" });
    if (
      emptyPresence &&
      (u.pathname.endsWith("/team-round/voice-events") ||
        (u.pathname.endsWith("/invigilation") &&
          u.searchParams.get("view") === "sessions"))
    )
      return ok([]);
    // Optional feeds: rank by roster order; Team 31 has one member in voice and one offline.
    if (u.pathname.endsWith("/team-round/board"))
      return ok({
        teams: roster.map((t, i) => ({
          uid: t.uid,
          rank: i + 1,
          score: 100 - i,
        })),
      });
    if (u.pathname.endsWith("/team-round/voice-events"))
      return ok([
        { team: "Team 31", username: "t31m1", kind: "join" },
        { team: "Team 31", username: "t31m2", kind: "join" },
        { team: "Team 31", username: "t31m2", kind: "leave" },
      ]);
    if (
      u.pathname.endsWith("/invigilation") &&
      u.searchParams.get("view") === "sessions"
    )
      return ok(
        roster
          .flatMap((t) => t.members)
          .filter((m) => m.username !== "t31m4")
          .map((m) => ({
            user_uid: m.user_uid,
            status: "active",
            idle_seconds: 10,
          })),
      );
    return ok([]);
  });

  await page.clock.install({ time: CLOCK });
  const started = Date.now();
  await page.goto(`${base}/org/contests/${contest}#team-round`);
  const table = page.getByRole("table", { name: "Live team status" });
  await table.waitFor();
  const firstPaintMs = Date.now() - started;
  const monitor = page.getByRole("region", { name: "Live team monitor" });
  const text = () => monitor.innerText();

  await untilAsync(
    async () => /read took/.test(await text()),
    "the first monitor read",
  );
  // Freeze page time; every later step advances it explicitly.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10);

  // Content: phase, summary and attention-first ordering.
  await untilAsync(
    async () => /Online\s+135\/136/i.test(await text()),
    "the session feed",
  );
  const body = await text();
  assert.match(body, /Scheduled phase: Allocation locked/);
  assert.match(body, /Teams\s+34/i);
  assert.match(body, /Parts claimed\s+135\/136/i);
  assert.match(body, /Submitted\s+33\/34 \(vote 16 · deadline 17\)/i);
  assert.match(body, /Judged\s+31\/33/i);
  assert.match(body, /Needs attention\s+1/i);
  assert.match(body, /read took \d+ ms/);
  const rows = table.locator("tbody tr");
  assert.equal(await rows.count(), 34);
  const first = await rows.nth(0).innerText();
  assert.match(first, /#31 Team 31/);
  assert.match(body, /In voice\s+1\/136/i);
  assert.match(first, /Team 31 Member 1: [^\n]* · online · in voice/);
  assert.match(first, /Team 31 Member 4: [^\n]* · offline/);
  assert.match(first, /#31 · 70/, "standing from the board");
  assert.match(first, /Part unassigned after lock/);
  assert.match(first, /Not submitted 1\+ min after the deadline/);
  assert.match(first, /Team 31 Member 4: not chosen/);
  const row = (n) => table.locator("tbody tr", { hasText: `#${n} Team ${n}` });
  assert.match(
    await row(32).innerText(),
    /Awaiting result[\s\S]*AC · 5\/5 checks[\s\S]*From revision 2/,
  );
  assert.match(
    await row(33).innerText(),
    /WA · 3\/5 checks[\s\S]*Not the team's own code: 3/,
  );
  assert.match(await row(34).innerText(), /No result for this revision yet/);
  assert.match(
    await row(2).innerText(),
    /Revision 2 auto-submitted at the deadline/,
  );
  assert.match(await row(1).innerText(), /Revision 2 submitted by team vote/);

  // Cadence: one read per 15 s after completion, never overlapping.
  const settled = teamReads; // setup panel read + the monitor's first read
  await page.clock.runFor(POLL - 1000);
  await realWait(200);
  assert.equal(teamReads, settled, "no read before the interval");
  const refresh = monitor.getByRole("button", { name: /Refresh now|Reading…/ });
  await refresh.focus();
  await page.clock.runFor(1500);
  await until(() => teamReads === settled + 1, "the interval read");
  await untilAsync(
    async () => !/Reading…/.test(await text()),
    "the interval read to settle",
  );
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Refresh now",
    "a background read keeps keyboard focus on the refresh button",
  );
  // A read in flight is never overlapped while inside its 10 s deadline.
  let release;
  next = { hold: new Promise((r) => (release = r)) };
  await page.clock.runFor(POLL + 500);
  await until(() => teamReads === settled + 2, "the held read");
  await refresh.click();
  await realWait(200);
  assert.equal(
    teamReads,
    settled + 2,
    "a manual refresh never overlaps a read in flight",
  );
  await page.clock.runFor(9_000);
  await realWait(200);
  assert.equal(
    teamReads,
    settled + 2,
    "no overlapping read while one is in flight",
  );
  // Past the deadline the read is abandoned and reported; polling then resumes.
  await page.clock.runFor(1_500);
  await page.getByRole("alert").filter({ hasText: "timed out" }).waitFor();
  assert.equal(await rows.count(), 34, "the last good roster stays on screen");
  release();
  await page.clock.runFor(POLL + 500);
  await until(() => teamReads === settled + 3, "the read after the timeout");
  await page
    .getByRole("alert")
    .filter({ hasText: "timed out" })
    .waitFor({ state: "detached" });

  // A hidden tab stops reading; showing it reads once, at once.
  const setVisibility = (state) =>
    page.evaluate((s) => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => s,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    }, state);
  await setVisibility("hidden");
  await page.clock.runFor(8 * POLL);
  await realWait(200);
  assert.equal(teamReads, settled + 3, "no reads while hidden");
  await setVisibility("visible");
  await until(() => teamReads === settled + 4, "the read on becoming visible");

  // An error keeps the last good data on screen.
  next = { status: 502, error: "Upstream unavailable." };
  await page.clock.runFor(POLL + 500);
  await page
    .getByRole("alert")
    .filter({ hasText: "Upstream unavailable." })
    .waitFor();
  assert.match(await text(), /Showing the last successful read/);
  assert.equal(await rows.count(), 34);
  await page.clock.runFor(POLL + 500);
  await page
    .getByRole("alert")
    .filter({ hasText: "Upstream unavailable." })
    .waitFor({ state: "detached" });

  // Healthy roster must not disguise optional failures as offline/current voice.
  optionalFailure = true;
  await page.clock.runFor(POLL + 500);
  await untilAsync(
    async () =>
      /online status;/.test(await text()) && /voice status;/.test(await text()),
    "unavailable feed warning",
  );
  assert.match(await text(), /Online\s+—/i);
  assert.match(await text(), /In voice\s+—/i);
  assert.doesNotMatch(
    await row(31).innerText(),
    / · offline| · online| · in voice/,
  );
  optionalFailure = false;
  emptyPresence = true;
  await page.clock.runFor(POLL + 500);
  await untilAsync(
    async () =>
      /Online\s+0\/136/i.test(await text()) &&
      /In voice\s+0\/136/i.test(await text()),
    "healthy empty feeds are zero",
  );
  emptyPresence = false;
  await page.clock.runFor(POLL + 500);
  await untilAsync(
    async () =>
      /Online\s+135\/136/i.test(await text()) &&
      /In voice\s+1\/136/i.test(await text()),
    "presence recovers",
  );

  // Teams still judging 10 minutes after first being seen are flagged. Advance
  // one interval at a time and let each read land, as real time would.
  for (let elapsed = 0; elapsed < 10 * 60_000; elapsed += POLL + 500) {
    const before = teamReads;
    await page.clock.runFor(POLL + 500);
    await until(() => teamReads === before + 1, "the next interval read");
    await untilAsync(
      async () => !/Reading…/.test(await text()),
      "the read to finish",
    );
  }
  await untilAsync(
    async () => /Needs attention\s+3/i.test(await text()),
    "three teams needing attention",
  );
  assert.match(
    await row(32).innerText(),
    /No result 10\+ min after submission/,
  );
  assert.match(
    await row(34).innerText(),
    /No result 10\+ min after submission/,
  );
  await page.getByLabel(/Show only teams needing attention/).check();
  assert.equal(await rows.count(), 3);

  assert.equal(
    await monitor.getByRole("alert").count(),
    0,
    "no error banner after normal reads",
  );
  await page.screenshot({ path: shot, fullPage: true });

  // Leaving the tab unmounts the monitor and stops its reads.
  await page.getByRole("button", { name: "problems", exact: true }).click();
  await table.waitFor({ state: "detached" });
  const after = teamReads;
  await page.clock.runFor(8 * POLL);
  await realWait(300);
  assert.equal(teamReads, after, "no reads after the monitor unmounts");

  // The only expected console error is the browser logging the 502 injected above.
  const injected = errors.filter((e) => /status of 502/.test(e));
  assert.equal(
    injected.length,
    1,
    "exactly one logged 502, from the injected failure",
  );
  assert.deepEqual(
    errors.filter((e) => !injected.includes(e)),
    [],
  );
  assert.deepEqual(mutations, [], "the monitor never writes");
  console.log(
    `PASS live team monitor: 34-team content, 15 s cadence, no overlap, hidden pause, error retention, slow-result flag, unmount stop; first table paint ${firstPaintMs} ms; screenshot ${shot}`,
  );
} finally {
  await browser.close();
}
