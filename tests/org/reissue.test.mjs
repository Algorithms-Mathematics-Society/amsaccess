import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const route = compile(readFileSync(new URL("../../src/app/api/org/contests/[uid]/participants/[loginId]/route.ts", import.meta.url), "utf8"));

test("proxy requests stored credentials and never caches passwords", async () => {
  const calls = [];
  const context = {
    exports: {}, URL,
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (data, options) => ({ data, ...options }) } };
      if (name.endsWith("/session")) return { requireSubject: async () => "staff" };
      if (name.endsWith("/amsApi")) return {
        callAmsApi: async (...args) => { calls.push(args); return { ok: true, data: { password: "synthetic-only" } }; },
        errorMessage: String,
      };
      throw Error(name);
    },
  };
  vm.runInNewContext(route, context);
  const send = (action) => context.exports.POST({ url: `https://portal.test/?action=${action}` }, { params: Promise.resolve({ uid: "contest", loginId: "candidate" }) });
  assert.equal((await send("unknown")).status, 400);
  assert.equal(calls.length, 0);
  for (let index = 0; index < 2; index++) {
    const result = await send("credentials");
    assert.equal(result.headers["Cache-Control"], "no-store");
    assert.equal(calls.at(-1)[1], "/contests/contest/participants/candidate/credentials");
    assert.equal(Object.keys(calls.at(-1)[2]).length, 0);
  }
});

const panel = readFileSync(new URL("../../src/components/org/ParticipantsPanel.tsx", import.meta.url), "utf8");
const start = panel.indexOf("  const act = useCallback(async (loginId:");
const end = panel.indexOf("\n  }, [contestUid, onChange]);", start);
assert.ok(start > 0 && end > start);
const action = compile(panel.slice(start, end + "\n  }, [contestUid, onChange]);".length) + "\nglobalThis.act = act;");

function harness(replies) {
  const calls = [], states = [], timers = [], signals = [];
  let sequence = 0;
  const context = {
    useCallback: (callback) => callback,
    mounted: { current: true }, pending: { current: new Set() },
    reissueLock: { current: false }, reissueRequestIds: { current: new Map() },
    unknownEmails: { current: new Set() }, acceptedEmails: { current: new Set() },
    requests: { current: new Set() }, contestUid: "contest", onChange() {},
    setReissueLocked() {}, setReissued() {}, setSelected() {},
    setActions: (update) => states.push(update({})),
    crypto: { randomUUID: () => `synthetic-request-${++sequence}` },
    AbortController, Error,
    window: { setTimeout: (callback) => { timers.push(callback); return timers.length; }, clearTimeout() {} },
    json: async (response) => { if (!response.ok) throw Error("Reissue already completed"); return response.json(); },
    fetch: async (_, options) => { calls.push(options.body); signals.push(options.signal); return replies.shift()(options); },
  };
  vm.runInNewContext(action, context);
  return { calls, states, timers, signals, locked: () => context.reissueLock.current, act: () => context.act("candidate", "credentials") };
}

test("a stalled credential response times out and allows a safe retry", async () => {
  let bodyStarted;
  const reading = new Promise((resolve) => { bodyStarted = resolve; });
  const h = harness([
    (options) => ({
      ok: true, status: 200,
      json: () => {
        bodyStarted();
        return new Promise((_, reject) => options.signal.addEventListener("abort", () => reject(Error("Body aborted"))));
      },
    }),
    () => ({ ok: false, status: 409 }),
  ]);
  const first = h.act();
  await reading;
  assert.equal(h.timers.length, 1);
  h.timers[0]();
  await first;
  assert.equal(h.signals[0].aborted, true);
  assert.equal(h.locked(), false);
  await h.act();
  assert.equal(h.calls[0], h.calls[1]);
});

test("interrupted retrieval and legacy conflict both release the UI lock", async () => {
  const h = harness([
    () => { throw Error("Connection lost"); },
    () => ({ ok: false, status: 409 }),
    () => ({ ok: true, status: 200, json: async () => ({ login_id: "candidate", password: "synthetic-only" }) }),
  ]);
  await h.act();
  assert.equal(h.calls.length, 1);
  await h.act();
  assert.equal(h.calls[0], h.calls[1]);
  assert.match(h.states.at(-1).candidate.error, /already completed/);
  await h.act();
  assert.equal(h.locked(), true);
  assert.equal(h.calls.length, 3);
});

test("an unreadable success allows another retrieval", async () => {
  const h = harness([
    () => ({ ok: true, status: 200, json: async () => ({}) }),
    () => ({ ok: false, status: 409 }),
  ]);
  await h.act(); await h.act();
  assert.equal(h.calls[0], h.calls[1]);
});

test("a malformed credential response never exposes parser contents in the UI", async () => {
  const h = harness([
    () => ({ ok: true, status: 200, json: async () => { throw Error("synthetic secret in parser detail"); } }),
  ]);
  await h.act();
  assert.match(h.states.at(-1).candidate.error, /Could not load credentials/);
  assert.doesNotMatch(h.states.at(-1).candidate.error, /synthetic secret/);
});

test("concurrent clicks send one mutation", async () => {
  let finish;
  const h = harness([() => new Promise((resolve) => { finish = resolve; })]);
  const first = h.act();
  await h.act();
  assert.equal(h.calls.length, 1);
  finish({ ok: false, status: 409 });
  await first;
});
