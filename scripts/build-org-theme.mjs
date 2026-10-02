/**
 * Compile src/theme/orgTheme.ts with `astryx theme build`, the pattern Astryx
 * documents for SSR apps: a static CSS file plus a built theme object, so
 * Theme skips runtime style injection and nothing flashes on hydration.
 *
 * Two deterministic fixups run after every build:
 * 1. The CLI writes em dashes into its generated headers; the repo bans them,
 *    so they become a colon.
 * 2. A root <Theme> mirrors data-astryx-theme onto <html>, which would make
 *    the @scope rules (prose colors, fonts, tokens) reach the whole page,
 *    including the org shell around the Astryx subtree. Excluding html as a
 *    scope root keeps the theme inside the <Theme> wrapper div only.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bin = resolve(root, "node_modules/.bin/astryx");
const result = spawnSync(bin, ["theme", "build", "src/theme/orgTheme.ts", "-o", "src/theme/orgTheme.css"], {
  cwd: root,
  stdio: "inherit"
});
if (result.status !== 0) process.exit(result.status ?? 1);

const DASH = String.fromCharCode(0x2014);
for (const file of ["org.js", "org.d.ts", "org.variants.d.ts", "orgTheme.css"]) {
  const path = resolve(root, "src/theme", file);
  let text = readFileSync(path, "utf8");
  text = text.split(` ${DASH} `).join(": ").split(DASH).join(":");
  if (file === "orgTheme.css") {
    const from = '@scope ([data-astryx-theme="org"]) to';
    const to = '@scope ([data-astryx-theme="org"]:not(html)) to';
    const count = text.split(from).length - 1;
    if (count === 0) throw new Error("orgTheme.css: expected @scope rules not found; review the fixup");
    text = text.split(from).join(to);
  }
  writeFileSync(path, text);
}
console.log("org theme built; generated files normalized.");
