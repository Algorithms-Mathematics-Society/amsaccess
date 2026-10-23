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
function harness(fetchImpl) {
  let deadline;
  let cleared = 0;
  const context = {
    exports: {},
    require: () => ({}),
    process: {
      env: {
        AMS_INTERNAL_API_SECRET: "isolated-test",
        AMS_API_URL: "https://api.test",
      },
    },
    crypto: { randomUUID: () => "test-request" },
    AbortController,
    setTimeout: (fn) => {
      deadline = fn;
      return 1;
    },
    clearTimeout: () => {
      cleared++;
    },
    fetch: fetchImpl,
  };
  vm.runInNewContext(code, context);
  return {
    call: () =>
      context.exports.callAmsApi(
        "GET",
        "/contests/test/reference-sheet",
        null,
        "staff",
      ),
    expire: () => deadline(),
    cleared: () => cleared,
  };
}
for (const mime of ["application/json", "text/plain"]) {
  test(`deadline remains armed through stalled ${mime} body`, async () => {
    let bodyStarted;
    const reading = new Promise((resolve) => {
      bodyStarted = resolve;
    });
    const h = harness(async (_url, { signal }) => {
      const read = () => {
        bodyStarted();
        return new Promise((resolve, reject) =>
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          }),
        );
      };
      return {
        status: 200,
        ok: true,
        headers: new Headers({ "content-type": mime }),
        json: read,
        text: read,
      };
    });
    const pending = h.call();
    await reading;
    assert.equal(h.cleared(), 0);
    h.expire();
    const result = await pending;
    assert.equal(result.status, 504);
    assert.equal(result.data.code, "UPSTREAM_TIMEOUT");
    assert.equal(h.cleared(), 1);
  });
}
test("complete JSON response keeps status/data and clears deadline", async () => {
  const h = harness(
    async () =>
      new Response(JSON.stringify({ detail: "Conflict" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      }),
  );
  const result = await h.call();
  assert.equal(result.status, 409);
  assert.equal(result.ok, false);
  assert.equal(result.data.detail, "Conflict");
  assert.equal(h.cleared(), 1);
});
test("204 response needs no body and clears deadline", async () => {
  const h = harness(async () => new Response(null, { status: 204 }));
  const result = await h.call();
  assert.equal(result.status, 204);
  assert.equal(result.data, null);
  assert.equal(h.cleared(), 1);
});
test("malformed body returns bounded gateway error instead of throwing", async () => {
  const h = harness(
    async () =>
      new Response("broken", {
        headers: { "content-type": "application/json" },
      }),
  );
  const result = await h.call();
  assert.equal(result.status, 502);
  assert.equal(result.data.code, "UPSTREAM_INVALID_RESPONSE");
  assert.equal(h.cleared(), 1);
});
test("connection failure keeps the existing unreachable classification", async () => {
  const h = harness(async () => {
    throw new TypeError("offline");
  });
  const result = await h.call();
  assert.equal(result.status, 502);
  assert.equal(result.data.code, "UPSTREAM_UNREACHABLE");
  assert.equal(h.cleared(), 1);
});
