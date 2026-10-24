// Local browser regression; every API is mocked and external requests blocked.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ORG_TEST_URL || 'http://localhost:3124';
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,headless:true,args:['--no-sandbox']});
const context = await browser.newContext();
await context.addCookies([{name:'ams_session',value:`test.${Math.floor(Date.now()/1000)+3600}.test`,url:base}]);
const page = await context.newPage();
page.on('pageerror', error => console.error(error.message));
let fleetReads=0, runReads=0, releaseRuns, writes=0, failFleet=false, practice=false, failRuns=false, runs=[];
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
 if(url.pathname==='/api/org/fleet/runs') {runReads++;if(runReads===1) await runsGate;if(failRuns) return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"History unavailable"})});return ok(runs);}
 if(url.pathname==='/api/org/contests/a') return ok({uid:'a',title:'Test contest',status:'running',starts_at:'2026-01-01',ends_at:'2027-01-01',is_practice:practice,problems:[],frozen:false});
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
 fleet.queue_error='Fixture queue error'; fleet.queue_waiting=42;
 await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await page.getByText('Unknown',{exact:true}).waitFor();
 assert.equal(await page.getByText('42',{exact:true}).count(),0,'Unavailable queue is not shown as a trustworthy count');
 practice=true; fleet.live=0; fleet.desired=2; fleet.upcoming=[]; fleet.queue_error=''; fleet.queue_waiting=0;
 fleet.override={mode:'warm',instances:2,expires_at:'2027-01-01T00:00:00Z',reason:'fixture'};
 await page.reload();
 await page.getByText('No shared fleet workers reporting',{exact:true}).waitFor();
 await page.getByText(/This practice contest uses the always-on judge/).waitFor();
 await page.getByText(/2 requested/).waitFor();
 assert.equal(await page.getByText(/No additional fleet capacity is currently scheduled/).count(),0,'Warm request is not described as absent');
 await page.getByText(/No test result is available in the loaded history/).waitFor();
 const diagnostics=page.getByRole('complementary',{name:'Judging diagnostics'});
 await diagnostics.getByText('No tests in the available history. Use Test judging for a fresh check.',{exact:true}).waitFor();
 runs=[{uid:'failed-check',kind:'probe',status:'failed',total:1,completed:0,failed:1,started_at:'2026-10-25T00:00:00Z',last_error:'Judge could not finish the test',latency_ms:{},throughput:null}];
 fleet.state={desired:2,actual:0,ceiling:40,per_region:{},driver:'schedule',last_error:'Controller message '+ 'x'.repeat(500),last_scaled_at:null,reported_at:'2026-10-25T00:00:00Z',stale:true};
 await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await diagnostics.getByText('Problem reported',{exact:true}).waitFor();
 await diagnostics.getByText('The controller reported a problem managing judges',{exact:true}).waitFor();
 await diagnostics.getByText('Show reported message',{exact:true}).first().click();
 failRuns=true;
 await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await diagnostics.getByText(/Test history could not be refreshed/).waitFor();
 assert.equal(await diagnostics.getByText('Problem reported',{exact:true}).count(),1,'history failure retains historical failures');
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Judging UI fits mobile');
 fleet.live=3; fleet.override=null; fleet.state=null;
 await page.goto(base+'/org/fleet');
 await page.getByText('Ready — 3 judges available',{exact:true}).waitFor();
 console.log('Judging browser checks passed: shared reads, slow history, non-overlap, remount, action refresh, errors, standalone page');
} catch(error) {console.error('URL',page.url(),'reads',fleetReads,runReads,await page.locator('body').innerText());throw error;} finally {releaseRuns();await browser.close();}
