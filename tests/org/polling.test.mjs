import test from "node:test";
import assert from "node:assert/strict";
import {
  ORG_SIGNED_OUT_EVENT,
  orgBackoffMs,
  orgSignedOut,
  observeOrgApiResponses,
  pauseOrgPolling,
  reportOrgResponse,
  resumeOrgPolling,
  startOrgPolling,
} from "../../src/lib/client/orgPolling.ts";

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

test("polling waits for completion, pauses hidden, resumes once and cleans up pending work", async () => {
  const original = {
    document: globalThis.document,
    window: globalThis.window,
    setTimeout,
    clearTimeout,
  };
  const document = new EventTarget();
  document.visibilityState = "visible";
  const window = new EventTarget();
  const timers = new Map();
  let timerId = 0;
  globalThis.document = document;
  globalThis.window = window;
  globalThis.setTimeout = (fn, delay) => {
    timers.set(++timerId, { fn, delay });
    return timerId;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  let calls = 0;
  let finish;
  let stop;
  try {
    stop = startOrgPolling(() => {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    }, 2000);
    assert.equal(calls, 1);
    window.dispatchEvent(new Event("focus"));
    assert.equal(calls, 1, "focus does not overlap a slow request");
    assert.equal(timers.size, 0, "no interval starts before completion");
    finish();
    await flush();
    assert.equal(timers.size, 1);
    assert.equal([...timers.values()][0].delay, 2000);
    document.visibilityState = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
    assert.equal(timers.size, 0);
    window.dispatchEvent(new Event("focus"));
    assert.equal(calls, 1);
    document.visibilityState = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
    assert.equal(calls, 2);
    stop();
    finish();
    await flush();
    assert.equal(timers.size, 0, "completion after unmount cannot reschedule");
    window.dispatchEvent(new Event("focus"));
    assert.equal(calls, 2);
  } finally {
    stop?.();
    Object.assign(globalThis, original);
  }
});

test("failed reads still schedule a retry and inactive contests never schedule periodic reads", async () => {
  const original = {
    document: globalThis.document,
    window: globalThis.window,
    setTimeout,
    clearTimeout,
  };
  globalThis.document = Object.assign(new EventTarget(), {
    visibilityState: "visible",
  });
  globalThis.window = new EventTarget();
  const timers = new Map();
  let nextId = 0;
  let stop;
  globalThis.setTimeout = (fn, delay) => {
    timers.set(++nextId, { fn, delay });
    return nextId;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  try {
    stop = startOrgPolling(async () => {
      throw new Error("offline");
    }, 3000);
    await flush();
    assert.equal(timers.size, 1);
    stop();
    assert.equal(timers.size, 0);
    stop = startOrgPolling(async () => {}, null);
    await flush();
    assert.equal(timers.size, 0);
  } finally {
    stop?.();
    Object.assign(globalThis, original);
  }
});

test("backoff starts on the second failure, doubles, caps at a minute and never drops below the cadence", () => {
  assert.equal(orgBackoffMs(3000, 0), 3000);
  assert.equal(
    orgBackoffMs(3000, 1),
    3000,
    "one failure retries on the normal cadence",
  );
  assert.equal(orgBackoffMs(3000, 2), 6000);
  assert.equal(orgBackoffMs(3000, 4), 24000);
  assert.equal(orgBackoffMs(3000, 9), 60000);
  assert.equal(orgBackoffMs(120000, 4), 120000, "a slow poll is not shortened");
});

function fakeRuntime() {
  const original = {
    document: globalThis.document,
    window: globalThis.window,
    setTimeout,
    clearTimeout,
  };
  globalThis.document = Object.assign(new EventTarget(), {
    visibilityState: "visible",
  });
  globalThis.window = new EventTarget();
  const timers = new Map();
  let nextId = 0;
  globalThis.setTimeout = (fn, delay) => {
    timers.set(++nextId, { fn, delay });
    return nextId;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  const delay = () => [...timers.values()][0]?.delay;
  const fire = async () => {
    const [[id, { fn }]] = [...timers];
    timers.delete(id);
    fn();
    await flush();
  };
  return {
    timers,
    delay,
    fire,
    restore: () => Object.assign(globalThis, original),
  };
}

test("failed reads back off, focus cannot bypass the backoff, and success restores the cadence", async () => {
  const rt = fakeRuntime();
  let stop;
  let fail = true;
  let calls = 0;
  try {
    stop = startOrgPolling(async () => {
      calls++;
      if (fail) throw new Error("offline");
    }, 2000);
    await flush();
    assert.equal(rt.delay(), 2000);
    await rt.fire();
    assert.equal(rt.delay(), 4000);
    await rt.fire();
    assert.equal(rt.delay(), 8000);
    window.dispatchEvent(new Event("focus"));
    await flush();
    assert.equal(calls, 3, "focus waits out the backoff");
    fail = false;
    await rt.fire();
    assert.equal(rt.delay(), 2000);
  } finally {
    stop?.();
    rt.restore();
  }
});

test("handled read errors back off and a successful read restores the cadence", async () => {
  const rt = fakeRuntime();
  let stop;
  let status = 503;
  try {
    stop = startOrgPolling(async () => {
      return status < 400 || status === 403;
    }, 2000);
    await flush();
    assert.equal(rt.delay(), 2000);
    await rt.fire();
    assert.equal(rt.delay(), 4000);
    await rt.fire();
    assert.equal(rt.delay(), 8000);
    status = 200;
    await rt.fire();
    assert.equal(rt.delay(), 2000, "one healthy response restores the cadence");
    status = 403;
    await rt.fire();
    assert.equal(rt.delay(), 2000, "a refusal is not an outage");
  } finally {
    stop?.();
    rt.restore();
  }
});

test("a 401 pauses every poller once, and a confirmed re-sign-in resumes them", async () => {
  const rt = fakeRuntime();
  let stop;
  let calls = 0;
  let announced = 0;
  try {
    window.addEventListener(ORG_SIGNED_OUT_EVENT, () => announced++);
    stop = startOrgPolling(async () => {
      calls++;
      if (calls === 1) reportOrgResponse(401);
    }, 2000);
    await flush();
    assert.equal(orgSignedOut(), true);
    assert.equal(rt.timers.size, 0, "no further reads while signed out");
    reportOrgResponse(401);
    assert.equal(announced, 1, "announced once");
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    await flush();
    assert.equal(calls, 1);
    resumeOrgPolling();
    await flush();
    assert.equal(calls, 2);
    assert.equal(orgSignedOut(), false);
    assert.equal(rt.delay(), 2000);
  } finally {
    stop?.();
    rt.restore();
  }
});

test("a poller that reports a handled failure backs off independently of healthy polls", async () => {
  const rt = fakeRuntime();
  let stop;
  let healthy;
  try {
    stop = startOrgPolling(async () => false, 2000);
    healthy = startOrgPolling(async () => {}, null);
    await flush();
    await rt.fire();
    assert.equal(rt.delay(), 4000);
    await rt.fire();
    assert.equal(rt.delay(), 8000);
  } finally {
    stop?.();
    healthy?.();
    rt.restore();
  }
});

test("short polling cadences also reach the full backoff cap", () => {
  assert.equal(orgBackoffMs(1000, 20), 60000);
});

test("local expiry cancels pending polls without waiting for a 401", async () => {
  const rt = fakeRuntime();
  let stop;
  try {
    stop = startOrgPolling(async () => {}, 2000);
    await flush();
    assert.equal(rt.timers.size, 1);
    pauseOrgPolling();
    assert.equal(rt.timers.size, 0);
    assert.equal(orgSignedOut(), true);
  } finally {
    stop?.();
    resumeOrgPolling();
    rt.restore();
  }
});

test("response observer scopes staff auth, preserves other wrappers and becomes inert on cleanup", async () => {
  const rt = fakeRuntime();
  let cleanup;
  const calls = [];
  const original = async (...args) => {
    calls.push(args);
    return new Response("{}", { status: 401 });
  };
  window.location = {
    href: "https://ams.test/org/dashboard",
    origin: "https://ams.test",
  };
  window.fetch = original;
  try {
    cleanup = observeOrgApiResponses();
    const observed = window.fetch;
    await observed("/api/auth/login");
    await observed("/api/public/example");
    await observed("https://other.test/api/org/contests");
    assert.equal(
      orgSignedOut(),
      false,
      "unrelated 401s do not expire staff sessions",
    );
    await observed(new Request("https://ams.test/api/org/contests"));
    assert.equal(orgSignedOut(), true);
    resumeOrgPolling();
    const later = (...args) => observed(...args);
    window.fetch = later;
    cleanup();
    assert.equal(window.fetch, later, "cleanup preserves a later wrapper");
    await later("/api/auth/me");
    assert.equal(
      orgSignedOut(),
      false,
      "a retained wrapper is inert after cleanup",
    );
    assert.equal(calls.length, 5);
    window.fetch = original;
    cleanup = observeOrgApiResponses();
    cleanup();
    assert.equal(
      window.fetch,
      original,
      "normal cleanup restores original fetch",
    );
  } finally {
    cleanup?.();
    resumeOrgPolling();
    rt.restore();
  }
});
