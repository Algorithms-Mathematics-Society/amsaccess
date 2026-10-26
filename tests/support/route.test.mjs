import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const code = ts.transpileModule(
  readFileSync(
    new URL(
      "../../src/app/api/org/support/[[...path]]/route.ts",
      import.meta.url,
    ),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const uid = "e364cd25-61df-402a-949a-d169afcc1741";
function harness(subject = "staff-subject") {
  const calls = [];
  const mocks = {
    "next/server": {
      NextResponse: { json: (data, options) => Response.json(data, options) },
    },
    "@/lib/server/session": { requireSubject: async () => subject },
    "@/lib/server/amsApi": {
      proxyToAmsApi: async (...args) => {
        calls.push(args);
        return Response.json({ ok: true });
      },
    },
  };
  const ctx = {
    exports: {},
    URL,
    URLSearchParams,
    Response,
    require: (name) => mocks[name],
  };
  vm.runInNewContext(code, ctx);
  return { ...ctx.exports, calls };
}
const context = (path) => ({ params: Promise.resolve({ path }) });
test("signed-out support calls never reach the API", async () => {
  const h = harness(null);
  const response = await h.GET(
    new Request("https://example.test/api/org/support"),
    context([]),
  );
  assert.equal(response.status, 401);
  assert.equal(h.calls.length, 0);
});
test("conversation routes cannot proxy arbitrary upstream paths", async () => {
  const h = harness();
  for (const path of [
    [".."],
    [uid, ".."],
    [uid, "messages", "extra"],
    ["not-a-uuid"],
  ]) {
    const response = await h.GET(
      new Request("https://example.test/api/org/support"),
      context(path),
    );
    assert.equal(response.status, 404);
  }
  assert.equal(h.calls.length, 0);
});
test("inbox forwards authenticated subject and only supported query fields", async () => {
  const h = harness();
  const response = await h.GET(
    new Request(
      "https://example.test/api/org/support?status=resolved&offset=50&secret=no",
    ),
    context([]),
  );
  assert.equal(h.calls[0][0], "GET");
  assert.equal(h.calls[0][1], "/org/support?status=resolved&offset=50");
  assert.equal(h.calls[0][3], "staff-subject");
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("reply preserves UUID body and rejects malformed payloads", async () => {
  const h = harness();
  const body = { uid, body: "Please retry" };
  await h.POST(
    new Request("https://example.test/api/org/support", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    context([uid, "messages"]),
  );
  assert.equal(h.calls[0][1], `/org/support/${uid}/messages`);
  assert.equal(h.calls[0][2].uid, uid);
  for (const raw of ["{", "null", "[]", '"text"']) {
    const response = await h.POST(
      new Request("https://example.test/api/org/support", {
        method: "POST",
        body: raw,
      }),
      context([uid, "messages"]),
    );
    assert.equal(response.status, 400);
  }
  assert.equal(h.calls.length, 1);
});
