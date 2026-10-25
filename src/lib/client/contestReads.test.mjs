import test from 'node:test';
import assert from 'node:assert/strict';
import { createContestReadStore } from './contestReads.ts';
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const response = data => ({ ok: true, status: 200, json: async () => data });

// Tests are intentionally serial: each controls the same fetch boundary.
test('contest snapshots preserve freshness, hand off intent once, and isolate consoles', async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; return response([{ user_uid: String(calls) }]); };
  const store = createContestReadStore('contest-a');
  try {
    await store.prefetch('participants');
    await store.open('participants');
    assert.equal(calls, 1);
    assert.equal(store.snapshot('participants').data[0].user_uid, '1');
    await store.open('participants');
    assert.equal(calls, 2);
    assert.equal(createContestReadStore('contest-b').snapshot('participants').data, null);
  } finally { store.dispose(); global.fetch = original; }
});

test('overlapping callers share one read; post-write response wins even when aborted read ignores cancellation', async () => {
  const original = global.fetch;
  const old = deferred(); const fresh = deferred(); let calls = 0;
  global.fetch = () => (++calls === 1 ? old.promise : fresh.promise);
  const store = createContestReadStore('contest');
  try {
    const before = store.load('participants');
    assert.equal(store.load('participants'), before);
    const after = store.refreshAfterWrite('participants');
    assert.equal(calls, 2);
    fresh.resolve(response([{ user_uid: 'new' }])); await after;
    old.resolve(response([{ user_uid: 'old' }])); await before;
    assert.equal(store.snapshot('participants').data[0].user_uid, 'new');
  } finally { store.dispose(); global.fetch = original; }
});

test('reset clears snapshots, suppresses late responses, and suspends old mounted page', async () => {
  const original = global.fetch; const body = deferred(); let calls = 0;
  global.fetch = async () => { calls++; return { ok: true, json: () => body.promise }; };
  const store = createContestReadStore('contest');
  try {
    const flight = store.load('analytics'); await Promise.resolve();
    store.reset(); body.resolve({ roster: 1321 }); await flight;
    assert.equal(store.snapshot('analytics').data, null);
    assert.match(store.snapshot('analytics').error, /Session changed/);
    await store.open('analytics'); await store.prefetch('analytics'); await store.refreshAfterWrite('analytics');
    assert.equal(calls, 1);
  } finally { store.dispose(); global.fetch = original; }
});

test('refresh errors retain last read; lost authorization removes it', async () => {
  const original = global.fetch;
  const store = createContestReadStore('contest');
  try {
    global.fetch = async () => response({ roster: 10 }); await store.load('analytics');
    global.fetch = async () => { throw new Error('offline'); }; await store.load('analytics');
    assert.equal(store.snapshot('analytics').data.roster, 10);
    assert.equal(store.snapshot('analytics').error, 'offline');
    global.fetch = async () => ({ ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) });
    await store.load('analytics'); assert.equal(store.snapshot('analytics').data, null);
    assert.equal(store.snapshot('analytics').error, 'Forbidden');
  } finally { store.dispose(); global.fetch = original; }
});

test('body timeout settles all concurrent readers and permits retry', async () => {
  const original = global.fetch;
  const store = createContestReadStore('contest', 10);
  try {
    global.fetch = async () => ({ ok: true, json: () => new Promise(() => {}) });
    await Promise.all(Array.from({ length: 50 }, () => store.load('scoreboard')));
    assert.equal(store.snapshot('scoreboard').refreshing, false);
    assert.match(store.snapshot('scoreboard').error, /timed out/);
    global.fetch = async () => response({ rows: [] }); await store.load('scoreboard');
    assert.deepEqual(store.snapshot('scoreboard').data, { rows: [] });
  } finally { store.dispose(); global.fetch = original; }
});

test('old speculative intent is revalidated on open and on renewed intent', async () => {
  const original = global.fetch; const originalNow = Date.now;
  let now = 100; let calls = 0;
  Date.now = () => now;
  global.fetch = async () => { calls++; return response({ rows: [] }); };
  const store = createContestReadStore('contest');
  try {
    await store.prefetch('scoreboard'); now += 1_001;
    await store.open('scoreboard'); assert.equal(calls, 2);
    await store.prefetch('scoreboard'); now += 1_001;
    await store.prefetch('scoreboard'); assert.equal(calls, 4);
    await store.open('scoreboard'); assert.equal(calls, 4);
  } finally { store.dispose(); global.fetch = original; Date.now = originalNow; }
});

test('authorization failure removes retained data before an unreadable response body settles', async () => {
  const original = global.fetch; const body = deferred();
  const store = createContestReadStore('contest');
  try {
    global.fetch = async () => response({ roster: 10 }); await store.load('analytics');
    global.fetch = async () => ({ ok: false, status: 401, json: () => body.promise });
    const read = store.load('analytics'); await Promise.resolve(); await Promise.resolve();
    assert.equal(store.snapshot('analytics').data, null);
    body.resolve(null); await read;
    assert.equal(store.snapshot('analytics').data, null);
    global.fetch = async () => ({ ok: false, status: 403, json: async () => { throw new Error('Invalid JSON'); } });
    await store.load('analytics'); assert.equal(store.snapshot('analytics').data, null);
  } finally { store.dispose(); global.fetch = original; }
});

