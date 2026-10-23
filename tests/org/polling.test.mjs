import test from 'node:test';
import assert from 'node:assert/strict';
import { startOrgPolling } from '../../src/lib/client/orgPolling.ts';

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test('polling waits for completion, pauses hidden, resumes once and cleans up pending work', async () => {
  const original = { document: globalThis.document, window: globalThis.window, setTimeout, clearTimeout };
  const document = new EventTarget();
  document.visibilityState = 'visible';
  const window = new EventTarget();
  const timers = new Map();
  let timerId = 0;
  globalThis.document = document;
  globalThis.window = window;
  globalThis.setTimeout = (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; };
  globalThis.clearTimeout = id => timers.delete(id);
  let calls = 0;
  let finish;
  let stop;
  try {
    stop = startOrgPolling(() => { calls++; return new Promise(resolve => { finish = resolve; }); }, 2000);
    assert.equal(calls, 1);
    window.dispatchEvent(new Event('focus'));
    assert.equal(calls, 1, 'focus does not overlap a slow request');
    assert.equal(timers.size, 0, 'no interval starts before completion');
    finish(); await flush();
    assert.equal(timers.size, 1);
    assert.equal([...timers.values()][0].delay, 2000);
    document.visibilityState = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(timers.size, 0);
    window.dispatchEvent(new Event('focus'));
    assert.equal(calls, 1);
    document.visibilityState = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    assert.equal(calls, 2);
    stop(); finish(); await flush();
    assert.equal(timers.size, 0, 'completion after unmount cannot reschedule');
    window.dispatchEvent(new Event('focus'));
    assert.equal(calls, 2);
  } finally {
    stop?.(); Object.assign(globalThis, original);
  }
});

test('failed reads still schedule a retry and inactive contests never schedule periodic reads', async () => {
  const original = { document: globalThis.document, window: globalThis.window, setTimeout, clearTimeout };
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  globalThis.window = new EventTarget();
  const timers = new Map(); let nextId = 0; let stop;
  globalThis.setTimeout = (fn, delay) => { timers.set(++nextId, { fn, delay }); return nextId; };
  globalThis.clearTimeout = id => timers.delete(id);
  try {
    stop = startOrgPolling(async () => { throw new Error('offline'); }, 3000);
    await flush(); assert.equal(timers.size, 1);
    stop(); assert.equal(timers.size, 0);
    stop = startOrgPolling(async () => {}, null);
    await flush(); assert.equal(timers.size, 0);
  } finally { stop?.(); Object.assign(globalThis, original); }
});
