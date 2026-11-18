// Real production UI, synthetic directory and roster data; no external writes.
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
const directory = Array.from({ length: 2205 }, (_, n) => ({
  uid: `u${n}`,
  display_name: `Student ${String(n).padStart(4, "0")}`,
  username: `student-${n}`,
  email: `student${n}@example.test`,
  mailable: n % 3 !== 0,
  college: n % 2 ? "College B" : "College A",
  branch: n % 3 ? "CSE" : "ECE",
  graduation_year: n % 2 ? 2027 : 2028,
  external_ref: `R${n}`,
  contests: [],
}));
const participant = (n) => ({
  user_uid: `u${n}`,
  login_id: `p${n}`,
  display_name: directory[n].display_name,
  revoked: false,
  last_login_at: null,
  has_passphrase: true,
  email: directory[n].email,
  mail_status: "sent",
  college: directory[n].college,
  device_os: "Linux",
});
async function scenario(run) {
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
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [],
    writes = [],
    reads = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = {
    target: [participant(0)],
    source: [participant(0), participant(1), participant(1)],
    sourceCount: 2,
    holdDirectory: null,
    failDirectoryBatch: 0,
  };
  await page.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    if (url.origin !== base) return route.abort();
    if (!path.startsWith("/api/")) return route.continue();
    const reply = (data, status = 200) =>
      route
        .fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        })
        .catch(() => {});
    if (request.method() !== "GET") {
      const payload = request.postDataJSON();
      writes.push({ path, payload });
      if (path.endsWith("/from-directory")) {
        if (writes.length === state.failDirectoryBatch)
          return reply({ error: "Synthetic batch failure" }, 503);
        state.target = [
          ...state.target,
          ...payload.student_uids.map((uid) =>
            participant(Number(uid.slice(1))),
          ),
        ];
        return reply({
          added: payload.student_uids.length,
          already_on_roster: 0,
          credentials: [],
        });
      }
      if (path.endsWith("/from-contest")) {
        assert.equal(payload.source_contest_uid, "source");
        const existing = new Set(state.target.map((row) => row.user_uid));
        const unique = [
          ...new Map(state.source.map((row) => [row.user_uid, row])).values(),
        ];
        const added = unique.filter((row) => !existing.has(row.user_uid));
        state.target.push(...added);
        return reply({
          added: added.length,
          already_on_roster: unique.length - added.length,
          credentials: [],
        });
      }
      throw Error(`Unexpected write ${path}`);
    }
    reads.push(url.pathname + url.search);
    if (path === "/api/auth/me") return reply({ role: "admin" });
    if (path === "/api/org/contests/a")
      return reply({
        uid: "a",
        title: "Selection fixture",
        status: "scheduled",
        is_practice: false,
        starts_at: "2027-01-01T00:00:00Z",
        ends_at: "2027-01-02T00:00:00Z",
        problems: [],
        frozen: false,
      });
    if (path === "/api/org/contests/a/participants") return reply(state.target);
    if (path === "/api/org/contests/source/participants")
      return reply(state.source);
    if (path.endsWith("/participants/sources"))
      return reply([
        {
          uid: "source",
          title: "Source roster",
          participants: state.sourceCount,
          is_practice: true,
        },
      ]);
    if (path === "/api/org/students" || path === "/api/org/students/facets") {
      assert.notEqual(
        url.searchParams.get("graduation_year"),
        "",
        "Empty year is omitted; the real API rejects it",
      );
      const filtered = directory.filter((student) => {
        const q = url.searchParams.get("q")?.toLowerCase();
        return (
          (!q || student.display_name.toLowerCase().includes(q)) &&
          ["college", "branch", "graduation_year"].every(
            (key) =>
              !url.searchParams.get(key) ||
              String(student[key]) === url.searchParams.get(key),
          )
        );
      });
      if (path.endsWith("/facets")) {
        const facets = (key) =>
          [...new Set(filtered.map((student) => student[key]))].map(
            (value) => ({
              value: String(value),
              count: filtered.filter((student) => student[key] === value)
                .length,
            }),
          );
        return reply({
          total: filtered.length,
          colleges: facets("college"),
          branches: facets("branch"),
          graduation_years: facets("graduation_year"),
        });
      }
      if (state.holdDirectory) await state.holdDirectory(url);
      const offset = Number(url.searchParams.get("offset") || 0),
        limit = Number(url.searchParams.get("limit") || 200);
      return reply(filtered.slice(offset, offset + Math.min(limit, 1000)));
    }
    if (path.endsWith("/submissions/summary"))
      return reply({ total: 0, pending: 0, verdicts: {} });
    if (path.endsWith("/credentials"))
      return reply({
        no_credential: 0,
        ready: state.target.length,
        holders: 0,
        holder_names: [],
        no_email: 0,
        no_email_names: [],
      });
    if (path.endsWith("/invigilation") || path === "/api/org/support")
      return reply([]);
    errors.push(`Unexpected GET ${path}`);
    return reply([]);
  });
  await page.goto(`${base}/org/contests/a#participants`);
  await page
    .getByRole("button", { name: "Add from Access", exact: true })
    .waitFor();
  const open = async () => {
    await page
      .getByRole("button", { name: "Add from Access", exact: true })
      .click();
    const modal = page.getByRole("dialog", {
      name: "Add participants from Access",
    });
    await modal.getByRole("button", { name: /^Student 0000/ }).waitFor();
    return modal;
  };
  try {
    await run({ page, state, writes, reads, open });
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}
try {
  await scenario(async ({ page, open, writes, reads }) => {
    const modal = await open();
    assert(
      await modal.getByRole("button", { name: /^Student 0000/ }).isDisabled(),
      "Existing roster members stay visible and disabled",
    );
    await modal.getByRole("button", { name: "Next page", exact: true }).click();
    await modal.getByRole("button", { name: /^Student 0200/ }).waitFor();
    await modal
      .getByRole("button", { name: "Previous page", exact: true })
      .click();
    await modal.getByRole("button", { name: /^Student 0000/ }).waitFor();
    await modal
      .getByRole("button", { name: "Select all 2205 matching", exact: true })
      .click();
    await modal
      .getByRole("button", { name: "Add 2204", exact: true })
      .waitFor();
    assert(
      reads.some((path) => path.includes("offset=1000")),
      "Select all traverses past the API page cap",
    );
    await modal
      .getByRole("button", { name: "Clear selection", exact: true })
      .click();
    await modal
      .getByLabel("College", { exact: true })
      .selectOption("College A");
    await modal
      .getByRole("button", { name: "Select all 1103 matching", exact: true })
      .click();
    await modal
      .getByRole("button", { name: "Add 1102", exact: true })
      .waitFor();
    await modal.getByLabel("College", { exact: true }).selectOption("");
    await modal
      .getByRole("button", { name: "Select all 2205 matching", exact: true })
      .waitFor();
    await modal
      .getByLabel("College", { exact: true })
      .selectOption("College B");
    await modal
      .getByRole("button", { name: "Select all 1102 matching", exact: true })
      .click();
    await modal
      .getByRole("button", { name: "Add 2204", exact: true })
      .waitFor();
    await modal.getByLabel("Branch", { exact: true }).selectOption("ECE");
    await modal
      .getByLabel("Graduation year", { exact: true })
      .selectOption("2027");
    await modal.getByRole("button", { name: "Add 2204", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Add participants from Access" })
      .waitFor({ state: "detached" });
    assert.equal(writes.length, 2);
    assert(writes.every((write) => write.payload.student_uids.length <= 2000));
    const selected = writes.flatMap((write) => write.payload.student_uids);
    assert.equal(selected.length, 2204);
    assert.equal(new Set(selected).size, 2204);
    assert(!selected.includes("u0"));
    assert(selected.includes("u2204"));
    console.log(
      "PASS directory: pagination, all matching beyond 1000, facets, disabled members and cross-filter selection",
    );
  });
  await scenario(async ({ open, state, writes }) => {
    const modal = await open();
    state.failDirectoryBatch = 2;
    await modal
      .getByRole("button", { name: "Select all 2205 matching", exact: true })
      .click();
    await modal.getByRole("button", { name: "Add 2204", exact: true }).click();
    await modal.getByText(/Synthetic batch failure/).waitFor();
    await modal.getByRole("button", { name: "Add 204", exact: true }).waitFor();
    assert.equal(
      state.target.length,
      2001,
      "Successful first batch stays on the roster",
    );
    await modal.getByRole("button", { name: "Add 204", exact: true }).click();
    await modal.waitFor({ state: "detached" });
    assert.equal(writes.length, 3);
    assert.deepEqual(
      writes[1].payload.student_uids,
      writes[2].payload.student_uids,
      "Only unfinished batch is retried",
    );
    assert.equal(state.target.length, 2205);
    console.log(
      "PASS directory: partial batch failure retains only unfinished selection for retry",
    );
  });
  await scenario(async ({ open, state, writes }) => {
    const modal = await open();
    let release, reached;
    const blocked = new Promise((resolve) => {
      release = resolve;
    });
    const started = new Promise((resolve) => {
      reached = resolve;
    });
    state.holdDirectory = async (url) => {
      if (url.searchParams.get("offset") === "1000") {
        reached();
        await blocked;
      }
    };
    await modal
      .getByRole("button", { name: "Select all 2205 matching", exact: true })
      .click();
    await started;
    await modal
      .getByLabel("College", { exact: true })
      .selectOption("College B");
    release();
    await modal
      .getByRole("button", { name: "Select all 1102 matching", exact: true })
      .waitFor();
    assert(
      await modal
        .getByRole("button", { name: /^Add\s*$/, exact: false })
        .isDisabled(),
      "Aborted bulk selection cannot populate the new filter",
    );
    assert.equal(writes.length, 0);
    console.log(
      "PASS directory: changing filters aborts stale bulk selection without writes",
    );
  });
  await scenario(async ({ page, state, writes }) => {
    await page
      .getByRole("button", { name: "Add from roster", exact: true })
      .click();
    await page.getByLabel("Copy the roster from").selectOption("source");
    assert.equal(writes.length, 0, "Choosing a source never mutates");
    await page
      .getByRole("button", { name: "Preview roster", exact: true })
      .click();
    let confirmation = page.getByRole("dialog", {
      name: "Copy roster from Source roster?",
    });
    await confirmation
      .getByText("2 source members · 1 already on this roster · 1 to add", {
        exact: false,
      })
      .waitFor();
    await confirmation
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    assert.equal(writes.length, 0);
    await page
      .getByRole("button", { name: "Preview roster", exact: true })
      .click();
    confirmation = page.getByRole("dialog", {
      name: "Copy roster from Source roster?",
    });
    await confirmation.waitFor();
    state.source = [participant(0), participant(2), participant(2)];
    await confirmation
      .getByRole("button", { name: "Confirm add 1", exact: true })
      .click();
    await page.getByText(/changed.*preview|preview.*again/i).waitFor();
    assert.equal(
      writes.length,
      0,
      "Changed source membership invalidates confirmation even at the same count",
    );
    await page
      .getByRole("button", { name: "Preview roster", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Copy roster from Source roster?" })
      .getByRole("button", { name: "Confirm add 1", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add from roster", exact: true })
      .waitFor();
    assert.equal(writes.length, 1);
    assert.equal(
      writes[0].path,
      "/api/org/contests/a/participants/from-contest",
    );
    console.log(
      "PASS roster copy: deduped overlap preview, cancel, stale membership rejection and one confirmed write",
    );
  });
  await scenario(async ({ page, state, writes }) => {
    state.sourceCount = 3;
    await page
      .getByRole("button", { name: "Add from roster", exact: true })
      .click();
    await page.getByLabel("Copy the roster from").selectOption("source");
    await page
      .getByRole("button", { name: "Preview roster", exact: true })
      .click();
    await page
      .getByText(
        "Source membership could not be verified against its advertised count. Refresh the roster and try again.",
        { exact: true },
      )
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: /^Confirm add/ }).count(),
      0,
    );
    assert.equal(writes.length, 0, "Inconsistent source counts fail closed");
    console.log(
      "PASS roster copy: mismatched membership count blocks confirmation",
    );
  });
  for (const malformed of ["source", "target", "count"]) {
    await scenario(async ({ page, state, writes }) => {
      if (malformed === "source")
        state.source = [
          participant(0),
          { ...participant(1), user_uid: undefined },
        ];
      else if (malformed === "target")
        state.target = [{ ...participant(0), user_uid: "" }];
      else state.sourceCount = "2";
      await page
        .getByRole("button", { name: "Add from roster", exact: true })
        .click();
      await page.getByLabel("Copy the roster from").selectOption("source");
      await page
        .getByRole("button", { name: "Preview roster", exact: true })
        .click();
      await page
        .getByText(
          malformed === "count"
            ? "Source membership could not be verified: invalid advertised count."
            : "Roster membership could not be verified: invalid member identifiers.",
          { exact: true },
        )
        .waitFor();
      assert.equal(
        await page.getByRole("button", { name: /^Confirm add/ }).count(),
        0,
      );
      assert.equal(writes.length, 0);
    });
  }
  console.log(
    "PASS roster copy: malformed member identities and counts fail closed",
  );
} finally {
  await browser.close();
}
