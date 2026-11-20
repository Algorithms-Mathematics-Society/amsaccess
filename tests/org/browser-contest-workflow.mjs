import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://localhost:3124";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
const uid = "10000000-0000-4000-8000-000000000001";
const context = await browser.newContext({
  viewport: { width: 1024, height: 900 },
});
await context.addCookies([
  {
    name: "ams_session",
    value: `test.${Math.floor(Date.now() / 1000) + 3600}.test`,
    url: base,
  },
]);
const page = await context.newPage();
page.setDefaultTimeout(20000);
let forbidden = false,
  malformed = false,
  open = true;
const writes = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/*", async (route) => {
  const r = route.request(),
    url = new URL(r.url());
  if (url.origin !== base) return route.abort();
  if (!url.pathname.startsWith("/api/")) return route.continue();
  const reply = (data, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  if (r.method() !== "GET") {
    writes.push(r.url());
    return reply({}, 500);
  }
  if (url.pathname === "/api/auth/me") return reply({ role: "admin" });
  if (forbidden) return reply({ error: "Permission denied." }, 403);
  if (url.pathname === `/api/org/contests/${uid}`)
    return reply({
      title: "Regional contest",
      status: "ended",
      starts_at: "2026-11-20T09:00:00Z",
      ends_at: "2026-11-20T10:00:00Z",
      problems: [{}],
    });
  if (url.pathname.endsWith("/participants"))
    return reply(
      malformed ? {} : [{ user_uid: uid, revoked: true, has_passphrase: true }],
    );
  if (url.pathname.endsWith("/submissions/summary"))
    return reply({ pending: 0 });
  if (url.pathname === "/api/org/support") {
    assert.equal(url.searchParams.get("contest_uid"), uid);
    assert.equal(url.searchParams.get("pagination"), "cursor");
    return reply({
      items: open
        ? [
            {
              uid,
              contest_uid: uid,
              email: "a@example.test",
              phone: "12345",
              name: "A",
              category: "OTHER",
              status: "open",
              updated_at: "2026-11-20T10:00:00Z",
            },
          ]
        : [],
      has_more: false,
      next_cursor: null,
    });
  }
  return reply([]);
});
try {
  await page.goto(`${base}/org/contests/${uid}/workflow`);
  await page.getByRole("button", { name: "Refresh checks" }).waitFor();
  assert.equal(await page.getByRole("heading", { level: 2 }).count(), 7);
  await page
    .getByText("0 of 1 people have an active login", { exact: false })
    .waitFor();
  await page
    .getByText("Open support tickets remain", { exact: false })
    .waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Review roster" })
      .getAttribute("href"),
    `/org/contests/${uid}#participants`,
  );
  assert.equal(
    await page
      .getByRole("link", { name: "Review results and exports" })
      .getAttribute("href"),
    `/org/contests/${uid}#leaderboard`,
  );
  assert.ok(
    (await page.getByText("Manual review", { exact: true }).count()) > 0,
  );
  await page.screenshot({
    path: "/tmp/session2-workflow-tablet.png",
    fullPage: true,
  });
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `overflow at ${width}`,
    );
  }
  open = false;
  malformed = true;
  await page.getByRole("button", { name: "Refresh checks" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Roster details are incomplete" })
    .waitFor();
  await page.getByText("Credential state unavailable.").waitFor();
  await page.getByText("No open support tickets", { exact: false }).waitFor();
  forbidden = true;
  await page.getByRole("button", { name: "Refresh checks" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Permission denied" })
    .waitFor();
  assert.equal(await page.getByText("Verified", { exact: true }).count(), 0);
  assert.deepEqual(writes, []);
  assert.deepEqual(errors, []);
  console.log(
    "PASS seven workflow stages, scoped checks, manual boundaries, refresh failures, permissions and responsive layout",
  );
} finally {
  await context.close();
  await browser.close();
}
