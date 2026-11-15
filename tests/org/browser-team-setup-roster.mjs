// Production bundle, mocked API only. Never use real participant data or credentials.
// Malformed /teams rosters must not break the Team round setup panel; run like
// browser-team-monitor.mjs. The round is unpublished so only the setup panel reads /teams.
import assert from "node:assert/strict";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://127.0.0.1:3124";
const contest = "3fbf9cee-8b6e-4872-947f-c52b46bb572e";
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// Shape of ams-api routes/teams.py::list_teams.
const member = (t, i, extra = {}) => ({
  user_uid: uid(100000 + t * 100 + i),
  username: `t${t}m${i}`,
  display_name: `Team ${t} Member ${i}`,
  seed_rank: i,
  part_label: null,
  assigned_by: null,
  ...extra,
});
const team = (n, extra = {}) => ({
  uid: uid(n),
  number: n,
  name: `Team ${n}`,
  revision: 0,
  votes: 0,
  submitted_revision: null,
  submitted_by: null,
  members: [1, 2, 3, 4].map((i) => member(n, i)),
  last_result: null,
  ...extra,
});
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
  published_at: null,
  rank_sum_spread: 0,
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
const results = [];

async function scenario(name, roster, check) {
  const context = await browser.newContext();
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
  const mutations = [];
  await page.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== base) return route.abort();
    if (!u.pathname.startsWith("/api/")) return route.continue();
    if (route.request().method() !== "GET") {
      mutations.push(u.pathname);
      return route.fulfill({ status: 405, body: "" });
    }
    const json = (data) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (u.pathname === "/api/auth/me") return json({ role: "admin" });
    if (u.pathname === `/api/org/contests/${contest}`)
      return json({
        uid: contest,
        title: "Roster edges",
        slug: "roster-edges",
        status: "draft",
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
    if (u.pathname.endsWith("/team-round")) return json(round);
    if (u.pathname.endsWith("/team-round/teams")) return json(roster);
    return json([]);
  });
  const setup = page.getByRole("region", { name: "Team round setup" });
  try {
    await page.goto(`${base}/org/contests/${contest}#team-round`);
    await page
      .getByRole("button", { name: "Save settings", exact: true })
      .waitFor({ timeout: 8000 });
    await page.waitForTimeout(300);
    await check({ page, setup });
    assert.deepEqual(pageErrors, [], "no uncaught page errors");
    assert.deepEqual(mutations, [], "no writes");
    results.push(`PASS ${name}`);
  } catch (e) {
    results.push(`FAIL ${name}: ${e.message.split("\n")[0]}`);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
}

const malformed = async ({ page, setup }) => {
  await setup
    .getByRole("alert")
    .filter({ hasText: /team roster response was not recognised/ })
    .waitFor({ timeout: 4000 });
  assert.match(await setup.innerText(), /Roster not available/);
  assert.ok(
    await page
      .getByRole("button", { name: "Save settings", exact: true })
      .isEnabled(),
    "settings stay usable",
  );
  assert.ok(
    await page
      .getByRole("button", { name: "Publish teams", exact: true })
      .isDisabled(),
    "cannot publish an unreviewed roster",
  );
  assert.ok(
    await page
      .getByRole("button", { name: "Redraw unpublished teams", exact: true })
      .isDisabled(),
    "cannot redraw over an unreadable roster",
  );
};

try {
  await scenario(
    "valid roster renders as before",
    [team(1), team(2)],
    async ({ setup }) => {
      const text = (await setup.innerText()).replace(/\s+/g, " ");
      assert.match(text, /2 teams · Rank-sum spread: 0 · Teams unpublished/);
      assert.match(text, /Team 1 · Rank sum 10/);
      assert.match(text, /Team 2 Member 3 · Rank 3 · Part not chosen/);
      assert.equal(await setup.getByRole("alert").count(), 0);
    },
  );

  await scenario(
    "odd display fields degrade instead of failing",
    [
      team(1, {
        name: 42,
        members: [
          member(1, 1, { display_name: null }),
          member(1, 2, { display_name: { x: 1 } }),
        ],
      }),
    ],
    async ({ setup }) => {
      const text = (await setup.innerText()).replace(/\s+/g, " ");
      assert.match(text, /Team 1 · Rank sum 3/);
      assert.match(text, /t1m1 · Rank 1/);
      assert.match(text, /t1m2 · Rank 2/);
      assert.equal(await setup.getByRole("alert").count(), 0);
    },
  );

  for (const [label, roster] of [
    ["an object instead of a list", { teams: [team(1)] }],
    ["null", null],
    ["a team without members", [team(1, { members: undefined })]],
    ["members that are not a list", [team(1, { members: "4 people" })]],
    ["a null team", [null]],
    [
      "an oversized team",
      [
        team(1, {
          members: Array.from({ length: 21 }, (_, i) => member(1, i + 1)),
        }),
      ],
    ],
  ])
    await scenario(`malformed roster: ${label}`, roster, malformed);
} finally {
  await browser.close();
  console.log(results.join("\n"));
}
