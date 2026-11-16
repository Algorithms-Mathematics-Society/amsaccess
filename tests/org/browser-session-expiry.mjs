// Production build only; all API traffic mocked, external requests blocked.
// A synthetic ams_session close to expiry drives the warning; the signature is
// never checked because /api/auth/me is mocked.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.ORG_TEST_URL || 'http://localhost:3124';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const expiresAt=Date.now()+10*60_000;
await context.addCookies([{name:'ams_session',value:`test.${Math.floor(expiresAt/1000)}.test`,url:base}]);
const page=await context.newPage();
const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<200;i++){if(await fn())return;await wait(25);}throw new Error('Condition not reached');}
let me={role:'admin',uid:'staff-1',session_expires_at:expiresAt},expired=false;
const contest={uid:'a',title:'Session test contest',slug:'a',description:'',visibility:'private',status:'running',starts_at:'2026-01-01T00:00:00Z',ends_at:'2027-01-01T00:00:00Z',is_practice:false,invite_code:null,problems:[],joined:false,frozen:false};
await page.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.origin!==base)return route.abort();
 if(!url.pathname.startsWith('/api/'))return route.continue();
 calls.push(url.pathname+url.search);
 const ok=async(data,status=200)=>{try{await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});}catch{}};
 assert.equal(req.method(),'GET','this test never writes');
 if(expired)return ok({error:'Not signed in.'},401);
 if(url.pathname==='/api/auth/me')return ok(me);
 if(url.pathname==='/api/org/contests')return ok([contest]);
 if(url.pathname==='/api/org/contests/a')return ok(contest);
 if(url.pathname.endsWith('/submissions/summary'))return ok({total:0,pending:0,verdicts:{}});
 if(url.pathname.startsWith('/api/org/contests/a/'))return ok(url.pathname.endsWith('/scoreboard')?{rows:[],frozen:false}:[]);
 throw new Error('Unexpected API '+url.pathname);
});
const feedReads=()=>calls.filter(c=>c.includes('/invigilation?view=')).length;
const warning=()=>page.getByRole('status').filter({hasText:'Your session ends in'});
const signedOut=()=>page.getByRole('alert').filter({hasText:'Your session has expired'});
try{
 await page.goto(base+'/org/contests/a#invigilation');
 await page.getByRole('heading',{name:'Session test contest'}).waitFor();
 await warning().waitFor();
 assert.match(await warning().innerText(),/ends in (9|10) minutes/);
 const link=warning().getByRole('link',{name:'Sign in again'});
 assert.equal(await link.getAttribute('href'),'/org/login?reauth=1');
 assert.equal(await link.getAttribute('target'),'_blank');
 console.log('PASS: a session 10 minutes from expiry shows a non-blocking sign-in warning');

 // Unsaved state the signed-out notice must keep.
 await page.evaluate(()=>{const i=document.createElement('textarea');i.id='draft';i.value='unsaved draft';document.querySelector('#org-main').prepend(i);});
 await until(async()=>feedReads()>0);
 expired=true;
 await signedOut().waitFor({timeout:10_000});
 await wait(200);
 const pausedAt=feedReads();
 await wait(7_000);
 assert.equal(feedReads(),pausedAt,'every poll pauses once signed out');
 assert.equal(await page.locator('#draft').inputValue(),'unsaved draft');
 await page.getByRole('heading',{name:'Session test contest'}).waitFor();
 assert.equal(await page.getByText('Your session changed').count(),0,'signed out is not an account reset');
 console.log('PASS: a 401 shows a signed-out notice, pauses polling and keeps the page');

 // Re-sign-in as the same account in another tab, then return here.
 expired=false;me={...me,session_expires_at:Date.now()+12*3600_000};
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await until(async()=>await signedOut().count()===0&&await warning().count()===0);
 await until(async()=>feedReads()>pausedAt);
 assert.equal(await page.locator('#draft').inputValue(),'unsaved draft');
 console.log('PASS: re-sign-in as the same account resumes polling with the page intact');

 // A different account signing in must not inherit this page.
 expired=true;
 await page.evaluate(()=>fetch('/api/org/contests/a'));
 await signedOut().waitFor();
 expired=false;me={role:'admin',uid:'staff-2',session_expires_at:Date.now()+12*3600_000};
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.getByText('Your session changed').waitFor();
 console.log('PASS: re-sign-in as another account resets the page like any account change');

 assert.deepEqual(errors,[]);
}finally{await browser.close();}
