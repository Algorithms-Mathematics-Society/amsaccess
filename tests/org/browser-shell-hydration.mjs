// The persistent shell must hydrate independently of a delayed route bundle.
// Local production server only; every API call is mocked, external traffic blocked.
import assert from "node:assert/strict";
import { recordPageErrors } from "./page-errors.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://localhost:3124";
const browser = await chromium.launch({
  headless: true,
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
let releaseChild;
const childGate = new Promise((resolve) => {
  releaseChild = resolve;
});
let blocked = 0;
await page.route("**/*", async (route) => {
  const request = route.request(),
    url = new URL(request.url());
  if (url.origin !== base) return route.abort();
  if (!url.pathname.startsWith("/api/")) {
    if (/\/contests\/\[uid\]\/page-/.test(decodeURIComponent(url.pathname))) {
      blocked++;
      await childGate;
    }
    return route.continue();
  }
  assert.equal(request.method(), "GET", "hydration must not write");
  let data = [];
  if (url.pathname === "/api/auth/me")
    data = {
      role: "admin",
      uid: "staff",
      session_expires_at: Date.now() + 600_000,
    };
  if (url.pathname === "/api/org/contests/a")
    data = {
      uid: "a",
      title: "Hydration fixture",
      status: "running",
      starts_at: "2026-01-01",
      ends_at: "2027-01-01",
      is_practice: false,
      problems: [],
    };
  return route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(data),
  });
});
try {
  await page.goto(base + "/org/contests/a#problems", { waitUntil: "commit" });
  await page.locator("#org-main").waitFor();
  await page.evaluate(() => {
    window.__serverMain = document.querySelector("#org-main");
  });
  // This notice needs the shell's mounted session component and authenticated
  // read. Waiting for it while the route bundle is held proves independent hydration.
  await page.getByText(/Your session ends in/).waitFor({ timeout: 10_000 });
  assert.ok(blocked > 0, "the child route bundle was actually held");
  assert.equal(
    await page.getByRole("link", { name: "Sign in again" }).count(),
    1,
  );
  releaseChild();
  await page.getByRole("button", { name: /^Problems/i }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.querySelector("#org-main") === window.__serverMain,
    ),
    true,
    "hydration preserves the server-rendered shell",
  );
  assert.deepEqual(errors, [], "no hydration recovery or uncaught errors");
  console.log(
    "PASS shell and session notice hydrate before delayed route; original main survives content hydration",
  );
} finally {
  releaseChild();
  await browser.close();
}
