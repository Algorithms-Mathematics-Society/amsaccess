// Synthetic API fixtures exercise the production directory UI without external writes.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://localhost:3133";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
const context = await browser.newContext({ acceptDownloads: true });
await context.addCookies([
  {
    name: "ams_session",
    value: `test.${Math.floor(Date.now() / 1000) + 3600}.test`,
    url: base,
  },
]);
const page = await context.newPage();
const rows = Array.from({ length: 405 }, (_, index) => ({
  uid: `u${index}`,
  username: `student${index}`,
  display_name: `Student ${String(index).padStart(4, "0")}`,
  email: `s${index}@example.test`,
  mailable: index !== 1,
  contests_entered: index === 2 ? 0 : 1,
  problems_solved: 0,
  college: index % 2 ? "B" : "A",
  branch: "CSE",
  contests: [],
}));
const writes = [],
  reads = [],
  errors = [];
let fail = true;
let resetOnMail = false;
let contestLoads = 0;
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/api/**", async (route) => {
  const request = route.request(),
    url = new URL(request.url()),
    path = url.pathname;
  const reply = (data, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  if (request.method() !== "GET") {
    writes.push({ path, method: request.method() });
    if (resetOnMail && path.endsWith("/credential/mail")) {
      await page.evaluate(() =>
        window.dispatchEvent(new Event("ams:org-session-reset")),
      );
      return reply({ queued: true }).catch(() => {});
    }
    if (path === "/api/org/students/u200/credential/mail" && fail)
      return reply({ error: "Synthetic mail refusal" }, 503);
    if (request.method() === "DELETE") return route.fulfill({ status: 204 });
    return reply({ password: "SECRET-MUST-NOT-APPEAR" });
  }
  reads.push(url.pathname + url.search);
  if (path === "/api/auth/me") return reply({ role: "admin" });
  if (path === "/api/org/contests") {
    contestLoads++;
    if (contestLoads === 1)
      return reply({ error: "Synthetic contest permission refusal" }, 403);
    if (contestLoads === 2) return reply([{ uid: "missing-title" }]);
    return reply([{ uid: "c", title: "Destination" }]);
  }
  if (path === "/api/org/students" || path.endsWith("/facets")) {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const filtered = rows.filter(
      (row) =>
        (!q || row.display_name.toLowerCase().includes(q)) &&
        (!url.searchParams.get("college") ||
          url.searchParams.get("college") === row.college),
    );
    if (q === "Student 0000".toLowerCase())
      await new Promise((resolve) => setTimeout(resolve, 350));
    if (path.endsWith("/facets"))
      return reply({
        total: filtered.length,
        colleges: ["A", "B"].map((value) => ({
          value,
          count: filtered.filter((row) => row.college === value).length,
        })),
        branches: [],
        graduation_years: [],
      });
    const offset = Number(url.searchParams.get("offset") || 0);
    return reply(
      filtered.slice(
        offset,
        offset + Number(url.searchParams.get("limit") || 200),
      ),
    );
  }
  return reply([]);
});
try {
  await page.goto(`${base}/org/participants`);
  await page.getByLabel("Select Student 0000", { exact: true }).waitFor();
  assert(
    !reads.includes("/api/org/contests"),
    "Browsing students does not load destination contests",
  );
  await page.getByLabel("Select Student 0000", { exact: true }).check();
  await page
    .getByRole("alert")
    .getByText("Synthetic contest permission refusal")
    .waitFor();
  assert.equal(writes.length, 0);
  await page
    .getByRole("button", { name: "Retry loading contests", exact: true })
    .click();
  await page
    .getByRole("alert")
    .getByText("The contest list could not be read. Retry loading contests.", {
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("button", { name: "Retry loading contests", exact: true })
    .click();
  await page
    .getByLabel("Destination contest")
    .getByRole("option", { name: "Destination", exact: true })
    .waitFor({ state: "attached" });
  assert(
    reads.includes("/api/org/contests"),
    "Selection loads destination contests for enrollment",
  );
  await page.getByLabel("Select Student 0001", { exact: true }).check();
  await page.getByLabel("Select Student 0002", { exact: true }).check();
  // Without 0000, neither selected student can be emailed (no login email;
  // no contest): refuse without a dialog.
  await page.getByLabel("Select Student 0000", { exact: true }).uncheck();
  await page.getByLabel("Selected student action").selectOption("mail");
  await page.getByRole("button", { name: "Review selected action" }).click();
  await page
    .getByText(/None of the selected students can be emailed/)
    .waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(writes.length, 0);
  await page.getByLabel("Select Student 0000", { exact: true }).check();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.getByLabel("Select Student 0200", { exact: true }).check();
  assert(reads.some((read) => read.includes("offset=200")));
  await page
    .getByText("4 selected · 3 on other pages or filters", { exact: true })
    .waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export selected CSV" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString();
  assert.equal(csv.split("\r\n").length, 5);
  assert(csv.includes("Student 0200") && !csv.includes("Student 0201"));
  await page.getByLabel("Selected student action").selectOption("mail");
  await page.getByRole("button", { name: "Review selected action" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  assert.equal(writes.length, 0);
  await page.getByRole("button", { name: "Review selected action" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm queue login emails" })
    .click();
  await page.getByRole("button", { name: "Retry 1 failed students" }).waitFor();
  assert.equal(writes.length, 2);
  assert(!writes.some((write) => /u[12]\//.test(write.path)));
  fail = false;
  await page.getByRole("button", { name: "Retry 1 failed students" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm queue login emails" })
    .click();
  await page
    .getByText("1 of 1 processed · 1 succeeded · 0 failed · 0 skipped")
    .waitFor();
  assert.equal(writes.length, 3);
  assert(writes[2].path.includes("u200"));
  await page.getByLabel("Selected student action").selectOption("add");
  await page.getByLabel("Destination contest").selectOption("c");
  await page.getByRole("button", { name: "Review selected action" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm add students" })
    .click();
  await page
    .getByText("4 of 4 processed · 4 succeeded · 0 failed · 0 skipped")
    .waitFor();
  assert.equal(writes.length, 7);
  assert(
    !(await page.locator("body").innerText()).includes(
      "SECRET-MUST-NOT-APPEAR",
    ),
  );
  await page.getByLabel("College", { exact: true }).selectOption("B");
  await page.getByText("Page 1", { exact: true }).waitFor();
  await page.getByLabel("Select Student 0001", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await page.getByLabel("Select current page").check();
  await page
    .getByText("200 selected · 0 on other pages or filters", { exact: true })
    .waitFor();
  await page.getByLabel("Select current page").uncheck();
  await page.getByLabel("College", { exact: true }).selectOption("");
  const search = page.getByPlaceholder(
    "Search by name, email, college, or reference…",
  );
  await search.fill("Student 0000");
  await page.waitForTimeout(320);
  await search.fill("Student 0404");
  await page.getByLabel("Select Student 0404", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Select Student 0000", { exact: true }).count(),
    0,
  );
  await page.getByLabel("Select Student 0404", { exact: true }).check();
  await page.getByLabel("Selected student action").selectOption("delete");
  await page.getByRole("button", { name: "Review selected action" }).click();
  await page
    .getByRole("dialog")
    .getByText(/history is preserved/)
    .waitFor();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  assert.equal(writes.length, 7);
  await page.getByRole("button", { name: "Review selected action" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm remove students" })
    .click();
  await page
    .getByText("Removed, or disabled with history preserved.", { exact: false })
    .waitFor();
  assert.equal(writes.at(-1).method, "DELETE");
  await search.fill("");
  await page.getByLabel("Select Student 0000", { exact: true }).check();
  await page.getByLabel("Select Student 0003", { exact: true }).check();
  await page.getByLabel("Selected student action").selectOption("mail");
  await page.getByRole("button", { name: "Review selected action" }).click();
  const beforeReset = writes.length;
  resetOnMail = true;
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm queue login emails" })
    .click();
  await page
    .getByText("Session changed. Reload the directory after signing in.")
    .waitFor();
  await page.waitForTimeout(200);
  assert.equal(
    writes.length,
    beforeReset + 1,
    "Session reset cancels remaining queued writes",
  );
  assert.equal(
    await page.getByLabel("Select Student 0000", { exact: true }).count(),
    0,
  );
  await page
    .getByText("0 selected · 0 on other pages or filters", { exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS Students directory: pagination >200, cross-page selection, selected CSV, mail eligibility, confirmation cancel, failed-only retry, add, safe delete, filters and stale search races",
  );
} finally {
  await browser.close();
}
