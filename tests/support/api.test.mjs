import test from "node:test";
import assert from "node:assert/strict";
import {
  supportApi,
  loadSupportInbox,
  loadSupportThread,
} from "../../src/lib/client/support.ts";
const uid = "e364cd25-61df-402a-949a-d169afcc1741";
const message = {
  uid: "5a2a0316-b07d-4eaf-a7cd-bea46816902d",
  sender: "participant",
  body: "I cannot sign in",
  created_at: "2026-10-24T00:00:00Z",
};
const summary = {
  uid,
  email: "a@example.com",
  phone: "1234567890",
  name: "Candidate",
  category: "LOGIN",
  status: "open",
  updated_at: "2026-10-24T00:00:00Z",
};
test("staff reply preserves the retry identifier, does not cache private data", async (t) => {
  let called;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    called = { url, init };
    return Response.json({ uid: message.uid });
  });
  await supportApi(`/${uid}/messages`, "POST", {
    uid: message.uid,
    body: "Reply",
  });
  assert.equal(called.url, `/api/org/support/${uid}/messages`);
  assert.equal(called.init.cache, "no-store");
  assert.deepEqual(JSON.parse(called.init.body), {
    uid: message.uid,
    body: "Reply",
  });
});
test("role refusals reach staff without an accidental success", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ detail: "Insufficient role" }, { status: 403 }),
  );
  await assert.rejects(loadSupportInbox("open"), /Insufficient role/);
});
test("inbox and history validate shapes and require pagination to advance", async (t) => {
  let data = { items: [summary], has_more: false };
  t.mock.method(globalThis, "fetch", async () => Response.json(data));
  assert.equal((await loadSupportInbox("open")).items[0].uid, uid);
  data = { items: [{ ...summary, status: "invalid" }], has_more: false };
  await assert.rejects(loadSupportInbox("open"), /incomplete/);
  data = { ...summary, messages: [message], has_more: false };
  assert.equal((await loadSupportThread(uid)).messages[0].body, message.body);
  data = { ...summary, messages: [], has_more: true };
  await assert.rejects(loadSupportThread(uid), /incomplete/);
  data = {
    ...summary,
    messages: [{ ...message, sender: "unknown" }],
    has_more: false,
  };
  await assert.rejects(loadSupportThread(uid), /incomplete/);
});
test("an unrelated conversation response is rejected", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      ...summary,
      uid: message.uid,
      messages: [message],
      has_more: false,
    }),
  );
  await assert.rejects(loadSupportThread(uid), /incomplete/);
});
test("malformed response and network errors describe delivery as unconfirmed", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("not-json", { status: 502 }),
  );
  await assert.rejects(
    supportApi(`/${uid}/messages`, "POST", { uid: message.uid, body: "Reply" }),
    /unconfirmed/,
  );
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  await assert.rejects(
    supportApi(`/${uid}/messages`, "POST", { uid: message.uid, body: "Reply" }),
    /unconfirmed/,
  );
});