test('roster mutations clear derived snapshots and fence pending derived reads without eager requests', async () => {
  const original = global.fetch; const oldBoard = deferred(); let calls = 0;
  const store = createContestReadStore('contest');
  try {
    global.fetch = async url => { calls++; return response(url.endsWith('participants') ? [] : { rows: [], roster: 10 }); };
    await store.load('analytics'); await store.load('scoreboard');
    global.fetch = url => { calls++; return url.endsWith('scoreboard') ? oldBoard.promise : Promise.resolve(response([])); };
    const stale = store.load('scoreboard');
    await store.refreshAfterWrite('participants');
    assert.equal(calls, 4);
    assert.equal(store.snapshot('analytics').data, null);
    assert.equal(store.snapshot('scoreboard').data, null);
    oldBoard.resolve(response({ rows: ['stale'] })); await stale;
    assert.equal(store.snapshot('scoreboard').data, null);
    store.invalidate('participants'); assert.equal(store.snapshot('participants').data, null);
    assert.equal(calls, 4);
  } finally { store.dispose(); global.fetch = original; }
});

test('many concurrent post-write refresh generations cannot publish out of order', async () => {
  const original = global.fetch; const pending = [];
  const store = createContestReadStore('contest');
  global.fetch = () => { const item = deferred(); pending.push(item); return item.promise; };
  try {
    const readers = Array.from({ length: 32 }, () => store.refreshAfterWrite('participants'));
    assert.equal(pending.length, 32);
    pending[31].resolve(response([{ user_uid: 'latest' }])); await readers[31];
    for (let index = 30; index >= 0; index--) pending[index].resolve(response([{ user_uid: String(index) }]));
    await Promise.all(readers);
    assert.equal(store.snapshot('participants').data[0].user_uid, 'latest');
    assert.equal(store.snapshot('participants').refreshing, false);
  } finally { store.dispose(); global.fetch = original; }
});

test('equivalent JSON snapshots retain identity; every changed value or shape publishes new data', async () => {
  const original = global.fetch;
  const store = createContestReadStore('contest');
  const initial = [{ user_uid: 'a', nested: { flags: [true, null, 3], mail: { sent: false } } }, { user_uid: 'b' }];
  const read = async data => { global.fetch = async () => response(data); await store.load('participants'); return store.snapshot('participants').data; };
  try {
    await read(initial);
    const reorderedKeys = [{ nested: { mail: { sent: false }, flags: [true, null, 3] }, user_uid: 'a' }, { user_uid: 'b' }];
    assert.equal(await read(reorderedKeys), initial);
    const variants = [
      [{ user_uid: 'a', nested: { flags: [true, null, 3], mail: { sent: true } } }, { user_uid: 'b' }],
      [{ user_uid: 'a', nested: { flags: [true, null, 3] } }, { user_uid: 'b' }],
      [initial[1], initial[0]],
      [initial[0]],
      [{ ...initial[0], extra: null }, initial[1]],
      [{ user_uid: 'a', nested: { flags: [true, 3, null], mail: { sent: false } } }, { user_uid: 'b' }],
      [{ user_uid: 'a', nested: { flags: [true, null, '3'], mail: { sent: false } } }, { user_uid: 'b' }],
    ];
    for (const changed of variants) {
      await read(initial);
      assert.equal(await read(changed), changed);
      assert.notEqual(store.snapshot('participants').data, initial);
    }
  } finally { store.dispose(); global.fetch = original; }
});

test('JSON comparison handles deep nesting and unusual JSON keys without false equivalence', async () => {
  const { equivalentJson } = await import('./contestReads.ts');
  const unusual = JSON.parse('{"__proto__":{"x":1},"constructor":2}');
  assert.equal(equivalentJson(unusual, JSON.parse(JSON.stringify(unusual))), true);
  assert.equal(equivalentJson(unusual, { constructor: 2, x: 1 }), false);
  assert.equal(equivalentJson([], {}), false);
  assert.equal(equivalentJson({ x: null }, {}), false);
  assert.equal(equivalentJson({ x: 0 }, { x: -0 }), false);
  let first = { value: 1 }; let second = { value: 1 };
  for (let i = 0; i < 5_000; i++) { first = { child: first }; second = { child: second }; }
  assert.equal(equivalentJson(first, second), true);
});

test('committed navigation hands off once despite slow rendering, then revisit reads fresh', async () => {
  const original = global.fetch; const originalNow = Date.now;
  let now = 100; let calls = 0;
  Date.now = () => now;
  global.fetch = async () => { calls++; return response([]); };
  const store = createContestReadStore('contest');
  try {
    await store.navigate(['participants']);
    now += 5_000;
    await store.open('participants'); assert.equal(calls, 1);
    await store.navigate([]);
    await store.navigate(['participants']); assert.equal(calls, 2);
    now += 5_000;
    await store.open('participants'); assert.equal(calls, 2);
    // Even an unconsumed navigation is revoked by leaving its tab.
    await store.navigate(['participants']); assert.equal(calls, 3);
    await store.navigate([]); await store.open('participants'); assert.equal(calls, 4);
  } finally { store.dispose(); global.fetch = original; Date.now = originalNow; }
});

