import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { UUID } from "../../src/lib/teamSetup.ts";

const uid = "6b0c8f0e-6a0e-4c7e-9d7e-2f4a3c1b9e11";
function route(subject, result, calls) {
  const context = {
    exports: {},
    URL,
    URLSearchParams,
    require(name) {
      if (name === "next/server")
        return {
          NextResponse: { json: (data, options) => ({ data, ...options }) },
        };
      if (name === "@/lib/server/session")
        return { requireSubject: async () => subject };
      if (name === "@/lib/teamSetup") return { UUID };
      if (name === "@/lib/server/amsApi")
        return {
          callAmsApi: async (...args) => {
            calls.push(args);
            return result;
          },
          errorMessage: (data) => data.detail,
        };
      throw Error(name);
    },
  };
  const source = readFileSync(
    new URL(
      "../../src/app/api/org/contests/[uid]/submissions/route.ts",
      import.meta.url,
    ),
    "utf8",
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    context,
  );
  return context.exports.GET;
}
const ctx = { params: Promise.resolve({ uid }) };
test("submission proxy forwards the selected UUID and limit, preserving unfiltered reads", async () => {
  const calls = [],
    rows = [{ uid: "outside-latest-100" }];
  const get = route("staff", { ok: true, data: rows }, calls);
  assert.equal(
    (
      await get(
        new Request(`https://test?user_uid=${uid}&limit=100&username=ignored`),
        ctx,
      )
    ).data,
    rows,
  );
  assert.equal(
    calls[0][1],
    `/contests/${uid}/submissions?limit=100&user_uid=${uid}`,
  );
  await get(new Request("https://test?limit=200"), ctx);
  assert.equal(calls[1][1], `/contests/${uid}/submissions?limit=200`);
  assert.equal(calls[0][3], "staff");
});
test("invalid or missing authentication fails before forwarding, including empty UID", async () => {
  for (const userUid of ["", "person1", "undefined", `${uid}/extra`]) {
    const calls = [];
    const get = route("staff", { ok: true, data: [] }, calls);
    assert.equal(
      (
        await get(
          new Request(`https://test?user_uid=${encodeURIComponent(userUid)}`),
          ctx,
        )
      ).status,
      400,
    );
    assert.equal(calls.length, 0);
  }
  const calls = [];
  assert.equal(
    (
      await route(
        null,
        {},
        calls,
      )(new Request(`https://test?user_uid=${uid}`), ctx)
    ).status,
    401,
  );
  assert.equal(calls.length, 0);
});
test("submission proxy preserves backend authorization failures", async () => {
  const get = route(
    "staff",
    { ok: false, status: 403, data: { detail: "Forbidden" } },
    [],
  );
  const result = await get(new Request(`https://test?user_uid=${uid}`), ctx);
  assert.equal(result.status, 403);
  assert.equal(result.data.error, "Forbidden");
});
