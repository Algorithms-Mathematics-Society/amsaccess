// Isolated production build only. Every API call is mocked; external origins blocked.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.ORG_TEST_URL || 'http://localhost:3124';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addCookies([{name:'ams_session',value:`test.${Math.floor(Date.now()/1000)+3600}.test`,url:base}]);
const page=await context.newPage();
const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<150;i++){if(await fn())return;await wait(25);}throw new Error('Condition not reached');}
function gate(){let release;const promise=new Promise(r=>{release=r;});return{promise,release};}
const now='2026-10-23T14:00:00Z';
const resume=(uid,name)=>({uid,status:'pending',reason:'Connection interrupted; ready to resume.',device_fingerprint:'test-device',created_at:now,session_uid:'s',display_name:name,login_id:uid,resume_count:0});
let resumes=[resume('r1','Asha Resume'),resume('r2','Rohan Resume')];
let incidents=[{uid:'i1',status:'open',message:'Need help with setup.',category:'technical',contact:'',created_at:now,display_name:'Mira Help',login_id:'mira'}];
let bulk=false;
let count=2,role='admin',postGate=null,readGate=null,actionFailure=false,failResumeRead=false;
await page.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.origin!==base)return route.abort();
 if(!url.pathname.startsWith('/api/'))return route.continue();
 calls.push({path:url.pathname,query:url.search,method:req.method()});
 const ok=async data=>{try{await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});}catch{}};
 if(url.pathname==='/api/auth/me')return ok({role});
 if(/^\/api\/org\/contests\/[ab]$/.test(url.pathname))return ok({uid:url.pathname.split('/').at(-1),title:'Notification test contest',slug:'test',description:'',visibility:'private',status:'running',starts_at:'2026-01-01',ends_at:'2027-01-01',is_practice:false,invite_code:null,problems:[],joined:false,frozen:false});
 if(url.pathname.endsWith('/submissions/summary'))return ok({total:0,pending:0,verdicts:{}});
 if(url.pathname.endsWith('/submissions')||url.pathname.endsWith('/participants'))return ok([]);
 if(url.pathname.endsWith('/invigilation')&&url.pathname.includes('/contests/')){
  if(req.method()==='POST'){
   assert(url.pathname.includes('/a/'));const action=url.searchParams.get('action'),uid=url.searchParams.get('uid');
   assert(['approve-resume','reject-resume','resolve-incident'].includes(action));
   if(postGate)await postGate.promise;
   if(actionFailure)return route.fulfill({status:409,contentType:'application/json',body:'{"error":"Already reviewed elsewhere"}'});
   if(action==='resolve-incident')incidents=incidents.map(i=>i.uid===uid?{...i,status:'resolved'}:i);
   else resumes=resumes.filter(r=>r.uid!==uid);
   return ok({status:action==='approve-resume'?'approved':action==='reject-resume'?'rejected':'resolved'});
  }
  assert.equal(req.method(),'GET');
  const view=url.searchParams.get('view');
  if(url.pathname.includes('/b/'))return ok([]);
  if(view==='resume-requests'){const snapshot=resumes.map(r=>({...r}));if(readGate)await readGate.promise;if(failResumeRead)return route.fulfill({status:503,contentType:'application/json',body:'{}'});return ok(snapshot);}
  if(view==='incidents')return ok(incidents);
  if(view==='sessions' && bulk)return ok(Array.from({length:5000},(_,i)=>({uid:`bulk-${i}`,user_uid:`person-${i}`,login_id:`person-${i}`,display_name:`Flagged Person ${i}`,status:'active',violation_count:1,resume_count:0})));
  if(view==='sessions')return ok([{uid:'s',user_uid:'student',login_id:'flagged',display_name:'Dev Flagged',status:'active',started_at:now,last_seen_at:now,violation_count:count,resume_count:0,idle_seconds:1,resume_pending:false,has_entry_photo:false,has_exit_photo:false,entry_photo_at:null,exit_photo_at:null}]);
  return ok([]);
 }
 if(url.pathname==='/api/org/students/student/profile')return ok({uid:'student',handle:'flagged',display_name:'Dev Flagged',email:'test@example.test',mailable:true,status:'active',college:'',branch:'',graduation_year:null,linkedin_url:'',github_url:'',has_resume_file:false,phone:'',location:'',external_ref:'',notes:'',created_at:now,contests_entered:1,problems_solved:0,submissions_total:0,accepted_total:0,contests:[],submissions:[],tags:[],verdicts:[],activity:[]});
 if(url.pathname==='/api/org/students/student/invigilation')return ok([]);
 if(url.pathname==='/api/org/students/student/photo')return route.fulfill({status:404,body:''});
 throw new Error('Unexpected API '+req.method()+' '+url.pathname);
});
const launcher=()=>page.getByRole('button',{name:/^Open notifications,/});
const drawer=()=>page.getByRole('dialog',{name:'Notifications',exact:true});
const card=name=>drawer().getByRole('listitem').filter({hasText:name});
const refresh=async()=>{await drawer().getByRole('button',{name:'Refresh notifications'}).click();await until(async()=>await drawer().getByRole('button',{name:'Refresh notifications'}).isEnabled());};
try{
 await page.goto(base+'/org/contests/a#invigilation');
 await until(async()=> (await launcher().getAttribute('aria-label'))?.includes('4 awaiting'));
 // Parent and invigilation panel consume a single shared feed.
 for(const view of ['resume-requests','incidents','sessions'])assert.equal(calls.filter(c=>c.query===`?view=${view}`).length,1,view+' should be fetched once on mount');
 await launcher().click();await card('Asha Resume').waitFor();
 await until(async()=>await drawer().evaluate(el=>getComputedStyle(el).opacity)==='1');
 await page.screenshot({path:'/tmp/org-notifications-desktop.jpg',type:'jpeg',quality:65});
 // Opening either decision must not submit; No and Escape cancel locally.
 const beforeDecision=calls.filter(c=>c.method==='POST').length;
 await card('Asha Resume').getByRole('button',{name:'Allow re-entry'}).click();
 await card('Asha Resume').getByRole('group',{name:'Confirm decision'}).waitFor();
 assert.equal(calls.filter(c=>c.method==='POST').length,beforeDecision);
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'/tmp/org-entry-confirmation-mobile.png'});
 const confirmationBox=await card('Asha Resume').getByRole('group',{name:'Confirm decision'}).boundingBox();
 assert(confirmationBox.x>=0 && confirmationBox.x+confirmationBox.width<=390);
 await page.setViewportSize({width:1440,height:1000});
 await card('Asha Resume').getByRole('button',{name:'No, cancel'}).click();
 assert.equal(await card('Asha Resume').getByRole('group',{name:'Confirm decision'}).count(),0);
 assert(await card('Asha Resume').getByRole('button',{name:'Allow re-entry'}).evaluate(el=>el===document.activeElement));
 await card('Asha Resume').getByRole('button',{name:'Block request'}).click();
 await page.keyboard.press('Escape');
 assert(await drawer().isVisible());
 assert.equal(await card('Asha Resume').getByRole('group',{name:'Confirm decision'}).count(),0);
 assert.equal(calls.filter(c=>c.method==='POST').length,beforeDecision);
 assert.equal(await card('Mira Help').count(),0,'help requests have their own group');
 await drawer().getByRole('button',{name:/^Help/}).click();await card('Mira Help').waitFor();
 assert.equal(await card('Asha Resume').count(),0);
 await drawer().getByRole('button',{name:/^Entries/}).click();
 postGate=gate();await card('Asha Resume').getByRole('button',{name:'Allow re-entry'}).click();
 await card('Asha Resume').getByRole('button',{name:'Yes, allow'}).click();
 await until(()=>calls.some(c=>c.method==='POST'));
 assert(await card('Asha Resume').getByRole('button',{name:'Block request'}).isDisabled());
 assert(await page.getByRole('button',{name:'Let them back in'}).first().isDisabled(),'existing panel shares action busy state');
 postGate.release();postGate=null;
 await until(async()=>await card('Asha Resume').count()===0);
 await drawer().getByRole('button',{name:/^History/}).click();
 await card('Asha Resume').getByText('approved',{exact:true}).waitFor();
 assert.equal(calls.filter(c=>c.method==='POST'&&c.query.includes('uid=r1')).length,1);
 await refresh();await card('Asha Resume').waitFor();
 console.log('PASS: separate entry/help sections, Yes/No and Escape confirmation, single decision POST, retained history');

 await drawer().getByRole('button',{name:/^Entries/}).click();
 await card('Rohan Resume').getByRole('button',{name:'Block request'}).click();
 await card('Rohan Resume').getByRole('button',{name:'Yes, block'}).click();
 await drawer().getByRole('button',{name:/^Help/}).click();
 await card('Mira Help').getByRole('button',{name:'Mark resolved'}).click();
 await card('Mira Help').getByRole('button',{name:'Yes, resolve'}).click();
 await drawer().getByRole('button',{name:/^History/}).click();
 await card('Rohan Resume').getByText('rejected',{exact:true}).waitFor();
 await card('Mira Help').getByText('resolved',{exact:true}).waitFor();
 await drawer().getByRole('button',{name:'Close notifications'}).click();
 await page.getByRole('button',{name:'problems',exact:true}).click();
 await launcher().click();await drawer().getByRole('button',{name:/^History/}).click();
 await card('Asha Resume').waitFor();
 console.log('PASS: reject/resolve actions preserve history across contest tabs');

 resumes=[resume('r3','New Arrival')];await refresh();
 await drawer().getByRole('button',{name:/^Entries/}).click();await card('New Arrival').waitFor();
 actionFailure=true;resumes=[];
 await card('New Arrival').getByRole('button',{name:'Allow re-entry'}).click();
 await card('New Arrival').getByRole('button',{name:'Yes, allow'}).click();
 await drawer().getByRole('button',{name:/^History/}).click();
 await card('New Arrival').getByText('Status unconfirmed',{exact:true}).waitFor();
 await card('New Arrival').getByText('Already reviewed elsewhere',{exact:true}).waitFor();
 assert.equal(calls.filter(c=>c.method==='POST'&&c.query.includes('uid=r3')).length,1);
 actionFailure=false;
 console.log('PASS: conflict is not retried, missing pending request remains neutral in history');

 resumes=[resume('r5','Uncertain Request')];await refresh();
 await drawer().getByRole('button',{name:/^Entries/}).click();await card('Uncertain Request').waitFor();
 actionFailure=true;failResumeRead=true;readGate=gate();
 await card('Uncertain Request').getByRole('button',{name:'Allow re-entry'}).click();
 await card('Uncertain Request').getByRole('button',{name:'Yes, allow'}).click();
 await until(()=>calls.some(c=>c.method==='POST'&&c.query.includes('uid=r5')));
 assert(await card('Uncertain Request').getByRole('button',{name:'Block request'}).isDisabled());
 const reconcile=readGate;readGate=null;reconcile.release();await wait(150);
 assert(await card('Uncertain Request').getByRole('button',{name:'Allow re-entry'}).isDisabled(),'failed reconciliation must retain uncertainty lock');
 assert.equal(calls.filter(c=>c.method==='POST'&&c.query.includes('uid=r5')).length,1);
 actionFailure=false;failResumeRead=false;await refresh();
 await until(async()=>await card('Uncertain Request').getByRole('button',{name:'Allow re-entry'}).isEnabled());
 assert.equal(await card('Uncertain Request').getByText(/decisions stay disabled/).count(),0,'successful reconciliation removes stale disabled wording');
 await card('Uncertain Request').getByRole('button',{name:'Allow re-entry'}).click();
 resumes=[];await refresh();
 assert.equal(await drawer().getByRole('group',{name:'Confirm decision'}).count(),0,'stale request cannot keep confirmation');
 console.log('PASS: uncertain action stays locked through delayed/failed read and unlocks only after successful reconciliation');

 await drawer().getByRole('button',{name:'Close notifications'}).click();
 resumes=[resume('r6','Toast Arrival')];
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.getByRole('button',{name:'Dismiss notification preview; keep in drawer'}).waitFor();
 await page.getByRole('button',{name:'Dismiss notification preview; keep in drawer'}).click();
 await launcher().click();await drawer().getByRole('button',{name:/^Entries/}).click();await card('Toast Arrival').waitFor();
 resumes=[];await refresh();
 console.log('PASS: dismissing arrival preview preserves the request in the drawer');

 await drawer().getByRole('button',{name:/^Flags/}).click();await card('Dev Flagged').waitFor();
 await card('Dev Flagged').getByRole('button',{name:'Review participant'}).click();
 await page.getByRole('dialog',{name:'Participant',exact:true}).waitFor();
 await page.getByRole('dialog',{name:'Participant',exact:true}).getByRole('button',{name:'Close',exact:true}).click();
 await until(async()=> (await launcher().getAttribute('aria-label'))?.includes('0 awaiting'));
 await launcher().click();await drawer().getByRole('button',{name:/^Flags/}).click();await card('Dev Flagged').waitFor();
 count=3;await refresh();
 assert((await page.getByRole('button',{name:/^Close notifications,/}).getAttribute('aria-label')).includes('1 awaiting'));
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.screenshot({path:'/tmp/org-notifications-mobile.png'});
 const box=await drawer().boundingBox();assert(box.x>=0&&box.x+box.width<=390&&box.y>=0);
 await page.keyboard.press('Escape');await until(async()=>await launcher().isVisible());
 assert(await launcher().evaluate(el=>el===document.activeElement));
 console.log('PASS: grouped flag review retains card, increased count renews attention, mobile/reduced-motion/focus work');

 // Stress the maximum sessions response while keeping rendered cards bounded.
 await page.setViewportSize({width:1440,height:1000});
 await page.emulateMedia({reducedMotion:'no-preference'});
 bulk=true;resumes=Array.from({length:200},(_,i)=>resume(`bulk-r-${i}`,`Waiting Person ${i}`));
 await launcher().click();await refresh();
 await drawer().getByRole('button',{name:/^Flags/}).click();
 assert.equal(await drawer().getByRole('listitem').count(),50);
 await drawer().getByRole('button',{name:/^Show more/}).click();
 assert.equal(await drawer().getByRole('listitem').count(),100);
 const scroll=drawer().locator('.overflow-y-auto');
 await scroll.evaluate(el=>{el.scrollTop=600;});
 const beforeScroll=await scroll.evaluate(el=>el.scrollTop);
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
 const taskDuration=async()=> (await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='TaskDuration').value;
 const beforeTask=await taskDuration();
 for(let i=0;i<5;i++)await refresh();
 const taskMs=((await taskDuration())-beforeTask)*1000;
 assert.equal(await scroll.evaluate(el=>el.scrollTop),beforeScroll,'no-op refresh preserves scroll');
 assert.equal(await drawer().getByRole('listitem').count(),100,'refresh preserves expanded page');
 await drawer().getByRole('button',{name:'Close notifications'}).click();
 await wait(250);
 const openPaintMs=await launcher().evaluate(async el=>{
  const start=performance.now();el.click();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  return performance.now()-start;
 });
 await until(async()=>await drawer().evaluate(el=>getComputedStyle(el).opacity)==='1');
 console.log(`PROFILE: 5,000 flags + 200 requests: reopen next paint ${openPaintMs.toFixed(1)}ms; five unchanged refreshes browser task time ${taskMs.toFixed(1)}ms`);
 await drawer().getByRole('button',{name:/^Entries/}).click();
 assert.equal(await drawer().getByRole('listitem').count(),50);
 assert.equal(await scroll.evaluate(el=>el.scrollTop),0,'changing groups starts at top');
 await cdp.detach();bulk=false;resumes=[];await refresh();
 await drawer().getByRole('button',{name:'Close notifications'}).click();
 console.log('PASS: large feed uses bounded rendering and retains scroll/pagination on refresh');

 resumes=[resume('reset-toast','Old Session Preview')];
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.getByRole('button',{name:'Dismiss notification preview; keep in drawer'}).waitFor();
 resumes=[resume('r4','Late Old Request')];readGate=gate();
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'ams-org-cache-reset',newValue:'test'})));
 const pending=readGate;readGate=null;pending.release();await wait(150);
 assert.equal(await page.getByRole('button',{name:'Dismiss notification preview; keep in drawer'}).count(),0,'auth reset clears stale preview');
 assert.equal(await page.getByRole('status').filter({hasText:'Old Session Preview'}).count(),0,'auth reset clears old announcement');
 await page.getByRole('alert').filter({hasText:'Your session changed.'}).waitFor();
 assert.equal(await launcher().count(),0,'reset suspends the entire contest console');
 assert.equal(await page.getByText('Late Old Request',{exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Allow re-entry'}).count(),0);
 console.log('PASS: auth reset clears notifications and rejects late responses');

 await page.goto(base+'/org/contests/b#problems');await launcher().click();
 assert.equal(await drawer().getByText('Asha Resume',{exact:true}).count(),0);
 await page.getByText('No entry requests waiting.',{exact:true}).waitFor();
 role='intern';const before=calls.length;
 await page.goto(base+'/org/contests/a#problems');await page.getByRole('heading',{name:'Notification test contest',exact:true}).waitFor();await wait(150);
 assert.equal(await page.getByRole('button',{name:/notifications,/}).count(),0);
 assert.equal(calls.slice(before).filter(c=>c.path.endsWith('/invigilation')).length,0);
 assert.deepEqual(errors,[]);
 console.log('PASS: contest isolation and no notification polling/actions for intern; no browser errors');
}finally{await browser.close();}
