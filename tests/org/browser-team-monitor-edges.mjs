// Production bundle, mocked API only. Never use real participant data or credentials.
// Edge cases for the live team monitor; run like browser-team-monitor.mjs.
import assert from "node:assert/strict";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://127.0.0.1:3124";
const contest = "3fbf9cee-8b6e-4872-947f-c52b46bb572e";
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const CLOCK = Date.parse("2026-12-01T13:05:00Z");

const member = (t, i, part = String(i)) => ({
  user_uid: uid(100000 + t * 100 + i),
  username: `t${t}m${i}`,
  display_name: `Team ${t} Member ${i}`,
  seed_rank: i,
  part_label: part,
  assigned_by: part === null ? null : "claim",
});
const team = (n, extra = {}) => ({
  uid: uid(n),
  number: n,
  name: `Team ${n}`,
  revision: 1,
  votes: 0,
  submitted_revision: null,
  submitted_by: null,
  members: [1, 2, 3, 4].map((i) => member(n, i)),
  last_result: null,
  ...extra,
});
const round = (extra = {}) => ({
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
  rank_sum_spread: 0,
  project: { uid: uid(55), slug: "r2", name: "R2 synthetic" },
  parts: [1, 2, 3, 4].map((n) => ({ label: String(n) })),
  ...extra,
});

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
const results = [];

/** One isolated page per scenario. The setup panel's own first /teams read gets a valid
 * roster; `teams` then answers the monitor's reads in order (the last one repeats). */
async function scenario(
  name,
  { roundBody = round(), teams, viewport, time = CLOCK, absent },
  check,
) {
  const context = await browser.newContext({
    viewport: viewport ?? { width: 1366, height: 900 },
  });
  await context.addCookies([
    {
      name: "ams_session",
      value: `synthetic.${Math.floor(Date.now() / 1000) + 3600}.synthetic`,
      url: base,
    },
  ]);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const state = { teamReads: 0, mutations: [], absent: [] };
  page.on("dialog", (d) => d.accept());
  await page.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== base) return route.abort();
    if (!u.pathname.startsWith("/api/")) return route.continue();
    // Only the scenario's absent marking may write.
    if (
      absent &&
      route.request().method() === "POST" &&
      u.pathname.endsWith("/absent")
    ) {
      state.absent.push([u.pathname, route.request().postDataJSON()]);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(absent),
      });
    }
    if (route.request().method() !== "GET") {
      state.mutations.push(u.pathname);
      return route.fulfill({ status: 405, body: "" });
    }
    const json = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (u.pathname === "/api/auth/me") return json({ role: "admin" });
    if (u.pathname === `/api/org/contests/${contest}`)
      return json({
        uid: contest,
        title: "Edge cases",
        slug: "edges",
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
      return json({ total: 0, pending: 0, verdicts: {} });
    if (u.pathname.endsWith("/team-round")) return json(roundBody);
    if (u.pathname.endsWith("/team-round/teams")) {
      const read = state.teamReads++;
      if (read === 0) return json([team(1)]);
      const answer = teams[Math.min(read - 1, teams.length - 1)];
      return typeof answer === "function" ? answer(route) : json(answer);
    }
    return json([]);
  });
  await page.clock.install({ time });
  await page.goto(`${base}/org/contests/${contest}#team-round`);
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .waitFor();
  const monitor = page.getByRole("region", { name: "Live team monitor" });
  try {
    await check({ page, monitor, state });
    assert.deepEqual(pageErrors, [], "no uncaught page errors");
    assert.deepEqual(state.mutations, [], "no writes");
    results.push(`PASS ${name}`);
  } catch (e) {
    results.push(`FAIL ${name}: ${e.message.split("\n")[0]}`);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
}
const textOf = async (monitor) =>
  (await monitor.innerText()).replace(/\s+/g, " ");
const firstLoad = (monitor, re) =>
  monitor
    .page()
    .waitForFunction(
      ([sel, src]) =>
        new RegExp(src, "i").test(
          document.querySelector(sel)?.textContent ?? "",
        ),
      ['section[aria-label="Live team monitor"]', re.source],
      { timeout: 8000 },
    );

