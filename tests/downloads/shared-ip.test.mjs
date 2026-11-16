// A finals room shares one campus NAT address: these tests pin that a full
// room can download at once without tripping our limiter or GitHub's, while a
// stale page still never redirects to a different file.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";
import {
  downloadHref,
  parseDownloadIdentity,
  resolveDownload,
} from "../../src/lib/release-download.ts";

const repository =
  "https://github.com/Algorithms-Mathematics-Society/ams-access";
const ROOM = 150;

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
const releasesCode = compile("../../src/lib/releases.ts");
const downloadCode = compile("../../src/app/api/releases/download/route.ts");
const rateLimitCode = compile("../../src/lib/server/rateLimit.ts");

function rawRelease(tag = "v2.3.1", id = 1, assetId = 10) {
  const name = `AMS.Access_${tag.slice(1)}_x64-setup.exe`;
  return {
    id,
    tag_name: tag,
    published_at: "2026-10-08T12:00:00Z",
    html_url: `${repository}/releases/tag/${tag}`,
    draft: false,
    prerelease: false,
    assets: [
      {
        id: assetId,
        name,
        size: 7613680,
        state: "uploaded",
        digest: "sha256:" + "ab".repeat(32),
        browser_download_url: `${repository}/releases/download/${tag}/${name}`,
      },
    ],
  };
}

// Real releases module with a controllable clock and a slow, counted upstream.
function releasesHarness() {
  const state = {
    payload: rawRelease(),
    status: 200,
    calls: 0,
    now: 1_000_000,
  };
  const clock = state;
  class FakeDate extends Date {
    static now() {
      return clock.now;
    }
  }
  const context = createContext({
    exports: {},
    URL,
    Date: FakeDate,
    process: { env: {} },
    AbortSignal,
    fetch: async () => {
      state.calls++;
      const body = JSON.stringify(state.payload);
      const status = state.status;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response(body, { status });
    },
  });
  runInContext(releasesCode, context);
  return { releases: context.exports, state };
}

function routeHarness(releases) {
  const mocks = {
    "next/server": {
      NextResponse: class extends Response {
        static redirect(url) {
          return new Response(null, {
            status: 307,
            headers: { Location: url },
          });
        }
      },
    },
    "@/lib/release-download": { parseDownloadIdentity, resolveDownload },
    "@/lib/releases": releases,
    "@/lib/server/http": {
      apiRateLimited: (seconds) =>
        new Response(null, {
          status: 429,
          headers: { "Retry-After": String(seconds) },
        }),
    },
    "@/lib/server/rateLimit": {
      checkRequestRateLimitAsync: async (_request, policy) => {
        assert.equal(policy, "releaseDownload");
        return { limited: false, remaining: 1, retryAfter: 60 };
      },
    },
  };
  const context = createContext({
    exports: {},
    require: (name) => {
      assert(name in mocks, "Unexpected dependency: " + name);
      return mocks[name];
    },
  });
  runInContext(downloadCode, context);
  return (query) =>
    context.exports.GET({
      nextUrl: new URL("https://app.example/api/releases/download?" + query),
    });
}

function queryFor(latest) {
  return new URL(
    downloadHref(latest, latest.windows.exe, "windows", "exe"),
    "https://app.example",
  ).search.slice(1);
}

test("a full room downloading at once costs one GitHub API call", async () => {
  const { releases, state } = releasesHarness();
  const page = await releases.fetchLatestRelease();
  state.calls = 0;
  const get = routeHarness(releases);
  const responses = await Promise.all(
    Array.from({ length: ROOM }, () => get(queryFor(page))),
  );
  assert.equal(state.calls, 1);
  for (const response of responses) {
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), page.windows.exe.url);
  }
  // Later clicks within the window reuse the snapshot.
  state.now += 29_000;
  assert.equal((await get(queryFor(page))).status, 307);
  assert.equal(state.calls, 1);
  // After the window the next download rechecks upstream.
  state.now += 2_000;
  assert.equal((await get(queryFor(page))).status, 307);
  assert.equal(state.calls, 2);
});

