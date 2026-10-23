// Run against an isolated production build. All API reads/writes are mocked;
// external requests are blocked, including any mail or proctoring side effects.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ORG_TEST_URL || 'http://localhost:3124';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext();
await context.addCookies([{ name: 'ams_session', value: `test.${Math.floor(Date.now()/1000)+3600}.test`, url: base }]);
const page = await context.newPage();
const errors = [], calls = [];
page.on('pageerror', e => errors.push(e.message));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) { for (let i=0;i<100;i++) { if (await fn()) return; await wait(30); } throw new Error('Condition not reached'); }
function gate() { let release; const promise = new Promise(r => { release=r; }); return { promise, release }; }
let templateGate = gate(), readinessGate = gate(), batchGate = null, searchGate = null;
let failSessions = false, retried = false;
const batch = () => ({uid:'batch',label:retried?'Fresh after retry':'Test batch',template_name:'reminder',kind:'custom',contest_uid:null,contest_title:'',total:1,counts:retried?{sent:1}:{failed:1},created_at:'2026-10-23T12:00:00Z',messages:[]});
const count = (path) => calls.filter(c=>c.path===path && c.method==='GET').length;
await page.route('**/*', async route => {
  const request=route.request(), url=new URL(request.url());
  if(url.origin!==base) return route.abort();
  if(!url.pathname.startsWith('/api/')) return route.continue();
  calls.push({path:url.pathname,query:url.search,at:Date.now(),method:request.method()});
  const ok=async value => { try { await route.fulfill({contentType:'application/json',body:JSON.stringify(value)}); } catch { /* request may have been aborted */ } };
  if(request.method()!=='GET') {
    assert.equal(url.pathname,'/api/org/mail/batches/batch');
    assert.equal(url.search,'?action=retry-failed');
    assert.equal(request.method(),'POST');
    retried=true; return ok({});
  }
  if(url.pathname==='/api/auth/me') return ok({role:'admin'});
  if(url.pathname==='/api/org/mail/templates') {
    if(url.searchParams.has('variables')) return ok({variables:[]});
    await templateGate.promise;
    return ok([{name:'reminder',subject:'Reminder',text:'Body',html:'',placeholders:[]}]);
  }
  if(url.pathname==='/api/org/mail/batches') return ok([{...batch(),counts:{queued:1}}]);
  if(url.pathname==='/api/org/mail/batches/batch') { const snapshot=batch(); if(batchGate) await batchGate.promise; return ok(snapshot); }
  if(url.pathname==='/api/org/contests') return ok([]);
  if(/^\/api\/org\/contests\/a$/.test(url.pathname)) return ok({uid:'a',title:'Test contest',slug:'test',description:'',visibility:'private',status:'running',starts_at:'2026-01-01',ends_at:'2027-01-01',is_practice:false,invite_code:null,problems:[],joined:false,frozen:false});
  if(url.pathname.endsWith('/submissions/summary')) return ok({total:0,pending:0,verdicts:{}});
  if(url.pathname.endsWith('/submissions') || url.pathname.endsWith('/participants')) return ok([]);
  if(url.pathname.endsWith('/invigilation')) {
    const view=url.searchParams.get('view');
    if(view==='readiness') await readinessGate.promise;
    if(view==='sessions') {
      if(failSessions === 'null') return ok(null);
      if(failSessions) return route.fulfill({status:503,contentType:'application/json',body:'{}'});
      return ok([{uid:'session',user_uid:'student',login_id:'student',display_name:'Visible Student',status:'active',started_at:'2026-10-23T12:00:00Z',idle_seconds:1,violation_count:0,resume_count:0}]);
    }
    return ok([]);
  }
  if(url.pathname==='/api/org/students/facets') return ok({total:1,colleges:[],branches:[],graduation_years:[]});
  if(url.pathname==='/api/org/students') {
    const q=url.searchParams.get('q')||'Initial';
    if(q==='Slow' && searchGate) await searchGate.promise;
    return ok([{uid:q,username:q.toLowerCase(),display_name:q+' Student',email:'test@example.test',college:'',branch:'',graduation_year:null,contests:[],contests_entered:0,problems_solved:0,mailable:true}]);
  }
  throw new Error('Unexpected API '+url.pathname);
});
async function focus() { await page.evaluate(()=>window.dispatchEvent(new Event('focus'))); }
async function visibility(state) { await page.evaluate(state=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:state});document.dispatchEvent(new Event('visibilitychange'));},state); }
try {
  await page.goto(base+'/org/mails');
  await page.getByRole('button',{name:'New send',exact:true}).click();
  await until(()=>count('/api/org/contests')===1);
  // Contest request has started although the template request is still blocked.
  assert.equal(count('/api/org/mail/templates'),1);
  templateGate.release();
  await page.getByRole('option',{name:'reminder — Reminder'}).waitFor({state:'attached'});
  templateGate=gate();
  await page.getByRole('button',{name:'Templates',exact:true}).click();
  await until(()=>calls.some(c=>c.path==='/api/org/mail/templates'&&c.query==='?variables=1'));
  templateGate.release();
  await page.getByRole('cell',{name:'reminder',exact:true}).waitFor();
  console.log('PASS: both mail request pairs start concurrently');

  await page.getByRole('button',{name:'Sends',exact:true}).click();
  await page.getByText('Test batch',{exact:true}).click();
  await page.getByRole('heading',{name:'Test batch'}).waitFor();
  const listCount=count('/api/org/mail/batches');
  batchGate=gate();
  const before=count('/api/org/mail/batches/batch');
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await until(()=>count('/api/org/mail/batches/batch')===before+1);
  await focus(); await focus();
  await page.getByRole('button',{name:'Retry 1 failed'}).click();
  await until(()=>retried);
  await wait(100);
  assert.equal(count('/api/org/mail/batches/batch'),before+1,'retry waits for older read');
  const pending=batchGate; batchGate=null; pending.release();
  await page.getByRole('heading',{name:'Fresh after retry'}).waitFor();
  assert.equal(count('/api/org/mail/batches/batch'),before+2,'fresh post-write read required');
  await wait(5200);
  assert.equal(count('/api/org/mail/batches'),listCount,'parent mail list must stop polling in detail view');
  await visibility('hidden'); const hiddenCount=count('/api/org/mail/batches/batch'); await focus(); await wait(100);
  assert.equal(count('/api/org/mail/batches/batch'),hiddenCount);
  await visibility('visible');
  console.log('PASS: mail dedupe, post-write freshness, hidden focus and parent polling suspension');

  await page.goto(base+'/org/contests/a#invigilation');
  await page.getByRole('button',{name:'Visible Student',exact:true}).first().waitFor({state:'attached'});
  assert(calls.some(c=>c.path.endsWith('/invigilation')&&c.query==='?view=readiness'));
  const reads=()=>calls.filter(c=>c.path.endsWith('/invigilation')).length;
  const readinessReads=()=>calls.filter(c=>c.path.endsWith('/invigilation')&&c.query==='?view=readiness').length;
  const initial=readinessReads(); await focus(); await focus(); await wait(100); assert.equal(readinessReads(),initial,'pending readiness read is deduplicated while independent streams can refresh');
  assert.equal(await page.getByRole('button',{name:'Visible Student',exact:true,includeHidden:true}).count(),1,'only desktop row tree mounted');
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Visible Student',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Visible Student',exact:true,includeHidden:true}).count(),1,'only mobile row tree mounted');
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole('button',{name:'Visible Student',exact:true}).waitFor();
  readinessGate.release(); await wait(100);
  failSessions=true; await focus(); await wait(100);
  assert(await page.getByRole('button',{name:'Visible Student',exact:true}).first().count(),'failed section retains last data');
  failSessions='null'; await focus(); await wait(100);
  assert.equal(await page.getByRole('button',{name:'Visible Student',exact:true}).count(),1,'null section response retains previous data');
  await visibility('hidden'); const hiddenReads=reads();
  await wait(10200); await focus(); await wait(100); assert.equal(reads(),hiddenReads);
  await visibility('visible'); await until(()=>reads()>hiddenReads);
  console.log('PASS: independent invigilation display, dedupe, stale data preservation and hidden polling pause');

  await page.goto(base+'/org/contests/a#participants');
  await page.getByRole('button',{name:'Add from Access',exact:true}).click();
  const search=page.getByPlaceholder('Search by name, college or reference');
  await page.getByText('Initial Student',{exact:true}).waitFor();
  searchGate=gate(); await search.fill('Slow');
  await until(()=>calls.some(c=>c.path==='/api/org/students'&&c.query==='?q=Slow'));
  await search.fill('Fast');
  await page.getByText('Fast Student',{exact:true}).waitFor();
  searchGate.release(); await wait(100);
  assert.equal(await page.getByText('Slow Student',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  console.log('PASS: directory picker ignores superseded search results');

  await page.goto(base+'/org/participants');
  await page.getByText('Initial Student',{exact:true}).waitFor();
  // Clock control proves select changes bypass the 300ms text debounce.
  const clockNow = Date.now();
  await page.clock.install({ time: clockNow - 1000 }); await page.clock.pauseAt(clockNow);
  const studentCount=count('/api/org/students');
  await page.getByRole('combobox',{name:'Sort order'}).selectOption('newest');
  await until(()=>count('/api/org/students')>studentCount);
  const searchCount=count('/api/org/students');
  await page.getByPlaceholder('Search by name, email, college, or reference…').fill('Typed');
  await page.clock.runFor(299); assert.equal(count('/api/org/students'),searchCount);
  await page.clock.runFor(1); await until(()=>count('/api/org/students')>searchCount);
  await page.getByText('Typed Student',{exact:true}).waitFor();
  console.log('PASS: select refresh is immediate and text search retains 300ms debounce');
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
