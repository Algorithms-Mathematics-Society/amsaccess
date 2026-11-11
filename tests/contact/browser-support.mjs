// All contact submissions intercepted locally: never sends email.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.CONTACT_TEST_URL || 'http://127.0.0.1:3137';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
const context = await browser.newContext();
const page = await context.newPage();
let responseStatus = 429, calls = 0;
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.origin !== base) return route.abort();
  if (url.pathname === '/api/contact') {
    calls++;
    const body = route.request().postDataJSON();
    assert.equal(body.category, 'Support');
    assert.equal(body.message, 'Synthetic sign-in problem');
    return route.fulfill({ status: responseStatus, contentType: 'application/json', body: responseStatus === 200 ? '{"ok":true,"data":{"delivered":true}}' : '{}' });
  }
  return route.continue();
});
try {
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const initial = await noJS.newPage();
  await initial.goto(base + '/contact?source=access-login');
  assert(await initial.locator('input[value=Support]').isChecked(), 'Support must be selected before hydration');
  assert(!(await initial.locator('input[value=Sales]').isChecked()));
  await noJS.close();
  await page.goto(base + '/contact?source=access-login');
  await page.getByText('You don’t need to sign in to use this form.', { exact: false }).waitFor();
  await page.locator('#contact-name').fill('Synthetic Candidate');
  await page.locator('#contact-email').fill('synthetic@example.test');
  await page.locator('#contact-message').fill('Synthetic sign-in problem');
  for (const status of [429, 400, 503, 502]) {
    responseStatus = status;
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await page.getByRole('form', { name: 'Contact Access' }).getByRole('alert').waitFor();
    assert.equal(await page.locator('#contact-message').inputValue(), 'Synthetic sign-in problem');
    assert.equal(await page.locator('#contact-email').inputValue(), 'synthetic@example.test');
    if (status === 502) assert.match(await page.getByRole('form', { name: 'Contact Access' }).getByRole('alert').innerText(), /duplicate/);
  }
  responseStatus = 200;
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByText('Accepted for sending', { exact: true }).waitFor();
  assert.match(await page.locator('form').innerText(), /does not confirm inbox delivery/);
  assert.equal(calls, 5);
  assert.deepEqual(errors, []);
  console.log('PASS: initial Support HTML, public help, draft preserved for 429/400/503/502, honest accepted state; 5 mocked sends only');
} finally { await browser.close(); }
