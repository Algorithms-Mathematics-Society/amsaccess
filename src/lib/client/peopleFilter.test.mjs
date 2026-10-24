import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  NO_FILTER,
  applyPeopleFilter,
  filterIsActive,
  optionsFrom,
  osLabel,
} from "./peopleFilter.ts";

const people = [
  {
    name: "Ayush Shukla",
    handle: "ayush-shukla",
    os: "windows",
    college: "IIT Kanpur",
  },
  {
    name: "Meet Agrawal",
    handle: "meet-agrawal",
    os: "macos",
    college: "IIT Gandhinagar",
  },
  {
    name: "Aarav Nair",
    handle: "aarav-nair",
    os: "windows",
    college: "IIT Kanpur",
  },
  { name: "Priya Das", handle: "priya-das", os: "", college: "" },
];

const read = {
  fields: (p) => [p.name, p.handle],
  os: (p) => p.os,
  college: (p) => p.college,
};

test("no filter returns everyone, in the order given", () => {
  const out = applyPeopleFilter(people, NO_FILTER, read);
  assert.deepEqual(
    out.map((p) => p.handle),
    people.map((p) => p.handle),
  );
});

test("OS and college narrow, and combine", () => {
  assert.equal(
    applyPeopleFilter(people, { ...NO_FILTER, os: "windows" }, read).length,
    2,
  );
  assert.equal(
    applyPeopleFilter(people, { ...NO_FILTER, college: "IIT Kanpur" }, read)
      .length,
    2,
  );
  assert.equal(
    applyPeopleFilter(
      people,
      { ...NO_FILTER, os: "macos", college: "IIT Kanpur" },
      read,
    ).length,
    0,
  );
});

test("filtering happens before search, so results are always actionable", () => {
  const out = applyPeopleFilter(people, { needle: "a", os: "macos" }, read);
  assert.equal(out.length, 1);
  assert.equal(out[0].handle, "meet-agrawal");
});

test("people with no OS recorded are excluded by an OS filter, not treated as a match", () => {
  const out = applyPeopleFilter(people, { ...NO_FILTER, os: "windows" }, read);
  assert.ok(!out.some((p) => p.handle === "priya-das"));
});

test("search is fuzzy across name and handle", () => {
  const out = applyPeopleFilter(
    people,
    { ...NO_FILTER, needle: "ayushs" },
    read,
  );
  assert.equal(out[0].handle, "ayush-shukla");
});

test("options come back most common first, with blanks dropped", () => {
  assert.deepEqual(
    optionsFrom(people, (p) => p.os),
    ["windows", "macos"],
  );
  assert.deepEqual(
    optionsFrom(people, (p) => p.college),
    ["IIT Kanpur", "IIT Gandhinagar"],
  );
});

test("filterIsActive ignores whitespace-only searches", () => {
  assert.equal(filterIsActive(NO_FILTER), false);
  assert.equal(filterIsActive({ ...NO_FILTER, needle: "   " }), false);
  assert.equal(filterIsActive({ ...NO_FILTER, needle: "a" }), true);
  assert.equal(filterIsActive({ ...NO_FILTER, os: "linux" }), true);
});

test("OS labels are tidied, and anything unknown is shown as it arrived", () => {
  assert.equal(osLabel("windows"), "Windows");
  assert.equal(osLabel("macos"), "macOS");
  assert.equal(osLabel("linux"), "Linux");
  assert.equal(osLabel("haiku"), "haiku");
});

test("a filter on a field the caller does not supply is ignored, not fatal", () => {
  const out = applyPeopleFilter(
    people,
    { ...NO_FILTER, os: "windows" },
    { fields: read.fields },
  );
  assert.equal(out.length, people.length);
});