test("a stale page is still refused after a new release, through the cache", async () => {
  const { releases, state } = releasesHarness();
  const stalePage = await releases.fetchLatestRelease();
  const get = routeHarness(releases);
  state.payload = rawRelease("v2.3.2", 2, 11);
  state.calls = 0;
  const responses = await Promise.all(
    Array.from({ length: ROOM }, () => get(queryFor(stalePage))),
  );
  for (const response of responses) {
    assert.equal(response.status, 409);
    assert.equal(response.headers.get("location"), null);
  }
  // The fresh snapshot is younger than the recheck floor, so no second call.
  assert.equal(state.calls, 1);
});

test("a cached snapshot never redirects a stale page to a newer file", async () => {
  const { releases, state } = releasesHarness();
  const stalePage = await releases.fetchLatestRelease();
  const get = routeHarness(releases);
  // Warm the cache with the old release, then publish a new one upstream.
  assert.equal((await get(queryFor(stalePage))).status, 307);
  state.payload = rawRelease("v2.3.2", 2, 11);
  const freshPage = await releases.fetchLatestRelease();
  state.calls = 0;
  state.now += 10_000;
  // Old page: cached snapshot still names the exact file that page showed.
  const old = await get(queryFor(stalePage));
  assert.equal(old.status, 307);
  assert.equal(old.headers.get("location"), stalePage.windows.exe.url);
  assert.equal(state.calls, 0);
  // New page against an old snapshot: one recheck, then the exact new file.
  const fresh = await get(queryFor(freshPage));
  assert.equal(fresh.status, 307);
  assert.equal(fresh.headers.get("location"), freshPage.windows.exe.url);
  assert.notEqual(freshPage.windows.exe.url, stalePage.windows.exe.url);
  assert.equal(state.calls, 1);
  // Now the old page is refused.
  assert.equal((await get(queryFor(stalePage))).status, 409);
});

test("upstream failures are not cached and concurrent retries share one call", async () => {
  const { releases, state } = releasesHarness();
  state.status = 403;
  const results = await Promise.all(
    Array.from({ length: ROOM }, () => releases.fetchRecentRelease()),
  );
  assert(results.every((r) => r === null));
  assert.equal(state.calls, 1);
  state.status = 200;
  assert.equal((await releases.fetchRecentRelease()).version, "v2.3.1");
  assert.equal(state.calls, 2);
});

function limiterHarness() {
  const context = createContext({
    exports: {},
    globalThis: {},
    console,
    process: { env: {} },
    require: (name) => {
      if (name === "@/lib/server/request")
        return { getClientIp: (request) => request.ip };
      if (name === "@upstash/ratelimit") return { Ratelimit: class {} };
      if (name === "@upstash/redis") return { Redis: class {} };
      throw new Error("Unexpected dependency: " + name);
    },
  });
  runInContext(rateLimitCode, context);
  const check = (ip, policy) =>
    context.exports.checkRequestRateLimitAsync({ ip }, policy, [
      "release-download",
    ]);
  return { check, policies: context.exports.rateLimitPolicies };
}

test("one campus NAT address can serve a 150 person room, with retries", async () => {
  const { check, policies } = limiterHarness();
  const campus = "203.0.113.7";
  // Each candidate: a refresh plus up to three download clicks within a minute.
  for (let i = 0; i < ROOM * 4; i++) {
    const result = await check(campus, "releaseDownload");
    assert.equal(result.limited, false, `request ${i + 1}`);
  }
  assert.equal(ROOM * 4, policies.releaseDownload.limit);
  // Above the cap the address is still limited, and others are unaffected.
  const over = await check(campus, "releaseDownload");
  assert.equal(over.limited, true);
  assert(over.retryAfter >= 1);
  assert.equal((await check("198.51.100.9", "releaseDownload")).limited, false);
});

test("other public routes keep their tighter limit", async () => {
  const { check, policies } = limiterHarness();
  assert.deepEqual({ ...policies.publicRead }, { limit: 30, windowMs: 60_000 });
  for (let i = 0; i < 30; i++)
    assert.equal((await check("203.0.113.7", "publicRead")).limited, false);
  assert.equal((await check("203.0.113.7", "publicRead")).limited, true);
});
