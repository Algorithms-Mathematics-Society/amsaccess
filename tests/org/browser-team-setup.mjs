// Production bundle, mocked API only. Never use real participant data or credentials.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://127.0.0.1:3124";
const uid = "3fbf9cee-8b6e-4872-947f-c52b46bb572e";
const existingProjectUid = "ce789597-e678-4a45-8c38-5a456418d87a";
const members = [1, 2, 3, 4].map((n) => ({
  user_uid: uid + n,
  username: `tester${n}`,
  display_name: `Tester ${n}`,
  seed_rank: n,
}));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "ams_session",
      value: `synthetic.${Math.floor(Date.now() / 1000) + 3600}.synthetic`,
      url: base,
    },
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let accept = true;
  page.on("dialog", (d) => (accept ? d.accept() : d.dismiss()));
  let round = null;
  let roster = [];
  let reads = 0;
  const writes = [];
  const previews = [];
  let savedDraw;
  let catalogAvailable = false;
  let unpublishConflict = true;
  await page.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== base) return route.abort();
    if (!u.pathname.startsWith("/api/")) return route.continue();
    const method = route.request().method();
    const ok = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (u.pathname === "/api/auth/me") return ok({ role: "admin" });
    if (u.pathname === `/api/org/contests/${uid}`)
      return ok({
        uid,
        title: "Team test",
        slug: "team-test",
        status: "draft",
        starts_at: "2026-11-11T12:00:00Z",
        ends_at: "2026-11-12T12:00:00Z",
        invite_code: "TEST",
        is_practice: true,
        problems: [],
        joined: false,
        frozen: false,
      });
    if (u.pathname.endsWith("/submissions/summary"))
      return ok({ total: 0, pending: 0, verdicts: {} });
    if (u.pathname === "/api/org/projects/inspect")
      return ok({
        name: "Sample",
        parts: [1, 2, 3, 4].map((n) => ({
          label: String(n),
          title: `Part ${n}`,
          warnings: [],
        })),
      });
    if (u.pathname === "/api/org/projects" && method === "GET") {
      if (!catalogAvailable) return ok({ error: "Method not allowed" }, 405);
      return ok([
        { uid: existingProjectUid, name: "Existing project", part_count: 2 },
      ]);
    }
    if (u.pathname === "/api/org/projects") {
      writes.push("import");
      return ok({ uid, name: "Sample" });
    }
    if (u.pathname.endsWith("/team-round") && method === "GET") {
      reads++;
      return round ? ok(round) : ok({ error: "not configured" }, 404);
    }
    if (u.pathname.endsWith("/team-round") && method === "PUT") {
      writes.push("save");
      round = {
        ...route.request().postDataJSON(),
        project: { uid, name: "Sample" },
        seeded_at: null,
        published_at: null,
        parts: [1, 2, 3, 4].map((n) => ({ label: String(n) })),
        rank_sum_spread: 0,
      };
      return ok(round);
    }
    if (u.pathname.endsWith("/team-round/teams")) return ok(roster);
    if (u.pathname.endsWith("/team-round/seed/preview")) {
      previews.push(route.request().postDataJSON());
      return ok({
        teams: 1,
        members: 4,
        rank_sums: [10],
        rank_sum_spread: 0,
        team_list: [{ number: 1, name: "Team 1", members }],
      });
    }
    if (u.pathname.endsWith("/team-round/seed")) {
      writes.push("seed");
      savedDraw = route.request().postDataJSON();
      round.seeded_at = "2026-11-11T12:00:00Z";
      roster = [
        {
          uid,
          number: 1,
          name: "Team 1",
          revision: 0,
          votes: 0,
          submitted_revision: null,
          submitted_by: null,
          members: members.map((member, index) => ({
            ...member,
            part_label: null,
            assigned_by: null,
            ready: [true, false][index],
          })),
          last_result: null,
        },
      ];
      return ok({ teams: 1 });
    }
    if (u.pathname.endsWith("/team-round/publish")) {
      writes.push("publish");
      round.published_at = "2026-11-11T12:00:00Z";
      return ok(round);
    }
    if (u.pathname.endsWith("/team-round/unpublish")) {
      writes.push("unpublish");
      if (unpublishConflict)
        return ok(
          {
            error:
              "A member already claimed a part; teams cannot be unpublished.",
          },
          409,
        );
      round.published_at = null;
      return ok(round);
    }
    if (method !== "GET") throw Error("Unexpected mutation " + u.pathname);
    return ok([]);
  });
  await page.goto(base + `/org/contests/${uid}#team-round`);
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .waitFor();
  await page.getByRole("textbox", { name: "Project UID" }).waitFor();
  catalogAvailable = true;
  const refresh = page.getByRole("button", { name: "Refresh state" });
  await refresh.click();
  const picker = page.getByRole("combobox", { name: "Imported project" });
  await picker.selectOption({ label: "Existing project (2 parts)" });
  assert.equal(await page.getByLabel("Team size").inputValue(), "2");
  await page.getByLabel("Package", { exact: true }).setInputFiles({
    name: "sample.cxxpkg",
    mimeType: "application/zip",
    buffer: Buffer.from("fixture"),
  });
  await page
    .getByRole("button", { name: "Inspect package", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import project", exact: true })
    .click();
  await page.getByRole("button", { name: "Imported", exact: true }).waitFor();
  assert.equal(await picker.inputValue(), uid);
  assert.equal(await page.getByLabel("Team size").inputValue(), "4");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  const previewDraw = page.getByRole("button", {
    name: "Preview draw",
    exact: true,
  });
  const preview = page.getByRole("region", { name: "Draw preview" });
  const saveDraw = preview.getByRole("button", {
    name: "Save draw",
    exact: true,
  });
  await previewDraw.click();
  await preview.getByText("Tester 4 · Rank 4", { exact: true }).waitFor();
  await preview.getByText("Team 1 · Rank sum 10", { exact: true }).waitFor();
  await preview.getByText(/saved teams can differ/).waitFor();
  assert.deepEqual(writes, ["import", "save"]);
  await page.getByLabel("Top-ranked count").fill("5");
  await preview.waitFor({ state: "hidden" });
  await previewDraw.click();
  await preview.waitFor();
  accept = false;
  await saveDraw.click();
  assert.deepEqual(writes, ["import", "save"]);
  accept = true;
  await saveDraw.click();
  await preview.waitFor({ state: "hidden" });
  await page
    .getByText("Tester 4 · Rank 4 · Part not chosen", { exact: true })
    .waitFor();
  assert.deepEqual(savedDraw, previews[1]);
  assert.equal(savedDraw.take, 5);
  await page
    .getByRole("button", { name: "Publish teams", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.body.textContent.includes("Teams published"),
  );
  assert.deepEqual(writes, ["import", "save", "seed", "publish"]);
  const redraw = page.getByRole("button", {
    name: "Preview redraw",
    exact: true,
  });
  assert(await redraw.isDisabled());
  const monitor = page.getByRole("region", { name: "Live team monitor" });
  await monitor.getByText(/^Tester 1: not chosen · ready(?: ·|$)/).waitFor();
  await monitor
    .getByText(/^Tester 2: not chosen · not ready(?: ·|$)/)
    .waitFor();
  await monitor
    .getByText(/^Tester 3: not chosen · readiness unknown(?: ·|$)/)
    .waitFor();
  const unpublish = page.getByRole("button", {
    name: "Unpublish teams",
    exact: true,
  });
  roster[0].members[0].part_label = "1";
  await refresh.click();
  await page.getByText(/Teams can only be unpublished before/).waitFor();
  assert(await unpublish.isDisabled());
  roster[0].members[0].part_label = null;
  await refresh.click();
  accept = false;
  await unpublish.click();
  assert.deepEqual(writes, ["import", "save", "seed", "publish"]);
  accept = true;
  await unpublish.click();
  await page.getByText(/already claimed a part/).waitFor();
  assert(await redraw.isDisabled());
  unpublishConflict = false;
  await unpublish.click();
  await page.getByText(/Teams unpublished/).waitFor();
  await monitor.waitFor({ state: "hidden" });
  await redraw.click();
  await preview
    .getByRole("button", { name: "Save redraw", exact: true })
    .waitFor();
  assert.equal(previews[2].reset, true);
  assert.deepEqual(writes, [
    "import",
    "save",
    "seed",
    "publish",
    "unpublish",
    "unpublish",
  ]);
  const count = reads;
  await page.waitForTimeout(1000);
  assert.equal(reads, count, "no recurring team poll");
  assert.deepEqual(errors, []);
  console.log(
    "PASS catalog, import, read-only preview, save, publish, readiness, and guarded unpublish",
  );
  await page.screenshot({
    path: "/tmp/amsaccess-team-setup.png",
    fullPage: true,
  });
} finally {
  await browser.close();
}
