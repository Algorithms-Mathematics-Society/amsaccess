/**
 * The console's statement split must agree with the proctor's.
 *
 * `src/lib/problemStatement.ts` is a port of the proctor's
 * `markdown.ts`, duplicated because the two apps ship separately. A port that
 * drifts is worse than no preview at all: staff would sign off on a statement
 * that divides into different tabs in the exam. These cases are the ones the
 * split actually decides, so a change to either side fails here.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

const context = { exports: {}, module: { exports: {} }, URL, console };
context.module.exports = context.exports;
vm.createContext(context);
vm.runInContext(
  compile(readFileSync(new URL("../../src/lib/problemStatement.ts", import.meta.url), "utf8")),
  context,
);
const { splitProblemDescription, getAvailableProblemTabs, renderStatementHtml } = context.exports;

test("headings route text into the proctor's three sections", () => {
  const md = [
    "Implement split_fields.",
    "## Examples",
    "`split_fields(\"a,b\", ',')` returns two views.",
    "## Constraints",
    "The input is at most 10^5 bytes.",
  ].join("\n");

  const sections = splitProblemDescription(md);
  assert.match(sections.statement, /Implement split_fields/);
  assert.match(sections.examples, /returns two views/);
  assert.match(sections.constraints, /10\^5 bytes/);
  // Each section keeps its own heading and nothing leaks across.
  assert.ok(!sections.statement.includes("10^5"));
  assert.ok(!sections.examples.includes("Implement split_fields"));
});

test("samples and limits are accepted as aliases, like the proctor", () => {
  const sections = splitProblemDescription(
    ["Body.", "### Sample", "in/out", "### Limits", "2 seconds"].join("\n"),
  );
  assert.match(sections.examples, /in\/out/);
  assert.match(sections.constraints, /2 seconds/);
});

test("an unrecognised heading returns to the statement", () => {
  const sections = splitProblemDescription(
    ["## Examples", "sample text", "## Notes", "a closing remark"].join("\n"),
  );
  assert.match(sections.statement, /a closing remark/);
  assert.ok(!sections.examples.includes("a closing remark"));
});

test("a statement with no headings is never empty", () => {
  const sections = splitProblemDescription("Just one paragraph, no headings at all.");
  assert.match(sections.statement, /Just one paragraph/);
  assert.equal(sections.examples, "");
});

test("tabs appear only for sections that have content", () => {
  // The module runs in a vm context, so arrays it returns carry that realm's
  // Array prototype and compare unequal to a host array. Copy before asserting.
  const tabs = (sections) => Array.from(getAvailableProblemTabs(sections));
  assert.deepEqual(tabs({ statement: "body", examples: "", constraints: "" }), ["statement"]);
  assert.deepEqual(tabs({ statement: "body", examples: "x", constraints: "" }), [
    "statement",
    "examples",
  ]);
  assert.deepEqual(tabs({ statement: "body", examples: "x", constraints: "y" }), [
    "statement",
    "examples",
    "constraints",
  ]);
});

test("statement markup is escaped, never injected", () => {
  const html = renderStatementHtml("A <script>alert(1)</script> tag and <b>bold</b>.");
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<b>bold</b>"));
  assert.match(html, /&lt;script&gt;/);
});

test("a javascript: link renders as text rather than a link", () => {
  const html = renderStatementHtml("[click](javascript:alert(1))");
  assert.ok(!html.includes("href"));
  assert.match(html, /click/);
});

test("fenced blocks become copyable samples carrying their own text", () => {
  const html = renderStatementHtml(["```", "3 4", "plum apple", "```"].join("\n"));
  assert.match(html, /data-copy-sample="3 4\nplum apple"/);
  assert.match(html, /data-copy-key="sample-0"/);
});

test("an unterminated fence still renders its contents", () => {
  const html = renderStatementHtml(["Example:", "```", "7 8"].join("\n"));
  assert.match(html, /7 8/);
});
