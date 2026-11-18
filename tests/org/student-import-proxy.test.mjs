import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(
  subject,
  response = { ok: true, status: 200, data: { dry_run: true } },
) {
  const calls = [];
  const source = readFileSync(
    new URL("../../src/lib/server/studentImportProxy.ts", import.meta.url),
    "utf8",
  );
  const modules = {
    "next/server": {
      NextResponse: { json: (data, options) => ({ data, ...options }) },
    },
    "@/lib/server/session": { requireSubject: async () => subject },
    "@/lib/studentImport": { MAX_STUDENT_IMPORT_BYTES: 10 * 1024 * 1024 },
    "@/lib/server/amsApi": {
      errorMessage: (data) => data.detail,
      uploadToAmsApi: async (...args) => {
        calls.push(args);
        return response;
      },
    },
  };
  const context = { exports: {}, File, require: (name) => modules[name] };
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    context,
  );
  return { calls, run: context.exports.studentImportProxy };
}
const request = (token) => {
  const form = new FormData();
  form.set("file", new File(["Name\nA"], "students.csv"));
  form.set("mapping", '{"display_name":"Name"}');
  if (token) form.set("preview_token", token);
  return { formData: async () => form };
};
test("preview and explicit commit use distinct safe upstream routes", async () => {
  const { run, calls } = load("staff");
  await run(request(), "preview");
  await run(request("reviewed"), "commit");
  assert.deepEqual(
    calls.map((call) => call[0]),
    ["/students/import/preview", "/students/import/commit"],
  );
  assert.equal(calls[1][1].get("preview_token"), "reviewed");
  assert.equal(calls[0][2], "staff");
});
test("unauthorized, malformed and unpreviewed requests never reach upstream", async () => {
  const absent = load(null);
  assert.equal((await absent.run(request(), "preview")).status, 401);
  assert.equal(absent.calls.length, 0);
  const client = load("staff");
  assert.equal(
    (
      await client.run(
        {
          formData: async () => {
            throw Error();
          },
        },
        "preview",
      )
    ).status,
    400,
  );
  assert.equal((await client.run(request(), "commit")).status, 400);
  assert.equal(client.calls.length, 0);
});
test("old API preview failure never falls back to immediate import", async () => {
  const { run, calls } = load("staff", {
    ok: false,
    status: 404,
    data: { detail: "Not Found" },
  });
  assert.equal((await run(request(), "preview")).status, 404);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/students/import/preview");
});
