// Local production-build regression and interaction benchmark. All APIs are mocked.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ORG_TEST_URL || 'http://localhost:3138';
const benchmark = process.env.ROSTER_BENCHMARK === '1';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function gate() { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; }
async function until(check, message) { for (let i = 0; i < 200; i++) { if (await check()) return; await delay(25); } throw Error(message); }
const person = i => ({ user_uid: `u${i}`, login_id: `candidate-${i}`, display_name: `Candidate ${String(i).padStart(4, '0')}`, revoked: false, last_login_at: null, has_passphrase: true, email: `candidate${i}@example.test`, mail_status: '', college: i % 2 ? 'College B' : 'College A', device_os: i % 2 ? 'Windows' : 'Linux' });
async function scenario(run, count = 4) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'ams_session', value: `test.${Math.floor(Date.now()/1000)+3600}.test`, url: base }]);
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  const calls = [], errors = [], releases = [];
  const state = { roster: Array.from({ length: count }, (_, i) => person(i)), write: null, sessions: [] };
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    calls.push({ path: url.pathname, query: url.search, method: request.method() });
    const respond = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {});
    if (request.method() !== 'GET') {
      if (state.write) return state.write({ request, url, respond, malformed: () => route.fulfill({ status: 200, contentType: "application/json", body: "{not-valid-json" }).catch(() => {}), abort: () => route.abort("failed").catch(() => {}) });
      errors.push(`Unexpected write ${url.pathname}`); return respond({ error: 'Unexpected write' }, 500);
    }
    if (url.pathname === '/api/auth/me') return respond({ role: 'admin' });
    if (url.pathname === '/api/org/contests/a') return respond({ uid: 'a', title: 'Roster UI fixture', status: 'running', starts_at: '2026-01-01', ends_at: '2027-01-01', is_practice: false, problems: [], frozen: false });
    if (url.pathname.endsWith('/credentials')) return respond({ no_credential: 0, ready: 4, holders: 0, holder_names: [], no_email: 0, no_email_names: [] });
    if (url.pathname.endsWith('/participants')) return respond(state.roster);
    if (url.pathname.endsWith('/submissions/summary')) return respond({ total: 0, pending: 0, verdicts: {} });
    if (url.pathname.endsWith('/invigilation')) return respond(url.searchParams.get('view') === 'sessions' ? state.sessions : []);
    errors.push(`Unexpected API ${url.pathname}`); return respond({ error: 'Unmocked request' }, 500);
  });
  const hold = () => { const g = gate(); releases.push(g.release); return g; };
  const row = i => page.getByRole('row').filter({ has: page.getByRole('button', { name: `Candidate ${String(i).padStart(4, '0')}`, exact: true }) });
  const emailButton = i => row(i).getByRole('button', { name: /^(Send email|Resend email|Queueing…|Queued)$/ });
  const load = async () => { await page.goto(base + '/org/contests/a#participants'); await row(0).waitFor(); };
  try { await run({ page, state, calls, hold, row, emailButton, load, context }); assert.deepEqual(errors, []); }
  finally { releases.forEach(release => release()); await context.close(); }
}try {
  await scenario(async ({ page, state, calls, hold, row, load }) => {
    const blocked = hold(); let active = 0, peak = 0; const ids = [];
    state.write = async ({ url, respond }) => {
      assert.equal(url.searchParams.get('action'), 'reemail');
      const loginId = url.pathname.split('/').at(-1); ids.push(loginId); peak = Math.max(peak, ++active);
      await blocked.promise; active--;
      return respond(loginId === 'candidate-3' ? { error: 'Fixture failure' } : { queued: 1 }, loginId === 'candidate-3' ? 500 : 200);
    };
    await load();
    await page.getByRole('button', { name: 'Select eligible shown' }).click();
    await page.getByRole('textbox', { name: 'Find a candidate' }).fill('Candidate 0000');
    await until(async () => await page.locator('tbody tr').count() === 1, 'Filter applies');
    let confirmations = 0;
    page.on('dialog', async dialog => { confirmations++; assert.match(dialog.message(), /6 selected participants/); assert.match(dialog.message(), /hidden by filters/); assert.match(dialog.message(), /replaces existing passwords\/slips for 6 participants/); await dialog.accept(); });
    const readsBefore = calls.filter(c => c.path.endsWith('/participants') && c.method === 'GET').length;
    await page.getByRole('button', { name: 'Email selected', exact: true }).click();
    await until(() => ids.length === 3, 'Three concurrent workers start');
    assert.equal(await page.getByRole('button', { name: 'Queueing selected…' }).isDisabled(), true);
    assert.equal(await row(0).getByRole('button', { name: 'Queueing…', exact: true }).isDisabled(), true);
    blocked.release();
    await until(async () => (await page.getByRole('status').allTextContents()).some(t => t.includes('5 queued · 1 failed · 0 skipped · 0 unknown') && t.includes('not delivered')), 'Batch settles');
    assert.equal(peak, 3); assert.equal(ids.length, 6); assert.equal(new Set(ids).size, 6); assert.equal(confirmations, 1);
    assert.equal(calls.filter(c => c.path.endsWith('/participants') && c.method === 'GET').length, readsBefore + 1, 'One refresh at completion');
  }, 6);
  console.log('PASS bulk: hidden selection confirmation, max3 concurrency, duplicate prevention, one refresh');

  await scenario(async ({ page, state, hold, load }) => {
    const blocked = hold(); const ids = [];
    state.write = async ({ url, respond }) => { ids.push(url.pathname); await blocked.promise; return respond({ queued: 1 }); };
    await load();
    await page.getByRole('button', { name: 'Select eligible shown' }).click();
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Email selected', exact: true }).click();
    assert.equal(ids.length, 0, 'Cancel sends nothing');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Email selected', exact: true }).click();
    await until(() => ids.length === 3, 'Three active requests');
    await page.goto(base + '/org/login');
    blocked.release(); await delay(250);
    assert.equal(ids.length, 3, 'Navigation stops waiting workers');
  }, 6);
  console.log('PASS bulk: cancellation and navigation prevent queued requests');
  await scenario(async ({ page, state, hold, load }) => {
    const blocked = hold(); const ids = [];
    state.write = async ({ url, respond }) => { ids.push(url.pathname); await blocked.promise; return respond({ queued: 1 }); };
    await load();
    await page.getByRole('button', { name: 'Select eligible shown' }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Email selected', exact: true }).click();
    await until(() => ids.length === 3, 'Initial requests before session reset');
    await page.evaluate(() => window.dispatchEvent(new Event('ams:org-session-reset')));
    blocked.release(); await delay(250);
    assert.equal(ids.length, 3, 'Account/session reset stops all waiting recipients');
  }, 6);
  console.log('PASS bulk: session reset prevents subsequent requests');


  await scenario(async ({ page, state, calls, row, load }) => {
    state.roster[1].mail_status = 'sent'; state.roster[2].revoked = true; state.roster[3].email = '';
    state.write = async ({ respond }) => respond({ error: 'Temporary fixture failure' }, 503);
    await load();
    assert.equal(await page.getByRole('checkbox', { name: /candidate-1/ }).isDisabled(), true);
    assert.equal(await page.getByRole('checkbox', { name: /candidate-2/ }).isDisabled(), true);
    assert.equal(await page.getByRole('checkbox', { name: /candidate-3/ }).isDisabled(), true);
    await page.getByRole('button', { name: 'Select eligible shown' }).click();
    page.once('dialog', async dialog => { assert.match(dialog.message(), /1 selected participants/); await dialog.accept(); });
    await page.getByRole('button', { name: 'Email selected', exact: true }).click();
    await until(async () => (await page.getByRole('status').allTextContents()).some(t => t.includes('0 queued · 1 failed')), 'Failure summary');
    assert.equal(calls.filter(c => c.method === 'POST').length, 1);
    assert.match(await row(0).getByRole('alert').innerText(), /Temporary fixture failure/);
  });
  console.log('PASS bulk: existing eligibility and row-local failures preserved');
  await scenario(async ({ page, state, hold, row, load }) => {
    const blocked = hold(); const mailed = [];
    state.write = async ({ url, respond }) => {
      const loginId = url.pathname.split('/').at(-1);
      if (url.searchParams.get('action') === 'revoke') {
        state.roster = state.roster.map(p => p.login_id === loginId ? { ...p, revoked: true } : p.login_id === 'candidate-4' ? { ...p, email: 'changed@example.test' } : p);
        return respond(state.roster.find(p => p.login_id === loginId));
      }
      mailed.push(loginId); await blocked.promise; return respond({ queued: 1 });
    };
    await load();
    await page.getByRole('button', { name: 'Select eligible shown' }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Email selected', exact: true }).click();
    await until(() => mailed.length === 3, 'Initial workers');
    await row(5).getByRole('button', { name: 'Revoke', exact: true }).click();
    await until(async () => (await row(5).innerText()).includes('revoked'), 'Concurrent revoke refreshes eligibility');
    blocked.release();
    await until(async () => (await page.getByRole('status').allTextContents()).some(t => t.includes('4 queued · 0 failed · 2 skipped')), 'Stale selection skipped');
    assert.equal(mailed.includes('candidate-5'), false);
    assert.equal(mailed.includes('candidate-4'), false, 'Changed recipient address requires fresh confirmation');
  }, 6);
  console.log('PASS bulk: queued recipients revalidated after concurrent revoke');
  await scenario(async ({ page, state, calls, row, load }) => {
    state.write = async ({ abort }) => abort();
    await load();
    await row(0).getByRole('checkbox').check();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Email selected', exact: true }).click();
    await until(async () => (await page.getByRole('status').allTextContents()).some(t => t.includes('0 queued · 0 failed · 0 skipped · 1 unknown')), 'Transport failure classified unknown');
    assert.match(await row(0).innerText(), /Email outcome unknown/);
    assert.equal(await row(0).getByRole('checkbox').isDisabled(), true);
    await page.getByRole('button', { name: 'Select eligible shown' }).click();
    assert.equal(await row(0).getByRole('checkbox').isChecked(), false, 'Unknown recipient excluded from another batch');
    assert.equal(calls.filter(c => c.method === 'POST').length, 1);
    page.once('dialog', async dialog => { assert.match(dialog.message(), /prior email request may still deliver/); assert.match(dialog.message(), /replaces their existing password/); await dialog.dismiss(); });
    await row(0).getByRole('button', { name: 'Review retry', exact: true }).click();
    assert.equal(calls.filter(c => c.method === 'POST').length, 1, 'Canceled retry does not send');
    state.write = async ({ respond }) => respond({ queued: 1 });
    page.once('dialog', dialog => dialog.accept());
    await row(0).getByRole('button', { name: 'Review retry', exact: true }).click();
    await until(async () => await row(0).getByRole('button', { name: 'Queued', exact: true }).count() === 1, 'Acknowledged unknown retry accepted');
    assert.equal(calls.filter(c => c.method === 'POST').length, 2);
  });
  console.log('PASS bulk: unknown transport outcome cannot automatically requeue; explicit confirmed retry only');

  await scenario(async ({ page, state, calls, row, load }) => {
    state.roster[0].mail_status = 'bounced';
    state.write = async ({ respond }) => respond({ queued: 1 });
    await load();
    await row(0).getByRole('button', { name: 'Resend email', exact: true }).click();
    await row(0).getByRole('button', { name: 'Review retry', exact: true }).waitFor();
    page.once('dialog', async dialog => { assert.match(dialog.message(), /prior email request may still deliver/); await dialog.dismiss(); });
    await row(0).getByRole('button', { name: 'Review retry', exact: true }).click();
    assert.equal(calls.filter(c => c.method === 'POST').length, 1);
    page.once('dialog', dialog => dialog.accept());
    await row(0).getByRole('button', { name: 'Review retry', exact: true }).click();
    await until(() => calls.filter(c => c.method === 'POST').length === 2, 'Explicit bounced retry sends once');
  });
  console.log('PASS bulk: unchanged bounced status retains a deliberate retry path');

  await scenario(async ({ page, state, calls, row, load }) => {
    state.write = async ({ malformed }) => malformed();
    await load();
    await row(0).getByRole('checkbox').check();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Email selected', exact: true }).click();
    await until(async () => (await page.getByRole('status').allTextContents()).some(t => t.includes('0 queued · 0 failed · 0 skipped · 1 unknown')), 'Malformed HTTP200 body classified unknown');
    assert.match(await row(0).innerText(), /Email outcome unknown/);
    assert.equal(await row(0).getByRole('checkbox').isDisabled(), true);
    await page.getByRole('button', { name: 'Select eligible shown' }).click();
    assert.equal(await row(0).getByRole('checkbox').isChecked(), false, 'Unknown malformed response cannot rejoin bulk');
    assert.equal(calls.filter(c => c.method === 'POST').length, 1, 'No automatic retry after malformed HTTP200');
    await row(0).getByRole('button', { name: 'Review retry', exact: true }).waitFor();
  });
  console.log('PASS bulk: malformed HTTP200 response is unknown and excluded from bulk');

} finally { await browser.close(); }
