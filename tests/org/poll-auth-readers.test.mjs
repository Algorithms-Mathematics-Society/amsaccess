import test from "node:test";
import assert from "node:assert/strict";
import { createOrgSessionStore } from "../../src/lib/client/orgSessions.ts";
import { createContestReadStore } from "../../src/lib/client/contestReads.ts";
import {
  orgSignedOut,
  resumeOrgPolling,
} from "../../src/lib/client/orgPolling.ts";

for (const kind of ["sessions", "scoreboard"]) {
  test(`${kind} explicitly reports 401 and ignores a late response from a disposed read`, async () => {
    const original = {
      window: globalThis.window,
      document: globalThis.document,
      fetch: globalThis.fetch,
    };
    globalThis.window = new EventTarget();
    globalThis.document = Object.assign(new EventTarget(), {
      visibilityState: "visible",
    });
    let answer;
    globalThis.fetch = () =>
      new Promise((resolve) => {
        answer = resolve;
      });
    const create = () => {
      if (kind === "sessions") {
        const store = createOrgSessionStore("contest");
        const stop = store.subscribe(() => {}, false);
        return { read: () => store.refresh(), dispose: stop };
      }
      const store = createContestReadStore("contest");
      return {
        read: () => store.load("scoreboard"),
        dispose: () => store.dispose(),
      };
    };
    let source;
    try {
      resumeOrgPolling();
      source = create();
      const failed = source.read().catch(() => {});
      answer(new Response("not JSON", { status: 401 }));
      await failed;
      assert.equal(
        orgSignedOut(),
        true,
        "401 is detected even with a malformed response body",
      );
      source.dispose();
      await Promise.resolve();
      resumeOrgPolling();
      source = create();
      const stale = source.read().catch(() => {});
      source.dispose();
      await Promise.resolve();
      answer(new Response("{}", { status: 401 }));
      await stale;
      assert.equal(
        orgSignedOut(),
        false,
        "a departed source must not expire the current session",
      );
    } finally {
      source?.dispose();
      resumeOrgPolling();
      await Promise.resolve();
      Object.assign(globalThis, original);
    }
  });
}
