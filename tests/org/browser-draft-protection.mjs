// Production browser regressions; no real credentials or backend traffic.
import assert from "node:assert/strict";
import { recordPageErrors } from "./page-errors.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://localhost:3124";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
async function scenario(run, fallback = false) {
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
  if (fallback)
    await context.addInitScript(() =>
      Object.defineProperty(window, "navigation", { value: undefined }),
    );
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  recordPageErrors(page, errors);
  let writes = 0;
  await page.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin !== base) return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const ok = (body) =>
      route
        .fulfill({
          contentType: "application/json",
          body: JSON.stringify(body),
        })
        .catch(() => {});
    if (url.pathname === "/api/auth/me") return ok({ role: "admin" });
    if (url.pathname === "/api/org/students") return ok([]);
    if (url.pathname === "/api/org/students/facets")
      return ok({ total: 0, colleges: [], branches: [], graduation_years: [] });
    if (url.pathname === "/api/org/contests")
      return ok([
        {
          uid: "a",
          title: "Draft protection",
          status: "running",
          is_practice: true,
          starts_at: "2026-01-01",
          ends_at: "2027-01-01",
          problems: [],
        },
      ]);
    if (url.pathname === "/api/org/contests/a")
      return ok({
        uid: "a",
        title: "Draft protection",
        status: "running",
        is_practice: true,
        starts_at: "2026-01-01",
        ends_at: "2027-01-01",
        problems: [],
        frozen: false,
      });
    if (url.pathname.endsWith("/participants") && request.method() === "POST") {
      writes++;
      return ok([
        {
          display_name: "Test Candidate 001",
          login_id: "candidate-1",
          password: "private-bulk-password",
        },
      ]);
    }
    if (url.pathname.endsWith("/analytics")) return ok({ problems: [] });
    if (url.pathname.endsWith("/announcements"))
      return ok({ sitting: 5, announcements: [] });
    if (
      url.pathname.endsWith("/participants") ||
      url.pathname.endsWith("/invigilation") ||
      url.pathname === "/api/org/contests"
    )
      return ok([]);
    if (url.pathname.endsWith("/submissions/summary"))
      return ok({ total: 0, pending: 0, verdicts: {} });
    errors.push(`Unexpected ${request.method()} ${url.pathname}`);
    return ok([]);
  });
  const load = async () => {
    await page.goto(base + "/org/contests/a#participants");
    await page
      .getByRole("button", { name: "Add test candidates", exact: true })
      .waitFor();
  };
  const issue = async () => {
    await page
      .getByRole("button", { name: "Add test candidates", exact: true })
      .click();
    await page
      .getByRole("spinbutton", { name: "How many test candidates" })
      .fill("1");
    await page.getByRole("button", { name: "Add 1", exact: true }).click();
    await page.getByText("private-bulk-password", { exact: true }).waitFor();
  };
  try {
    await run({ page, context, load, issue });
    assert.equal(writes, 0 === writes ? 0 : 1, "Only one provisioning request");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}
