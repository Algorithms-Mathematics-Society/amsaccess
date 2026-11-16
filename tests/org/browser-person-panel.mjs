// Production bundle, mocked API only. Never use real participant data or credentials.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://127.0.0.1:3124";
const uid = "5b0c8f0e-6a0e-4c7e-9d7e-2f4a3c1b9e11";
const now = new Date().toISOString();
const roster = [
  {
    user_uid: "u1",
    login_id: "p1",
    display_name: "Person 1",
    revoked: false,
    last_login_at: now,
    has_passphrase: true,
    email: "p1@example.test",
    mail_status: "bounced",
    college: "",
    device_os: "",
  },
  {
    user_uid: "u2",
    login_id: "p2",
    display_name: "Person 2",
    revoked: false,
    last_login_at: null,
    has_passphrase: true,
    email: "p2@example.test",
    mail_status: "sent",
    college: "",
    device_os: "",
  },
];
const sessions = [
  {
    uid: "s1",
    user_uid: "u1",
    login_id: "p1",
    display_name: "Person 1",
    status: "active",
    started_at: now,
    last_seen_at: now,
    violation_count: 2,
    resume_count: 1,
    idle_seconds: 30,
    resume_pending: true,
    has_entry_photo: false,
    has_exit_photo: false,
    entry_photo_at: null,
    exit_photo_at: null,
  },
];
let resumes = [
  {
    uid: "r1",
    status: "pending",
    reason: "Laptop restarted",
    device_fingerprint: "",
    created_at: now,
    session_uid: "s1",
    display_name: "Person 1",
    login_id: "p1",
    resume_count: 1,
  },
  {
    uid: "r2",
    status: "pending",
    reason: "Other person",
    device_fingerprint: "",
    created_at: now,
    session_uid: "s2",
    display_name: "Person 2",
    login_id: "p2",
    resume_count: 0,
  },
];
let incidents = [
  {
    uid: "i1",
    category: "technical",
    message: "Camera frozen",
    contact: "",
    status: "open",
    created_at: now,
    display_name: "Person 1",
    login_id: "p1",
  },
];
let failSessions = false;
const profile = {
  uid: "u1",
  handle: "person1",
  display_name: "Person 1",
  email: "p1@example.test",
  mailable: true,
  status: "active",
  college: "",
  branch: "",
  graduation_year: null,
  linkedin_url: "",
  github_url: "",
  has_resume_file: false,
  phone: "",
  location: "",
  external_ref: "",
  notes: "",
  created_at: now,
  contests_entered: 1,
  problems_solved: 0,
  submissions_total: 0,
  accepted_total: 0,
  contests: [],
  submissions: [],
  tags: [],
  verdicts: [],
  activity: [],
};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
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
  const writes = [];
  await page.route("**/*", async (route) => {
    const req = route.request(),
      u = new URL(req.url());
    if (u.origin !== base) return route.abort();
    if (!u.pathname.startsWith("/api/")) return route.continue();
    const ok = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    const p = u.pathname;
    if (p === "/api/auth/me") return ok({ role: "admin" });
    if (p === `/api/org/contests/${uid}`)
      return ok({
        uid,
        title: "Person panel test",
        slug: "person-panel",
        status: "running",
        starts_at: "2026-01-01T10:00:00Z",
        ends_at: "2027-01-01T13:00:00Z",
        invite_code: "TEST",
        is_practice: false,
        problems: [],
        joined: false,
        frozen: false,
      });
    if (p.endsWith("/participants") && req.method() === "GET")
      return ok(roster);
    if (p === "/api/org/students/u1/profile") return ok(profile);
    if (p.endsWith("/invigilation") && req.method() === "POST") {
      const action = u.searchParams.get("action"),
        target = u.searchParams.get("uid");
      writes.push(`${action}:${target}`);
      if (action === "approve-resume" || action === "reject-resume")
        resumes = resumes.map((r) =>
          r.uid === target
            ? {
                ...r,
                status: action === "approve-resume" ? "approved" : "rejected",
              }
            : r,
        );
      if (action === "resolve-incident")
        incidents = incidents.map((i) =>
          i.uid === target ? { ...i, status: "resolved" } : i,
        );
      return ok({});
    }
    if (p.endsWith("/invigilation"))
      switch (u.searchParams.get("view")) {
        case "sessions":
          return failSessions
            ? ok({ error: "Unavailable" }, 503)
            : ok(sessions);
        case "resume-requests":
          return ok(resumes);
        case "incidents":
          return ok(incidents);
        default:
          return ok([]);
      }
    if (req.method() !== "GET") return ok({ error: "unexpected write" }, 405);
    return ok(
      p.endsWith("/summary") ? { total: 0, pending: 0, verdicts: {} } : [],
    );
  });
  const panel = page.getByRole("dialog", { name: "Participant", exact: true });
  const here = panel.getByRole("region", { name: "In this contest" });

  // From invigilation: the name in "Waiting to resume" opens the panel.
  await page.goto(base + `/org/contests/${uid}#invigilation`);
  const trigger = page
    .getByRole("button", { name: "Person 1", exact: true })
    .first();
  await trigger.click();
  await here.getByText("State:", { exact: false }).waitFor();
  await here.getByText("2 violations", { exact: true }).waitFor();
  await here.getByText("reopened 1×", { exact: true }).waitFor();
  await here.getByText("Last contact: 30s ago", { exact: true }).waitFor();
  await here.getByText("signed in", { exact: true }).waitFor();
  await here.getByText("email bounced", { exact: true }).waitFor();
  assert.equal(
    await here.getByText("Other person").count(),
    0,
    "another participant’s request is not shown",
  );
  assert.equal(
    await panel
      .getByRole("link", { name: "Full profile" })
      .getAttribute("href"),
    "/org/participants/u1",
  );
  await here.getByRole("button", { name: "Refuse", exact: true }).click();
  const confirm = page.getByRole("dialog", {
    name: "Refuse re-entry for Person 1?",
  });
  await confirm.getByRole("button", { name: "Cancel" }).click();
  assert.deepEqual(writes, [], "cancel sends nothing");
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  assert(
    await trigger.evaluate((el) => el === document.activeElement),
    "focus returns to the name that opened the panel",
  );
  console.log(
    "PASS person panel from invigilation: session, roster state, own requests only, cancel is a no-op, Escape restores focus",
  );

  // From the roster: decisions inline, each behind the shared confirm.
  await page.evaluate(() => {
    location.hash = "participants";
  });
  await page
    .getByRole("table")
    .getByRole("button", { name: /^Person 1/ })
    .click();
  await here.getByText("Laptop restarted").waitFor();
  await here.getByRole("button", { name: "Let them back in" }).click();
  await page
    .getByRole("dialog", { name: "Allow re-entry for Person 1?" })
    .getByRole("button", { name: "Allow re-entry" })
    .click();
  await here.getByText("Laptop restarted").waitFor({ state: "detached" });
  await here.getByRole("button", { name: "Mark resolved" }).click();
  await page
    .getByRole("dialog", { name: "Resolve Person 1’s help request?" })
    .getByRole("button", { name: "Mark resolved" })
    .click();
  await here.getByText("Camera frozen").waitFor({ state: "detached" });
  assert.deepEqual(writes, ["approve-resume:r1", "resolve-incident:i1"]);
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  console.log(
    "PASS person panel from roster: approve and resolve inline with confirm, Escape still closes after the item leaves",
  );

  // Touch: controls are at least 44px tall on a phone.
  await page.setViewportSize({ width: 390, height: 844 });
  resumes = [{ ...resumes[0], uid: "r3", status: "pending", reason: "Again" }];
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page
    .getByRole("table")
    .getByRole("button", { name: /^Person 1/ })
    .click();
  const approve = here.getByRole("button", { name: "Let them back in" });
  await approve.waitFor();
  for (const control of [
    approve,
    panel.getByRole("button", { name: "Close", exact: true }),
    panel.getByRole("link", { name: "Full profile" }),
  ])
    assert(
      (await control.boundingBox()).height >= 44,
      "touch target is at least 44px",
    );
  assert.deepEqual(errors, []);
  console.log("PASS person panel touch targets");

  // A failed refresh must not present the retained session as fresh live data.
  failSessions = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await here
    .getByText("Live updates are unavailable.", { exact: false })
    .waitFor();
  await here.getByText("2 violations", { exact: true }).waitFor();
  failSessions = false;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await here
    .getByText("Live updates are unavailable.", { exact: false })
    .waitFor({ state: "detached" });
  console.log(
    "PASS person panel labels retained data after a failed refresh and clears the warning after recovery",
  );
} finally {
  await browser.close();
}
