// Persistent org shell and tablet layout. Isolated production server; every API
// read is mocked, writes are refused, and external requests are blocked.
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
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await context.addCookies([
  {
    name: "ams_session",
    value: `test.${Math.floor(Date.now() / 1000) + 3600}.test`,
    url: base,
  },
]);
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && /hydrat/i.test(m.text())) errors.push(m.text());
});
const now = new Date().toISOString();
const contest = {
  uid: "a",
  title: "Tablet fixture",
  slug: "tablet",
  description: "",
  visibility: "private",
  status: "running",
  starts_at: "2026-01-01T00:00:00Z",
  ends_at: "2027-01-01T00:00:00Z",
  is_practice: false,
  invite_code: "CODE",
  problems: [],
  joined: false,
  frozen: false,
};
const session = (uid) => ({
  uid,
  user_uid: uid,
  login_id: `${uid}-long-readable-handle`,
  display_name: `Candidate ${uid}`,
  status: "active",
  started_at: now,
  last_seen_at: now,
  violation_count: 2,
  resume_count: 0,
  idle_seconds: 5,
  resume_pending: false,
  has_entry_photo: false,
  has_exit_photo: false,
  entry_photo_at: null,
  exit_photo_at: null,
});
await page.route("**/*", async (route) => {
  const req = route.request(),
    url = new URL(req.url());
  if (url.origin !== base) return route.abort();
  if (!url.pathname.startsWith("/api/")) return route.continue();
  const ok = (data) =>
    route
      .fulfill({ contentType: "application/json", body: JSON.stringify(data) })
      .catch(() => {});
  if (req.method() !== "GET")
    throw new Error(`Unexpected write ${req.method()} ${url.pathname}`);
  if (url.pathname === "/api/auth/me") return ok({ role: "admin" });
  if (url.pathname === "/api/org/support")
    return ok({
      items: [
        {
          uid: "11111111-1111-4111-8111-111111111111",
          contest_uid: "a",
          name: "Candidate ticket",
          email: "ticket@example.test",
          phone: "",
          category: "LOGIN_ISSUE",
          status: "open",
          updated_at: now,
          chat_enabled: true,
        },
      ],
      has_more: false,
    });
  if (url.pathname === "/api/org/contests") return ok([contest]);
  if (url.pathname === "/api/org/contests/a") return ok(contest);
  if (url.pathname.endsWith("/submissions/summary"))
    return ok({ total: 0, pending: 0, verdicts: {} });
  if (url.pathname.endsWith("/credentials"))
    return ok({
      no_credential: 0,
      ready: 0,
      holders: 0,
      holder_names: [],
      no_email: 0,
      no_email_names: [],
    });
  if (url.pathname.endsWith("/invigilation")) {
    const view = url.searchParams.get("view");
    if (view === "sessions") return ok([session("one"), session("two")]);
    if (view === "incidents")
      return ok([
        {
          uid: "help",
          login_id: "one-long-readable-handle",
          display_name: "Candidate one",
          message: "Camera needs help",
          category: "technical",
          contact: "",
          status: "open",
          created_at: now,
        },
      ]);
    if (view === "resume-requests")
      return ok([
        {
          uid: "req",
          login_id: "one-long-readable-handle",
          display_name: "Candidate one",
          reason: "App closed",
          status: "pending",
          created_at: now,
          device_fingerprint: "",
          resume_count: 0,
        },
      ]);
    return ok([]);
  }
  return ok([]);
});
const overflow = () =>
  page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
