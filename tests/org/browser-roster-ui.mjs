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
      if (state.write) return state.write({ request, url, respond });
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
  const emailButton = i => row(i).getByRole('button', { name: /^(Re-email|Queueing…|Queued)$/ });
  const load = async () => { await page.goto(base + '/org/contests/a#participants'); await row(0).waitFor(); };
  try { await run({ page, state, calls, hold, row, emailButton, load, context }); assert.deepEqual(errors, []); }
  finally { releases.forEach(release => release()); await context.close(); }
}
try {
  if (benchmark) {
    for (let run = 1; run <= 3; run++) await scenario(async ({ page, context, state, hold, row, emailButton, load }) => {
      const session = await context.newCDPSession(page); await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const blocked = hold(); state.write = async ({ respond }) => { await blocked.promise; return respond({ queued: 1 }); };
      await load(); await page.locator('tbody tr').nth(1320).waitFor({ state: 'attached' });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const pendingMs = await emailButton(0).evaluate(button => new Promise(resolve => {
        const started = performance.now();
        const check = () => performance.now() - started > 15000 ? resolve(null) : button.disabled ? requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - started))) : requestAnimationFrame(check);
        button.click(); check();
      }));
      const searchTiming = await page.getByRole('textbox', { name: 'Find a candidate' }).evaluate(input => new Promise(resolve => {
        const started = performance.now();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'Candidate 1320'); input.dispatchEvent(new Event('input', { bubbles: true }));
        let inputPaintMs = null;
        requestAnimationFrame(() => requestAnimationFrame(() => { inputPaintMs = performance.now() - started; }));
        const check = () => performance.now() - started > 15000 ? resolve(null) : document.querySelectorAll('tbody tr').length === 1 && document.querySelector('tbody')?.textContent.includes('Candidate 1320') ? requestAnimationFrame(() => requestAnimationFrame(() => resolve({ searchMs: performance.now() - started, inputPaintMs }))) : requestAnimationFrame(check);
        check();
      }));
      assert.notEqual(pendingMs, null, 'Pending feedback appeared within15s');
      assert.notEqual(searchTiming, null, 'Search settled within15s');
      console.log(JSON.stringify({ run, rows: 1321, cpu: 4, pendingMs, ...searchTiming }));
    }, 1321);
  } else {
    await scenario(async ({ page, state, calls, load }) => {
      state.roster[1].last_login_at = '2026-10-25T00:00:00Z';
      await load();
      const candidate = page.getByRole('row').filter({ has: page.getByText('candidate-1', { exact: false }) });
      await candidate.getByText('signed in', { exact: true }).waitFor();
      assert.equal(await candidate.getByText('Entered', { exact: true }).count(), 0, 'Sign-in alone is not contest entry');
      const before = calls.filter(c => c.method === 'GET' && c.path.endsWith('/participants')).length;
      state.sessions = [{ user_uid: 'u1', login_id: 'candidate-1', started_at: '2026-10-25T00:00:00Z' }];
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await candidate.getByText('Entered', { exact: true }).waitFor();
      assert((await page.locator('tbody tr').first().innerText()).includes('Candidate 0001'), 'Newly entered candidate moves first');
      assert.equal(calls.filter(c => c.method === 'GET' && c.path.endsWith('/participants')).length, before, 'Session membership refresh does not fetch roster again');
      console.log('PASS: live entry updates memoized row label and ordering independently of login status');
    });
    await scenario(async ({ state, calls, hold, row, emailButton, load }) => {
      const first = hold(), second = hold();
      state.write = async ({ request, url, respond }) => {
        assert.equal(request.method(), 'POST'); assert.equal(url.search, '?action=reemail');
        assert(['/api/org/contests/a/participants/candidate-0', '/api/org/contests/a/participants/candidate-1'].includes(url.pathname));
        await (url.pathname.endsWith('candidate-0') ? first.promise : second.promise);
        return respond(url.pathname.endsWith('candidate-0') ? { queued: 1 } : { error: 'Second mailbox refused' }, url.pathname.endsWith('candidate-0') ? 200 : 503);
      };
      await load();
      await emailButton(0).evaluate(button => { button.click(); button.click(); });
      await emailButton(1).click();
      await until(() => calls.filter(c => c.method === 'POST').length === 2, 'Exactly one write per row');
      assert(await emailButton(0).isDisabled()); assert(await emailButton(1).isDisabled());
      assert(await row(0).getByRole('button', {name:'Revoke',exact:true}).isDisabled(), 'Same-row revoke blocked during mail');
      first.release(); await row(0).getByText('Queued', { exact: true }).waitFor();
      assert(await emailButton(1).isDisabled(), 'Other row remains pending when first completes');
      assert.equal(await row(1).getByText('Queued', { exact: true }).count(), 0);
      second.release(); await row(1).getByText('Second mailbox refused', { exact: true }).waitFor();
      assert.equal(await row(0).getByText('Second mailbox refused', { exact: true }).count(), 0);
      assert.equal(calls.filter(c => c.method === 'POST').length, 2);
      console.log('PASS: independent row requests, duplicate guard, row-local success and error');
    });
    await scenario(async ({ page, state, calls, hold, row, emailButton, load }) => {
      const pending = hold();
      state.write = async ({ respond }) => { await pending.promise; return respond({ queued: 1 }); };
      await load(); await emailButton(0).click();
      await page.getByRole('textbox', { name: 'Find a candidate' }).fill('Candidate 0001');
      await until(async () => await row(0).count() === 0, 'Pending row filtered away');
      const before = calls.filter(c => c.method === 'GET' && c.path.endsWith('/participants')).length;
      pending.release();
      await until(() => calls.filter(c => c.method === 'GET' && c.path.endsWith('/participants')).length > before, 'Hidden row completion refreshes roster');
      await page.getByRole('button', { name: 'Clear', exact: true }).click();
      await row(0).getByText('Queued', { exact: true }).waitFor();
      console.log('PASS: filtering pending row does not lose action state or refresh');
    });
    await scenario(async ({ page, state, calls, hold, row, load }) => {
      const pending = hold();
      await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable:true, value: { writeText: async value => { window.__copiedCredential = value; } } }));
      state.write = async ({ url, respond }) => {
        assert.equal(url.pathname, '/api/org/contests/a/participants/candidate-0'); assert.equal(url.search, '?action=reissue');
        await pending.promise; return respond({ ...state.roster[0], password: 'synthetic-once-only-secret' });
      };
      await load();
      await row(0).getByRole('button', { name: 'Reissue', exact: true }).evaluate(button => { button.click(); button.click(); });
      await until(() => calls.filter(c => c.method === 'POST').length === 1, 'One reissue begins');
      assert(await row(1).getByRole('button', { name: 'Reissue', exact: true }).isDisabled());
      pending.release();
      const dialog = page.getByRole('dialog', { name: 'New credential for Candidate 0000' }); await dialog.waitFor();
      assert(await row(1).getByRole('button', { name: 'Reissue', exact: true }).isDisabled(), 'Reissue globally locked until credential acknowledged');
      assert(await dialog.getByRole('button', { name: 'Done', exact: true }).isDisabled());
      assert(await row(0).getByRole('button', { name: 'Re-email', exact: true }).isDisabled(), 'Same credential cannot be replaced by mail while slip is open');
      assert(await row(0).getByRole('button', { name: 'Revoke', exact: true }).isDisabled(), 'Same login cannot be revoked while slip is open');
      await page.keyboard.press('Escape'); assert(await dialog.isVisible());
      await dialog.getByRole('button', { name: 'Copy message', exact: true }).click();
      assert((await page.evaluate(() => window.__copiedCredential)).includes('synthetic-once-only-secret'));
      await dialog.getByRole('button', { name: 'Done', exact: true }).click();
      await dialog.waitFor({ state: 'detached' });
      assert(await row(1).getByRole('button', { name: 'Reissue', exact: true }).isEnabled());
      assert(await row(0).getByRole('button', { name: 'Re-email', exact: true }).isEnabled());
      assert(await row(0).getByRole('button', { name: 'Revoke', exact: true }).isEnabled());
      assert.equal(calls.filter(c => c.method === 'POST').length, 1);
      console.log('PASS: reissue serialized, one-time credential copy/close retained');
    });
    await scenario(async ({ state, calls, row, load }) => {
      state.write = async ({ request, url, respond }) => {
        assert.equal(request.method(), 'POST'); assert.equal(url.pathname, '/api/org/contests/a/participants/candidate-0'); assert.equal(url.search, '?action=revoke');
        state.roster[0] = { ...state.roster[0], revoked: true }; return respond(state.roster[0]);
      };
      await load(); await row(0).getByRole('button', { name: 'Revoke', exact: true }).click();
      await row(0).getByText('revoked', { exact: true }).waitFor();
      assert.equal(await row(0).getByRole('button', { name: 'Revoke', exact: true }).count(), 0);
      assert(await row(0).getByRole('button', { name: 'Re-email', exact: true }).isDisabled());
      assert.equal(calls.filter(c => c.method === 'POST').length, 1);
      console.log('PASS: revoke keeps exact endpoint and refreshes eligibility');
    });
    await scenario(async ({ page, state, row, load }) => {
      state.roster[0].email = 'a-very-long-candidate-email-address-that-must-remain-readable@example-college.test';
      state.roster[0].login_id = 'very-long-participant-handle-that-must-remain-readable';
      await load();
      assert(await row(0).getByText(state.roster[0].email, { exact: true }).isVisible());
      const input = page.getByRole('textbox', { name: 'Find a candidate' });
      await input.fill(state.roster[0].email); await until(async () => await page.locator('tbody tr').count() === 1, 'Email search');
      await page.getByRole('button', { name: 'Clear', exact: true }).click();
      await page.getByRole('combobox', { name: 'Filter by operating system' }).selectOption('Linux');
      await until(async () => await page.locator('tbody tr').count() === 2, 'OS filter settles');
      await page.getByRole('combobox', { name: 'Filter by college' }).selectOption('College B');
      await page.getByText(/No .*match|No participants|Nobody matches/i).waitFor();
      await page.getByRole('button', { name: 'Clear', exact: true }).click();
      await until(async () => await page.locator('tbody tr').count() === 4, 'Clear restores rows');
      await page.screenshot({ path: '/tmp/ams-roster-ui-desktop.png' });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: '/tmp/ams-roster-ui-mobile.png' });
      const bounds = await page.locator('table').evaluate(table => {
        let scroll = table.parentElement;
        while (scroll && !['auto', 'scroll'].includes(getComputedStyle(scroll).overflowX)) scroll = scroll.parentElement;
        return { hasScroller: Boolean(scroll), overflowing: scroll ? scroll.scrollWidth > scroll.clientWidth : false, documentOverflow: document.documentElement.scrollWidth - innerWidth };
      });
      assert(bounds.hasScroller && bounds.overflowing, 'Table has a horizontal scroll container on mobile');
      assert(bounds.documentOverflow <= 2, 'Table must not widen the page: ' + JSON.stringify(bounds));
      const action = row(0).getByRole('button', { name: 'Reissue', exact: true });
      await action.focus(); assert(await action.evaluate(button => document.activeElement === button));
      await page.keyboard.press('Tab');
      assert(await row(0).getByRole('button', { name: 'Revoke', exact: true }).evaluate(button => document.activeElement === button));
      await page.getByRole('button', { name: 'Credentials by email', exact: true }).click();
      await page.getByRole('button', { name: 'Send to 4', exact: true }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Credential dropdown fits narrow viewport');
      console.log('PASS: identifier search, combined filters, narrow viewport containment, credential dropdown and keyboard actions');
    });
  }
} finally { await browser.close(); }
