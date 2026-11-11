// Production bundle, mocked API only. Never use real participant data or credentials.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.ORG_TEST_URL || 'http://127.0.0.1:3124';
const uid='3fbf9cee-8b6e-4872-947f-c52b46bb572e';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try {
 const context=await browser.newContext();
 await context.addCookies([{name:'ams_session',value:`synthetic.${Math.floor(Date.now()/1000)+3600}.synthetic`,url:base}]);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 let round=null;let roster=[];let reads=0;const writes=[];
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!==base)return route.abort();
  if(!u.pathname.startsWith('/api/'))return route.continue();
  const method=route.request().method();const ok=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(u.pathname==='/api/auth/me')return ok({role:'admin'});
  if(u.pathname===`/api/org/contests/${uid}`)return ok({uid,title:'Team test',slug:'team-test',status:'draft',starts_at:'2026-11-11T12:00:00Z',ends_at:'2026-11-12T12:00:00Z',invite_code:'TEST',is_practice:true,problems:[],joined:false,frozen:false});
  if(u.pathname.endsWith('/submissions/summary'))return ok({total:0,pending:0,verdicts:{}});
  if(u.pathname==='/api/org/projects/inspect')return ok({name:'Sample',parts:[1,2,3,4].map(n=>({label:String(n),title:`Part ${n}`,warnings:[]}))});
  if(u.pathname==='/api/org/projects'){writes.push('import');return ok({uid,name:'Sample'});}
  if(u.pathname.endsWith('/team-round')&&method==='GET'){reads++;return round?ok(round):ok({error:'not configured'},404);}
  if(u.pathname.endsWith('/team-round')&&method==='PUT'){
   writes.push('save');round={...route.request().postDataJSON(),project:{uid,name:'Sample'},seeded_at:null,published_at:null,parts:[1,2,3,4].map(n=>({label:String(n)})),rank_sum_spread:0};return ok(round);
  }
  if(u.pathname.endsWith('/team-round/teams'))return ok(roster);
  if(u.pathname.endsWith('/team-round/seed')){writes.push('seed');round.seeded_at='2026-11-11T12:00:00Z';roster=[{uid,name:'Team 1',revision:0,members:[1,2,3,4].map(n=>({user_uid:uid+n,display_name:`Tester ${n}`,seed_rank:n,part_label:null}))}];return ok({teams:1});}
  if(u.pathname.endsWith('/team-round/publish')){writes.push('publish');round.published_at='2026-11-11T12:00:00Z';return ok(round);}
  if(method!=='GET')throw Error('Unexpected mutation '+u.pathname);
  return ok([]);
 });
 await page.goto(base+`/org/contests/${uid}#team-round`);
 await page.getByRole('button',{name:'Save settings',exact:true}).waitFor();
 await page.locator('input[type=file]').setInputFiles({name:'sample.cxxpkg',mimeType:'application/zip',buffer:Buffer.from('fixture')});
 await page.getByRole('button',{name:'Inspect package',exact:true}).click();
 await page.getByRole('button',{name:'Import project',exact:true}).click();
 await page.getByRole('button',{name:'Imported',exact:true}).waitFor();
 await page.getByRole('button',{name:'Save settings',exact:true}).click();
 await page.getByRole('button',{name:'Draw teams',exact:true}).click();
 await page.getByText('Tester 4 · Rank 4',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Publish teams',exact:true}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('Teams published'));
 assert.deepEqual(writes,['import','save','seed','publish']);
 assert(await page.getByRole('button',{name:'Redraw unpublished teams',exact:true}).isDisabled());
 const count=reads;await page.waitForTimeout(1000);assert.equal(reads,count,'no recurring team poll');
 assert.deepEqual(errors,[]);
 console.log('PASS project inspection/import → settings → seed → publish; no background team polling');
 await page.screenshot({path:'/tmp/amsaccess-team-setup.png',fullPage:true});
} finally {await browser.close();}
