import test from "node:test";
import assert from "node:assert/strict";
import { architectureFromHints, detectDownloadDevice, readDownloadDevice } from "./download-platform.ts";
import { recommendDownload } from "./download-recommendation.ts";
import { downloadOptions } from "../app/(marketing)/download/download-options.ts";

let fixtureAssetId = 100;
const asset = (architecture) => ({ id: ++fixtureAssetId, sha256: "a".repeat(64), architecture, url: "https://example.invalid/installer", size: 1000, label: "installer" });
const release = {
  id: 1, version: "v2.3.1", name: "test", publishedAt: "2026-10-10T00:00:00Z", releaseUrl: "",
  windows: { exe: asset("x64"), msi: asset("x64") },
  macos: { arm64: asset("arm64"), x64: asset("x64") },
  linux: { appimage: asset("x64"), deb: asset("x64"), rpm: asset("x64") },
};
const options = downloadOptions(release);
const pick = (device, architecture, family = "", list = options) =>
  recommendDownload(list, { device, architecture }, family);

test("only explicit complete architecture hints produce a supported architecture", () => {
  assert.equal(architectureFromHints("arm", "64"), "arm64");
  assert.equal(architectureFromHints("x86", "64"), "x64");
  assert.equal(architectureFromHints("x86", "32"), "unsupported");
  assert.equal(architectureFromHints("arm", "32"), "unsupported");
  assert.equal(architectureFromHints("x86", ""), "unknown");
  assert.equal(architectureFromHints("", "64"), "unknown");
  assert.equal(architectureFromHints("other", "64"), "unsupported");
});
test("iPad desktop IDs, Android, ChromeOS and unrelated X11 do not become supported desktops", () => {
  assert.equal(detectDownloadDevice("Macintosh; Intel Mac OS X", "MacIntel", 5), "mobile");
  assert.equal(detectDownloadDevice("Linux; Android 15"), "mobile");
  assert.equal(detectDownloadDevice("X11; CrOS x86_64"), "unknown");
  assert.equal(detectDownloadDevice("X11; FreeBSD amd64"), "unknown");
});
test("Mac Intel user-agent text is never evidence of an Intel CPU", async () => {
  const result = await readDownloadDevice({ userAgent: "Macintosh; Intel Mac OS X", platform: "MacIntel" });
  assert.deepEqual(result, { device: "macos", architecture: "unknown" });
});
test("supported hints are read with their receiver and only required fields", async () => {
  const data = { async getHighEntropyValues(hints) {
    assert.equal(this, data);
    assert.deepEqual(hints, ["architecture", "bitness"]);
    return { architecture: "arm", bitness: "64" };
  }};
  assert.deepEqual(await readDownloadDevice({ userAgent: "Macintosh", userAgentData: data }),
    { device: "macos", architecture: "arm64" });
});
test("denied hints fall back to manual choice", async () => {
  const result = await readDownloadDevice({ userAgent: "Windows NT", userAgentData: {
    getHighEntropyValues() { return Promise.reject(new Error("denied")); },
  }});
  assert.equal(result.architecture, "unknown");
  assert.equal(pick(result.device, result.architecture).kind, "choose-chip");
});
test("slow hints do not block the chooser", async () => {
  const result = await readDownloadDevice({ userAgent: "Linux", userAgentData: {
    getHighEntropyValues() { return new Promise(() => {}); },
  }});
  assert.deepEqual(result, { device: "linux", architecture: "unknown" });
});
test("mobile browsers never request architecture hints", async () => {
  const result = await readDownloadDevice({ userAgent: "iPhone", userAgentData: {
    getHighEntropyValues() { assert.fail("must not request hints"); },
  }});
  assert.equal(result.device, "mobile");
  assert.equal(pick("mobile", "unknown").kind, "mobile");
});
test("Windows recommends EXE and preserves architecture in download URL", () => {
  const result = pick("windows", "x64");
  assert.equal(result.kind, "ready");
  assert.equal(result.file.format, "exe");
  assert.match(result.file.href, /architecture=x64/);
});
test("Windows falls back to matching MSI, never mismatched EXE", () => {
  const list = downloadOptions({ ...release, windows: { exe: asset("arm64"), msi: asset("x64") } });
  assert.equal(pick("windows", "x64", "", list).file.format, "msi");
});
test("Mac selects the correct chip", () => {
  assert.equal(pick("macos", "arm64").file.architecture, "arm64");
  assert.equal(pick("macos", "x64").file.architecture, "x64");
  assert.equal(pick("macos", "unknown").kind, "choose-chip");
});
test("published Universal Mac supports an unknown chip", () => {
  const list = downloadOptions({ ...release, macos: { universal: asset("universal") } });
  assert.equal(pick("macos", "unknown", "", list).file.architecture, "universal");
});
test("unknown DMG architecture never means Universal", () => {
  const list = downloadOptions({ ...release, macos: { dmg: asset(undefined) } });
  assert.equal(pick("macos", "arm64", "", list).kind, "unavailable");
  assert.equal(pick("macos", "unknown", "", list).kind, "choose-chip");
});
test("missing Mac architecture does not select the other chip", () => {
  const list = downloadOptions({ ...release, macos: { x64: asset("x64") } });
  assert.equal(pick("macos", "arm64", "", list).kind, "unavailable");
});
test("Linux asks distribution and maps exact package", () => {
  assert.equal(pick("linux", "x64").kind, "choose-linux");
  for (const family of ["deb", "rpm", "appimage"])
    assert.equal(pick("linux", "x64", family).file.format, family);
});
test("missing DEB does not silently recommend RPM or AppImage", () => {
  const list = downloadOptions({ ...release, linux: { rpm: asset("x64"), appimage: asset("x64") } });
  assert.equal(pick("linux", "x64", "deb", list).kind, "unavailable");
});
test("Linux ARM cannot receive an x64 recommendation", () => {
  assert.equal(pick("linux", "arm64", "deb").kind, "unavailable");
});
test("known unsupported processors and unknown OS never get a recommendation", () => {
  for (const platform of ["windows", "macos", "linux"])
    assert.equal(pick(platform, "unsupported").kind, "unavailable");
  assert.equal(pick("unknown", "unknown").kind, "choose-system");
});
test("missing release and platform builds stay unavailable", () => {
  assert.equal(pick("windows", "x64", "", downloadOptions(null)).kind, "unavailable");
  assert.equal(pick("mobile", "unknown", "", downloadOptions(null)).kind, "unavailable");
  const list = downloadOptions({ ...release, windows: {} });
  assert.equal(pick("windows", "x64", "", list).kind, "unavailable");
});
test("all recommendations are existing options with matching architecture", () => {
  for (const device of ["windows", "macos", "linux"])
    for (const architecture of ["x64", "arm64", "unknown", "unsupported"])
      for (const family of ["", "deb", "rpm", "appimage"]) {
        const result = pick(device, architecture, family);
        if (!result.file) continue;
        const option = options.find((item) => item.id === device);
        assert([...option.files, ...option.alternatives].includes(result.file));
        assert.equal(result.file.architecture, architecture);
        assert.equal(new URL(result.file.href, "https://app.amsaccess.com").pathname, "/api/releases/download");
      }
});
