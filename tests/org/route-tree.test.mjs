import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getSortedRoutes } = require("next/dist/shared/lib/router/utils/sorted-routes");
const { normalizeAppPath } = require("next/dist/shared/lib/router/utils/app-paths");
const root = fileURLToPath(new URL("../../src/app/", import.meta.url));

function routes(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) return routes(`${directory}/${entry.name}`, path);
    return /^(page|route)\.[jt]sx?$/.test(entry.name)
      ? [normalizeAppPath(path.replace(/\.[jt]sx?$/, ""))]
      : [];
  });
}

test("the complete app route tree initializes without dynamic slug collisions", () => {
  const paths = routes(root);
  assert.ok(paths.includes("/api/auth/me"));
  assert.ok(paths.includes("/api/org/problems/[uid]/versions/[versionUid]"));
  assert.doesNotThrow(() => getSortedRoutes(paths));
});
