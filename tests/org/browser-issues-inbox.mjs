// Isolated production build only. Every API call is mocked; external origins blocked.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.ORG_TEST_URL || 'http://localhost:3124';
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addCookies([{name:'ams_session',value:`test.${Math.floor(Date.now()/1000)+3600}.test`,url:base}]);
const page=await context.newPage();
const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label='Condition not reached'){for(let i=0;i<200;i++){if(await fn())return;await wait(25);}throw new Error(label);}
const at=m=>new Date(Date.parse('2026-11-16T10:00:00Z')+m*60_000).toISOString();
const T1='11111111-1111-4111-8111-111111111111',T2='22222222-2222-4222-8222-222222222222',T3='33333333-3333-4333-8333-333333333333',T4='44444444-4444-4444-8444-444444444444';
const ticket=(uid,contest_uid,name,status,m)=>({uid,contest_uid,email:`${name.split(' ')[0].toLowerCase()}@example.test`,phone:'',name,category:'LOGIN_ISSUE',status,updated_at:at(m),chat_enabled:true});
let resumes=[{uid:'r1',status:'pending',reason:'Laptop restarted',device_fingerprint:'dev-r1',created_at:at(10),session_uid:'s1',display_name:'Asha Resume',login_id:'asha',resume_count:1}];
let incidents=[{uid:'i1',status:'open',message:'Keyboard not working',category:'technical',contact:'',created_at:at(1),display_name:'Mira Help',login_id:'mira'}];
const readiness=[{uid:'g1',device_fingerprint:'gate-device-fingerprint',os_name:'windows',app_version:'1',passed:false,failed_checks:['camera'],display_name:'Gate Person',created_at:at(2)}];
// Two org inbox pages: the contest filter is client-side, so the other contest's ticket must not show.
const openPages=[[ticket(T1,'a','Tara Ticket','open',-30),ticket(T2,'other','Elsewhere Person','open',-40)],[ticket(T3,'a','Uma Ticket','open',-20)]];
const resolvedTickets=[ticket(T4,'a','Old Ticket','resolved',-50)];
await page.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.origin!==base)return route.abort();
 if(!url.pathname.startsWith('/api/'))return route.continue();
 calls.push({path:url.pathname,query:url.search,method:req.method()});
 const ok=async data=>{try{await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});}catch{}};
 if(url.pathname==='/api/auth/me')return ok({role:'admin'});
 if(url.pathname==='/api/org/contests/a')return ok({uid:'a',title:'Inbox contest',status:'running',starts_at:'2026-01-01',ends_at:'2027-01-01',is_practice:false,invite_code:null,problems:[],frozen:false});
 if(url.pathname.endsWith('/submissions/summary'))return ok({total:0,pending:0,verdicts:{}});
 if(url.pathname==='/api/org/support'){
  if(url.searchParams.get('status')==='resolved')return ok({items:resolvedTickets,has_more:false});
  const offset=Number(url.searchParams.get('offset'));
  return ok(offset===0?{items:openPages[0],has_more:true}:{items:openPages[1],has_more:false});
 }
 if(url.pathname===`/api/org/support/${T1}`)return ok({...openPages[0][0],messages:[{uid:'55555555-5555-4555-8555-555555555555',sender:'participant',body:'I cannot log in to the contest.',created_at:at(-30)}],has_more:false});
 if(url.pathname.endsWith('/invigilation')){
  if(req.method()==='POST'){
   const action=url.searchParams.get('action'),uid=url.searchParams.get('uid');
   if(action==='reject-resume'){assert.equal(uid,'r1');resumes=resumes.map(r=>({...r,status:'rejected'}));}
   else if(action==='resolve-incident'){assert.equal(uid,'i1');incidents=incidents.map(i=>({...i,status:'resolved'}));}
   else throw new Error('Unexpected action '+action);
   return ok({status:action==='reject-resume'?'rejected':'resolved'});
  }
  switch(url.searchParams.get('view')){
   case 'resume-requests':return ok(resumes);
   case 'incidents':return ok(incidents);
   case 'readiness':return ok(readiness);
   default:return ok([]);
  }
 }
 throw new Error('Unexpected API '+req.method()+' '+url.pathname);
});
const list=()=>page.getByRole('list',{name:'Issues waiting on staff'});
const rows=async()=>(await list().getByRole('listitem').allInnerTexts()).map(t=>t.split('\n').filter(Boolean).slice(0,2).join(' '));
const strip=page.getByRole('region',{name:'Live contest status'});
const stripValue=label=>strip.getByRole('button').filter({hasText:label}).innerText();
const typeChip=name=>page.getByRole('group',{name:'Type'}).getByRole('button',{name:new RegExp(`^${name} \\d+$`)});
const posts=()=>calls.filter(c=>c.method==='POST');
try{
 await page.goto(base+'/org/contests/a#invigilation');
 await list().waitFor();
 await until(async()=>(await rows()).length===5,'five open issues');
 assert.deepEqual(await rows(),['Re-entry Asha Resume asha','Help Mira Help mira','Entry gate Gate Person','Support Tara Ticket','Support Uma Ticket']);
 assert.equal(await page.getByText('Elsewhere Person').count(),0,'tickets from other contests are filtered out');
 assert.deepEqual(calls.filter(c=>c.path==='/api/org/support').map(c=>c.query),['?status=open&offset=0','?status=open&offset=2']);
 for(const view of ['resume-requests','incidents'])assert.equal(calls.filter(c=>c.query===`?view=${view}`).length,1,`${view} is read once by the shared store`);
 assert.equal(await typeChip('All').innerText(),'All 5');
 assert.equal(await typeChip('Re-entry').innerText(),'Re-entry 1');
 assert.equal(await typeChip('Help').innerText(),'Help 1');
 assert.match(await stripValue('Waiting to re-enter'),/\n1$/);
 assert.match(await stripValue('Help requests open'),/\n1$/);
 console.log('PASS: one prioritised list across four sources; counts match the status strip; contest filter on paged tickets');

 // Keyboard filter.
 await typeChip('Help').focus();await page.keyboard.press('Enter');
 assert.equal(await typeChip('Help').getAttribute('aria-pressed'),'true');
 assert.deepEqual(await rows(),['Help Mira Help mira']);
 await typeChip('All').focus();await page.keyboard.press('Space');
 await until(async()=>(await rows()).length===5);
 console.log('PASS: type filter by keyboard');

 // Refuse is confirmed; Escape cancels without a request.
 const asha=list().getByRole('listitem').filter({hasText:'Asha Resume'});
 await asha.getByRole('button',{name:'Refuse'}).click();
 const dialog=page.getByRole('dialog',{name:"Refuse Asha Resume's re-entry?"});
 await dialog.waitFor();
 await page.keyboard.press('Escape');
 await dialog.waitFor({state:'detached'});
 assert.equal(posts().length,0);
 await asha.getByRole('button',{name:'Refuse'}).click();
 await dialog.getByRole('button',{name:'Refuse re-entry'}).click();
 await until(async()=>await asha.count()===0,'refused request leaves the open list');
 assert.equal(posts().length,1);assert.match(posts()[0].query,/action=reject-resume&uid=r1/);
 await page.getByRole('status').filter({hasText:"Refused Asha Resume's re-entry."}).waitFor();
 await until(async()=>/\n0$/.test(await stripValue('Waiting to re-enter')),'strip count follows the inbox');
 assert.equal(await typeChip('Re-entry').innerText(),'Re-entry 0');

 await list().getByRole('listitem').filter({hasText:'Mira Help'}).getByRole('button',{name:'Mark resolved'}).click();
 await until(async()=>await list().getByRole('listitem').filter({hasText:'Mira Help'}).count()===0);
 assert.equal(posts().length,2);assert.match(posts()[1].query,/action=resolve-incident&uid=i1/);
 await until(async()=>/\n0$/.test(await stripValue('Help requests open')));
 console.log('PASS: refuse needs confirmation, resolve acts inline, counts and announcement update');

 // Resolved view shows handled items and resolved tickets for this contest.
 await page.getByRole('group',{name:'Status'}).getByRole('button',{name:'Resolved'}).click();
 await until(async()=>(await rows()).length===3,'three resolved items');
 assert.deepEqual(await rows(),['Re-entry · rejected Asha Resume asha','Help · resolved Mira Help mira','Support · resolved Old Ticket']);
 assert(calls.some(c=>c.path==='/api/org/support'&&c.query==='?status=resolved&offset=0'));
 assert.equal(await list().getByRole('button').count(),0,'resolved items have no decisions');
 await page.getByRole('group',{name:'Status'}).getByRole('button',{name:'Open'}).click();
 await until(async()=>(await rows()).length===3,'gate and two tickets remain open');
 console.log('PASS: open/resolved filter');

 // Mobile layout stays within the viewport.
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No mobile document overflow');
 await page.setViewportSize({width:1440,height:1000});

 // Opening a ticket is a client-side navigation to that conversation.
 await page.evaluate(()=>{window.__noReload=true;});
 await list().getByRole('link',{name:'Open ticket from Tara Ticket'}).click();
 await page.waitForURL(`**/org/support?t=${T1}`);
 await page.getByText('I cannot log in to the contest.').waitFor();
 assert.equal(await page.evaluate(()=>window.__noReload),true,'no full page reload');
 assert.deepEqual(errors,[]);
 console.log('PASS: open ticket deep-links to the conversation without a reload; no browser errors');
}finally{await browser.close();}
