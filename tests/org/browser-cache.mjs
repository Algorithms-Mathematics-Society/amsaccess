// Production build only; all API traffic mocked, external requests blocked.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.ORG_TEST_URL || 'http://localhost:3124';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext();
await context.addCookies([{name:'ams_session',value:`test.${Math.floor(Date.now()/1000)+3600}.test`,url:base}]);
const page=await context.newPage();
const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(await fn())return;await wait(30);}throw new Error('Condition not reached');}
function gate(){let release;const promise=new Promise(r=>{release=r;});return{promise,release};}
let contestGate=null,problemGate=null,archiveGate=null,failProblems=false,archived=false;
let title='Cached Contest',problemTitle='Cached Problem';
const contest=()=>({uid:'a',title,slug:'a',description:'',visibility:'private',status:'draft',starts_at:'2027-01-01T12:00:00Z',ends_at:'2027-01-01T14:00:00Z',is_practice:false,invite_code:null,problems:[],verification_window_minutes:30});
await page.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.origin!==base)return route.abort();
 if(!url.pathname.startsWith('/api/'))return route.continue();
 calls.push(url.pathname+url.search);
 const ok=async data=>{try{await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});}catch{}};
 if(req.method()!=='GET'){
  assert.equal(req.method(),'POST');assert.equal(url.pathname+url.search,'/api/org/contests/a/lifecycle?action=archive');archived=true;return ok({});
 }
 if(url.pathname==='/api/auth/me')return ok({role:'admin'});
 if(url.pathname==='/api/org/contests'){
  if(url.searchParams.has('archived')){if(archiveGate)await archiveGate.promise;return ok([{...contest(),title:'Archived Contest',status:'archived'}]);}
  if(contestGate)await contestGate.promise;return ok(archived?[]:[contest()]);
 }
 if(url.pathname==='/api/org/problems'){
  if(problemGate)await problemGate.promise;
  if(failProblems)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"offline"}'});
  return ok([{uid:'p',slug:'p',title:problemTitle,versions:[],tags:[]}]);
 }
 if(url.pathname==='/api/org/topics')return ok({groups:[]});
 if(url.pathname==='/api/org/fleet')return ok({live:0,running_jobs:0,queued_jobs:0,desired:0,queue_waiting:0,override:null,state:null,upcoming:[]});
 throw new Error('Unexpected API '+url.pathname);
});
const nav=async name=>page.getByRole('link',{name,exact:true}).click();
try{
 await page.goto(base+'/org/contests');await page.getByRole('link',{name:'Cached Contest',exact:true}).waitFor();
 await nav('Problems');await page.getByRole('heading',{name:'Cached Problem',exact:true}).waitFor();
 contestGate=gate();title='Fresh Contest';
 await nav('Contests');
 await page.getByRole('link',{name:'Cached Contest',exact:true}).waitFor();
 contestGate.release();contestGate=null;
 await page.getByRole('link',{name:'Fresh Contest',exact:true}).waitFor();
 console.log('PASS: returning to Contests shows cached rows while revalidating');

 archiveGate=gate();await page.getByRole('button',{name:'Show archived',exact:true}).click();
 assert.equal(await page.getByRole('link',{name:'Fresh Contest',exact:true}).count(),0,'different key must not display previous rows');
 await page.getByRole('button',{name:'Showing archived',exact:true}).click();
 await page.getByRole('link',{name:'Fresh Contest',exact:true}).waitFor();
 archiveGate.release();archiveGate=null;await wait(100);
 assert.equal(await page.getByRole('link',{name:'Archived Contest',exact:true}).count(),0,'late archived response must not overwrite current list');
 console.log('PASS: query-key changes and late archived responses stay isolated');

 await page.getByRole('button',{name:'Archive',exact:true}).click();
 await page.getByText('No contests yet',{exact:true}).waitFor();
 assert.equal(await page.getByRole('link',{name:'Fresh Contest',exact:true}).count(),0);
 archived=false;title='Dashboard Contest';
 await nav('Problems');await page.getByRole('heading',{name:'Cached Problem',exact:true}).waitFor();
 failProblems=true;
 await nav('Contests');await page.getByRole('link',{name:'Dashboard Contest',exact:true}).waitFor();
 await nav('Problems');await page.getByText('offline',{exact:true}).waitFor();
 await page.getByRole('heading',{name:'Cached Problem',exact:true}).waitFor();
 failProblems=false;
 console.log('PASS: catalogue mutations refresh rows; failed revalidation retains prior data');

 contestGate=gate();problemGate=gate();
 await nav('Dashboard');
 await page.getByRole('link',{name:'Dashboard Contest',exact:true}).first().waitFor();
 await page.getByText('Cached Problem',{exact:true}).first().waitFor();
 title='Dashboard Updated';problemTitle='Problem Updated';
 contestGate.release();problemGate.release();contestGate=null;problemGate=null;
 await page.getByRole('link',{name:'Dashboard Updated',exact:true}).first().waitFor();
 await page.getByText('Problem Updated',{exact:true}).first().waitFor();
 console.log('PASS: dashboard reuses catalogue reads and renders background updates');

 // Account-transition notification drops snapshots immediately and refetches.
 contestGate=gate();
 await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'ams-org-cache-reset',newValue:'test'})));
 await until(async()=>await page.getByRole('link',{name:'Dashboard Updated',exact:true}).count()===0);
 title='Next Account Contest';contestGate.release();contestGate=null;
 await page.getByRole('link',{name:'Next Account Contest',exact:true}).first().waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: account-reset notification clears active cached data; no browser errors');
}finally{await browser.close();}
