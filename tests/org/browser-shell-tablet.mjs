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
  reducedMotion: "reduce",
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
const ticket = {
  uid: "11111111-1111-4111-8111-111111111111",
  contest_uid: "a",
  name: "Candidate ticket",
  email: "ticket@example.test",
  phone: "",
  category: "LOGIN_ISSUE",
  status: "open",
  updated_at: now,
  chat_enabled: true,
};
let supportList = false;
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
async function handleRoute(route) {
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
      items: supportList
        ? [
            ticket,
            ...Array.from({ length: 49 }, (_, index) => ({
              ...ticket,
              uid: `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`,
              name: `Other ticket ${index + 1}`,
            })),
          ]
        : [ticket],
      has_more: false,
    });
  if (url.pathname === `/api/org/support/${ticket.uid}`)
    return ok({ ...ticket, messages: [], has_more: false });
  if (url.pathname === "/api/org/contests/a/participants")
    return ok(
      Array.from({ length: 30 }, (_, index) => ({
        user_uid: `user-${index}`,
        login_id: `roster-${index}`,
        display_name: `Roster Candidate ${index + 1}`,
        revoked: false,
        last_login_at: null,
        has_passphrase: true,
        email: `roster-${index}@example.test`,
        mail_status: "",
      })),
    );
  if (url.pathname === "/api/org/contests") return ok([contest]);
  if (url.pathname === "/api/org/contests/a") return ok(contest);
  if (url.pathname === "/api/org/fleet")
    return ok({
      workers: [],
      live: 0,
      stale: 0,
      running_jobs: 0,
      queued_jobs: 0,
      desired: 0,
      driver: "schedule",
      detail: "",
      override: null,
      state: null,
      upcoming: [],
      queue_waiting: 0,
      queue_inflight: 0,
      queue_error: "",
      ceiling: 40,
    });
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
}
await page.route("**/*", handleRoute);
const overflow = () =>
  page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const tabFits = (tab) =>
  tab.evaluate((el) => {
    const tab = el.getBoundingClientRect();
    const strip = el.parentElement.getBoundingClientRect();
    return tab.left >= strip.left - 1 && tab.right <= strip.right + 1;
  });
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
  await page.getByRole("tab", { name: /^invigilation/ }).waitFor();
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
    const tabs = page.getByRole("tablist", { name: "Contest sections" });
    const invigilation = tabs.getByRole("tab", {
      name: /^invigilation\s*2 waiting on staff$/,
    });
    await invigilation.waitFor();
    await page.waitForURL("**/org/contests/a#overview");
    assert(
      await tabFits(tabs.getByRole("tab", { selected: true })),
      `stage default is visible at ${width}`,
    );
    assert(
      (await overflow()) <= 1,
      `contest page overflows by ${await overflow()}px at ${width}`,
    );
    const tabStrip = await tabs.evaluate((el) => ({
      scrolls: el.scrollWidth > el.clientWidth,
      mask:
        getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage,
    }));
    if (width < 1024) assert(tabStrip.scrolls, `tab strip scrolls at ${width}`);
    assert(
      Boolean(tabStrip.mask && tabStrip.mask !== "none") === tabStrip.scrolls,
      "tab strip shows an edge fade exactly while it can scroll",
    );
    for (const h of await tabs
      .getByRole("tab")
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

    await tabs.getByRole("tab", { name: "participants", exact: true }).click();
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
    await tabs.getByRole("tab", { name: /^invigilation/ }).click();
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

  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto("about:blank");
  await page.goto(base + "/org/contests/a#judging");
  const tabs = page.getByRole("tablist", { name: "Contest sections" });
  const judging = tabs.getByRole("tab", { name: "Judging" });
  await page.getByText("No judges held for this contest").waitFor();
  await tabs
    .getByRole("tab", { name: /^invigilation\s*2 waiting on staff$/ })
    .waitFor();
  assert.equal(await judging.getAttribute("aria-selected"), "true");
  assert(
    await tabFits(judging),
    "deep-linked Judging stays visible as badges load",
  );

  await tabs.getByRole("tab", { name: "problems", exact: true }).click();
  const invigilation = tabs.getByRole("tab", { name: /^invigilation/ });
  assert(!(await tabFits(invigilation)), "Invigilation starts offscreen");

  const shortcut = page.getByRole("button", { name: /waiting to re-enter/i });
  // Keep the viewport below the strip so ancestor scrolling would be observable.
  const scrollPastTabs = await tabs.evaluate(
    (el) => el.getBoundingClientRect().bottom + window.scrollY + 40,
  );
  const before = await shortcut.evaluate((el, top) => {
    document.body.style.minHeight = "300vh";
    document.documentElement.style.overflowAnchor = "none";
    document.documentElement.style.scrollBehavior = "auto";
    el.focus({ preventScroll: true });
    window.scrollTo({ top, behavior: "instant" });
    return window.scrollY;
  }, scrollPastTabs);
  assert(before >= scrollPastTabs - 1, "page is scrolled below the tabs");
  await shortcut.dispatchEvent("click");
  await page.waitForURL("**/org/contests/a#invigilation");
  assert.equal(await invigilation.getAttribute("aria-selected"), "true");
  assert(await tabFits(invigilation), "shortcut reveals Invigilation");
  assert.equal(await page.evaluate(() => window.scrollY), before);
  assert(await shortcut.evaluate((el) => document.activeElement === el));

  await judging.focus();
  await page.keyboard.press("Home");
  const first = tabs.getByRole("tab").first();
  assert(await first.evaluate((el) => el === document.activeElement));
  assert.equal(await invigilation.getAttribute("aria-selected"), "true");
  await page.keyboard.press("ArrowLeft");
  assert(await judging.evaluate((el) => el === document.activeElement));
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowRight");
  assert(await first.evaluate((el) => el === document.activeElement));
  const problems = tabs.getByRole("tab", { name: "problems", exact: true });
  await page.keyboard.press("ArrowRight");
  assert(await problems.evaluate((el) => el === document.activeElement));
  await page.keyboard.press("Enter");
  await page.waitForURL("**/org/contests/a#problems");
  const panel = page.getByRole("tabpanel", { name: "problems" });
  assert.equal(
    await panel.getAttribute("id"),
    await problems.getAttribute("aria-controls"),
  );
  assert.equal(
    await panel.getAttribute("aria-labelledby"),
    await problems.getAttribute("id"),
  );
  assert.equal(await page.getByRole("tabpanel").count(), 1);
  await page.keyboard.press("Tab");
  assert(await panel.evaluate((el) => el === document.activeElement));

  // 3. A real overflow at laptop width keeps Actions visible before scrolling.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base + "/org/contests/a#participants");
  const hint = page.getByText("Scroll the table sideways to see more columns.");
  await hint.waitFor();
  const region = page.getByRole("region", { name: "Participant roster" });
  const rowAction = region
    .getByRole("button", { name: "Revoke", exact: true })
    .last();
  const actionRight = await rowAction.evaluate(
    (button) => button.getBoundingClientRect().right,
  );
  const scrollerRight = await region.evaluate(
    (el) => el.getBoundingClientRect().right,
  );
  assert(
    actionRight <= scrollerRight,
    "Revoke stays visible at the edge of the roster",
  );
  await rowAction.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  const actionBottom =
    (await rowAction.boundingBox()).y + (await rowAction.boundingBox()).height;
  const launcherTop = (
    await page
      .getByRole("button", { name: /^Open notifications,/ })
      .boundingBox()
  ).y;
  assert(
    actionBottom <= launcherTop,
    "Last row clears the fixed notifications launcher",
  );
  await page.setViewportSize({ width: 1600, height: 900 });
  await hint.waitFor({ state: "hidden" });

  // 4. Coarse tablet targets and the conversation stacked under 50 issues.
  const touchContext = await browser.newContext({
    viewport: { width: 768, height: 900 },
    hasTouch: true,
    storageState: await context.storageState(),
  });
  const touch = await touchContext.newPage();
  await touch.route("**/*", handleRoute);
  await touch.goto(base + "/org/contests/a#participants");
  const copy = touch.getByRole("button", { name: "Copy invite code" });
  await copy.waitFor();
  const selectAll = touch.getByRole("checkbox", {
    name: /Select all 30 shown/,
  });
  const target = selectAll.locator("..");
  const revoke = touch
    .getByRole("region", { name: "Participant roster" })
    .getByRole("button", { name: "Revoke", exact: true })
    .first();
  for (const width of [768, 1024]) {
    await touch.setViewportSize({ width, height: 900 });
    for (const [name, locator] of [
      ["Copy invite code", copy],
      ["Padded checkbox", target],
      ["Revoke", revoke],
    ]) {
      const box = await locator.boundingBox();
      assert(
        box.height >= 44 && box.width >= 44,
        `${name} has a 44px hit area at ${width}px`,
      );
    }
  }
  await target.tap();
  assert(
    await selectAll.isChecked(),
    "Tapping the padded label selects participants",
  );

  supportList = true;
  await touch.setViewportSize({ width: 768, height: 900 });
  await touch.goto(base + "/org/support");
  const openIssue = touch.getByRole("button", {
    name: "Open conversation with Candidate ticket",
  });
  await openIssue.tap();
  const detail = touch.getByRole("region", { name: "Support conversation" });
  await touch.waitForFunction(() => {
    const active = document.activeElement;
    return (
      active?.getAttribute("aria-label") === "Support conversation" &&
      active.getBoundingClientRect().top < innerHeight
    );
  });
  assert.equal(
    await touch
      .getByRole("button", { name: "Open issues" })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await detail.getByRole("tabpanel").count(), 0);
  await touchContext.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: active contest tabs scroll into view without moving the page or focus",
  );
} finally {
  await browser.close();
}
