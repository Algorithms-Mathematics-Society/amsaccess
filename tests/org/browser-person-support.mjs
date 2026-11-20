// Production bundle with synthetic API fixtures only; external origins are blocked.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.ORG_TEST_URL || "http://127.0.0.1:3124";
const contest1 = "11111111-1111-4111-8111-111111111111";
const contest2 = "22222222-2222-4222-8222-222222222222";
const user1 = "33333333-3333-4333-8333-333333333333";
const user2 = "44444444-4444-4444-8444-444444444444";
const now = "2026-11-19T10:00:00Z";
const id = (n) => `55555555-5555-4555-8555-${String(n).padStart(12, "0")}`;
const ticket = (n, user_uid = user1, contest_uid = contest1, extra = {}) => ({
  uid: id(n),
  user_uid,
  contest_uid,
  name: "Same contact",
  email: "same@example.test",
  phone: "",
  category: "LOGIN_ISSUE",
  status: "open",
  updated_at: now,
  chat_enabled: true,
  ...extra,
});
const primary = ticket(1),
  secondPage = ticket(2),
  resolved = ticket(3, user1, contest1, { status: "resolved" });
const otherPerson = ticket(4, user2),
  otherContest = ticket(5, user1, contest2);
const guest = ticket(6, null, contest1, { category: "GUEST_CONTACT" });
const historical = ticket(7, undefined, contest1, {
  category: "HISTORICAL_CONTACT",
});
delete historical.user_uid;
const all = [
  primary,
  secondPage,
  resolved,
  otherPerson,
  otherContest,
  guest,
  historical,
];
const messages = new Map(
  all.map((item) => [
    item.uid,
    [
      {
        uid: id(100 + Number(item.uid.slice(-3))),
        sender: "participant",
        body: `Private thread ${item.uid}`,
        created_at: now,
      },
    ],
  ]),
);
let role = "admin",
  foreignList = false,
  foreignThread = false,
  authLost = false,
  failReply = true;
const staffMember = {
  uid: id(900),
  display_name: "Eligible staff",
  email: "staff@example.test",
};
const internalNotes = new Map(all.map((item) => [item.uid, []]));
const noteWrites = [],
  assignmentWrites = [];
let failNote = true,
  failAssignment = true;
const scopedReads = [],
  replies = [],
  writes = [],
  waiting = new Map();
