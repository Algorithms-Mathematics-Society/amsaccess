// Malformed successful responses stay inside the profile, not the contest boundary.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://localhost:3124";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const message = "The profile response was incomplete. Try again.";
const uid = "5b0c8f0e-6a0e-4c7e-9d7e-2f4a3c1b9e11";
try {
  for (const body of [
    "{}",
    "null",
    "not JSON",
    JSON.stringify({ contests: [], submissions: [], tags: [], verdicts: [] }),
  ]) {
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
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.error("PROFILE_PAGE_ERROR", error.message);
    });
    await page.route("**/*", (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin !== new URL(base).origin) return route.abort();
      if (!url.pathname.startsWith("/api/")) return route.continue();
      assert.equal(request.method(), "GET");
      const ok = (data) =>
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      if (url.pathname === "/api/auth/me")
        return ok({ role: "admin", uid: "staff" });
      if (url.pathname.endsWith("/profile"))
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body,
        });
      if (url.pathname === `/api/org/contests/${uid}`)
        return ok({
          uid,
          title: "Profile response fixture",
          status: "running",
          starts_at: "2026-01-01",
          ends_at: "2027-01-01",
          is_practice: false,
          problems: [],
          joined: false,
          frozen: false,
        });
      if (url.pathname.endsWith("/participants"))
        return ok([
          {
            user_uid: "u1",
            login_id: "p1",
            display_name: "Person 1",
            revoked: false,
            last_login_at: null,
            has_passphrase: true,
            email: "p1@example.test",
            mail_status: "sent",
            college: "",
            device_os: "",
          },
        ]);
      if (url.pathname.endsWith("/submissions/summary"))
        return ok({ total: 0, pending: 0, verdicts: {} });
      return ok([]);
    });
    await page.goto(`${base}/org/contests/${uid}#participants`);
    await page
      .getByRole("table")
      .getByRole("button", { name: /^Person 1/ })
      .click();
    const panel = page.getByRole("dialog", {
      name: "Participant",
      exact: true,
    });
    await panel.getByText(message, { exact: true }).waitFor({ timeout: 5000 });
    assert.equal(
      await page.getByText("This page hit an error", { exact: true }).count(),
      0,
    );
    await panel.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("heading", { name: "Profile response fixture" })
      .waitFor();
    await page.getByRole("tab", { name: "problems", exact: true }).click();
    await page.getByText("No problems yet.", { exact: false }).waitFor();
    assert.deepEqual(
      errors,
      [],
      "malformed profile must not crash the console",
    );

    await page.goto(`${base}/org/participants/u1`);
    await page.getByText(message, { exact: true }).waitFor();
    assert.equal(
      await page.getByText("This page hit an error", { exact: true }).count(),
      0,
    );
    assert.deepEqual(
      errors,
      [],
      "standalone profile keeps the same local error handling",
    );
    await context.close();
  }
  console.log(
    "PASS incomplete, null and non-JSON profiles stay inside the modal/full-page error box; contest navigation remains usable",
  );
} finally {
  await browser.close();
}
