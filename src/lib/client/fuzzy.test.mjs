import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fuzzyBest, fuzzyRank, fuzzyScore } from "./fuzzy.ts";

test("every character must appear, in order", () => {
  assert.notEqual(fuzzyScore("Ayush Shukla", "ayush"), null);
  assert.notEqual(fuzzyScore("Ayush Shukla", "aysh"), null);
  assert.equal(fuzzyScore("Ayush Shukla", "zq"), null);
  // Right letters, wrong order.
  assert.equal(fuzzyScore("Ayush", "hsuya"), null);
});

test("skipped middle names still match, which substring search could not", () => {
  assert.notEqual(fuzzyScore("Ayush Kumar Shukla", "ayush shukla"), null);
  assert.notEqual(fuzzyScore("ayush-kumar-shukla", "ayushs"), null);
});

test("an outright substring outranks a scattered match", () => {
  const substring = fuzzyScore("Abhinav Saxena", "saxena");
  const scattered = fuzzyScore("Sanjay Axel Nehra", "saxena");
  assert.notEqual(substring, null);
  assert.notEqual(scattered, null);
  assert.ok(substring > scattered);
});

test("a match at the start of a word beats one buried mid-word", () => {
  const atStart = fuzzyScore("Rahul Verma", "verma");
  const buried = fuzzyScore("Convermant Singh", "verma");
  assert.ok(atStart > buried);
});

test("the shorter of two equally good candidates wins", () => {
  const short = fuzzyScore("Ayush Dutta", "ayush");
  const long = fuzzyScore("Ayush Kumar Shukla Dutta Sharma", "ayush");
  assert.ok(short > long);
});

test("an empty query matches everything and disturbs nothing", () => {
  assert.equal(fuzzyScore("anything", ""), 0);
  const rows = [{ n: "c" }, { n: "a" }, { n: "b" }];
  assert.deepEqual(
    fuzzyRank(rows, "   ", (r) => [r.n]).map((r) => r.n),
    ["c", "a", "b"],
  );
});

test("fuzzyBest takes the best field, and ignores empty ones", () => {
  const fields = ["Meet Agrawal", "", null, "meet-agrawal"];
  assert.notEqual(fuzzyBest(fields, "agrawal"), null);
  assert.equal(fuzzyBest(["Meet Agrawal"], "zzz"), null);
  assert.equal(fuzzyBest([null, undefined, ""], "a"), null);
});

test("ranking drops non-matches and orders the rest by score", () => {
  const people = [
    { name: "Sanjay Axel Nehra", handle: "sanjay-axel" },
    { name: "Abhinav Saxena", handle: "abhinav-saxena" },
    { name: "Priya Nair", handle: "priya-nair" },
  ];
  const found = fuzzyRank(people, "saxena", (p) => [p.name, p.handle]);
  assert.equal(found.length, 2);
  assert.equal(found[0].name, "Abhinav Saxena");
});

test("case and surrounding punctuation do not matter", () => {
  assert.notEqual(fuzzyScore("ABHIJEET TANAY", "abhijeet"), null);
  assert.notEqual(fuzzyScore("abhijeet.tanay@iitk.ac.in", "tanay"), null);
});

test("ties keep the caller's order, which both panels rely on", () => {
  const rows = [
    { n: "Ayush One", i: 1 },
    { n: "Ayush Two", i: 2 },
    { n: "Ayush Six", i: 3 },
  ];
  const found = fuzzyRank(rows, "ayush", (r) => [r.n]);
  assert.deepEqual(
    found.map((r) => r.i),
    [1, 2, 3],
  );
});
