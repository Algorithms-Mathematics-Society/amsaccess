// Run after pnpm build. Exercise compiled handlers without a listening socket,
// credentials, or a backend connection; anonymous requests must stop at auth.
process.env.NODE_ENV = "production";
delete process.env.AMS_DEV_SUBJECT;
require("next/dist/server/node-environment");
const assert = require("node:assert/strict");
const { NextRequest } = require("next/server");
const { getSortedRoutes } = require("next/dist/shared/lib/router/utils/sorted-routes");

async function main() {
  // Handler checks alone miss failures in Next's global matcher initialization.
  const paths = require("../.next/app-path-routes-manifest.json");
  getSortedRoutes(Object.values(paths));
  console.log("PASS complete compiled route tree");
  globalThis.fetch = async () => {
    throw new Error("Anonymous request unexpectedly contacted an upstream");
  };
  for (const route of ["auth/me", "org/contests", "org/problems", "org/problems/[uid]/versions/[versionUid]/preview"]) {
    const { routeModule } = require(`../.next/server/app/api/${route}/route.js`);
    const response = await routeModule.handle(
      new NextRequest(`https://portal.invalid/api/${route}`),
      {
        params: Promise.resolve({}),
        sharedContext: { buildId: "auth-runtime-check" },
        prerenderManifest: { preview: {} },
        renderOpts: {
          supportsDynamicResponse: true,
          experimental: {},
          waitUntil() {},
          onClose() {},
        },
      },
    );
    assert.equal(response.status, 401, route);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.equal(typeof (await response.json()).error, "string");
    console.log(`PASS /api/${route}: JSON 401`);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
