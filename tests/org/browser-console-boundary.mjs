// Isolated production server; API traffic is mocked and external requests blocked.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ORG_TEST_URL || 'http://localhost:3124';
const browser = await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
const context = await browser.newContext();
await context.addCookies([{name:'ams_session',value:`test.${Math.floor(Date.now()/1000)+3600}.test`,url:base}]);
const page = await context.newPage();
const errors = [], calls = [];
page.on('pageerror', error => errors.push(error.message));
// Observe actual React commits, without adding instrumentation to shipped code.
await page.addInitScript(() => {
  window.__consoleCommits = 0;
  window.__reactCommits = 0;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    inject: () => 1,
    onCommitFiberUnmount() {},
    onCommitFiberRoot(_renderer, root) {
      window.__reactCommits++;
      const visit = fiber => {
        if (!fiber) return;
        if (fiber.type === window.__consoleType && (fiber.flags & 1)) window.__consoleCommits++;
        visit(fiber.child);
        visit(fiber.sibling);
      };
      visit(root.current);
    },
  };
});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) {
  for (let i = 0; i < 160; i++) { if (await fn()) return; await wait(25); }
  throw new Error('Condition not reached');
}
let incidents = [{uid:'help',status:'open',message:'Need assistance',category:'technical',contact:'',created_at:'2026-10-23T14:00:00Z',display_name:'Help Person',login_id:'helper'}];
let violations = 1, releaseScripts = null;
await page.route('**/*', async route => {
  const req = route.request(), url = new URL(req.url());
  if (url.origin !== base) return route.abort();
  if (!url.pathname.startsWith('/api/')) {
    if (releaseScripts && req.resourceType() === 'script') await releaseScripts.promise;
    return route.continue();
  }
  calls.push({path:url.pathname,query:url.search,method:req.method()});
  const ok = data => route.fulfill({contentType:'application/json',body:JSON.stringify(data)}).catch(() => {});
  if (url.pathname === '/api/auth/me') return ok({role:'admin'});
  if (/^\/api\/org\/contests\/[ab]$/.test(url.pathname)) return ok({uid:url.pathname.split('/').at(-1),title:'Boundary contest',status:'running',starts_at:'2026-01-01',ends_at:'2027-01-01',is_practice:false,invite_code:null,problems:[],frozen:false});
  if (url.pathname.endsWith('/submissions/summary')) return ok({total:0,pending:0,verdicts:{}});
  if (url.pathname.endsWith('/submissions') || url.pathname.endsWith('/participants')) return ok([]);
  if (url.pathname.endsWith('/invigilation')) {
    if (req.method() === 'POST') {
      assert.equal(url.searchParams.get('action'),'resolve-incident');
      assert.equal(url.searchParams.get('uid'),'help');
      incidents = [];
      return ok({status:'resolved'});
    }
    if (url.pathname.includes('/b/')) return ok([]);
    const view = url.searchParams.get('view');
    if (view === 'incidents') return ok(incidents);
    if (view === 'sessions') return ok([{uid:'session',user_uid:'student',login_id:'student',display_name:'Review Person',status:'active',violation_count:violations,resume_count:0,idle_seconds:1}]);
    return ok([]);
  }
  if (url.pathname === '/api/org/students/student/profile') return ok({uid:'student',handle:'student',display_name:'Review Person',email:'test@example.test',mailable:true,status:'active',college:'',branch:'',graduation_year:null,linkedin_url:'',github_url:'',has_resume_file:false,phone:'',location:'',external_ref:'',notes:'',created_at:'2026-10-23',contests_entered:0,problems_solved:0,submissions_total:0,accepted_total:0,contests:[],submissions:[],tags:[],verdicts:[],activity:[]});
  if (url.pathname === '/api/org/students/student/invigilation') return ok([]);
  if (url.pathname === '/api/org/students/student/photo') return route.fulfill({status:404,body:''});
  throw new Error('Unexpected API ' + req.method() + ' ' + url.pathname);
});
const launcher = () => page.getByRole('button',{name:/^Open notifications,/});
const drawer = () => page.getByRole('dialog',{name:'Notifications',exact:true});
try {
  await page.goto(base + '/org/contests/a#problems');
  await launcher().waitFor();
  await until(() => calls.filter(c => c.path.endsWith('/invigilation')).length >= 3);
  await wait(150);
  await page.evaluate(() => {
    const heading = document.querySelector('h1');
    const key = Object.keys(heading).find(key => key.startsWith('__reactFiber$'));
    let fiber = heading[key];
    while (fiber && typeof fiber.type !== 'function') fiber = fiber.return;
    if (!fiber) throw new Error('Console fiber not found');
    window.__consoleType = fiber.type;
    window.__consoleCommits = 0;
  });
  assert(await page.evaluate(() => window.__reactCommits > 0), 'React commit observer is active');
  await launcher().click();
  for (let i = 0; i < 5; i++) {
    violations++;
    await drawer().getByRole('button',{name:'Refresh notifications'}).click();
    await until(async () => await drawer().getByRole('button',{name:'Refresh notifications'}).isEnabled());
  }
  await drawer().getByRole('button',{name:/^Help/}).click();
  const help = drawer().getByRole('listitem').filter({hasText:'Help Person'});
  await help.getByRole('button',{name:'Mark resolved'}).click();
  await help.getByRole('button',{name:'Yes, resolve'}).click();
  await until(async () => await help.count() === 0);
  assert.equal(calls.filter(c => c.method === 'POST').length, 1, 'one immediate action POST');
  const parentRenders = await page.evaluate(() => window.__consoleCommits);
  console.log('CONSOLE_RENDER_METRIC ' + JSON.stringify({parentRenders, refreshes:5, actions:1}));
  if (process.env.ORG_EXPECT_PARENT_RENDERS === '1') assert(parentRenders > 0, 'baseline observer must detect parent rendering');
  else assert.equal(parentRenders, 0, 'feed refresh/actions must not render the contest parent');
  assert.equal(calls.filter(c => c.path.endsWith('/profile')).length, 0, 'closed profile has no data requests');
  console.log('PASS: notification render measurement and single action POST');

  await drawer().getByRole('button',{name:/^Flags/}).click();
  let release;
  releaseScripts = {promise:new Promise(resolve => {release = resolve;})};
  await drawer().getByRole('button',{name:'Review participant'}).click();
  const modal = page.getByRole('dialog',{name:'Participant',exact:true});
  await modal.waitFor();
  assert.equal(await page.evaluate(() => location.hash), '#problems');
  await page.keyboard.press('Escape');
  await modal.waitFor({state:'detached'});
  releaseScripts = null;
  release();
  await launcher().click();
  await drawer().getByRole('button',{name:/^Flags/}).click();
  await drawer().getByRole('button',{name:'Review participant'}).click();
  await modal.getByText('Review Person',{exact:true}).first().waitFor();
  await modal.getByRole('button',{name:'Close',exact:true}).click();
  await modal.waitFor({state:'detached'});
  console.log('PASS: profile shell closes during delayed chunk load, reopened profile works without navigating away');

  const participants = page.getByRole('button',{name:'participants',exact:true});
  const readsBefore = calls.filter(c => c.path.endsWith('/participants')).length;
  await participants.focus();
  await wait(100);
  assert.equal(calls.filter(c => c.path.endsWith('/participants')).length, readsBefore, 'intent loads code without mounting/fetching inactive panel');
  await participants.click();
  await until(() => calls.some(c => c.path.endsWith('/participants')));
  assert.equal(await page.evaluate(() => location.hash), '#participants');
  assert(await page.evaluate(() => window.__consoleCommits > 0), 'observer detects genuine parent renders on tab navigation');
  await page.goto(base + '/org/contests/b#problems');
  await until(async () => (await launcher().getAttribute('aria-label'))?.includes('0 awaiting'));
  await launcher().click();
  assert.equal(await drawer().getByText('Review Person',{exact:true}).count(), 0, 'previous contest notifications are not retained');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS: lazy tab intent, hash navigation, and contest-scoped notification reset');
} finally {
  await browser.close();
}
