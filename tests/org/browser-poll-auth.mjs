// All API traffic is mocked. Each owned read must report its own 401 without a fetch patch.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://localhost:3124";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check) {
  for (let n = 0; n < 200; n++) {
    if (await check()) return;
    await wait(25);
  }
  throw new Error("Condition not reached");
}
const root = "/api/org/contests/a";
const cases = [
  ["sessions", "participants", `${root}/invigilation?view=sessions`],
  ["re-entry", "invigilation", `${root}/invigilation?view=resume-requests`],
  ["incidents", "invigilation", `${root}/invigilation?view=incidents`],
  ["readiness", "invigilation", `${root}/invigilation?view=readiness`],
  ["overrides", "invigilation", `${root}/invigilation?view=overrides`],
  ["summary", "problems", `${root}/submissions/summary`],
  ["submissions", "submissions", `${root}/submissions`],
  ["scoreboard", "leaderboard", `${root}/scoreboard`],
  ["roster", "leaderboard", `${root}/participants`],
  ["teams", "team-round", `${root}/team-round/teams`],
  ["standings", "team-round", `${root}/team-round/board`],
  ["voice", "team-round", `${root}/team-round/voice-events`],
  ["mail list", "mail", "/api/org/mail/batches"],
  ["mail detail", "mail-detail", "/api/org/mail/batches/batch"],
];
const batch = {
  uid: "batch",
  label: "Test batch",
  template_name: "reminder",
  kind: "custom",
  contest_uid: null,
  contest_title: "",
  total: 1,
  counts: { queued: 1 },
  created_at: "2026-11-01T12:00:00Z",
  messages: [],
};
try {
  for (const [name, tab, target] of cases) {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "ams_session",
        value: `test.${Math.floor(Date.now() / 1000) + 7200}.test`,
        url: base,
      },
    ]);
    await context.addInitScript(() => {
      window.__originalFetch = window.fetch;
    });
    const page = await context.newPage();
    await page.clock.install();
    let fail = false,
      owned = 0,
      total = 0;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      if (url.origin !== base) return route.abort();
      if (!url.pathname.startsWith("/api/")) return route.continue();
      assert.equal(req.method(), "GET", "the read regression never writes");
      total++;
      const endpoint =
        url.pathname +
        (url.pathname.endsWith("/invigilation") ? url.search : "");
      const ok = (data, status = 200) =>
        route
          .fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify(data),
          })
          .catch(() => {});
      if (endpoint === target) {
        owned++;
        if (fail) return ok({ error: "Not signed in" }, 401);
      }
      if (url.pathname === "/api/auth/me")
        return ok({
          role: "admin",
          uid: "staff",
          session_expires_at: Date.now() + 7200_000,
        });
      if (url.pathname === root)
        return ok({
          uid: "a",
          title: "Poll auth test",
          status: "running",
          starts_at: "2026-01-01",
          ends_at: "2027-01-01",
          is_practice: false,
          problems: [],
          joined: false,
          frozen: false,
        });
      if (url.pathname.endsWith("/submissions/summary"))
        return ok({ total: 0, pending: 0, verdicts: {} });
      if (url.pathname.endsWith("/scoreboard"))
        return ok({ rows: [], frozen: false });
      if (url.pathname === "/api/org/support")
        return ok({ items: [], has_more: false });
      if (url.pathname.endsWith("/team-round"))
        return ok({
          uid: "round",
          team_size: 4,
          integration_score: 100,
          selection_opens_at: "2026-01-01T00:00:00Z",
          discussion_seconds: 120,
          allocation_locks_at: "2026-01-02T00:00:00Z",
          allocation_locked_at: null,
          submit_deadline: "2027-01-01T00:00:00Z",
          seeded_at: "2026-01-01T00:00:00Z",
          published_at: "2026-01-01T00:00:00Z",
          rank_sum_spread: 0,
          project: { uid: "project", slug: "project", name: "Project" },
          parts: [{ label: "1" }],
        });
      if (url.pathname.endsWith("/team-round/board")) return ok({ teams: [] });
      if (url.pathname === "/api/org/mail/batches") return ok([batch]);
      if (url.pathname === "/api/org/mail/batches/batch") return ok(batch);
      return ok([]);
    });
    try {
      await page.goto(
        base +
          (tab.startsWith("mail") ? "/org/mails" : `/org/contests/a#${tab}`),
      );
      if (tab === "mail-detail")
        await page.getByText("Test batch", { exact: true }).click();
      await until(() => owned > 0);
      await wait(150);
      assert.equal(
        await page.evaluate(() => window.fetch === window.__originalFetch),
        true,
        `${name}: fetch identity`,
      );
      fail = true;
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      const notice = page
        .getByRole("alert")
        .filter({ hasText: "Your session has expired" });
      await notice.waitFor();
      await wait(150);
      const paused = total;
      await page.clock.runFor(60_000);
      await wait(100);
      assert.equal(total, paused, `${name}: all polling pauses after its 401`);
      const beforeResume = owned;
      fail = false;
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await notice.waitFor({ state: "detached" });
      await until(() => owned > beforeResume);
      assert.deepEqual(errors, [], name);
      console.log(
        `PASS ${name}: explicit 401 pauses polling and same-account reauthentication resumes it`,
      );
    } finally {
      await context.close();
    }
  }
  const context = await browser.newContext();
  try {
    await context.addCookies([
      {
        name: "ams_session",
        value: `test.${Math.floor(Date.now() / 1000) + 7200}.test`,
        url: base,
      },
    ]);
    const page = await context.newPage();
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== base) return route.abort();
      if (!url.pathname.startsWith("/api/")) return route.continue();
      return route.fulfill({
        status: url.pathname === "/api/auth/me" ? 401 : 200,
        contentType: "application/json",
        body: "[]",
      });
    });
    await page.goto(base + "/org/mails");
    await page
      .getByRole("alert")
      .filter({ hasText: "Your session has expired" })
      .waitFor();
    console.log(
      "PASS initial auth/me 401 is reported without a shell fetch observer",
    );
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}
