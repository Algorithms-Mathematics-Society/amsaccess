// All contest state and request counts come from local fixtures.
import assert from "node:assert/strict";
import { recordPageErrors } from "./page-errors.mjs";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://localhost:3124";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  args: ["--no-sandbox"],
});
const context = await browser.newContext();
await context.addCookies([
  {
    name: "ams_session",
    value: `test.${Math.floor(Date.now() / 1000) + 3600}.test`,
    url: base,
  },
]);
const page = await context.newPage();
const errors = [];
recordPageErrors(page, errors);
const root = "/api/org/contests/a";
const at = "2026-11-20T10:00:00Z";
let status = "scheduled";
let frozen = false;
let statusReads = 0;
let analyticsReads = 0;

await page.clock.install({ time: new Date(at) });
await page.clock.pauseAt(new Date("2026-11-20T10:00:01Z"));
await page.route("**/*", async (route) => {
  const { origin, pathname, searchParams } = new URL(route.request().url());
  if (origin !== base) return route.abort();
  if (!pathname.startsWith("/api/")) return route.continue();
  assert.equal(route.request().method(), "GET");
  const json = (value) => route.fulfill({ json: value });
  if (pathname === "/api/auth/me") return json({ uid: "staff", role: "admin" });
  if (pathname === root) {
    statusReads++;
    return json({
      uid: "a",
      title: "Local control room",
      status,
      frozen,
      is_practice: false,
      starts_at: "2026-11-20T10:00:10Z",
      ends_at: "2026-11-20T10:00:20Z",
      problems: [],
    });
  }
  if (pathname === `${root}/analytics`) {
    analyticsReads++;
    return json({
      problems: [{ label: "A", title: "Sort cells", solved: 2, attempted: 5 }],
    });
  }
  if (pathname === `${root}/announcements`)
    return json({
      sitting: 1,
      announcements: [
        {
          uid: "ann",
          title: "Correction to problem A",
          issued_by: "Ops",
          created_at: "2026-11-20T10:00:15Z",
        },
      ],
    });
  if (
    pathname === `${root}/invigilation` &&
    searchParams.get("view") === "incidents"
  )
    return json([
      {
        uid: "help",
        display_name: "Local candidate",
        login_id: "local",
        message: "Camera error",
        status: "resolved",
        created_at: "2026-11-20T10:00:12Z",
        resolved_at: "2026-11-20T10:00:16Z",
      },
    ]);
  if (pathname === `${root}/submissions/summary`)
    return json({ total: 0, pending: 0, verdicts: {} });
  if (pathname === `${root}/scoreboard`)
    return json({ frozen: false, rows: [] });
  return json([]);
});

try {
  await page.goto(base + "/org/contests/a#problems");
  await page.getByRole("heading", { name: "Local control room" }).waitFor();
  const checklist = page.getByRole("link", { name: "Setup checklist" });
  assert.equal(
    await checklist.getAttribute("href"),
    "/org/contests/a/workflow",
  );
  assert.equal(await page.getByRole("tab", { name: "Overview" }).count(), 0);
  assert.equal(analyticsReads, 0);
  const initialReads = statusReads;
  status = "running";
  await page.clock.fastForward(9_050);
  const strip = page.getByRole("region", { name: "Live contest status" });
  await strip.getByText("Time left").waitFor();
  assert.equal(statusReads, initialReads + 1, "the start boundary reads once");
  assert.equal(analyticsReads, 0, "an explicit Problems tab stays lazy");

  await page.getByRole("tab", { name: "Overview" }).click();
  const pulse = page.getByRole("region", { name: "Problem pulse" });
  await pulse.getByText("2 solved · 5 tried", { exact: true }).waitFor();
  const timeline = page.getByRole("region", { name: "Staff timeline" });
  await timeline.getByText("Correction to problem A · Ops").waitFor();
  const resolved = timeline.getByText("Help request resolved", { exact: true });
  await resolved.waitFor();
  assert.equal(
    await timeline
      .locator("li")
      .first()
      .getByText("Help request resolved")
      .count(),
    1,
  );
  assert.equal(
    await timeline.locator('time[datetime="2026-11-20T10:00:16Z"]').count(),
    1,
  );

  frozen = true;
  await strip.getByRole("button", { name: "Refresh status" }).click();
  await page.getByText("scoreboard frozen", { exact: true }).waitFor();
  await strip.getByRole("button", { name: /waiting to be judged/i }).click();
  assert.equal(
    await page
      .getByRole("tab", { name: "Submissions" })
      .getAttribute("aria-selected"),
    "true",
  );
  await page.getByRole("tab", { name: "Overview" }).click();

  status = "ended";
  frozen = false;
  await page.clock.fastForward(10_000);
  await page
    .getByRole("tab", { name: "Leaderboard", selected: true })
    .waitFor();
  assert.equal(await strip.count(), 0);
  assert.equal(
    await checklist.getAttribute("href"),
    "/org/contests/a/workflow",
  );

  status = "archived";
  await page.clock.fastForward(12_000);
  await page.getByText("archived", { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS scheduled start and end refresh status, live overview, strip navigation, and checklist link",
  );
} finally {
  await browser.close();
}
