import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
test("bundled house fonts retain verified bytes and licenses", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("public/fonts/manifest.json", root), "utf8"),
  );
  assert.equal(
    manifest.length,
    13,
    "all previously supplied Unicode subsets are bundled",
  );
  for (const font of manifest) {
    const bytes = readFileSync(new URL(`public/fonts/${font.file}`, root));
    assert.equal(bytes.subarray(0, 4).toString(), "wOF2");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), font.sha256);
    assert.match(
      readFileSync(
        new URL(`public/fonts/${font.family}-OFL.txt`, root),
        "utf8",
      ),
      /SIL OPEN FONT LICENSE Version 1.1/,
    );
  }
});