try {
  await scenario(
    "unpublished round shows no monitor and starts no polling",
    {
      roundBody: round({ published_at: null }),
      teams: [[team(1)]],
    },
    async ({ page, monitor, state }) => {
      await page.waitForTimeout(500);
      assert.equal(await monitor.count(), 0);
      const reads = state.teamReads; // the setup panel's own single roster read
      await page.clock.runFor(60_000);
      await page.waitForTimeout(300);
      assert.equal(
        state.teamReads,
        reads,
        "nothing polls an unpublished round",
      );
    },
  );

  await scenario(
    "empty roster explains itself",
    { teams: [[]] },
    async ({ monitor }) => {
      await firstLoad(monitor, /No teams in this round yet/);
      assert.match(await textOf(monitor), /Teams 0/i);
      assert.equal(await monitor.getByRole("table").count(), 0);
    },
  );

  for (const [label, answer, expected] of [
    [
      "403 role error",
      (r) =>
        r.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "Your organization role cannot perform this team operation. Ask an owner or administrator.",
          }),
        }),
      /organization role cannot perform/,
    ],
    [
      "non-JSON 500 page",
      (r) =>
        r.fulfill({
          status: 500,
          contentType: "text/html",
          body: "<html>Internal error</html>",
        }),
      /Team roster read failed \(500\)/,
    ],
    [
      "malformed roster",
      (r) =>
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ teams: [] }),
        }),
      /not recognised/,
    ],
    ["network failure", (r) => r.abort("failed"), /Could not reach the server/],
  ])
    await scenario(
      `first read fails: ${label}`,
      { teams: [answer] },
      async ({ monitor }) => {
        const alert = monitor.getByRole("alert");
        await alert.waitFor({ timeout: 8000 });
        const message = await alert.innerText();
        assert.match(message, expected);
        assert.doesNotMatch(
          message,
          /last successful read/,
          "no earlier data to fall back on",
        );
        assert.equal(await monitor.getByRole("table").count(), 0);
      },
    );

  await scenario(
    "recovers from a failed first read on the next interval",
    {
      teams: [(r) => r.abort("failed"), [team(1)]],
    },
    async ({ page, monitor }) => {
      await monitor.getByRole("alert").waitFor({ timeout: 8000 });
      await page.clock.runFor(15_500);
      await monitor.getByRole("table").waitFor({ timeout: 8000 });
      assert.equal(await monitor.getByRole("alert").count(), 0);
    },
  );

  for (const [phase, at] of [
    ["Waiting for the lobby", Date.parse("2026-12-01T09:59:00Z")],
    ["Discussion", Date.parse("2026-12-01T10:01:00Z")],
    ["Choosing parts", Date.parse("2026-12-01T10:05:00Z")],
    ["Allocation locked", Date.parse("2026-12-01T10:15:00Z")],
  ])
    await scenario(
      `phase text: ${phase}`,
      { teams: [[team(1)]], time: at },
      async ({ monitor }) => {
        await firstLoad(monitor, new RegExp(`Scheduled phase: ${phase}`));
      },
    );

  await scenario(
    "hostile and extreme names render as inert text without overflow",
    {
      teams: [
        [
          team(1, { name: '<img src=x onerror="window.__xss=1">' }),
          team(2, { name: "W".repeat(300), members: [] }),
          team(3, {
            members: Array.from({ length: 20 }, (_, i) => ({
              ...member(3, i + 1),
              display_name: "🙂".repeat(120),
            })),
          }),
        ],
      ],
    },
    async ({ page, monitor }) => {
      await monitor.getByRole("table").waitFor({ timeout: 8000 });
      assert.equal(
        await page.evaluate(() => window.__xss),
        undefined,
        "markup is never executed",
      );
      assert.match(await textOf(monitor), /<img src=x onerror=/);
      assert.match(await textOf(monitor), /0\/0 claimed/);
      assert.match(await textOf(monitor), /20\/20 claimed/);
      const box = await monitor.boundingBox();
      const width = await page.evaluate(() => window.innerWidth);
      assert.ok(
        box.x + box.width <= width,
        `monitor fits the viewport (${box.x + box.width} > ${width})`,
      );
    },
  );

  await scenario(
    "staff mark an absent member; the vote then counts present members",
    {
      time: Date.parse("2026-12-01T11:00:00Z"),
      absent: { absent: true, votes: 0, votes_needed: 3, submitted: false },
      teams: [
        [team(1)],
        [
          team(1, {
            votes_needed: 3,
            members: [1, 2, 3, 4].map((i) => ({
              ...member(1, i),
              absent: i === 4,
            })),
          }),
        ],
      ],
    },
    async ({ monitor, state }) => {
      await monitor.getByRole("table").waitFor({ timeout: 8000 });
      assert.match(await textOf(monitor), /0\/4 on revision 1/);
      await monitor
        .getByRole("button", { name: "Mark absent: Team 1 Member 4, Team 1" })
        .click();
      await monitor
        .getByRole("button", { name: "Mark present: Team 1 Member 4, Team 1" })
        .waitFor({ timeout: 8000 });
      assert.deepEqual(state.absent, [
        [
          `/api/org/contests/${contest}/team-round/teams/${uid(1)}/members/${uid(100104)}/absent`,
          { absent: true },
        ],
      ]);
      const text = await textOf(monitor);
      assert.match(
        text,
        /Team 1 Member 4: 4 · readiness unknown(?: · offline)? · absent/,
      );
      assert.match(text, /0\/3 on revision 1/);
    },
  );

  await scenario(
    "phone-width viewport keeps the monitor inside the screen",
    {
      teams: [[team(1), team(2)]],
      viewport: { width: 390, height: 844 },
    },
    async ({ page, monitor }) => {
      await monitor.getByRole("table").waitFor({ timeout: 8000 });
      const box = await monitor.boundingBox();
      const width = await page.evaluate(() => window.innerWidth);
      assert.ok(
        box.x + box.width <= width + 1,
        `monitor right edge ${box.x + box.width} within ${width}`,
      );
      const scroller = await monitor
        .locator("div.overflow-x-auto")
        .evaluate((d) => d.scrollWidth > d.clientWidth);
      assert.ok(scroller, "the table scrolls inside its own container");
    },
  );

  await scenario(
    "a 500-team round renders quickly",
    {
      teams: [Array.from({ length: 500 }, (_, i) => team(i + 1))],
    },
    async ({ page, monitor }) => {
      const started = Date.now();
      await page.waitForFunction(
        () =>
          document.querySelectorAll(
            'table[aria-label="Live team status"] tbody tr',
          ).length === 500,
        null,
        { timeout: 10000 },
      );
      const ms = Date.now() - started;
      assert.match(await textOf(monitor), /Teams 500/i);
      const tick = await page.evaluate(async () => {
        const t0 = performance.now();
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
        return performance.now() - t0;
      });
      results.push(
        `  info: 500 rows visible ${ms} ms after the tab rendered; frame ${tick.toFixed(1)} ms`,
      );
    },
  );
} finally {
  await browser.close();
  console.log(results.join("\n"));
}