test('navigation adopts fresh hover or inflight reads, but never old completed speculative data', async () => {
  const original = global.fetch; const originalNow = Date.now;
  let now = 100; let calls = 0;
  Date.now = () => now;
  global.fetch = async () => { calls++; return response([]); };
  const store = createContestReadStore('contest');
  try {
    await store.prefetch('participants');
    await store.navigate(['participants']); assert.equal(calls, 1);
    now += 5_000; await store.open('participants'); assert.equal(calls, 1);
    await store.navigate([]);
    await store.prefetch('participants'); assert.equal(calls, 2);
    now += 3_600_000;
    await store.navigate(['participants']); assert.equal(calls, 3);
    await store.open('participants'); assert.equal(calls, 3);
    const pending = deferred();
    global.fetch = () => { calls++; return pending.promise; };
    const hover = store.prefetch('participants'); now += 5_000;
    const navigation = store.navigate(['participants']); assert.equal(calls, 4);
    pending.resolve(response([])); await Promise.all([hover, navigation]);
    now += 5_000; await store.open('participants'); assert.equal(calls, 4);
  } finally { store.dispose(); global.fetch = original; Date.now = originalNow; }
});

test('mutation invalidation and reset revoke committed navigation handoffs', async () => {
  const original = global.fetch; let calls = 0;
  global.fetch = async () => { calls++; return response([]); };
  const store = createContestReadStore('contest');
  try {
    await store.navigate(['participants']); assert.equal(calls, 1);
    await store.refreshAfterWrite('participants'); assert.equal(calls, 2);
    await store.open('participants'); assert.equal(calls, 3);
    await store.navigate(['participants']); store.invalidate('participants');
    await store.open('participants'); assert.equal(calls, 5);
    await store.navigate(['participants']); store.reset();
    await store.open('participants'); await store.navigate(['participants']);
    assert.equal(calls, 6); assert.equal(store.snapshot('participants').data, null);
  } finally { store.dispose(); global.fetch = original; }
});

test('late roster mutation refreshes mounted derived views only and deduplicates consumers', async () => {
  const original = global.fetch; const calls = [];
  const store = createContestReadStore('contest');
  global.fetch = async url => { calls.push(url); return response(url.endsWith('participants') ? [] : { roster: calls.length }); };
  const first = store.subscribe('analytics', () => {});
  const second = store.subscribe('analytics', () => {});
  try {
    await store.open('analytics');
    const mutation = store.refreshAfterWrite('participants');
    await Promise.all([mutation, store.load('analytics')]); // Concurrent consumers join the replacement.
    assert.equal(calls.filter(url => url.endsWith('analytics')).length, 2);
    assert.equal(calls.filter(url => url.endsWith('scoreboard')).length, 0);
    assert.notEqual(store.snapshot('analytics').data, null);
    first(); second();
    await store.refreshAfterWrite('participants');
    assert.equal(calls.filter(url => url.endsWith('analytics')).length, 2);
    assert.equal(store.snapshot('analytics').data, null);
  } finally { first(); second(); store.dispose(); global.fetch = original; }
});

test('observed invalidation fences old bodies and immediately replaces the read', async () => {
  const original = global.fetch; const old = deferred(); const fresh = deferred(); let calls = 0;
  const store = createContestReadStore('contest');
  const unsubscribe = store.subscribe('analytics', () => {});
  global.fetch = async () => ({ ok: true, status: 200, json: () => (++calls === 1 ? old.promise : fresh.promise) });
  try {
    const prior = store.open('analytics');
    while (calls === 0) await Promise.resolve();
    store.invalidate('analytics');
    const replacement = store.load('analytics');
    fresh.resolve({ roster: 20 }); await replacement;
    old.resolve({ roster: 1 }); await prior;
    assert.equal(calls, 2);
    assert.deepEqual(store.snapshot('analytics').data, { roster: 20 });
  } finally { unsubscribe(); store.dispose(); global.fetch = original; }
});

test('reset and disposal never restart reads for mounted consumers', async () => {
  const original = global.fetch; let calls = 0;
  global.fetch = async () => { calls++; return response({ roster: 1 }); };
  try {
    for (const action of ['reset', 'dispose']) {
      const store = createContestReadStore('contest');
      const unsubscribe = store.subscribe('analytics', () => {});
      await store.open('analytics'); const before = calls;
      store[action](); store.invalidate('analytics');
      await store.refreshAfterWrite('participants');
      assert.equal(calls, before);
      assert.equal(store.snapshot('analytics').data, null);
      unsubscribe(); store.dispose();
    }
  } finally { global.fetch = original; }
});
