import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { loadSupportInbox } from "../../src/lib/client/support.ts";

const user = "11111111-1111-4111-8111-111111111111";
const contest = "22222222-2222-4222-8222-222222222222";
const ticket = {
  uid: "33333333-3333-4333-8333-333333333333",
  user_uid: user,
  contest_uid: contest,
  name: "Same name",
  email: "same@example.test",
  phone: "",
  category: "LOGIN",
  status: "open",
  updated_at: "2026-11-19T00:00:00Z",
};

test("person tickets require both UUIDs and scope every page at the server", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return Response.json({
      items: [ticket],
      has_more: true,
      next_cursor: "next",
    });
  });
  const result = await loadSupportInbox(
    "open",
    "previous",
    undefined,
    contest,
    user,
  );
  const query = new URL(calls[0], "https://example.test").searchParams;
  assert.equal(query.get("user_uid"), user);
  assert.equal(query.get("contest_uid"), contest);
  assert.equal(query.get("cursor"), "previous");
  assert.equal(query.get("pagination"), "cursor");
  assert.equal(query.has("offset"), false);
  assert.equal(result.items[0].uid, ticket.uid);
  await assert.rejects(
    loadSupportInbox("open", undefined, undefined, undefined, user),
    /verified participant and contest/,
  );
  await assert.rejects(
    loadSupportInbox("open", undefined, undefined, contest, "Same name"),
    /verified participant and contest/,
  );
  assert.equal(calls.length, 1);
});

test("contacts cannot link guest, historical, foreign-person or foreign-contest tickets", async (t) => {
  let response;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ items: [response], has_more: false }),
  );
  for (const fields of [
    { user_uid: null },
    { user_uid: undefined },
    { user_uid: contest },
    { user_uid: "invalid" },
    { contest_uid: user },
    { contest_uid: null },
  ]) {
    response = { ...ticket, ...fields };
    await assert.rejects(
      loadSupportInbox("open", undefined, undefined, contest, user),
      /incomplete/,
    );
  }
  response = { ...ticket, user_uid: null };
  assert.equal(
    (await loadSupportInbox("open")).items.length,
    1,
    "unlinked tickets remain in the general inbox",
  );
});

test("proxy forwards person and contest only on staff inbox reads", async () => {
  const calls = [];
  const source = readFileSync(
    new URL(
      "../../src/app/api/org/support/[[...path]]/route.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const context = {
    exports: {},
    URL,
    URLSearchParams,
    Response,
    require: (name) =>
      ({
        "next/server": { NextResponse: { json: Response.json } },
        "@/lib/server/session": { requireSubject: async () => "staff" },
        "@/lib/server/amsApi": {
          proxyToAmsApi: async (...args) => {
            calls.push(args);
            return Response.json({});
          },
        },
      })[name],
  };
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    context,
  );
  const url = `https://example.test/api/org/support?user_uid=${user}&contest_uid=${contest}`;
  await context.exports.GET(new Request(url), {
    params: Promise.resolve({ path: [] }),
  });
  assert.equal(
    calls[0][1],
    `/org/support?contest_uid=${contest}&user_uid=${user}`,
  );
  await context.exports.GET(new Request(url), {
    params: Promise.resolve({ path: [ticket.uid] }),
  });
  assert.equal(calls[1][1], `/org/support/${ticket.uid}`);
  await context.exports.PATCH(
    new Request(url, {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved" }),
    }),
    { params: Promise.resolve({ path: [ticket.uid] }) },
  );
  assert.equal(calls[2][1], `/org/support/${ticket.uid}`);
});