try {
  // 1. Shell survives client navigation between two org pages.
  await page.goto(base + "/org/contests");
  const sidebar = page.getByRole("complementary");
  await page
    .getByRole("link", { name: /Tablet fixture/ })
    .first()
    .waitFor();
  await page.evaluate(() => {
    document.querySelector("aside").dataset.shellMarker = "kept";
    window.__sameDocument = true;
  });
  await page
    .getByRole("link", { name: /Tablet fixture/ })
    .first()
    .click();
  await page.waitForURL("**/org/contests/a");
  await page.getByRole("button", { name: /^invigilation/ }).waitFor();
  assert.equal(
    await page.evaluate(() => window.__sameDocument),
    true,
    "navigation stayed client-side",
  );
  assert.equal(
    await sidebar.getAttribute("data-shell-marker"),
    "kept",
    "sidebar not re-mounted on contests -> contest",
  );
  await sidebar.getByRole("link", { name: "Contests", exact: true }).click();
  await page.waitForURL("**/org/contests");
  await page
    .getByRole("link", { name: /Tablet fixture/ })
    .first()
    .waitFor();
  assert.equal(
    await sidebar.getAttribute("data-shell-marker"),
    "kept",
    "sidebar not re-mounted on contest -> contests",
  );
  console.log("PASS: org shell persists across navigation");

  // 2. Tablet widths: active badges must not widen the page.
  for (const width of [768, 834, 1024]) {
    await page.setViewportSize({ width, height: 1112 });
    await page.goto(base + "/org/contests/a");
    const tabs = page.getByRole("navigation", { name: "Contest sections" });
    await tabs
      .getByRole("button", { name: /^invigilation\s*2 waiting on staff$/ })
      .waitFor();
    assert(
      (await overflow()) <= 1,
      `contest page overflows by ${await overflow()}px at ${width}`,
    );
    const tabStrip = await tabs.evaluate((el) => ({
      scrolls: el.scrollWidth > el.clientWidth,
      mask:
        getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage,
    }));
    assert.equal(
      tabStrip.scrolls,
      width < 1024,
      `tab strip scrolling matches the available width at ${width}`,
    );
    assert(
      Boolean(tabStrip.mask && tabStrip.mask !== "none") === tabStrip.scrolls,
      "tab strip shows an edge fade exactly while it can scroll",
    );
    for (const h of await tabs
      .getByRole("button")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height)))
      assert(h >= 44, `contest tab is ${h}px tall`);
    for (const h of await page
      .getByRole("banner")
      .getByRole("link")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height)))
      assert(h >= 44, `shell nav link is ${h}px tall`);
    await page.screenshot({
      path: `/tmp/shell-tablet-contest-${width}.png`,
      fullPage: true,
    });

    await tabs
      .getByRole("button", { name: "participants", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Credentials by email", exact: true })
      .click();
    const popover = page
      .getByRole("button", { name: "Credentials by email", exact: true })
      .locator("xpath=following-sibling::div[1]");
    await popover.waitFor();
    for (const width of [768, 834, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1112 });
      const box = await popover.boundingBox();
      assert(
        box.x >= 0 && box.x + box.width <= width + 1,
        `credentials popover spans ${box.x}..${box.x + box.width} at ${width}`,
      );
      assert(
        (await overflow()) <= 1,
        `credentials popover widens the page at ${width}`,
      );
    }

    await page.setViewportSize({ width, height: 1112 });
    await tabs.getByRole("button", { name: /^invigilation/ }).click();
    await page.getByRole("button", { name: "Let them back in" }).waitFor();
    await page
      .getByRole("button", { name: "Candidate two", exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("table", { name: "Live contest sessions" }).count(),
      0,
      "sessions render as cards, not the 780px table",
    );
    assert(
      (await overflow()) <= 1,
      `invigilation overflows by ${await overflow()}px at ${width}`,
    );
    for (const name of ["Let them back in", "Refuse", "Mark resolved"]) {
      const h = (await page.getByRole("button", { name }).boundingBox()).height;
      assert(h >= 44, `${name} is ${h}px tall`);
    }
    const ticket = page.getByRole("link", {
      name: /Open ticket from Candidate ticket/,
    });
    assert(
      (await ticket.boundingBox()).height >= 44,
      "Open ticket is at least 44px tall",
    );
    await page.screenshot({
      path: `/tmp/shell-tablet-invigilation-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      `PASS: ${width}x1112 contest + invigilation: active accessible badge, no page overflow, bounded tabs with appropriate fade, 44px targets, session cards`,
    );
  }
} finally {
  await browser.close();
}