let delayedScope = null;
async function until(check, label) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(label);
}
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  ...(process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? {
        executablePath:
          process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_EXECUTABLE_PATH,
      }
    : {}),
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    {
      name: "ams_session",
      value: `synthetic.${Math.floor(Date.now() / 1000) + 3600}.synthetic`,
      url: base,
    },
  ]);
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    if (url.origin !== base) return route.abort();
    if (!path.startsWith("/api/")) return route.continue();
    const ok = async (data, status = 200) => {
      // A deliberately delayed read can outlive navigation and its aborted request.
      try {
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      } catch {}
    };
    if (path === "/api/auth/me") return ok({ role, uid: staffMember.uid });
    if (path === "/api/org/support") {
      const user = url.searchParams.get("user_uid"),
        contest = url.searchParams.get("contest_uid"),
        status = url.searchParams.get("status"),
        offset = url.searchParams.get("cursor") ? 50 : 0;
      if (!user)
        return ok({
          items: [primary, guest, historical, otherPerson, otherContest].filter(
            (item) => item.status === status,
          ),
          has_more: false,
        });
      const scope = `${contest}:${user}`;
      scopedReads.push({ user, contest, status, offset });
      if (authLost) return ok({ error: "Sign in required." }, 401);
      if (scope === delayedScope)
        await new Promise((resolve) => waiting.set(scope, resolve));
      if (foreignList) return ok({ items: [otherPerson], has_more: false });
      const mine = all.filter(
        (item) =>
          item.user_uid === user &&
          item.contest_uid === contest &&
          item.status === status,
      );
      const paged = user === user1 && contest === contest1 && status === "open";
      return ok({
        items: paged
          ? mine.slice(offset ? 1 : 0, offset ? undefined : 1)
          : mine,
        has_more: paged && offset === 0 && mine.length > 1,
        next_cursor: paged && offset === 0 && mine.length > 1 ? "page2" : null,
      });
    }
    if (path.startsWith("/api/org/support/")) {
      const uid = path.split("/")[4],
        item = all.find((item) => item.uid === uid);
      assert(item, `unexpected support ticket ${path}`);
      if (path.endsWith("/assignees")) return ok({ items: [staffMember] });
      if (path.endsWith("/assignment")) {
        const body = request.postDataJSON();
        assignmentWrites.push(body);
        if (failAssignment) {
          failAssignment = false;
          return ok({ error: "Assignment unavailable" }, 503);
        }
        item.assignee = body.assignee_uid ? staffMember : null;
        return ok(item);
      }
      if (path.endsWith("/notes")) {
        if (request.method() === "POST") {
          const note = request.postDataJSON();
          noteWrites.push(note);
          const notes = internalNotes.get(uid);
          if (!notes.some((saved) => saved.uid === note.uid))
            notes.push({ ...note, created_at: now, author: staffMember });
          if (failNote) {
            failNote = false;
            return ok({ error: "Note delivery unconfirmed" }, 503);
          }
          return ok({ uid: note.uid });
        }
        const notes = internalNotes.get(uid),
          after = url.searchParams.get("after");
        return ok({
          notes: after
            ? notes.slice(notes.findIndex((note) => note.uid === after) + 1)
            : notes,
          has_more: false,
          next_cursor: null,
        });
      }
      if (request.method() === "POST") {
        const reply = request.postDataJSON();
        replies.push({ ticket: uid, ...reply });
        if (failReply) {
          failReply = false;
          return ok({ error: "Delivery unconfirmed" }, 503);
        }
        if (!messages.get(uid).some((message) => message.uid === reply.uid))
          messages
            .get(uid)
            .push({ ...reply, sender: "staff", created_at: now });
        return ok({ uid: reply.uid });
      }
      if (request.method() === "PATCH") {
        const { status } = request.postDataJSON();
        writes.push({ uid, status });
        item.status = status;
        return ok({ uid, status });
      }
      const after = url.searchParams.get("after"),
        threadMessages = messages.get(uid);
      return ok({
        ...item,
        ...(foreignThread ? { user_uid: user2 } : {}),
        messages: after
          ? threadMessages.slice(
              threadMessages.findIndex((message) => message.uid === after) + 1,
            )
          : threadMessages,
        has_more: false,
      });
    }
    if (path.endsWith("/participants"))
      return ok([
        {
          user_uid: user1,
          login_id: "alice",
          display_name: "Alice",
          revoked: true,
          last_login_at: null,
          has_passphrase: false,
          email: "",
          mail_status: "",
          college: "",
          device_os: "",
        },
        {
          user_uid: user2,
          login_id: "bob",
          display_name: "Bob",
          revoked: false,
          last_login_at: null,
          has_passphrase: false,
          email: "",
          mail_status: "",
          college: "",
          device_os: "",
        },
      ]);
    if (path.endsWith("/profile"))
      return ok({
        uid: path.split("/")[4],
        handle: "synthetic",
        display_name: "Synthetic participant",
        email: "",
        mailable: false,
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
        contests_entered: 0,
        problems_solved: 0,
        submissions_total: 0,
        accepted_total: 0,
        contests: [],
        submissions: [],
        tags: [],
        verdicts: [],
        activity: [],
      });
    if (path.endsWith("/submissions")) return ok([]);
    if (path.endsWith("/invigilation")) return ok([]);
    return ok([]);
  });
  const panel = page.getByRole("dialog", { name: "Participant", exact: true });
  const here = panel.getByRole("region", { name: "In this contest" });
  const support = panel.getByRole("region", { name: "Person support tickets" });
  const links = page.getByRole("button", {
    name: "View participant",
    exact: true,
  });
  async function closePanel() {
    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "detached" });
  }
  async function openPerson(index = 0) {
    await links.nth(index).click();
    await support
      .getByRole("button", { name: "Open ticket", exact: true })
      .first()
      .waitFor();
  }

  await page.goto(`${base}/org/support`);
  await until(
    async () => (await links.count()) === 3,
    "trusted support identities did not load",
  );
  for (const category of ["guest contact", "historical contact"])
    assert.equal(
      await page
        .getByText(category, { exact: true })
        .locator("..")
        .getByRole("button", { name: "View participant", exact: true })
        .count(),
      0,
      "same contact details never create a person link",
    );
  const trigger = links.first();
  await openPerson();
  await here.getByText("revoked", { exact: true }).waitFor();
  await here.getByText("no email", { exact: true }).waitFor();
  assert(
    scopedReads.some(
      (read) =>
        read.user === user1 &&
        read.contest === contest1 &&
        read.status === "open" &&
        read.offset === 0,
    ),
  );
  await support
    .getByRole("button", { name: "Next tickets", exact: true })
    .click();
  await until(
    () =>
      scopedReads.some(
        (read) =>
          read.offset === 50 &&
          read.user === user1 &&
          read.contest === contest1,
      ),
    "person ticket page 2 missing",
  );
  primary.updated_at = "2026-11-19T11:00:00Z";
  const readCountBeforeRefresh = scopedReads.length;
  await support
    .getByRole("button", { name: "Refresh tickets", exact: true })
    .click();
  await until(
    () =>
      scopedReads.length > readCountBeforeRefresh &&
      scopedReads.at(-1).offset === 0,
    "refresh did not reset the cursor",
  );
  await support
    .getByRole("button", { name: "Next tickets", exact: true })
    .click();
  await until(
    () => scopedReads.at(-1).offset === 50,
    "cursor page did not survive a reply update",
  );
  await support
    .getByRole("button", { name: "Previous tickets", exact: true })
    .click();
  await support
    .getByRole("button", { name: "Resolved tickets", exact: true })
    .click();
  await until(
    () =>
      scopedReads.some(
        (read) =>
          read.status === "resolved" &&
          read.offset === 0 &&
          read.user === user1,
      ),
    "resolved person tickets missing",
  );
  await support.getByText("resolved ·", { exact: false }).waitFor();
  await closePanel();
  assert(
    await trigger.evaluate((node) => node === document.activeElement),
    "support row focus restores on close",
  );
  console.log(
    "PASS support person entry, trusted identities only, roster state, server-scoped ticket pages/status, focus",
  );

  // The same shared conversation restores its draft when this person panel is reopened.
  await openPerson();
  await support
    .getByRole("button", { name: "Open ticket", exact: true })
    .first()
    .click();
  const replyBox = support.getByRole("textbox", {
    name: "Reply to participant",
  });
  await replyBox.fill("Please restart the assessment app.");
  await closePanel();
  await openPerson();
  await support
    .getByRole("button", { name: "Open ticket", exact: true })
    .first()
    .click();
  await until(
    async () =>
      (await replyBox.inputValue()) === "Please restart the assessment app.",
    "conversation draft was not recovered",
  );
  await support
    .getByRole("button", { name: "Send reply", exact: true })
    .click();
  await support
    .getByRole("button", { name: "Retry reply", exact: true })
    .click();
  await support
    .getByText("Please restart the assessment app.", { exact: true })
    .waitFor();
  assert.equal(replies.length, 2);
  assert.equal(replies[0].uid, replies[1].uid, "retry uses the saved reply ID");
  assert.equal(replies[0].body, replies[1].body);
  const assigneeBox = support.getByRole("combobox", { name: "Assigned staff" });
  await assigneeBox.selectOption(staffMember.uid);
  await support
    .getByRole("button", { name: "Save assignment", exact: true })
    .click();
  await support
    .getByRole("alert")
    .getByText("Assignment unavailable", { exact: true })
    .waitFor();
  assert.equal(await assigneeBox.inputValue(), staffMember.uid);
  await support
    .getByRole("button", { name: "Save assignment", exact: true })
    .click();
  await until(() => assignmentWrites.length === 2, "assignment retry missing");
  const noteBox = support.getByRole("textbox", {
    name: "Internal note (staff only)",
  });
  await noteBox.fill("Private staff investigation");
  await closePanel();
  await openPerson();
  await support
    .getByRole("button", { name: "Open ticket", exact: true })
    .first()
    .click();
  await until(
    async () => (await noteBox.inputValue()) === "Private staff investigation",
    "private draft recovery failed",
  );
  await support
    .getByRole("button", { name: "Add internal note", exact: true })
    .click();
  await support
    .getByRole("button", { name: "Retry internal note", exact: true })
    .click();
  await support
    .getByRole("log", { name: "Internal staff notes" })
    .getByText("Private staff investigation", { exact: true })
    .waitFor();
  assert.equal(noteWrites.length, 2);
  assert.equal(noteWrites[0].uid, noteWrites[1].uid);
  assert.equal(
    await support
      .getByRole("log", { name: "Participant support messages" })
      .getByText("Private staff investigation", { exact: true })
      .count(),
    0,
  );
  assert.equal(internalNotes.get(primary.uid).length, 1);
  await support
    .getByRole("button", { name: "Resolve issue", exact: true })
    .click();
  await support
    .getByRole("button", { name: "Reopen issue", exact: true })
    .waitFor();
  assert.deepEqual(writes, [{ uid: primary.uid, status: "resolved" }]);
  await support
    .getByRole("button", { name: "Reopen issue", exact: true })
    .click();
  await support
    .getByRole("button", { name: "Resolve issue", exact: true })
    .waitFor();
  await closePanel();
  console.log(
    "PASS person-scoped shared conversation draft, safe reply retry and inline resolve/reopen",
  );

  // Deep-linked conversations also carry a verified person entry, independently of the list.
  await page.goto(`${base}/org/support?t=${primary.uid}`);
  await page
    .getByRole("log", { name: "Participant support messages" })
    .waitFor();
  await page
    .getByRole("log", { name: "Internal staff notes" })
    .getByText("Private staff investigation", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("combobox", { name: "Assigned staff" }).inputValue(),
    staffMember.uid,
  );
  const threadTrigger = links.last();
  await threadTrigger.click();
  await support
    .getByRole("button", { name: "Open ticket", exact: true })
    .first()
    .waitFor();
  await closePanel();
  assert(
    await threadTrigger.evaluate((node) => node === document.activeElement),
    "deep-linked conversation focus restores",
  );

  // Delayed reads from a previous person and contest never populate the next panel.
  await page.goto(`${base}/org/support`);
  const firstScope = `${contest1}:${user1}`;
  delayedScope = firstScope;
  await links.first().click();
  await until(
    () => waiting.has(firstScope),
    "delayed first scope did not start",
  );
  await closePanel();
  await openPerson(1);
  await here.getByText("no passphrase", { exact: true }).waitFor();
  assert(
    scopedReads.some(
      (read) => read.user === user2 && read.contest === contest1,
    ),
  );
  waiting.get(firstScope)();
  waiting.delete(firstScope);
  delayedScope = null;
  await support
    .getByRole("button", { name: "Open ticket", exact: true })
    .first()
    .click();
  await support
    .getByText(`Private thread ${otherPerson.uid}`, { exact: true })
    .waitFor();
  assert.equal(
    await support
      .getByText(`Private thread ${primary.uid}`, { exact: true })
      .count(),
    0,
  );
  await closePanel();
  delayedScope = firstScope;
  await links.first().click();
  await until(
    () => waiting.has(firstScope),
    "delayed previous contest did not start",
  );
  await closePanel();
  await openPerson(2);
  assert(
    scopedReads.some(
      (read) => read.user === user1 && read.contest === contest2,
    ),
  );
  waiting.get(firstScope)();
  waiting.delete(firstScope);
  delayedScope = null;
  await support
    .getByRole("button", { name: "Open ticket", exact: true })
    .first()
    .click();
  await support
    .getByText(`Private thread ${otherContest.uid}`, { exact: true })
    .waitFor();
  assert.equal(
    await support
      .getByText(`Private thread ${primary.uid}`, { exact: true })
      .count(),
    0,
  );
  await closePanel();
  console.log(
    "PASS support context switches isolate stale person and contest reads",
  );

  await openPerson();
  foreignThread = true;
  await support
    .getByRole("button", { name: "Open ticket", exact: true })
    .first()
    .click();
  await support
    .getByText(
      "This ticket is no longer linked to the selected participant and contest.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await support
      .getByRole("textbox", { name: "Reply to participant" })
      .count(),
    0,
  );
  assert.equal(
    await support
      .getByText(`Private thread ${primary.uid}`, { exact: true })
      .count(),
    0,
  );
  await closePanel();
  foreignThread = false;
  await openPerson();
  foreignList = true;
  await support
    .getByRole("button", { name: "Refresh tickets", exact: true })
    .click();
  await support
    .getByText("The support inbox response was incomplete. Refresh to retry.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await support
      .getByRole("button", { name: "Open ticket", exact: true })
      .count(),
    0,
  );
  await closePanel();
  foreignList = false;
  await openPerson();
  authLost = true;
  await support
    .getByRole("button", { name: "Refresh tickets", exact: true })
    .click();
  await panel.waitFor({ state: "detached" });
  console.log(
    "PASS foreign list/thread identities fail closed and authentication loss closes the person panel",
  );

  authLost = false;
  role = "intern";
  await page.goto(`${base}/org/support`);
  await page
    .getByRole("heading", { name: "Participant support", exact: true })
    .waitFor();
  await page.getByText("guest contact", { exact: true }).waitFor();
  assert.equal(await links.count(), 0, "intern role has no person entry");
  assert.deepEqual(errors, []);
  console.log(
    "PASS support person entry respects staff role and has no browser errors",
  );
} finally {
  await browser.close();
}
