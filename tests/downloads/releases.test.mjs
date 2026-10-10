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
let nextAssetId = 10;
function asset(name, size = 1024) {
  return {
    name,
    size,
    id: nextAssetId++,
    state: "uploaded",
    digest: "sha256:" + "ab".repeat(32),
    browser_download_url: `${repository}/releases/download/v2.3.1/${name}`,
  };
}
function release(
  assets = [
    asset("AMS.Access-2.3.1-1.x86_64.rpm", 9001238),
    asset("AMS.Access_2.3.1_aarch64.dmg", 10020521),
    asset("AMS.Access_2.3.1_amd64.AppImage", 86985208),
    asset("AMS.Access_2.3.1_amd64.deb", 9001878),
    asset("AMS.Access_2.3.1_x64-setup.exe", 7613680),
    asset("AMS.Access_2.3.1_x64.dmg", 10552426),
    asset("AMS.Access_2.3.1_x64_en-US.msi", 9150464),
  ],
) {
  return {
    id: 1,
    tag_name: "v2.3.1",
    name: "AMS Access 2.3.1",
    published_at: "2026-10-08T12:00:00Z",
    html_url: `${repository}/releases/tag/v2.3.1`,
    draft: false,
    prerelease: false,
    assets,
  };
}
function releaseHarness(payload = release(), { status = 200, error } = {}) {
  const requests = [],
    timeouts = [];
  const context = createContext({
    exports: {},
    URL,
    process: { env: {} },
    AbortSignal: {
      timeout: (ms) => {
        timeouts.push(ms);
        return AbortSignal.timeout(ms);
      },
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (error) throw error;
      return new Response(JSON.stringify(payload), { status });
    },
  });
  runInContext(releasesCode, context);
  return { ...context.exports, requests, timeouts };
}
function downloadHarness(latest, { limited = false } = {}) {
  let fetchCount = 0;
  const mocks = {
    "next/server": {
      NextResponse: class extends Response {
        static json(body, init) {
          return Response.json(body, init);
        }
        static redirect(url) {
          return new Response(null, {
            status: 307,
            headers: { Location: url },
          });
        }
      },
    },
    "@/lib/release-download": { parseDownloadIdentity, resolveDownload },
    "@/lib/releases": {
      fetchLatestRelease: async (options) => {
        assert.equal(options.fresh, true);
        fetchCount++;
        return latest;
      },
    },
    "@/lib/server/http": {
      apiRateLimited: (seconds) =>
        Response.json(
          { error: "Rate limited." },
          {
            status: 429,
            headers: { "Retry-After": String(seconds) },
          },
        ),
    },
    "@/lib/server/rateLimit": {
      checkRequestRateLimitAsync: async () => ({ limited, retryAfter: 30 }),
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
  return {
    get: (query) =>
      context.exports.GET({
        nextUrl: new URL("https://app.example/api/releases/download?" + query),
      }),
    fetchCount: () => fetchCount,
  };
}

test("latest release preserves both Mac builds and all published package formats", async () => {
  const h = releaseHarness();
  const result = await h.fetchLatestRelease();
  assert.equal(result.version, "v2.3.1");
  assert.equal(result.macos.arm64.label, "AMS.Access_2.3.1_aarch64.dmg");
  assert.equal(result.macos.arm64.architecture, "arm64");
  assert.equal(result.macos.x64.label, "AMS.Access_2.3.1_x64.dmg");
  assert.equal(result.macos.x64.architecture, "x64");
  assert.equal(result.macos.dmg.label, result.macos.arm64.label);
  assert.equal(result.macos.universal, undefined);
  for (const item of [
    result.windows.msi,
    result.windows.exe,
    result.linux.appimage,
    result.linux.deb,
    result.linux.rpm,
  ])
    assert.equal(item.architecture, "x64");
  assert.deepEqual(h.timeouts, [10000]);
  assert(h.requests[0].options.signal instanceof AbortSignal);
});

test("architecture parser handles explicit aliases and does not invent unknown architecture", async () => {
  for (const [filename, expected] of [
    ["Access_arm64.dmg", "arm64"],
    ["Access_aarch64.dmg", "arm64"],
    ["Access_amd64.dmg", "x64"],
    ["Access_x86_64.dmg", "x64"],
    ["Access_x64.dmg", "x64"],
    ["Access_universal.dmg", "universal"],
    ["Access.dmg", undefined],
    ["Access_arm64ish.dmg", undefined],
  ]) {
    const value = await releaseHarness(
      release([asset(filename)]),
    ).fetchLatestRelease();
    assert.equal(value.macos.dmg.architecture, expected, filename);
    if (expected) assert.equal(value.macos[expected].label, filename);
  }
});

test("malformed or unsafe assets are omitted without discarding valid downloads", async () => {
  const base = asset("Access_x64.dmg");
  const bad = [
    null,
    {},
    { ...base, size: -1 },
    { ...base, size: "1024" },
    { ...base, size: 1.5 },
    { ...base, browser_download_url: "javascript:alert(1)" },
    {
      ...base,
      browser_download_url:
        "https://github.com/another/repo/releases/download/v1/file.dmg",
    },
    {
      ...base,
      browser_download_url: base.browser_download_url + "?token=sensitive",
    },
    asset("Access_x64.dmg.sig"),
  ];
  const result = await releaseHarness(
    release([...bad, asset("Access_arm64.dmg")]),
  ).fetchLatestRelease();
  assert.equal(result.macos.x64, undefined);
  assert.equal(result.macos.arm64.label, "Access_arm64.dmg");
});

test("invalid release metadata, drafts, prereleases, and upstream failures have no latest release", async () => {
  for (const payload of [
    null,
    [],
    {},
    { ...release(), tag_name: "" },
    { ...release(), published_at: "not a date" },
    { ...release(), assets: {} },
    { ...release(), html_url: "https://example.com/release" },
    { ...release(), draft: true },
    { ...release(), prerelease: true },
  ])
    assert.equal(await releaseHarness(payload).fetchLatestRelease(), null);
  assert.equal(
    await releaseHarness({}, { status: 503 }).fetchLatestRelease(),
    null,
  );
  assert.equal(
    await releaseHarness(
      {},
      { error: new DOMException("Timed out", "TimeoutError") },
    ).fetchLatestRelease(),
    null,
  );
});

test("public release metadata does not expose private release prose", async () => {
  const h = releaseHarness({
    ...release(),
    name: "Internal operational title",
    body: "Private operational notes",
  });
  const result = await h.fetchLatestRelease();
  assert.equal(result.name, "v2.3.1");
  assert.equal(result.notes, undefined);
  assert(!JSON.stringify(result).includes("Internal operational"));
  assert(!JSON.stringify(result).includes("Private operational"));
  assert.deepEqual(h.timeouts, [10000]);
});

function boundQuery(latest, platform, type, architecture) {
  const selected =
    platform === "macos" && architecture
      ? latest.macos[architecture]
      : latest[platform][type];
  return new URL(
    downloadHref(latest, selected, platform, type),
    "https://app.example",
  ).search.slice(1);
}

test("architecture-specific Mac requests select exact bound installers; legacy links require refresh", async () => {
  const latest = await releaseHarness().fetchLatestRelease();
  const h = downloadHarness(latest);
  for (const architecture of ["arm64", "x64"]) {
    const response = await h.get(
      boundQuery(latest, "macos", "dmg", architecture),
    );
    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      latest.macos[architecture].url,
    );
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  const before = h.fetchCount();
  const legacy = await h.get("platform=macos&type=dmg");
  assert.equal(legacy.status, 400);
  assert.equal(legacy.headers.get("location"), null);
  assert.equal(legacy.headers.get("cache-control"), "no-store");
  assert.match(await legacy.text(), /Refresh downloads/);
  assert.equal(h.fetchCount(), before);
});

test("unavailable or mismatched architecture never redirects to a different installer", async () => {
  const latest = await releaseHarness().fetchLatestRelease();
  const h = downloadHarness(latest);
  for (const [platform, type, existing, requested] of [
    ["macos", "dmg", "arm64", "universal"],
    ["windows", "exe", undefined, "arm64"],
    ["linux", "deb", undefined, "arm64"],
  ]) {
    const params = new URLSearchParams(
      boundQuery(latest, platform, type, existing),
    );
    params.set("architecture", requested);
    const response = await h.get(params.toString());
    assert.equal(response.status, 409);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal((await h.get(boundQuery(latest, "windows", "exe"))).status, 307);
  const missing = downloadHarness(null);
  assert.equal(
    (await missing.get(boundQuery(latest, "macos", "dmg", "arm64"))).status,
    503,
  );
  const unknown = await releaseHarness(
    release([asset("Access.dmg")]),
  ).fetchLatestRelease();
  const params = new URLSearchParams(boundQuery(unknown, "macos", "dmg"));
  params.set("architecture", "x64");
  assert.equal(
    (await downloadHarness(unknown).get(params.toString())).status,
    409,
  );
});

test("invalid parameters are rejected before fetching release metadata", async () => {
  const h = downloadHarness(null);
  for (const query of [
    "",
    "platform=android&type=exe",
    "platform=windows&type=dmg",
    "platform=macos&type=dmg&architecture=",
    "platform=macos&type=dmg&architecture=other",
    "platform=macos&type=dmg&architecture=__proto__",
  ]) {
    const response = await h.get(query);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(h.fetchCount(), 0);
});

test("rate limiting rejects valid bound requests before contacting GitHub", async () => {
  const latest = await releaseHarness().fetchLatestRelease();
  const h = downloadHarness(null, { limited: true });
  const response = await h.get(boundQuery(latest, "macos", "dmg", "arm64"));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "30");
  assert.equal(h.fetchCount(), 0);
});

test("replacement releases, replaced assets and changed checksums cannot redirect stale links", async () => {
  const latest = await releaseHarness().fetchLatestRelease();
  const query = boundQuery(latest, "windows", "exe");
  for (const changed of [
    { ...latest, id: 2 },
    { ...latest, version: "v2.3.2" },
    { ...latest, windows: {} },
    { ...latest, windows: { exe: { ...latest.windows.exe, id: 999 } } },
    {
      ...latest,
      windows: { exe: { ...latest.windows.exe, sha256: "cd".repeat(32) } },
    },
  ]) {
    const response = await downloadHarness(changed).get(query);
    assert.equal(response.status, 409);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(await response.text(), /This download has changed/);
  }
});
