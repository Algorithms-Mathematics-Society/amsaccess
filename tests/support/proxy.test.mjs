import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const code = ts.transpileModule(
  readFileSync(
    new URL("../../src/lib/server/amsApi.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
function harness(fetch) {
  const timers = new Map();
  const context = {
    exports: {},
    fetch,
    AbortController,
    DOMException,
    Response,
    process: {
      env: {
        AMS_INTERNAL_API_SECRET: "fixture-only",
        AMS_API_URL: "https://api.invalid",
      },
    },
    crypto: { randomUUID: () => "fixture-request-id" },
    setTimeout: (callback) => {
      timers.set(1, callback);
      return 1;
    },
    clearTimeout: (id) => timers.delete(id),
    require: (name) => {
      assert.equal(name, "next/server");
      return { NextResponse: { json: Response.json } };
    },
  };
  vm.runInNewContext(code, context);
  return { ...context.exports, timers };
}
test("proxy timeout remains armed through an unfinished response body", async () => {
  const h = harness(async (_url, options) => ({
    status: 200,
    ok: true,
    headers: new Headers({ "Content-Type": "application/json" }),
    json: () =>
      new Promise((_, reject) =>
        options.signal.addEventListener("abort", () =>
          reject(new DOMException("abort", "AbortError")),
        ),
      ),
  }));
  const pending = h.callAmsApi("POST", "/org/support/id/messages", {}, "staff");
  await flush();
  assert.equal(h.timers.size, 1);
  h.timers.get(1)();
  const result = await pending;
  assert.equal(result.status, 504);
  assert.match(result.data.error, /unconfirmed/);
  assert.equal(h.timers.size, 0);
});
test("incomplete bodies produce a controlled response rather than an unhandled parse error", async () => {
  const h = harness(async () => ({
    status: 200,
    ok: true,
    headers: new Headers({ "Content-Type": "application/json" }),
    json: async () => {
      throw new SyntaxError("incomplete JSON");
    },
  }));
  const result = await h.callAmsApi(
    "POST",
    "/org/support/id/messages",
    {},
    "staff",
  );
  assert.equal(result.status, 502);
  assert.match(result.data.error, /unconfirmed/);
  assert.equal(h.timers.size, 0);
});
test("proxy forwards Retry-After and request IDs without exposing service authorization", async () => {
  const h = harness(async () =>
    Response.json(
      { detail: "Slow down" },
      { status: 429, headers: { "Retry-After": "60" } },
    ),
  );
  const response = await h.proxyToAmsApi(
    "POST",
    "/org/support/id/messages",
    {},
    "staff",
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(response.headers.get("X-Request-ID"), "fixture-request-id");
  assert.equal(response.headers.get("Authorization"), null);
  assert.equal(h.timers.size, 0);
});
