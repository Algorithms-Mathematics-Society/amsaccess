// Production bundle, mocked API only. Never use real participant data or credentials.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://127.0.0.1:3124";
const uid = "5b0c8f0e-6a0e-4c7e-9d7e-2f4a3c1b9e11";
const secondContest = "8b0c8f0e-6a0e-4c7e-9d7e-2f4a3c1b9e11";
const user1 = "6b0c8f0e-6a0e-4c7e-9d7e-2f4a3c1b9e11";
const user2 = "7b0c8f0e-6a0e-4c7e-9d7e-2f4a3c1b9e11";
const now = new Date().toISOString();
const roster = [
  {
    user_uid: user1,
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
    user_uid: user2,
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
    user_uid: user1,
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
let submissionAuthLost = false;
let submissionForbidden = false;
let submissionForeign = false;
let releasePerson2;
let delayPerson2 = false;
let delayFirstContest = false;
let releaseFirstContest;
const personReads = [];
const submission = (id, problem, username) => ({
  uid: id,
  user_uid:
    username === "person1" ? user1 : username === "person2" ? user2 : null,
  problem_label: problem,
  username,
  display_name: username === "person1" ? "Person 1" : "Person 2",
  created_at: now,
  status: "done",
  verdict: "AC",
  passed_count: 1,
  total_count: 1,
  max_runtime_ms: 1,
  max_memory_kb: 1024,
});
const profile = {
  uid: user1,
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
    if (
      p === `/api/org/contests/${uid}` ||
      p === `/api/org/contests/${secondContest}`
    )
      return ok({
        uid: p.split("/").at(-1),
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
    if (
      p === `/api/org/students/${user1}/profile` ||
      p === "/api/org/students/person1/profile"
    )
      return ok(profile);
    if (
      p === `/api/org/students/${user2}/profile` ||
      p === "/api/org/students/person2/profile"
    )
      return ok({
        ...profile,
        uid: user2,
        handle: "person2",
        display_name: "Person 2",
      });
    if (p === "/api/org/students/invalid-person/profile")
      return ok({ ...profile, uid: "invalid" });
    if (p.endsWith("/submissions")) {
      const person = u.searchParams.get("user_uid");
      if (person) {
        personReads.push({ person, limit: u.searchParams.get("limit") });
        if (submissionAuthLost) return ok({ error: "Sign in required." }, 401);
        if (submissionForbidden)
          return ok(
            submissionForbidden === "null"
              ? null
              : { error: "Permission removed." },
            403,
          );
        if (submissionForeign)
          return ok([
            submission("foreign", "Another person's submission", "person2"),
          ]);
        if (person === user2 && delayPerson2)
          await new Promise((resolve) => {
            releasePerson2 = resolve;
          });
        const lateFirst = delayFirstContest && p.includes(uid);
        if (lateFirst)
          await new Promise((resolve) => {
            releaseFirstContest = resolve;
          });
        return ok([
          submission(
            `old-${person}`,
            lateFirst
              ? "Wrong contest late"
              : p.includes(secondContest)
                ? "Second contest only"
                : person === user1
                  ? "Outside recent page"
                  : "Person two only",
            person === user1 ? "person1" : "person2",
          ),
        ]);
      }
      // This participant's old submission is absent from the contest's latest 100.
      return ok(
        Array.from({ length: 100 }, (_, i) => ({
          ...submission(`recent-${i}`, "A", i === 0 ? "person1" : "person2"),
          ...(i === 0 ? { username: "different-from-login-id" } : {}),
          ...(i === 98
            ? {
                username: "person1",
                display_name: "Legacy person",
                user_uid: null,
              }
            : {}),
          ...(i === 99
            ? {
                username: "invalid-person",
                display_name: "Invalid person",
                user_uid: null,
              }
            : {}),
        })),
      );
    }
    if (p === "/api/org/support") return ok({ items: [], has_more: false });
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

  // The combined inbox carries the person links for both re-entry and help.
  await page.goto(base + `/org/contests/${uid}#invigilation`);
  const inbox = page.getByRole("region", { name: /Issues waiting on staff/ });
  const trigger = inbox
    .getByRole("listitem")
    .filter({ hasText: "Laptop restarted" })
    .getByRole("button", { name: "Person 1", exact: true });
  await trigger.waitFor();
  assert.equal(
    await inbox.getByRole("button", { name: "Person 2", exact: true }).count(),
    0,
    "a login without a matching session UID is not treated as a person UID",
  );
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
    `/org/participants/${user1}`,
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

  const helpTrigger = inbox
    .getByRole("listitem")
    .filter({ hasText: "Camera frozen" })
    .getByRole("button", { name: "Person 1", exact: true });
  await helpTrigger.click();
  await here.getByText("2 violations", { exact: true }).waitFor();
  await here.getByText("Camera frozen", { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  assert(
    await helpTrigger.evaluate((el) => el === document.activeElement),
    "help row receives focus after closing its person panel",
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

  // Read the selected UID at the server, even when absent from the recent page.
  assert(
    personReads.some((read) => read.person === user1 && read.limit === "100"),
  );
  await page.evaluate(() => {
    location.hash = "submissions";
  });
  const submissionTrigger = page
    .getByRole("table")
    .getByRole("button", { name: "Person 1", exact: true });
  await submissionTrigger.click();
  await here.getByText("Outside recent page", { exact: true }).waitFor();
  await here.getByText("Latest 100", { exact: false }).waitFor();
  await here.getByText("p1", { exact: true }).waitFor();
  await here.getByText("2 violations", { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  assert(
    await submissionTrigger.evaluate((el) => el === document.activeElement),
    "submission entry restores focus",
  );

  delayPerson2 = true;
  await page
    .getByRole("table")
    .getByRole("button", { name: "Person 2", exact: true })
    .first()
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector('[role="dialog"]')
      ?.textContent.includes("Loading submissions"),
  );
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  await submissionTrigger.click();
  await here.getByText("Outside recent page", { exact: true }).waitFor();
  releasePerson2();
  delayPerson2 = false;
  await page.waitForTimeout(150);
  assert.equal(
    await here.getByText("Person two only", { exact: true }).count(),
    0,
    "late response for another person cannot replace the selected person",
  );
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  await page.evaluate(() => {
    location.hash = "participants";
  });
  console.log(
    "PASS server-scoped submissions beyond the contest page; username profile resolution; person switching; submission entry focus",
  );

  await page.evaluate(() => {
    location.hash = "submissions";
  });
  await page
    .getByRole("table")
    .getByRole("button", { name: "Legacy person", exact: true })
    .click();
  await here.getByText("p1", { exact: true }).waitFor();
  await here.getByText("2 violations", { exact: true }).waitFor();
  await here.getByText("Outside recent page", { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  await page
    .getByRole("table")
    .getByRole("button", { name: "Invalid person", exact: true })
    .click();
  await here
    .getByText("Could not resolve this participant’s UID.", { exact: false })
    .waitFor();
  assert(
    !personReads.some((read) => read.person === "invalid"),
    "invalid profile UID is never forwarded",
  );
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  await submissionTrigger.click();
  await here.getByText("Outside recent page", { exact: true }).waitFor();
  delayFirstContest = true;
  await here
    .getByRole("button", { name: "Refresh submissions", exact: true })
    .click();
  await page.waitForTimeout(100);
  await page.goto(base + `/org/contests/${secondContest}#submissions`);
  await submissionTrigger.click();
  await here.getByText("Second contest only", { exact: true }).waitFor();
  releaseFirstContest();
  delayFirstContest = false;
  await page.waitForTimeout(150);
  assert.equal(
    await here.getByText("Wrong contest late", { exact: true }).count(),
    0,
    "late response for previous contest stays out of this contest",
  );
  await page.goto(base + `/org/contests/${uid}#participants`);
  console.log(
    "PASS invalid UID blocks the read and contest switching rejects late responses",
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
  submissionForeign = true;
  await here
    .getByRole("button", { name: "Refresh submissions", exact: true })
    .click();
  await here
    .getByText("The submissions response did not verify this participant.", {
      exact: false,
    })
    .waitFor();
  assert.equal(
    await here
      .getByText("Another person's submission", { exact: true })
      .count(),
    0,
  );
  submissionForeign = false;
  submissionForbidden = true;
  await here
    .getByRole("button", { name: "Refresh submissions", exact: true })
    .click();
  await here.getByText("Permission removed.", { exact: false }).waitFor();
  assert.equal(
    await here.getByText("Outside recent page", { exact: true }).count(),
    0,
    "permission loss clears cached rows",
  );
  submissionForbidden = false;
  await here
    .getByRole("button", { name: "Refresh submissions", exact: true })
    .click();
  await here.getByText("Outside recent page", { exact: true }).waitFor();
  submissionForbidden = "null";
  await here
    .getByRole("button", { name: "Refresh submissions", exact: true })
    .click();
  await here
    .getByText("You cannot view these submissions.", { exact: true })
    .waitFor();
  assert.equal(
    await here.getByText("Outside recent page", { exact: true }).count(),
    0,
  );
  submissionForbidden = false;
  await here
    .getByRole("button", { name: "Refresh submissions", exact: true })
    .click();
  await here.getByText("Outside recent page", { exact: true }).waitFor();
  submissionAuthLost = true;
  await here
    .getByRole("button", { name: "Refresh submissions", exact: true })
    .click();
  await here
    .getByText("Sign in again to view this participant’s submissions.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await here.getByText("Outside recent page", { exact: true }).count(),
    0,
    "auth loss clears visible participant submissions",
  );
  console.log(
    "PASS participant submissions fail closed on authentication loss",
  );
} finally {
  await browser.close();
}
