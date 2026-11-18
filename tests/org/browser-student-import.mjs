import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://localhost:3124";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
const file = {
  name: "students.csv",
  mimeType: "text/csv",
  buffer: Buffer.from(
    '"Name","Mail","Year"\n"Alice, A",alice@example.test,2028\nBob,bob@example.test,bad\n,,\n',
  ),
};
const result = (token) => ({
  created: 1,
  updated: 1,
  skipped: 1,
  total_rows: 3,
  error_count: 2,
  errors: ["bad year", "no display_name"],
  row_errors: [
    { line: 3, field: "graduation_year", message: "not a number" },
    { line: 4, field: "display_name", message: "no display_name" },
  ],
  sample_rows: [
    {
      line: 2,
      action: "create",
      values: {
        display_name: "Alice, A",
        email: "alice@example.test",
        graduation_year: "2028",
      },
    },
    {
      line: 3,
      action: "update",
      values: {
        display_name: "Bob",
        email: "bob@example.test",
        graduation_year: "bad",
      },
    },
    { line: 4, action: "skip", values: { display_name: "" } },
  ],
  preview_token: token,
  dry_run: token !== null,
});
async function scenario(run) {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 900 },
    acceptDownloads: true,
  });
  await context.addCookies([
    {
      name: "ams_session",
      value: `test.${Math.floor(Date.now() / 1000) + 3600}.test`,
      url: base,
    },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [],
    calls = [];
  const state = {
    previewStatus: 200,
    commitStatus: 200,
    malformed: false,
    directoryReads: 0,
    commitGate: null,
  };
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    if (url.origin !== base) return route.abort();
    if (!path.startsWith("/api/")) return route.continue();
    const reply = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (request.method() === "GET") {
      if (path === "/api/auth/me") return reply({ role: "admin" });
      if (path === "/api/org/students") {
        state.directoryReads++;
        return reply([]);
      }
      if (path === "/api/org/students/facets")
        return reply({
          total: 0,
          colleges: [],
          branches: [],
          graduation_years: [],
        });
      throw Error(`Unexpected read ${path}`);
    }
    assert.equal(request.method(), "POST");
    const body = request.postDataBuffer().toString("utf8");
    calls.push({ path, body });
    assert.notEqual(
      path,
      "/api/org/students/import",
      "Never fall back to the immediate-import endpoint",
    );
    if (path.endsWith("/preview")) {
      if (state.previewStatus !== 200)
        return reply(
          { error: "Import preview unavailable" },
          state.previewStatus,
        );
      return reply(
        state.malformed ? { created: 1 } : result(`preview-${calls.length}`),
      );
    }
    assert.equal(path, "/api/org/students/import/commit");
    if (state.commitGate) await state.commitGate;
    if (state.commitStatus !== 200)
      return reply(
        {
          error:
            state.commitStatus === 409
              ? "Directory changed; preview again"
              : "Synthetic timeout",
        },
        state.commitStatus,
      );
    return reply(result(null));
  });
  await page.goto(`${base}/org/participants`);
  await page.getByText("No students yet", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  const panel = page.getByRole("region", { name: "Import students from CSV" });
  const choose = async () => {
    await panel.getByLabel("CSV file", { exact: true }).setInputFiles(file);
    await panel
      .getByLabel("Name (required)", { exact: true })
      .selectOption("Name");
    await panel.getByLabel("Email", { exact: true }).selectOption("Mail");
    await panel
      .getByLabel("Graduation year", { exact: true })
      .selectOption("Year");
  };
  try {
    await run({ page, panel, choose, state, calls });
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}
try {
  await scenario(async ({ page, panel, choose, state, calls }) => {
    await choose();
    assert.equal(
      calls.length,
      0,
      "File selection and mapping perform no requests or writes",
    );
    assert.equal(
      await panel.getByRole("button", { name: /^Confirm import/ }).count(),
      0,
    );
    await panel
      .getByRole("button", { name: "Preview import", exact: true })
      .click();
    await panel
      .getByText("Preview — nothing imported yet", { exact: true })
      .waitFor();
    assert.equal(calls.length, 1);
    assert(calls[0].body.includes('"display_name":"Name"'));
    assert(calls[0].body.includes('"email":"Mail"'));
    assert(calls[0].body.includes('"Alice, A"'));
    await panel
      .getByRole("table", { name: "Mapped import sample" })
      .getByText("Alice, A", { exact: true })
      .waitFor();
    const download = page.waitForEvent("download");
    await panel
      .getByRole("button", { name: "Download all 2 errors", exact: true })
      .click();
    assert.match(
      await readFile(await (await download).path(), "utf8"),
      /"4","display_name","no display_name"/,
    );
    await panel.getByLabel("Email", { exact: true }).selectOption("");
    assert.equal(
      await panel.getByRole("button", { name: /^Confirm import/ }).count(),
      0,
      "Mapping changes invalidate preview",
    );
    await panel.getByLabel("Email", { exact: true }).selectOption("Mail");
    await panel
      .getByRole("button", { name: "Preview import", exact: true })
      .click();
    state.commitStatus = 409;
    await panel
      .getByRole("button", { name: "Confirm import 2 rows", exact: true })
      .click();
    await panel
      .getByRole("alert")
      .getByText("Directory changed; preview again")
      .waitFor();
    assert.equal(
      await panel.getByRole("button", { name: /^Confirm import/ }).count(),
      0,
      "Stale commit requires new preview",
    );
    assert(calls[2].body.includes("preview-2"));
    state.commitStatus = 200;
    await panel
      .getByRole("button", { name: "Preview import", exact: true })
      .click();
    const readsBefore = state.directoryReads;
    const directoryRefresh = page.waitForResponse((response) =>
      response.url().includes("/api/org/students?"),
    );
    await panel
      .getByRole("button", { name: "Confirm import 2 rows", exact: true })
      .click();
    await panel.getByText("Import complete", { exact: true }).waitFor();
    await directoryRefresh;
    assert(
      state.directoryReads > readsBefore,
      "Successful import refreshes the directory immediately",
    );
    assert.equal(
      calls.filter((call) => call.path.endsWith("/commit")).length,
      2,
    );
    await choose();
    assert.equal(
      calls.length,
      5,
      "Re-picking the same file resets preview without importing",
    );
    await panel.getByRole("button", { name: "Cancel", exact: true }).click();
    await panel.waitFor({ state: "detached" });
    console.log(
      "PASS import: mapping before preview, quoted rows, diagnostics download, invalidation, drift retry, explicit commit and same-file selection",
    );
  });
  await scenario(async ({ page, panel, choose, state, calls }) => {
    await choose();
    await panel
      .getByRole("button", { name: "Preview import", exact: true })
      .click();
    await panel
      .getByText("Preview — nothing imported yet", { exact: true })
      .waitFor();
    let releaseCommit;
    state.commitGate = new Promise((resolve) => {
      releaseCommit = resolve;
    });
    state.commitStatus = 504;
    try {
      const commitStarted = page.waitForRequest((request) =>
        request.url().endsWith("/api/org/students/import/commit"),
      );
      await panel
        .getByRole("button", { name: "Confirm import 2 rows", exact: true })
        .click();
      await commitStarted;
      await panel
        .getByText("Importing… Keep this page open.", { exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Import CSV", exact: true })
        .click();
      assert(
        await panel.isVisible(),
        "Toolbar must preserve the pending import panel",
      );
      assert(await panel.getByLabel("CSV file", { exact: true }).isDisabled());
      assert(
        await panel
          .getByRole("button", { name: "Confirm import 2 rows", exact: true })
          .isDisabled(),
      );
      releaseCommit();
      await panel
        .getByRole("button", { name: "Review directory", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Import CSV", exact: true })
        .click();
      assert(
        await panel.isVisible(),
        "Toolbar must preserve the uncertain import warning",
      );
      assert(
        await panel
          .getByRole("button", { name: "Review directory", exact: true })
          .isVisible(),
      );
      assert(await panel.getByLabel("CSV file", { exact: true }).isDisabled());
      assert.equal(
        await panel
          .getByRole("button", { name: "Preview import", exact: true })
          .count(),
        0,
      );
      assert.equal(
        calls.filter((call) => call.path.endsWith("/commit")).length,
        1,
        "Toolbar cannot reset the import and allow a duplicate commit",
      );
      const directoryRefresh = page.waitForResponse((response) =>
        response.url().includes("/api/org/students?"),
      );
      await panel
        .getByRole("button", { name: "Review directory", exact: true })
        .click();
      await directoryRefresh;
      await panel.waitFor({ state: "detached" });
      console.log(
        "PASS import: toolbar preserves pending commit and uncertain outcome until directory review",
      );
    } finally {
      releaseCommit();
    }
  });
  for (const failure of ["old-api", "malformed", "unknown-commit"])
    await scenario(async ({ panel, choose, state, calls }) => {
      await choose();
      if (failure === "old-api") state.previewStatus = 404;
      if (failure === "malformed") state.malformed = true;
      await panel
        .getByRole("button", { name: "Preview import", exact: true })
        .click();
      if (failure === "unknown-commit") {
        state.commitStatus = 504;
        await panel
          .getByRole("button", { name: "Confirm import 2 rows", exact: true })
          .click();
        await panel
          .getByRole("button", { name: "Review directory", exact: true })
          .waitFor();
        assert.equal(
          await panel
            .getByRole("button", { name: "Preview import", exact: true })
            .count(),
          0,
        );
      } else await panel.getByRole("alert").waitFor();
      assert.equal(
        await panel.getByRole("button", { name: /^Confirm import/ }).count(),
        0,
      );
      assert.equal(
        calls.filter((call) => call.path.endsWith("/commit")).length,
        failure === "unknown-commit" ? 1 : 0,
      );
    });
  console.log(
    "PASS import: old API and malformed preview fail closed; uncertain commits require directory review",
  );
} finally {
  await browser.close();
}
