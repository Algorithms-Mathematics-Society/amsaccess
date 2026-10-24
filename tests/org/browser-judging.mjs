// Local browser regression; every API is mocked and external requests blocked.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ORG_TEST_URL || 'http://localhost:3124';
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,headless:true,args:['--no-sandbox']});
const context = await browser.newContext();
await context.addCookies([{name:'ams_session',value:`test.${Math.floor(Date.now()/1000)+3600}.test`,url:base}]);
const page = await context.newPage();
page.on('pageerror', error => console.error(error.message));
let fleetReads=0, runReads=0, releaseRuns, writes=0, failFleet=false;
const runsGate = new Promise(r=>{releaseRuns=r;});
const fleet={workers:[],live:2,stale:0,running_jobs:0,queued_jobs:0,desired:2,driver:'schedule',detail:'Ready test fleet',override:null,state:null,upcoming:[{contest_uid:'a',title:'Test contest',starts_at:'2026-01-01',ends_at:'2027-01-01',participants:100,instances:2,reason:'running'}],queue_waiting:0,queue_inflight:0,queue_error:'',ceiling:40};
await page.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.origin!==base) return route.abort();
 if(!url.pathname.startsWith('/api/')) return route.continue();
 const ok=value=>route.fulfill({contentType:'application/json',body:JSON.stringify(value)}).catch(()=>{});
 if(route.request().method()==='POST') {
  assert.equal(url.pathname,'/api/org/fleet');
  assert.equal(url.search,'?action=probe');
  writes++; fleet.live=3; return ok({});
 }
 assert.equal(route.request().method(),'GET');
 if(url.pathname==='/api/auth/me') return ok({role:'admin'});
 if(url.pathname==='/api/org/fleet') {fleetReads++;if(failFleet) return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Fleet unavailable'})});return ok(fleet);}
 if(url.pathname==='/api/org/fleet/runs') {runReads++;if(runReads===1) await runsGate;return ok([]);}
 if(url.pathname==='/api/org/contests/a') return ok({uid:'a',title:'Test contest',status:'running',starts_at:'2026-01-01',ends_at:'2027-01-01',is_practice:false,problems:[],frozen:false});
 if(url.pathname.endsWith('/submissions/summary')) return ok({total:0,pending:0,verdicts:{}});
 return ok([]);
});
try {
 await page.goto(base+'/org/contests/a#judging');
 await page.getByText('All 2 running. Judging now.',{exact:false}).waitFor();
 assert.equal(fleetReads,1,'capacity strip shares the first fleet read');
 assert.equal(runReads,1);
 await page.waitForTimeout(11_000);
 assert.equal(fleetReads,2,'fleet keeps refreshing while run history stalls');
 assert.equal(runReads,1,'slow run history requests do not overlap');
 await Promise.all([
  page.waitForResponse(r => r.url().includes('/api/org/fleet?action=probe') && r.request().method() === 'POST'),
  page.getByRole('button',{name:'Test judging',exact:true}).click(),
 ]);
 await page.getByText('Ready — 3 judges available',{exact:true}).waitFor();
 await page.waitForFunction(() => {
   const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Test judging');
   return button && !button.disabled;
 }, null, {timeout:30_000});
 assert.ok(runReads >= 2,'post-action history refresh recovers without releasing the stalled read');
 releaseRuns();
 await page.getByRole('button',{name:'participants',exact:true}).click();
 await page.getByRole('button',{name:'judging',exact:true}).click();
 await page.getByText('All 2 running. Judging now.',{exact:false}).waitFor();
 assert.ok(fleetReads >= 4,'returning to judging gets a fresh fleet snapshot');
 await Promise.all([
  page.waitForResponse(r => r.url().includes('/api/org/fleet?action=probe') && r.request().method() === 'POST'),
  page.getByRole('button',{name:'Test judging',exact:true}).click(),
 ]);
 await page.getByText('Ready — 3 judges available',{exact:true}).waitFor();
 assert.equal(writes,2);
 failFleet=true;
 await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await page.getByText('Fleet unavailable',{exact:true}).waitFor();
 assert.equal(await page.getByText('Ready — 3 judges available',{exact:true}).count(),1,'failed read retains last good fleet');
 failFleet=false;
 await page.goto(base+'/org/fleet');
 await page.getByText('Ready — 3 judges available',{exact:true}).waitFor();
 console.log('Judging browser checks passed: shared reads, slow history, non-overlap, remount, action refresh, errors, standalone page');
} catch(error) {console.error('URL',page.url(),'reads',fleetReads,runReads,await page.locator('body').innerText());throw error;} finally {releaseRuns();await browser.close();}
