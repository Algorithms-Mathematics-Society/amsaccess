// Production build, isolated browser contexts. Every API response is synthetic;
// unexpected writes and all external traffic are rejected.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ORG_TEST_URL || 'http://localhost:3124';
const browser = await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function gate() { let release; const promise = new Promise(resolve => { release = resolve; }); return {promise,release}; }
async function until(check, message) {
  for (let i=0;i<160;i++) { if (await check()) return; await delay(25); }
  throw new Error(message || 'Condition not reached');
}
const person = (name='Original Candidate') => ({user_uid:'u1',login_id:'candidate',display_name:name,revoked:false,last_login_at:null,has_passphrase:true,email:'candidate@example.test',mail_status:'',college:'Test College',device_os:'Linux'});
const analytics = {roster:1,entered:0,attempted:0,solved_any:0,os:[],colleges:[],problems:[],verdicts:[],solved_distribution:[]};
async function scenario(run) {
  const context = await browser.newContext();
  await context.addCookies([{name:'ams_session',value:`test.${Math.floor(Date.now()/1000)+3600}.test`,url:base}]);
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  const calls=[], errors=[], releases=[];
  const state={roster:[person()],summary:{total:7,pending:0,verdicts:{AC:7}},hooks:new Map()};
  page.on('pageerror', error=>errors.push(error.message));
  const hold = () => { const g=gate(); releases.push(g.release); return g; };
  await page.route('**/*', async route => {
    const request=route.request(), url=new URL(request.url());
    if(url.origin!==base) return route.abort();
    if(!url.pathname.startsWith('/api/')) return route.continue();
    calls.push({path:url.pathname,query:url.search,method:request.method()});
    const respond=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
    const hook=state.hooks.get(url.pathname);
    if(hook && await hook({url,request,respond,route})!==false) return;
    assert.equal(request.method(),'GET','Unexpected write: '+url.pathname);
    if(url.pathname==='/api/auth/me') return respond({role:'admin'});
    if(/^\/api\/org\/contests\/[ab]$/.test(url.pathname)) return respond({uid:url.pathname.split('/').at(-1),title:'Read fixture',status:'running',starts_at:'2026-01-01',ends_at:'2027-01-01',is_practice:false,problems:[],frozen:false,description:''});
    if(url.pathname.endsWith('/participants')) return respond(state.roster);
    if(url.pathname.endsWith('/scoreboard')) return respond({rows:state.roster.map(p=>({...p,username:p.login_id,rank:1,solved:0,score:0,partial:0,penalty:0,cells:{}})),frozen:false,generated_at:new Date().toISOString()});
    if(url.pathname.endsWith('/analytics')) return respond(analytics);
    if(url.pathname.endsWith('/submissions/summary')) return respond(state.summary);
    if(url.pathname.endsWith('/submissions') || url.pathname.endsWith('/invigilation')) return respond([]);
    if(url.pathname==='/api/org/fleet') return respond({workers:[],live:0,stale:0,running_jobs:0,queued_jobs:0,desired:0,queue_waiting:0,override:null,state:null,upcoming:[],ceiling:4,driver:'test',detail:''});
    // Judging can request recent scaling actions in addition to fleet status.
    if(url.pathname.endsWith('/scale')) return respond({});
    if(url.pathname.endsWith('/runs')) return respond([]);
    errors.push('Unexpected API '+url.pathname+url.search); return respond({error:'Unmocked request'},500);
  });
  const tab=name=>page.getByRole('button',name==='submissions'?{name:/^submissions(?:\s*\d+)?$/}:{name,exact:true});
  const count=suffix=>calls.filter(c=>c.method==='GET' && c.path.endsWith(suffix)).length;
  try { await run({page,state,calls,hold,tab,count}); assert.deepEqual(errors,[]); }
  finally { releases.forEach(release=>release()); await context.close(); }
}
try {
  await scenario(async ({page,state,hold,count})=>{
    const contest=hold(), roster=hold();
    state.hooks.set('/api/org/contests/a',async ({respond})=>{await contest.promise;await respond({uid:'a',title:'Read fixture',status:'running',starts_at:'2026-01-01',ends_at:'2027-01-01',is_practice:false,problems:[],frozen:false});});
    state.hooks.set('/api/org/contests/a/participants',async ({respond})=>{await roster.promise;await respond(state.roster);});
    await page.goto(base+'/org/contests/a#participants');
    await until(()=>count('/participants')===1,'Selected tab must start data before contest response');
    roster.release();
    await delay(1200); // Exceed speculative-hover freshness while navigation is committed.
    assert.equal(count('/participants'),1,'Metadata gate cannot restart the selected read');
    contest.release(); await page.getByText('Original Candidate',{exact:true}).waitFor();
    assert.equal(count('/participants'),1,'Delayed mount adopts completed navigation read without duplication');
    assert.equal(count('/submissions'),0);
    console.log('PASS: selected-tab data starts before contest finishes and shares one request');
  });
  await scenario(async ({page,state,hold,count})=>{
    const roster=hold();
    state.hooks.set('/api/org/contests/a/participants',async ({respond})=>{await roster.promise;await respond(state.roster);});
    await page.goto(base+'/org/contests/a#leaderboard');
    await page.getByText('Original Candidate',{exact:true}).waitFor();
    assert.equal(count('/participants'),1);
    assert.equal(count('/scoreboard'),1);
    console.log('PASS: delayed roster metadata does not block leaderboard scores');
  });
  for(const name of ['participants','leaderboard','analytics']) await scenario(async ({page,state,hold,tab,count})=>{
    const suffix={participants:'/participants',leaderboard:'/scoreboard',analytics:'/analytics'}[name];
    const content=()=>name==='analytics'?page.getByText('Operating system',{exact:true}):page.getByText('Original Candidate',{exact:true});
    await page.goto(base+'/org/contests/a#'+name); await content().waitFor();
    await tab('problems').click(); const refresh=hold();
    state.hooks.set('/api/org/contests/a'+suffix,async ({respond})=>{await refresh.promise;await respond(name==='analytics'?analytics:name==='participants'?[person('Fresh Revisit Candidate')]:{rows:[],frozen:false});});
    const before=count(suffix); await tab(name).click();
    await until(()=>count(suffix)>before,'Revisit must revalidate immediately');
    if(name==='participants') {
      assert.equal(await content().count(),0,'Participants avoids mounting the cached full roster during navigation');
      assert.equal(await page.getByText('Fresh Revisit Candidate',{exact:true}).count(),0);
      refresh.release();await page.getByText('Fresh Revisit Candidate',{exact:true}).waitFor();
      assert.equal(await content().count(),0,'First populated roster uses the completed fresh read');
      console.log('PASS: participants revisit waits for current read then renders fresh rows');
    } else {
      await content().waitFor();
      assert(await content().isVisible(),'Cached content is usable before refresh response');
      console.log('PASS: '+name+' revisit keeps cached data while fresh read is blocked');
    }
    assert.equal(count('/submissions'),0);
  });
  await scenario(async ({page,state,tab})=>{
    await page.goto(base+'/org/contests/a#participants'); await page.getByText('Original Candidate',{exact:true}).waitFor();
    await tab('problems').click();
    state.hooks.set('/api/org/contests/a/participants',async ({respond})=>{await respond({error:'Fixture temporarily offline'},503);});
    await tab('participants').click();await page.getByText(/Fixture temporarily offline/).waitFor();
    assert(await page.getByText('Original Candidate',{exact:true}).isVisible(),'Failed refresh keeps last good roster');
    await tab('problems').click();
    state.hooks.set('/api/org/contests/a/participants',async ({respond})=>{await respond({error:'Fixture permission revoked'},403);});
    await tab('participants').click();await page.getByText(/Fixture permission revoked/).waitFor();
    assert.equal(await page.getByText('Original Candidate',{exact:true}).count(),0,'Authorization failure removes retained rows');
    console.log('PASS: ordinary failure retains rows but permission loss removes them');
  });
  await scenario(async ({page,state,hold,tab,count})=>{
    await page.goto(base+'/org/contests/a#participants'); await page.getByText('Original Candidate',{exact:true}).waitFor();
    const old=hold();let reads=0;
    state.hooks.set('/api/org/contests/a/participants',async ({respond})=>{reads++;if(reads===1){await old.promise;await respond([person('Stale Candidate')]);}else await respond([person('Fresh Candidate')]);});
    state.hooks.set('/api/org/contests/a/participants/candidate',async ({url,request,respond})=>{
      assert.equal(request.method(),'POST');assert.equal(url.searchParams.get('action'),'reemail');await respond({queued:1});
    });
    await tab('participants').hover(); await until(()=>reads===1);
    await page.getByRole('button',{name:'Re-email',exact:true}).click();
    await page.getByText('Fresh Candidate',{exact:true}).waitFor();
    old.release(); await delay(100);
    assert.equal(await page.getByText('Stale Candidate',{exact:true}).count(),0);
    assert.equal(count('/submissions'),0);
    console.log('PASS: post-write refresh supersedes an older pending read');
  });
  for (const destination of ['analytics', 'leaderboard']) await scenario(async ({page,state,hold,tab,count})=>{
    const mutation=hold(), replacement=hold(); let started=false;
    state.hooks.set('/api/org/contests/a/participants/candidate',async ({request,respond})=>{
      assert.equal(request.method(),'POST'); started=true; await mutation.promise; await respond({queued:1});
    });
    await page.goto(base+'/org/contests/a#participants');
    await page.getByText('Original Candidate',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Re-email',exact:true}).click(); await until(()=>started);
    await tab(destination).click();
    const content=()=>destination==='analytics'?page.getByText('Operating system',{exact:true}):page.getByText('Original Candidate',{exact:true});
    await content().waitFor();
    const suffix=destination==='analytics'?'/analytics':'/scoreboard'; const before=count(suffix);
    state.hooks.set('/api/org/contests/a'+suffix,async ({respond})=>{
      await replacement.promise;
      await respond(destination==='analytics'?analytics:{rows:[{...person(),username:'candidate',rank:1,solved:0,score:0,partial:0,penalty:0,cells:{}}],frozen:false});
    });
    mutation.release();
    await until(()=>count(suffix)===before+1,'Late mutation must immediately reload the active derived view');
    await content().waitFor({state:'detached'});
    replacement.release(); await content().waitFor();
    assert.equal(count(suffix),before+1,'Only one replacement request is needed');
    assert.equal(count(destination==='analytics'?'/scoreboard':'/analytics'),0,'Unopened derived view stays lazy');
    console.log('PASS: late participant mutation refreshes active '+destination+' without reopening');
  });
  await scenario(async ({page,state,hold,tab,count})=>{
    await page.goto(base+'/org/contests/a#participants'); await page.getByText('Original Candidate',{exact:true}).waitFor();
    const stale=hold();
    state.hooks.set('/api/org/contests/a/participants',async ({respond})=>{await stale.promise;await respond([person('Prior Account Secret')]);});
    const before=count('/participants');
    await tab('participants').hover();await until(()=>count('/participants')>before,'Reset scenario requires an active old-account read');
    await page.getByText('Original Candidate',{exact:true}).waitFor();
    await page.evaluate(()=>window.dispatchEvent(new Event('ams:org-session-reset')));
    await page.getByText('Original Candidate',{exact:true}).waitFor({state:'detached'});
    stale.release();await delay(150);
    assert.equal(await page.getByText('Prior Account Secret',{exact:true}).count(),0);
    console.log('PASS: account reset removes cached rows and rejects old account response');
  });
  await scenario(async ({page,state})=>{
    state.hooks.set('/api/org/contests/a/participants',async ({respond})=>{await respond({error:'Initial roster unavailable'},503);});
    await page.goto(base+'/org/contests/a#participants');await page.getByText(/Initial roster unavailable/).waitFor();
    state.hooks.delete('/api/org/contests/a/participants');
    await page.getByRole('button',{name:'Retry roster',exact:true}).click();
    await page.getByText('Original Candidate',{exact:true}).waitFor();
    console.log('PASS: failed initial roster has an actionable retry that recovers');
  });
  for (const status of ['queued','running']) await scenario(async ({page,state,count})=>{
    state.summary={total:7,pending:0,verdicts:{AC:7}};
    state.hooks.set('/api/org/contests/a/submissions',async ({respond})=>{
      await respond([{uid:'busy-row',display_name:'Busy Fixture Candidate',username:'busy',problem_label:'A',status,verdict:null,created_at:'2026-10-25T10:00:00Z'}]);
    });
    await page.goto(base+'/org/contests/a#submissions');
    await page.getByText('Busy Fixture Candidate',{exact:true}).waitFor();
    await page.getByRole('button',{name:/^submissions\s*7$/}).waitFor();
    assert.equal(await page.getByText(/Submission totals could not refresh/).count(),0,'Summary must remain healthy for this regression');
    const before=count('/submissions');
    await until(()=>count('/submissions')>before,'Visible '+status+' row must preserve fast polling despite healthy idle totals');
    assert.equal(await page.getByText(/Submission totals could not refresh/).count(),0);
    console.log('PASS: visible '+status+' row keeps fast polling with healthy summary.pending=0');
  });
  await scenario(async ({page,state,count})=>{
    const rows=[{uid:'s1',display_name:'Queued Fixture Candidate',username:'queued',problem_label:'A',status:'queued',verdict:null,created_at:'2026-10-25T10:00:00Z'}];
    state.summary={total:7,pending:0,verdicts:{AC:7}};
    state.hooks.set('/api/org/contests/a/submissions',async ({respond})=>{await respond(rows);});
    await page.goto(base+'/org/contests/a#submissions');await page.getByText('Queued Fixture Candidate',{exact:true}).waitFor();
    state.hooks.set('/api/org/contests/a/submissions/summary',async ({respond})=>{await respond({error:'Summary fixture offline'},503);});
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.getByText(/Submission totals could not refresh/).waitFor();
    const before=count('/submissions');
    await until(()=>count('/submissions')>before,'Queued page must retain busy cadence when last idle summary fails');
    assert(await page.getByText('Queued Fixture Candidate',{exact:true}).isVisible());
    console.log('PASS: failed idle summary retains totals and queued rows restore busy polling');
    state.hooks.set('/api/org/contests/a/submissions',async ({route})=>{await route.fulfill({status:200,contentType:'application/json',body:'{broken'});});
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.getByRole('alert').filter({hasText:/Showing the last read/}).waitFor();
    assert(await page.getByText('Queued Fixture Candidate',{exact:true}).isVisible(),'Malformed JSON must retain the last valid table');
    state.hooks.set('/api/org/contests/a/submissions',async ({respond})=>{await respond({error:'Submission permission revoked'},403);});
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.getByText(/Submission permission revoked/).waitFor();
    assert.equal(await page.getByText('Queued Fixture Candidate',{exact:true}).count(),0);
    console.log('PASS: malformed submission JSON preserves safe data; authorization loss clears it');
  });
  await scenario(async ({page,state,hold,tab,count})=>{
    state.summary={total:7,pending:1,verdicts:{AC:6}};
    await page.goto(base+'/org/contests/a#problems');await tab('participants').waitFor();
    for(const name of ['participants','leaderboard','analytics','invigilation','judging','problems']){
      await tab(name).click();await delay(150);assert.equal(count('/submissions'),0,'Inactive submissions read on '+name);
    }
    const before=count('/submissions/summary');await until(()=>count('/submissions/summary')>before,'Pending summary must keep polling behind other tabs');
    const summary=hold();state.hooks.set('/api/org/contests/a/submissions/summary',async ({respond})=>{await summary.promise;await respond(state.summary);});
    await tab('submissions').click();await until(()=>count('/submissions')>=1,'Active table must fetch immediately');
    await page.getByText('No submissions yet.',{exact:true}).waitFor();
    await tab('problems').click();const tableReads=count('/submissions');await delay(2300);
    assert.equal(count('/submissions'),tableReads,'Hidden table does not poll');
    console.log('PASS: all inactive tabs avoid submission rows; summary polls independently');
  });
} finally { await browser.close(); }