async function dialog(page, action, accept = false, type = "confirm") {
  const response = page.waitForEvent("dialog").then(async (d) => {
    assert.equal(d.type(), type);
    if (accept) await d.accept();
    else await d.dismiss();
  });
  try {
    await action();
  } catch (error) {
    if (type !== "beforeunload" || !String(error).includes("ERR_ABORTED"))
      throw error;
  }
  await response;
}
try {
  await scenario(async ({ page, load }) => {
    await load();
    await page
      .getByRole("button", { name: "Issue announcement", exact: true })
      .click();
    const composer = page.getByRole("dialog", {
      name: "Issue announcement",
      exact: true,
    });
    const headline = page.getByRole("textbox", {
      name: "Headline",
      exact: true,
    });
    const message = page.getByRole("textbox", { name: "Message", exact: true });
    await headline.fill("Preserve this headline");
    await message.fill("Preserve this announcement text");
    const discard = page.getByRole("dialog", {
      name: "Discard this announcement draft?",
    });
    for (const close of [
      () => headline.press("Escape"),
      () =>
        composer.getByRole("button", { name: "Close", exact: true }).click(),
      () =>
        composer.getByRole("button", { name: "Cancel", exact: true }).click(),
      () => page.mouse.click(5, 5),
    ]) {
      await close();
      await discard.waitFor();
      await discard.getByRole("button", { name: "Keep editing" }).click();
      assert.equal(await headline.inputValue(), "Preserve this headline");
      assert.equal(
        await message.inputValue(),
        "Preserve this announcement text",
      );
    }
    const box = await message.boundingBox();
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(5, 5);
    await page.mouse.up();
    assert.equal(
      await discard.count(),
      0,
      "A selection drag ending outside does not request dismissal",
    );
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await page.keyboard.press("Escape");
    await headline.waitFor();
    assert.equal(await headline.inputValue(), "Preserve this headline");
    await headline.press("Escape");
    await discard.waitFor();
    await page.keyboard.press("Escape");
    await discard.waitFor({ state: "hidden" });
    assert.equal(await headline.inputValue(), "Preserve this headline");
    await headline.press("Escape");
    await discard
      .getByRole("button", { name: "Discard draft", exact: true })
      .click();
    await composer.waitFor({ state: "hidden" });
    assert.equal(
      await page.evaluate(() => document.body.style.overflow),
      "",
      "Discard restores page scrolling",
    );
    await page
      .getByRole("button", { name: "Issue announcement", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await composer.waitFor({ state: "hidden" });
    console.log(
      "PASS: announcement Escape, close, Cancel, backdrop, drag selection and review preserve drafts until explicit discard",
    );
  });
  for (const fallback of [false, true])
    await scenario(async ({ page, load, issue, context }) => {
      await page.goto(base + "/org/contests");
      await page
        .getByRole("link", { name: "Draft protection", exact: true })
        .click();
      await page.getByRole("tab", { name: /^participants$/i }).click();
      await page
        .getByRole("button", { name: "Add test candidates", exact: true })
        .waitFor();
      await issue();
      await page.getByRole("tab", { name: /^problems$/i }).click();
      await page.getByRole("tab", { name: /^participants$/i }).click();
      await page.getByText("private-bulk-password", { exact: true }).waitFor();
      await dialog(page, () =>
        page
          .getByRole("link", { name: "Contests", exact: true })
          .first()
          .click(),
      );
      assert(page.url().includes("/contests/a"));
      await page.getByText("private-bulk-password", { exact: true }).waitFor();
      await dialog(page, () => page.evaluate(() => history.back()));
      await page.waitForURL(/\/org\/contests\/a/);
      await page.getByText("private-bulk-password", { exact: true }).waitFor();
      await dialog(page, () => page.evaluate(() => history.back()));
      await page.waitForURL(/\/org\/contests\/a/);
      await page.getByText("private-bulk-password", { exact: true }).waitFor();
      await page
        .getByRole("link", { name: "Contests", exact: true })
        .first()
        .evaluate((link) => {
          link.addEventListener(
            "click",
            (event) => {
              event.preventDefault();
              event.stopImmediatePropagation();
            },
            { once: true },
          );
        });
      await dialog(
        page,
        () =>
          page
            .getByRole("link", { name: "Contests", exact: true })
            .first()
            .click(),
        true,
      );
      assert(
        page.url().includes("/contests/a"),
        "Aborted link retains the current route",
      );
      await page.waitForFunction(() => {
        const event = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      });
      await dialog(page, () => page.evaluate(() => history.back()));
      await page.waitForURL(/\/org\/contests\/a/);
      await page.getByText("private-bulk-password", { exact: true }).waitFor();
      await dialog(
        page,
        () => page.evaluate(() => location.reload()),
        false,
        "beforeunload",
      );
      await page.getByText("private-bulk-password", { exact: true }).waitFor();
      await page.evaluate(() => {
        window.print = () => {};
      });
      await page
        .getByRole("button", { name: "Print slips", exact: true })
        .click();
      assert(
        await page
          .getByRole("button", { name: "Save them first", exact: true })
          .isDisabled(),
        "Print dialog alone cannot acknowledge saving",
      );
      assert.equal(
        await page
          .evaluate(() =>
            JSON.stringify({ ...localStorage, ...sessionStorage }),
          )
          .then((s) => s.includes("private-bulk-password")),
        false,
        "Passwords never enter browser storage",
      );
      await page
        .getByRole("button", {
          name: "I saved or printed these credentials",
          exact: true,
        })
        .click();
      await page.getByRole("button", { name: "Done", exact: true }).click();
      await page
        .getByRole("button", { name: "Add test candidates", exact: true })
        .waitFor();
      const unexpected = [];
      page.on("dialog", (d) => {
        unexpected.push(d.type());
        void d.dismiss();
      });
      await page
        .getByRole("link", { name: "Contests", exact: true })
        .first()
        .click();
      await page.waitForURL(base + "/org/contests");
      assert.deepEqual(
        unexpected,
        [],
        "Acknowledged credentials do not prompt on navigation",
      );
      console.log(
        `PASS: bulk credentials survive tabs, rejected links/Back/reload, print cancellation and saved acknowledgement (${fallback ? "legacy history" : "Navigation API"})`,
      );
    }, fallback);
  for (const fallback of [false, true])
    await scenario(async ({ page, load, issue }) => {
      await load();
      await issue();
      await dialog(
        page,
        () =>
          page
            .getByRole("link", { name: "Contests", exact: true })
            .first()
            .click(),
        true,
      );
      await page.waitForURL(base + "/org/contests");
      await page
        .getByRole("link", { name: "Draft protection", exact: true })
        .waitFor();
      assert.equal(
        page.url(),
        base + "/org/contests",
        "Accepted Next Link is not undone by guard cleanup",
      );
      console.log(
        `PASS: confirmed sidebar navigation completes (${fallback ? "legacy" : "Navigation API"})`,
      );
    }, fallback);
  for (const accept of [false, true])
    await scenario(async ({ page, issue }) => {
      await page.goto(base + "/org/participants");
      await page.getByText("No students yet", { exact: true }).waitFor();
      await page.evaluate(() => {
        window.historyFixture = true;
      });
      await page
        .getByRole("link", { name: "Contests", exact: true })
        .first()
        .click();
      await page
        .getByRole("link", { name: "Draft protection", exact: true })
        .click();
      await page.getByRole("tab", { name: /^participants$/i }).click();
      await page
        .getByRole("button", { name: "Add test candidates", exact: true })
        .waitFor();
      await issue();
      const guardedUrl = page.url();
      assert(
        await page.evaluate(() => window.historyFixture),
        "Fixture uses client-side navigation history",
      );
      await dialog(page, () => page.evaluate(() => history.go(-3)), accept);
      if (accept) await page.waitForURL(base + "/org/participants");
      else {
        await page.waitForURL(guardedUrl);
        await page
          .getByText("private-bulk-password", { exact: true })
          .waitFor();
        assert.equal(
          page.url(),
          guardedUrl,
          "Multi-step cancelled history traversal restores exact URL",
        );
        await page
          .getByRole("button", {
            name: "I saved or printed these credentials",
            exact: true,
          })
          .click();
      }
      console.log(
        `PASS: legacy multi-step Back ${accept ? "accepts requested destination" : "preserves exact guarded state"}`,
      );
    }, true);
  await scenario(async ({ page, load, issue }) => {
    await page.goto(base + "/org/contests");
    await page
      .getByRole("link", { name: "Draft protection", exact: true })
      .click();
    await page.getByRole("tab", { name: /^participants$/i }).click();
    await page
      .getByRole("button", { name: "Add test candidates", exact: true })
      .waitFor();
    await issue();
    await dialog(page, () => page.evaluate(() => history.back()), true);
    await page.waitForURL(base + "/org/contests");
    await page.goForward();
    await page.waitForURL(/\/org\/contests\/a/);
    await page
      .getByRole("button", { name: "Add test candidates", exact: true })
      .waitFor();
    assert.equal(
      await page.getByText("private-bulk-password", { exact: true }).count(),
      0,
      "Explicit leave discards the in-memory bulk view",
    );
    console.log(
      "PASS: explicit browser Back discards only after confirmation; Forward returns to a fresh console",
    );
  });
} finally {
  await browser.close();
}
