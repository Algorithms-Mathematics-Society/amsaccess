// Run only against an isolated server: all API reads are mocked and writes forbidden.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.ORG_TEST_URL || 'http://localhost:3124';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext();
await context.addCookies([{name:'ams_session',value:`test.${Math.floor(Date.now()/1000)+3600}.test`,url:base}]);
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const names=['Absent Person','Entered Person','Legacy Person','Pending Person','Second Entrant'];
const ids=['absent','entered','legacy','pending','second'];
const boardRows=names.map((display_name,i)=>({display_name,user_uid:ids[i],username:ids[i],rank:i+1,solved:0,score:0,partial:0,penalty:0,cells:{}}));
let evidence='good',delayEvidence=700,activeEvidence=0,maxActiveEvidence=0,activeBoards=0,maxActiveBoards=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await page.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.origin!==base)return route.abort();
 if(!url.pathname.startsWith('/api/'))return route.continue();
 assert.equal(route.request().method(),'GET');
 const ok=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 if(url.pathname==='/api/auth/me')return ok({role:'admin'});
 if(/^\/api\/org\/contests\/[ab]$/.test(url.pathname))return ok({uid:url.pathname.split('/').at(-1),title:'Test contest',slug:'test',description:'',visibility:'private',status:'running',starts_at:'2026-01-01',ends_at:'2027-01-01',is_practice:false,invite_code:null,problems:[],joined:false,frozen:false});
 if(url.pathname.endsWith('/submissions/summary'))return ok({total:0,pending:0,verdicts:{}});
 if(url.pathname.endsWith('/submissions'))return ok([]);
 if(url.pathname.endsWith('/scoreboard')){
  activeBoards++;maxActiveBoards=Math.max(maxActiveBoards,activeBoards);
  try{await wait(50);return await ok({contest_uid:url.pathname.split('/')[4],rows:boardRows,frozen:true,generated_at:new Date().toISOString()});}finally{activeBoards--;}
 }
 if(url.pathname.endsWith('/invigilation')){
  activeEvidence++;maxActiveEvidence=Math.max(maxActiveEvidence,activeEvidence);
  try{
   await wait(delayEvidence);
   if(evidence==='fail')return await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Unavailable'})});
   return await ok(url.pathname.includes('/a/')&&evidence==='good'?[
    {user_uid:'entered',started_at:'2026-10-23T10:00:00Z'},
    {login_id:'legacy',started_at:'2026-10-23T10:00:00Z'},
    {user_uid:'second',started_at:'2026-10-23T10:00:00Z'},
    {user_uid:'pending',started_at:null},
   ]:[]);
  }finally{activeEvidence--;}
 }
 throw new Error('Unexpected API '+url.pathname);
});
const order=()=>page.locator('tbody tr td:nth-child(2) button').allTextContents();
const clean=values=>values.map(x=>x.replace(' — Entered this contest','').trim());
try{
 await page.goto(base+'/org/contests/a#leaderboard');
 await page.getByRole('button',{name:'Absent Person',exact:true}).waitFor();
 assert.deepEqual(clean(await order()),names,'scoreboard renders before slow evidence');
 await page.getByRole('button',{name:'Entered Person — Entered this contest',exact:true}).waitFor();
 assert.deepEqual(clean(await order()),['Entered Person','Legacy Person','Second Entrant','Absent Person','Pending Person']);
 assert.deepEqual((await page.locator('tbody tr td:first-child').allTextContents()).map(x=>x.trim()),['2','3','5','1','4']);
 const green=page.getByRole('button',{name:'Entered Person — Entered this contest',exact:true});
 assert((await green.getAttribute('class')).includes('text-emerald-700'));
 assert(!(await page.getByRole('button',{name:'Pending Person',exact:true}).getAttribute('class')).includes('text-emerald-700'));
 assert.equal(await page.getByRole('link',{name:'Export standings',exact:true}).getAttribute('href'),'/api/org/contests/a/export?kind=standings');
 await page.getByRole('textbox',{name:'Find a candidate on the leaderboard'}).fill('Person');
 assert.deepEqual(clean(await order()),['Entered Person','Legacy Person','Absent Person','Pending Person']);
 await page.getByRole('textbox',{name:'Find a candidate on the leaderboard'}).fill('');
 evidence='fail';
 await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('focus'));});
 await page.getByText(/Entry status could not refresh/).waitFor();
 assert.deepEqual(clean(await order()),['Entered Person','Legacy Person','Second Entrant','Absent Person','Pending Person']);
 assert.equal(maxActiveEvidence,1);assert.equal(maxActiveBoards,1);
 evidence='empty';delayEvidence=50;
 await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();
 assert.deepEqual(clean(await order()),names);
 await page.goto(base+'/org/contests/b#leaderboard');
 await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();
 assert.deepEqual(clean(await order()),names);
 assert.deepEqual(errors,[]);
 console.log('PASS: green entrants first, others below, stable scoring order/ranks, filtering, slow/failed evidence, refresh dedupe and contest isolation');
}finally{await browser.close();}
