import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const {
  unstable_doesMiddlewareMatch,
} = require("next/experimental/testing/server");
const compiled = ts.transpileModule(
  readFileSync(new URL("../../src/middleware.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

// Use real NextRequest/NextResponse and Next's matcher evaluator. Empty test
// configuration deliberately avoids reading local or production credentials.
const context = createContext({
  exports: {},
  require,
  process: { env: {} },
  URL,
});
runInContext(compiled, context);
const { middleware, config } = context.exports;

function request(path, host = "app.amsaccess.com", extraHeaders = {}) {
  return new NextRequest("https://" + host + path, {
    headers: { host, ...extraHeaders },
  });
}

function matches(path, host) {
  return unstable_doesMiddlewareMatch({
    config,
    url: "https://" + host + path,
    headers: { host },
  });
}

test("the app root rewrites to downloads and preserves every query parameter", async () => {
  const response = await middleware(
    request("/?platform=mac&source=invite&source=email"),
  );
  assert.equal(response.status, 200);
  const destination = new URL(response.headers.get("x-middleware-rewrite"));
  assert.equal(destination.host, "app.amsaccess.com");
  assert.equal(destination.pathname, "/download");
  assert.deepEqual(destination.searchParams.getAll("source"), [
    "invite",
    "email",
  ]);
  assert.equal(destination.searchParams.get("platform"), "mac");
  assert.equal(response.headers.get("location"), null);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("the host matcher accepts the exact app hostname, case-insensitively and with a port", async () => {
  for (const host of [
    "app.amsaccess.com",
    "APP.AMSACCESS.COM",
    "app.amsaccess.com:443",
  ]) {
    assert.equal(matches("/", host), true, host);
    const response = await middleware(request("/", host));
    assert.equal(
      new URL(response.headers.get("x-middleware-rewrite")).pathname,
      "/download",
    );
  }
});

test("the website and similarly named hosts never match or rewrite the app root", async () => {
  for (const host of [
    "amsaccess.com",
    "www.amsaccess.com",
    "org.amsaccess.com",
    "app.amsaccess.com.evil.example",
    "otherapp.amsaccess.com",
    "app-amsaccess.com",
    "appXamsaccessYcom",
    "localhost:3000",
  ]) {
    assert.equal(matches("/", host), false, host);
    const response = await middleware(request("/", host));
    assert.equal(response.headers.get("x-middleware-rewrite"), null, host);
    assert.equal(response.headers.get("cache-control"), null, host);
  }
});

test("forwarded hostname alone cannot select the app rewrite", async () => {
  const response = await middleware(
    request("/", "www.amsaccess.com", {
      "x-forwarded-host": "app.amsaccess.com",
    }),
  );
  assert.equal(response.headers.get("x-middleware-rewrite"), null);
});

test("download routes, APIs, static assets and normal content are not remapped", () => {
  for (const path of [
    "/download",
    "/download/",
    "/api/downloads",
    "/api/auth/session",
    "/_next/static/chunks/app.js",
    "/logo.svg",
    "/favicon.ico",
    "/docs",
    "/contact",
    "/product",
  ]) {
    assert.equal(matches(path, "app.amsaccess.com"), false, path);
  }
});

test("protected routes keep their existing matcher and unauthenticated redirects", async () => {
  for (const [path, expectedLogin] of [
    ["/org/dashboard", "/org/login"],
    ["/admin/users", "/access-admin-only"],
    ["/amsadmin/users", "/amsadmin/login"],
  ]) {
    assert.equal(matches(path, "app.amsaccess.com"), true, path);
    const response = await middleware(request(path));
    assert.equal(
      new URL(response.headers.get("location")).pathname,
      expectedLogin,
    );
    assert.equal(response.headers.get("x-middleware-rewrite"), null);
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
});

test("the firm portal and organization login remain accessible and uncached", async () => {
  for (const path of [
    "/firms",
    "/firms/assessments",
    "/org/login",
    "/org/signup",
  ]) {
    assert.equal(matches(path, "app.amsaccess.com"), true, path);
    const response = await middleware(request(path));
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("x-middleware-rewrite"), null);
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
});
