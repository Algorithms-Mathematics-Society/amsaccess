import test from 'node:test';
import assert from 'node:assert/strict';
import { SESSION_WARNING_MS, sessionNotice } from '../../src/lib/client/orgSession.ts';

test('session notice: quiet until 15 minutes left, then a countdown, then signed out', () => {
  const now = 1_000_000_000_000;
  assert.deepEqual(sessionNotice(null, now, false), { kind: 'none' });
  assert.deepEqual(sessionNotice('soon', now, false), { kind: 'none' });
  assert.deepEqual(sessionNotice(now + SESSION_WARNING_MS + 1, now, false), { kind: 'none' });
  assert.deepEqual(sessionNotice(now + SESSION_WARNING_MS, now, false), { kind: 'expiring', minutesLeft: 15 });
  assert.deepEqual(sessionNotice(now + 61_000, now, false), { kind: 'expiring', minutesLeft: 2 });
  assert.deepEqual(sessionNotice(now + 1, now, false), { kind: 'expiring', minutesLeft: 1 });
  assert.deepEqual(sessionNotice(now, now, false), { kind: 'signed-out' });
  assert.deepEqual(sessionNotice(now + 3_600_000, now, true), { kind: 'signed-out' }, 'a 401 wins over the clock');
});
