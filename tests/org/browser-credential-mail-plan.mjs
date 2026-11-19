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

try {
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
  let plan;
  const writes = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const respond = (json) => route.fulfill({ json });

    if (request.method() !== "GET") {
      writes.push(url.pathname + url.search);
      plan = { ...plan, no_credential: 0, ready: plan.ready + 1 };
      return respond({ created: 1 });
    }
    if (url.pathname === "/api/auth/me") return respond({ role: "admin" });
    if (url.pathname === "/api/org/contests/a") {
      return respond({
        uid: "a",
        title: "Credentials mail fixture",
        status: "running",
        starts_at: "2026-01-01",
        ends_at: "2027-01-01",
        is_practice: false,
        problems: [],
        frozen: false,
      });
    }
    if (url.pathname.endsWith("/credentials")) return respond(plan);
    if (url.pathname.endsWith("/submissions/summary")) {
      return respond({ total: 0, pending: 0, verdicts: {} });
    }
    return respond([]);
  });

  const open = async (fixture) => {
    plan = {
      ready: 0,
      holders: 0,
      no_email: 0,
      holder_names: [],
      no_email_names: [],
      no_credential_names: [],
      ...fixture,
    };
    const target = base + "/org/contests/a#participants";
    if (page.url() === target) await page.reload();
    else await page.goto(target);
    await page.getByRole("button", { name: "Credentials by email" }).click();
    await page.getByText("1. Issue", { exact: true }).waitFor();
  };

  const issue = page.getByRole("button", { name: /^Issue \d+$/ });
  const revoked = page.getByText(/Use Undo revoke on a roster row only if/i);

  await open({ no_credential: 0, revoked: 2 });
  assert.match(
    await revoked.innerText(),
    /2 logins are revoked\..*restore that login across all contests/s,
  );
  assert.equal(await issue.count(), 0);
  assert(await page.getByRole("button", { name: "Send to 0" }).isDisabled());
  assert.deepEqual(writes, []);

  await open({ no_credential: 1, revoked: 1, ready: 1 });
  assert.match(await revoked.innerText(), /1 login is revoked/);
  assert(
    await page.getByText("1 on the roster has no credential yet.").isVisible(),
  );
  assert(await page.getByRole("button", { name: "Send to 1" }).isEnabled());
  assert.equal(await issue.innerText(), "Issue 1");
  await issue.click();
  await page.getByText("No new credentials to issue.").waitFor();
  assert(await revoked.isVisible());
  assert(await page.getByRole("button", { name: "Send to 2" }).isEnabled());
  assert.deepEqual(writes, ["/api/org/contests/a/credentials?action=issue"]);

  await open({ no_credential: 2, ready: 1 });
  assert(await page.getByText(/The server needs an update/).isVisible());
  assert.equal(await revoked.count(), 0);
  assert.equal(await issue.count(), 0);
  assert(await page.getByRole("button", { name: "Send to 1" }).isEnabled());
  assert.deepEqual(errors, []);
  console.log("PASS: revoked-only, mixed, and legacy credential mail plans");
} finally {
  await browser.close();
}
