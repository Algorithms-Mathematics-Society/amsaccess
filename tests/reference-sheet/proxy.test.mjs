import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

function compile(path) {
  return ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
}
const validation = { exports: {} };
runInContext(
  compile("../../src/lib/referenceSheet.ts"),
  createContext(validation),
);
const code = compile("../../src/lib/server/referenceSheetProxy.ts");
function harness({ subject = "staff-subject", status = 200 } = {}) {
  const calls = [];
  const mocks = {
    "next/server": { NextResponse: Response },
    "@/lib/referenceSheet": validation.exports,
    "@/lib/server/session": { requireSubject: async () => subject },
    "@/lib/server/amsApi": {
      callAmsApi: async (...args) => {
        calls.push(args);
        return {
          ok: status === 200,
          status,
          data:
            status === 200
              ? { draft: { version: 2 }, published: null }
              : { detail: "Conflict" },
        };
      },
      errorMessage: (value) => value.detail,
    },
  };
  const context = createContext({
    exports: {},
    URL,
    require: (name) => {
      assert(name in mocks);
      return mocks[name];
    },
  });
  runInContext(code, context);
  return { proxy: context.exports.referenceSheetProxy, calls };
}
function request(body, headers = {}) {
  return new Request(
    "https://www.amsaccess.com/api/org/contests/demo/reference-sheet",
    {
      method: "PUT",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    },
  );
}
const valid = {
  title: "Contest reference",
  body: "Use Run to check examples.",
  version: 0,
};

test("anonymous reads and mutations never reach the API", async () => {
  for (const method of ["GET", "PUT", "POST"]) {
    const h = harness({ subject: null });
    assert.equal((await h.proxy(request(valid), "demo", method)).status, 401);
    assert.equal(h.calls.length, 0);
  }
});
test("cross-origin and cross-site writes are rejected before forwarding", async () => {
  for (const headers of [
    { origin: "https://other.example" },
    { "sec-fetch-site": "cross-site" },
    { origin: "null" },
  ]) {
    const h = harness();
    assert.equal(
      (await h.proxy(request(valid, headers), "demo", "PUT")).status,
      403,
    );
    assert.equal(h.calls.length, 0);
  }
});
test("invalid content, oversized input, stale-token shape and non-JSON writes are rejected", async () => {
  for (const value of [
    null,
    [],
    "text",
    { ...valid, version: -1 },
    { ...valid, title: "Null\0title" },
    { ...valid, body: "Null\0body" },
    { ...valid, version: 1.5 },
    { ...valid, title: " " },
    { ...valid, body: "x".repeat(20001) },
    { ...valid, title: "x".repeat(121) },
  ]) {
    const h = harness();
    assert.equal((await h.proxy(request(value), "demo", "PUT")).status, 400);
    assert.equal(h.calls.length, 0);
  }
  const h = harness();
  assert.equal(
    (
      await h.proxy(
        request(valid, { "content-type": "text/plain" }),
        "demo",
        "PUT",
      )
    ).status,
    415,
  );
});
test("draft save forwards only allowed fields with signed subject and no-store", async () => {
  const h = harness();
  const response = await h.proxy(
    request({ ...valid, published: { body: "bypass" }, subject: "other" }),
    "demo",
    "PUT",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls)), [
    ["PUT", "/contests/demo/reference-sheet", valid, "staff-subject"],
  ]);
});
test("publish forwards saved version only and preserves upstream conflict/permission status", async () => {
  for (const status of [200, 403, 404, 409]) {
    const h = harness({ status });
    const response = await h.proxy(
      request({ ...valid, version: 4 }),
      "demo",
      "POST",
    );
    assert.equal(response.status, status);
    assert.deepEqual(JSON.parse(JSON.stringify(h.calls)), [
      [
        "POST",
        "/contests/demo/reference-sheet/publish",
        { version: 4 },
        "staff-subject",
      ],
    ]);
  }
});
test("GET is uncached and passes no draft mutation body", async () => {
  const h = harness();
  const response = await h.proxy(request(valid), "demo", "GET");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls)), [
    ["GET", "/contests/demo/reference-sheet", null, "staff-subject"],
  ]);
});
test("empty drafts and Unicode character limits remain compatible with API", () => {
  assert.equal(
    validation.exports.validateReferenceSheetRequest(
      { ...valid, body: "" },
      false,
    ),
    null,
  );
  assert.equal(
    validation.exports.validateReferenceSheetRequest(
      { ...valid, body: "😀".repeat(20000) },
      false,
    ),
    null,
  );
  assert.equal(
    validation.exports.validateReferenceSheetRequest({ version: 2 }, true),
    null,
  );
});
