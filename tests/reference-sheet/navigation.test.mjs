import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

class Element {
  constructor(anchor) {
    this.anchor = anchor;
  }
  closest(selector) {
    assert.equal(selector, "a[href]");
    return this.anchor;
  }
}
const context = createContext({ exports: {}, Element, URL });
runInContext(
  ts.transpileModule(
    readFileSync(
      new URL(
        "../../src/lib/client/referenceSheetNavigation.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
  context,
);
const guard = context.exports.guardReferenceSheetNavigation;
const current = "https://www.amsaccess.com/org/contests/demo";
function navigation(
  { href = "/org/contests", target = "", download = false, ...changes } = {},
  accepted = false,
) {
  let confirmations = 0,
    prevented = 0,
    stopped = 0;
  const event = {
    button: 0,
    defaultPrevented: false,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target: new Element({
      href,
      target,
      hasAttribute: (name) => name === "download" && download,
    }),
    preventDefault: () => prevented++,
    stopPropagation: () => stopped++,
    ...changes,
  };
  guard(event, current, () => {
    confirmations++;
    return accepted;
  });
  return { confirmations, prevented, stopped };
}

test("cancel blocks same-origin Next navigation before delegated handlers", () => {
  for (const href of [
    "/org/contests",
    "/org/dashboard",
    "/org/contests/demo?tab=other",
  ]) {
    assert.deepEqual(navigation({ href }), {
      confirmations: 1,
      prevented: 1,
      stopped: 1,
    });
  }
});
test("accept leaves navigation unchanged", () => {
  assert.deepEqual(navigation({}, true), {
    confirmations: 1,
    prevented: 0,
    stopped: 0,
  });
});
test("new tab, modifiers, middle click, downloads and already handled events never prompt", () => {
  for (const change of [
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
    { target: "_blank" },
    { download: true },
    { defaultPrevented: true },
  ]) {
    assert.deepEqual(navigation(change), {
      confirmations: 0,
      prevented: 0,
      stopped: 0,
    });
  }
});
test("hash/current-page links and external navigation remain unaffected", () => {
  for (const href of [
    "#reference-editor-heading",
    current,
    `${current}#preview`,
    "https://other.example/help",
    "mailto:help@example.com",
  ]) {
    assert.deepEqual(navigation({ href }), {
      confirmations: 0,
      prevented: 0,
      stopped: 0,
    });
  }
});
test("buttons/non-link elements do not trigger navigation protection", () => {
  let called = false;
  guard({ button: 0, target: new Element(null) }, current, () => {
    called = true;
    return false;
  });
  assert.equal(called, false);
});
