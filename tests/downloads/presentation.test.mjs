import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

function compile(path) {
  const context = createContext({ exports: {}, URLSearchParams });
  runInContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    context,
  );
  return context.exports;
}
const { detectDownloadDevice } = compile("../../src/lib/download-platform.ts");
const { downloadOptions } = compile(
  "../../src/app/(marketing)/download/download-options.ts",
);

test("mobile and tablet browsers never receive a desktop recommendation", () => {
  assert.equal(
    detectDownloadDevice("Mozilla Linux Android", "Linux armv8l", 5),
    "mobile",
  );
  assert.equal(
    detectDownloadDevice("Mozilla iPhone Mac OS X", "iPhone", 5),
    "mobile",
  );
  assert.equal(
    detectDownloadDevice("Mozilla Macintosh Intel Mac OS X", "MacIntel", 5),
    "mobile",
  );
});
test("desktop detection does not infer a Mac processor or recommend Linux on ChromeOS", () => {
  assert.equal(detectDownloadDevice("Mozilla Windows NT 10.0"), "windows");
  assert.equal(
    detectDownloadDevice("Mozilla Macintosh Intel Mac OS X", "MacIntel", 0),
    "macos",
  );
  assert.equal(detectDownloadDevice("Mozilla X11 Linux x86_64"), "linux");
  assert.equal(detectDownloadDevice("Mozilla X11 CrOS x86_64"), "unknown");
  assert.equal(detectDownloadDevice(""), "unknown");
});
function asset(architecture) {
  return {
    url: "https://example.invalid/private-metadata",
    size: 10_000_000,
    label: "file",
    architecture,
  };
}
function release(overrides = {}) {
  return { windows: {}, macos: {}, linux: {}, ...overrides };
}
test("Mac choices preserve exact architecture and expose only the download endpoint", () => {
  const mac = downloadOptions(
    release({
      macos: { dmg: asset("arm64"), arm64: asset("arm64"), x64: asset("x64") },
    }),
  ).find((p) => p.id === "macos");
  assert.equal(mac.files.length, 2);
  assert.equal(
    new URL(mac.files[0].href, "https://app.amsaccess.com").searchParams.get(
      "architecture",
    ),
    "arm64",
  );
  assert.equal(
    new URL(mac.files[1].href, "https://app.amsaccess.com").searchParams.get(
      "architecture",
    ),
    "x64",
  );
  assert(!JSON.stringify(mac).includes("example.invalid"));
});
test("partial releases retain available installer formats without inventing downloads", () => {
  const options = downloadOptions(
    release({ windows: { msi: asset("x64") }, linux: { deb: asset("x64") } }),
  );
  assert.equal(options[0].files.length, 1);
  assert(options[0].files[0].href.includes("type=msi"));
  assert.equal(options[1].files.length, 0);
  assert.equal(options[2].files.length, 0);
  assert.equal(options[2].alternatives.length, 1);
});
test("release failure offers no broken links and unknown Mac builds are not called universal", () => {
  assert(
    downloadOptions(null).every(
      (p) => p.files.length === 0 && p.alternatives.length === 0,
    ),
  );
  const mac = downloadOptions(release({ macos: { dmg: asset(undefined) } }))[1];
  assert(!mac.files[0].detail.includes("Universal"));
  assert(!mac.files[0].href.includes("architecture"));
});
