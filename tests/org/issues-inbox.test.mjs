import test from 'node:test';
import assert from 'node:assert/strict';
import { countWaitingOnStaff, loadContestTickets, mergeIssues } from '../../src/lib/client/issuesInbox.ts';

const t = minutes => new Date(Date.parse('2026-11-16T10:00:00Z') + minutes * 60_000).toISOString();
const now = Date.parse(t(60));
const resume = (uid, status, at) => ({uid, status, reason: '', device_fingerprint: 'd', created_at: at, session_uid: 's', display_name: uid, login_id: uid, resume_count: 0});
const incident = (uid, status, at) => ({uid, status, category: 'technical', message: 'help', contact: '', created_at: at, display_name: uid, login_id: uid});
const report = (uid, device, passed, failed, at) => ({uid, device_fingerprint: device, os_name: 'macos', app_version: '1', passed, failed_checks: failed, display_name: uid, created_at: at});
const ticket = (uid, contest_uid, status, at) => ({uid, contest_uid, email: 'e@example.test', phone: '', name: uid, category: 'LOGIN_ISSUE', status, updated_at: at});

test('open items come first by urgency then longest waiting; resolved newest first', () => {
  const raw = {
    resumes: [resume('r-new', 'pending', t(20)), resume('r-old', 'pending', t(5)), resume('r-done', 'approved', t(1))],
    incidents: [incident('i-open', 'open', t(0)), incident('i-done', 'resolved', t(30))],
    sessions: [],
  };
  const items = mergeIssues({
    raw, contestUid: 'c', now,
    readiness: [report('gate', 'dev1', false, ['camera'], t(2))],
    overrides: [],
    tickets: [ticket('tk', 'c', 'open', t(-10)), ticket('other-contest', 'x', 'open', t(-20)), ticket('tk-done', 'c', 'resolved', t(40))],
  });
  assert.deepEqual(items.map(i => i.id), [
    'resume:r-old', 'resume:r-new', 'incident:i-open', 'entry:gate', 'ticket:tk',
    'ticket:tk-done', 'incident:i-done', 'resume:r-done',
  ]);
  assert.deepEqual(items.map(i => i.open), [true, true, true, true, true, false, false, false]);
});

test('open re-entry and help counts match the status strip count', () => {
  const raw = {
    resumes: [resume('a', 'pending', t(0)), resume('b', 'rejected', t(0)), resume('c', 'pending', t(1))],
    incidents: [incident('x', 'open', t(0)), incident('y', 'in_progress', t(0)), incident('z', 'resolved', t(0))],
    sessions: [],
  };
  const open = mergeIssues({raw, readiness: [], overrides: [], tickets: [], contestUid: 'c', now}).filter(i => i.open);
  const strip = countWaitingOnStaff(raw);
  assert.equal(open.filter(i => i.kind === 'resume').length, strip.waiting);
  assert.equal(open.filter(i => i.kind === 'incident').length, strip.openHelp);
  assert.deepEqual(strip, {waiting: 2, openHelp: 2});
});

test('entry-gate block uses the latest report per device and is resolved once every failed check is waived', () => {
  const raw = {resumes: [], incidents: [], sessions: []};
  const readiness = [report('old', 'dev', false, ['camera', 'vm'], t(0)), report('new', 'dev', false, ['camera', 'vm'], t(5)), report('fixed', 'dev2', false, ['vm'], t(0)), report('fixed2', 'dev2', true, [], t(6))];
  const grant = (check, extra = {}) => ({uid: check, device_fingerprint: 'dev', check_kind: check, reason: 'ok', expires_at: t(120), revoked: false, granted_by: 'staff', ...extra});
  const run = overrides => mergeIssues({raw, readiness, overrides, tickets: [], contestUid: 'c', now});
  assert.deepEqual(run([]).map(i => [i.id, i.open, i.detail]), [['entry:new', true, 'Failed camera, vm']]);
  assert.deepEqual(run([grant('camera')]).map(i => [i.open, i.detail]), [[true, 'Failed vm']]);
  assert.deepEqual(run([grant('camera'), grant('vm')]).map(i => [i.open, i.status]), [[false, 'waived']]);
  assert.equal(run([grant('camera'), grant('vm', {revoked: true})])[0].open, true, 'revoked waiver does not count');
  assert.equal(run([grant('camera'), grant('vm', {expires_at: t(30)})])[0].open, true, 'expired waiver does not count');
});

test('contest tickets are paged across the whole org inbox and filtered client-side', async () => {
  const original = globalThis.fetch;
  const offsets = [];
  const pages = [[ticket('11111111-1111-4111-8111-111111111111', 'c', 'open', t(0)), ticket('22222222-2222-4222-8222-222222222222', 'x', 'open', t(0))], [ticket('33333333-3333-4333-8333-333333333333', 'c', 'open', t(0))]];
  globalThis.fetch = async url => {
    const params = new URLSearchParams(String(url).split('?')[1]);
    assert.equal(params.get('status'), 'open');
    const offset = Number(params.get('offset'));
    offsets.push(offset);
    const page = offset === 0 ? 0 : 1;
    return new Response(JSON.stringify({items: pages[page], has_more: page === 0}), {status: 200});
  };
  try {
    const result = await loadContestTickets('c', 'open');
    assert.deepEqual(offsets, [0, 2]);
    assert.equal(result.complete, true);
    assert.deepEqual(result.tickets.map(x => x.uid[0]), ['1', '3']);
  } finally {
    globalThis.fetch = original;
  }
});
