import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeRelease } from "./releases.ts";
import { requirementsFor } from "./release-requirements.ts";
import { downloadOptions } from "../app/(marketing)/download/download-options.ts";

// Independent source of the approved identities; production code never imports
// the full audit record. No network requests or real downloads in these tests.
const audit = JSON.parse(
  readFileSync(
    new URL("../../docs/release-integrity-v2.3.1.json", import.meta.url),
    "utf8",
  ),
);
function reviewedRelease() {
  const repo = "https://github.com/Algorithms-Mathematics-Society/ams-access";
  return normalizeRelease({
    id: audit.releaseId,
    tag_name: audit.version,
    published_at: audit.publishedAt,
    draft: false,
    prerelease: false,
    html_url: repo + "/releases/tag/" + audit.version,
    assets: audit.installers.map((asset) => ({
      id: asset.assetId,
      name: asset.filename,
      state: "uploaded",
      size: asset.actualBytes,
      digest: "sha256:" + asset.actualSha256,
      browser_download_url:
        repo + "/releases/download/" + audit.version + "/" + asset.filename,
    })),
  });
}
const slots = [
  ["windows", "msi"],
  ["windows", "exe"],
  ["linux", "appimage"],
  ["linux", "deb"],
  ["linux", "rpm"],
  ["macos", "arm64"],
  ["macos", "x64"],
];
test("requirements apply to exactly the independently audited release and all seven installers", () => {
  const release = reviewedRelease();
  assert.equal(
    requirementsFor(release).macos,
    "macOS 12 or later · Apple silicon or Intel",
  );
  assert(downloadOptions(release)[0].requirement.includes("Intel / AMD"));
});
test("either reviewed Mac DMG can occupy the generic compatibility alias", () => {
  for (const architecture of ["x64", "arm64"]) {
    const release = reviewedRelease();
    release.macos.dmg = release.macos[architecture];
    assert(requirementsFor(release));
  }
});
test("missing release, unknown version and recreated same-tag releases do not inherit requirements", () => {
  for (const release of [
    null,
    undefined,
    { ...reviewedRelease(), version: "v2.3.2" },
    { ...reviewedRelease(), id: audit.releaseId + 1 },
  ])
    assert.equal(requirementsFor(release), undefined);
});
test("every changed installer identity invalidates the reviewed requirements", () => {
  for (const [platform, slot] of slots) {
    for (const [field, value] of [
      ["id", 1],
      ["label", "Replacement.exe"],
      ["size", 1],
      ["sha256", "ab".repeat(32)],
      ["architecture", "universal"],
      ["sha256", undefined],
    ]) {
      const release = reviewedRelease();
      release[platform][slot] = { ...release[platform][slot], [field]: value };
      assert.equal(
        requirementsFor(release),
        undefined,
        platform + "." + slot + "." + field,
      );
    }
  }
});
test("missing installers, extra exposed slots and altered Mac aliases remain unconfirmed", () => {
  for (const [platform, slot] of slots) {
    const release = reviewedRelease();
    delete release[platform][slot];
    assert.equal(requirementsFor(release), undefined, platform + "." + slot);
  }
  for (const alter of [
    (release) => {
      release.macos.universal = {
        ...release.macos.x64,
        architecture: "universal",
      };
    },
    (release) => {
      release.windows.extra = release.windows.exe;
    },
    (release) => {
      release.macos.dmg = { ...release.macos.x64, id: 1 };
    },
    (release) => {
      delete release.macos.dmg;
    },
  ]) {
    const release = reviewedRelease();
    alter(release);
    assert.equal(requirementsFor(release), undefined);
  }
});
test("same-tag ARM replacement cannot display the reviewed Intel-only packaging summary", () => {
  const release = reviewedRelease();
  release.windows.exe = {
    ...release.windows.exe,
    id: 999,
    label: "AMS.Access_2.3.1_arm64-setup.exe",
    architecture: "arm64",
  };
  const option = downloadOptions(release)[0];
  assert.equal(option.requirement, "Check the installer architecture below");
  assert.match(option.files[0].detail, /ARM64/);
  assert(!option.requirement.includes("Intel"));
  assert(!downloadOptions(release)[1].requirement.includes("12"));
});
