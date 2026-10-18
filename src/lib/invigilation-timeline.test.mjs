import { test } from "node:test";
import assert from "node:assert/strict";
import { elapsedLabel, gapMinutes } from "./invigilation-timeline.ts";

const start = "2026-10-24T08:30:00Z";
const at = (minutes) => new Date(Date.parse(start) + minutes * 60000).toISOString();

test("elapsed time is counted from the first frame, not the wall clock", () => {
  // "1:30 into the paper" is what a reader reasons about, not "10:00".
  assert.equal(elapsedLabel(start, at(0)), "0:00");
  assert.equal(elapsedLabel(start, at(30)), "0:30");
  assert.equal(elapsedLabel(start, at(90)), "1:30");
  assert.equal(elapsedLabel(start, at(185)), "3:05");
});

test("minutes are zero-padded so the strip reads as a column of times", () => {
  assert.equal(elapsedLabel(start, at(65)), "1:05");
  assert.equal(elapsedLabel(start, at(60)), "1:00");
});

test("no first frame means no elapsed label rather than a wrong one", () => {
  assert.equal(elapsedLabel(null, at(30)), "");
});

test("a frame on time, or merely late, is not a gap", () => {
  // The timer is half-hourly; a frame arriving a few minutes late is the
  // ordinary case and must not be flagged as missing time.
  assert.equal(gapMinutes(at(0), at(30)), 0);
  assert.equal(gapMinutes(at(0), at(38)), 0);
  assert.equal(gapMinutes(at(0), at(40)), 0);
});

test("a missed capture is reported with how long was unaccounted for", () => {
  // A boolean would say "something is wrong". The number is what tells an
  // invigilator whether to care: 41 minutes is a hiccup, 70 is a gap.
  assert.equal(gapMinutes(at(0), at(41)), 41);
  assert.equal(gapMinutes(at(0), at(70)), 70);
});

test("the whole paper missing between two frames is a very loud gap", () => {
  // Exactly the shape of a candidate who left and came back: arrived,
  // vanished, returned for the exit frame.
  assert.equal(gapMinutes(at(0), at(180)), 180);
});
