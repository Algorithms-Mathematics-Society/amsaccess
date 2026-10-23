// Isolated server, all APIs mocked. PLAYWRIGHT_MODULE can point to an installed playwright-core module.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.ORG_TEST_URL || 'http://localhost:3124';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext();
await context.addCookies([{name:'ams_session',value:`test.${Math.floor(Date.now()/1000)+3600}.test`,url:base}]);
const page=await context.newPage();
const calls=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(await fn())return;await wait(50);}throw new Error('Condition not reached');}
await page.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.origin!==base)return route.abort();
 if(!url.pathname.startsWith('/api/'))return route.continue();
 assert.equal(route.request().method(),'GET','No real or mock write expected');
 calls.push({path:url.pathname,q:url.searchParams.get('q'),at:Date.now()});
 const ok=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 if(url.pathname==='/api/auth/me')return ok({role:'admin'});
 if(/^\/api\/org\/contests\/[ab]$/.test(url.pathname))return ok({uid:url.pathname.split('/').at(-1),title:'Test contest',slug:'test',description:'',visibility:'private',status:'running',starts_at:'2026-01-01',ends_at:'2027-01-01',is_practice:false,invite_code:null,problems:[],joined:false,frozen:false});
 if(url.pathname.endsWith('/submissions/summary'))return ok({total:0,pending:0,verdicts:{}});
 if(url.pathname.endsWith('/submissions')){await wait(700);return ok([]);}
 if(url.pathname.endsWith('/participants'))return ok([
  {user_uid:'entered',login_id:'alice',display_name:'Entered Person',revoked:false,last_login_at:'2026-10-23',has_passphrase:true,email:'a@example.test',mail_status:'sent'},
  {user_uid:'pending',login_id:'bob',display_name:'Pending Person',revoked:false,last_login_at:'2026-10-23',has_passphrase:true,email:'b@example.test',mail_status:'sent'},
  {user_uid:'legacy',login_id:'carol',display_name:'Legacy Person',revoked:false,last_login_at:null,has_passphrase:true,email:'c@example.test',mail_status:''},
 ]);
 if(url.pathname.endsWith('/invigilation')&&url.searchParams.get('view')!=='sessions')return ok([]);
 if(url.pathname.endsWith('/invigilation'))return ok(url.pathname.includes('/a/')?[
  {user_uid:'entered',login_id:'alice',started_at:'2026-10-23T10:00:00Z'},
  {user_uid:'pending',login_id:'bob',started_at:null},
  {login_id:'carol',started_at:'2026-10-23T10:00:00Z'},
 ]:[]);
 if(url.pathname==='/api/org/students/facets')return ok({total:1,colleges:[],branches:[],graduation_years:[]});
 if(url.pathname==='/api/org/students'){
  const q=url.searchParams.get('q')||'Initial';
  await wait(q==='Slow'?900:300);
  return ok([{uid:q,username:q.toLowerCase(),display_name:q+' Student',email:'a@example.test',college:'',branch:'',graduation_year:null,contests_entered:0,problems_solved:0}]);
 }
 // Link prefetches are documents, not APIs; no unexpected service reads permitted.
 throw new Error('Unexpected API '+url.pathname);
});
try{
 await page.goto(base+'/org/contests/a#participants');
 const entered=page.getByRole('button',{name:'Entered Person — Entered this contest',exact:true});
 await entered.waitFor();
 assert((await entered.getAttribute('class')).includes('text-emerald-700'));
 assert(!(await page.getByRole('button',{name:'Pending Person',exact:true}).getAttribute('class')).includes('text-emerald-700'));
 await page.getByRole('button',{name:'Legacy Person — Entered this contest',exact:true}).waitFor();
 const submission=calls.find(c=>c.path.endsWith('/submissions'));
 const summary=calls.find(c=>c.path.endsWith('/submissions/summary'));
 assert(summary.at-submission.at<500,'summary must start before the 700ms submissions read completes');
 console.log('PASS contest entry, pending check-in exclusion, legacy handle matching and concurrent submissions reads');
 await page.goto(base+'/org/contests/b#participants');
 await page.getByRole('button',{name:'Entered Person',exact:true}).waitFor();
 await page.waitForTimeout(150);
 assert(!(await page.getByRole('button',{name:'Entered Person',exact:true}).getAttribute('class')).includes('text-emerald-700'));
 await page.goto(base+'/org/participants');
 await page.getByRole('link',{name:'Initial Student',exact:true}).waitFor();
 const initial=calls.find(c=>c.path==='/api/org/students');
 const facets=calls.find(c=>c.path==='/api/org/students/facets');
 assert(facets.at-initial.at<200,'facets starts before list completes');
 const search=page.locator('input[placeholder]').first();
 await search.fill('Slow');
 await until(()=>calls.some(c=>c.path==='/api/org/students'&&c.q==='Slow'));
 await search.fill('Fast');
 await page.getByRole('link',{name:'Fast Student',exact:true}).waitFor();
 await page.waitForTimeout(1000);
 assert.equal(await page.getByRole('link',{name:'Slow Student',exact:true}).count(),0);
 assert.equal(await page.getByRole('link',{name:'Fast Student',exact:true}).count(),1);
 assert.deepEqual(errors,[]);
 console.log('PASS contest isolation, concurrent student/facets reads and late-response search protection; no browser errors');
}finally{await browser.close();}
