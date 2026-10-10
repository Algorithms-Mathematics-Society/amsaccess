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
const code = compile("../../src/app/api/contact/route.ts");
const validation = { exports: {} };
runInContext(
  compile("../../src/lib/server/request.ts"),
  createContext(validation),
);
const enquiry = {
  name: "Test Person",
  email: "TEST@example.com",
  category: "Sales",
  message: "Synthetic enquiry",
  expectedRoundVolume: "Not sure yet",
};

function harness({
  env = { RESEND_API_KEY: "test-key", CONTACT_TO_EMAIL: "inbox@example.com" },
  provider = async () => new Response("{}", { status: 200 }),
  limited = false,
  emailLimited = false,
} = {}) {
  const calls = [],
    logs = [],
    timeouts = [];
  const http = {
    apiOk: (data) => Response.json({ ok: true, data }),
    apiError: (message, status, code) =>
      Response.json({ ok: false, error: { message, code } }, { status }),
    apiRateLimited: (retryAfter) =>
      Response.json(
        { ok: false },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      ),
  };
  const mocks = {
    "@/lib/server/http": http,
    "@/lib/server/request": validation.exports,
    "@/lib/server/logger": {
      logger: {
        info: (...args) => logs.push(args),
        error: (...args) => logs.push(args),
      },
      withApiLogging: (_, fn) => fn(),
    },
    "@/lib/server/rateLimit": {
      checkRequestRateLimitAsync: async (_, __, keys) => ({
        limited: limited || (emailLimited && keys[0] === "email"),
        retryAfter: 30,
      }),
    },
  };
  const context = createContext({
    exports: {},
    process: { env },
    Response,
    AbortSignal: {
      timeout: (ms) => {
        timeouts.push(ms);
        return AbortSignal.timeout(ms);
      },
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return provider(url, options);
    },
    require: (name) => {
      assert(name in mocks, "Unexpected dependency: " + name);
      return mocks[name];
    },
  });
  runInContext(code, context);
  return { ...context.exports, calls, logs, timeouts };
}
function request(body = enquiry) {
  return { json: async () => body };
}

test("malformed JSON and non-object payloads are rejected without a send", async () => {
  const h = harness();
  for (const body of [null, [], "text", 42])
    assert.equal((await h.POST(request(body))).status, 400);
  assert.equal(
    (
      await h.POST({
        json: async () => {
          throw Error("Invalid JSON");
        },
      })
    ).status,
    400,
  );
  assert.equal(h.calls.length, 0);
});
test("invalid enquiries never reach the provider", async () => {
  const h = harness();
  for (const patch of [
    { name: " " },
    { email: "invalid" },
    { message: " " },
    { category: "other" },
    { expectedRoundVolume: "other" },
  ]) {
    assert.equal((await h.POST(request({ ...enquiry, ...patch }))).status, 400);
  }
  assert.equal(h.calls.length, 0);
});
test("missing delivery settings return unavailable, never a delivery acknowledgement", async () => {
  for (const env of [
    {},
    { RESEND_API_KEY: "test" },
    { CONTACT_TO_EMAIL: "inbox@example.com" },
  ]) {
    const h = harness({ env });
    const response = await h.POST(request());
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
    assert.equal(h.calls.length, 0);
    assert(!JSON.stringify(h.logs).includes(enquiry.message));
  }
});
test("provider rejection is not success", async () => {
  const h = harness({
    provider: async () =>
      new Response("private provider diagnostic", { status: 503 }),
  });
  const response = await h.POST(request());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).ok, false);
  assert(!JSON.stringify(h.logs).includes("private provider diagnostic"));
});
test("network failures and timeouts return recoverable errors without exposing details", async () => {
  for (const error of [
    new Error("sensitive provider details"),
    new DOMException("timed out", "TimeoutError"),
  ]) {
    const h = harness({
      provider: async () => {
        throw error;
      },
    });
    const response = await h.POST(request());
    assert.equal(response.status, 502);
    assert.equal((await response.json()).ok, false);
    assert.deepEqual(h.timeouts, [12000]);
    assert(!JSON.stringify(h.logs).includes(error.message));
  }
});
test("accepted enquiry normalizes reply address and preserves the configured recipient", async () => {
  const h = harness();
  const response = await h.POST(request());
  assert.deepEqual(await response.json(), {
    ok: true,
    data: { delivered: true },
  });
  assert.equal(h.calls.length, 1);
  const body = JSON.parse(h.calls[0].options.body);
  assert.equal(body.to, "inbox@example.com");
  assert.equal(body.reply_to, "test@example.com");
  assert(body.text.includes(enquiry.message));
  assert(!JSON.stringify(h.logs).includes(enquiry.email));
  assert(!JSON.stringify(h.logs).includes(enquiry.name));
  assert(!JSON.stringify(h.logs).includes(enquiry.message));
});
test("legacy recipient configuration is supported", async () => {
  const h = harness({
    env: { RESEND_API_KEY: "test", RESEND_TO_EMAIL: "legacy@example.com" },
  });
  assert.equal((await h.POST(request())).status, 200);
  assert.equal(JSON.parse(h.calls[0].options.body).to, "legacy@example.com");
});
test("IP and email limits block delivery", async () => {
  for (const config of [{ limited: true }, { emailLimited: true }]) {
    const h = harness(config);
    const response = await h.POST(request());
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "30");
    assert.equal(h.calls.length, 0);
  }
});
test("honeypot silently discards automated submissions", async () => {
  const h = harness();
  assert.equal((await h.POST(request({ ...enquiry, _hp: "bot" }))).status, 200);
  assert.equal(h.calls.length, 0);
});
