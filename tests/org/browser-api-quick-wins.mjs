// Production bundle, mocked API only. Never use real participant data or credentials.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.ORG_TEST_URL || 'http://127.0.0.1:3124';
const uid='3fbf9cee-8b6e-4872-947f-c52b46bb572e';
const versionUid='8a1d3c1e-5f0b-4a43-9d1e-2b6f7c9a0e11';
const oldSha='a'.repeat(64);const newSha='b'.repeat(64);
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
async function open(role,handle){
 const context=await browser.newContext({acceptDownloads:true});
 await context.addCookies([{name:'ams_session',value:`synthetic.${Math.floor(Date.now()/1000)+3600}.synthetic`,url:base}]);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const dialogs=[];page.on('dialog',d=>{dialogs.push(d.message());void d.accept();});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!==base)return route.abort();
  if(!u.pathname.startsWith('/api/'))return route.continue();
  const method=route.request().method();const ok=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(u.pathname==='/api/auth/me')return ok({role});
  const handled=handle({route,u,method,ok});if(handled!==undefined)return handled;
  if(method!=='GET')throw Error('Unexpected mutation '+u.pathname);
  return ok([]);
 });
 return {page,errors,dialogs};
}
try {
 // 1. Rebuild preview: an error is shown, a retry succeeds and the preview is re-read.
 {
  let reprojects=0;let backfilled=true;let previewReads=0;
  const {page,errors}=await open('admin',({route,u,method,ok})=>{
   if(u.pathname==='/api/org/problems'&&method==='GET')return ok([{uid,title:'Old problem',slug:'old-problem',visibility:'private',created_at:'2026-01-01T00:00:00Z',tags:[],versions:[{uid:versionUid,version:1,time_limit_ms:1000,memory_limit_mb:256,notes:'',has_package:true,created_at:'2026-01-01T00:00:00Z'}]}]);
   if(u.pathname===`/api/org/problems/${uid}/versions/${versionUid}/preview`){previewReads++;return ok({version:1,problem:{statement:{markdown:backfilled?'Old statement':'Fresh statement'},samples:[],limits:{wall_time_ms:1000,memory_mb:256},backfilled}});}
   if(u.pathname===`/api/org/problems/${uid}/versions/${versionUid}/reproject`&&method==='POST'){
    reprojects++;if(reprojects===1)return ok({detail:'the stored package is missing',error:'the stored package is missing'},409);
    backfilled=false;return ok({uid:versionUid,version:1});
   }
  });
  await page.goto(base+'/org/problems');
  await page.getByRole('button',{name:'Old problem',exact:true}).click();
  await page.getByText('Old statement').waitFor();
  const rebuild=page.getByRole('button',{name:'Rebuild preview',exact:true});
  await rebuild.click();
  await page.getByRole('alert').filter({hasText:'the stored package is missing'}).waitFor();
  const reads=previewReads;
  await rebuild.click();
  await page.getByRole('status').filter({hasText:'Preview rebuilt from the stored package.'}).waitFor();
  await page.getByText('Fresh statement').waitFor();
  assert.equal(reprojects,2);assert(previewReads>reads,'preview re-read after reproject');
  assert.equal(await rebuild.count(),0,'backfill banner gone after rebuild');
  assert.deepEqual(errors,[]);
  console.log('PASS rebuild preview shows error, then success, and refreshes the preview');
 }
 // 2. Student import template downloads through the portal route.
 {
  const csv='display_name,email,college,branch,graduation_year,external_ref\n';
  const {page,errors}=await open('admin',({route,u,ok})=>{
   if(u.pathname==='/api/org/students/facets')return ok({total:0,colleges:[],branches:[],graduation_years:[]});
   if(u.pathname==='/api/org/students/import/template.csv')return route.fulfill({status:200,headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="students-template.csv"'},body:csv});
  });
  await page.goto(base+'/org/participants');
  await page.getByRole('button',{name:'Import CSV',exact:true}).click();
  const link=page.getByRole('link',{name:'Download template',exact:true});
  assert.equal(await link.getAttribute('href'),'/api/org/students/import/template.csv');
  assert.equal(await link.getAttribute('download'),'students-template.csv');
  const [download]=await Promise.all([page.waitForEvent('download'),link.click()]);
  assert.equal(download.suggestedFilename(),'students-template.csv');
  // Chromium cancels downloads answered by page.route, so the bytes are checked by the route unit test.
  assert.equal(new URL(download.url()).pathname,'/api/org/students/import/template.csv');
  assert.deepEqual(errors,[]);
  console.log('PASS import template link downloads the CSV');
 }
 // 3. Hidden benchmark input: confirmed replace, sha shown, run history listed; read-only for interns.
 const contest={uid,title:'Team test',slug:'team-test',status:'draft',starts_at:'2026-11-11T12:00:00Z',ends_at:'2026-11-12T12:00:00Z',invite_code:'TEST',is_practice:true,problems:[],joined:false,frozen:false};
 const runs=[{uid:uid+'r1',team:'Team 1',revision:2,status:'measured',median_ns:1500000,input_sha256:oldSha,completed_at:'2026-11-11T13:00:00Z'}];
 {
  let sha=oldSha;let upload=null;
  const {page,errors,dialogs}=await open('admin',({route,u,method,ok})=>{
   if(u.pathname===`/api/org/contests/${uid}`)return ok(contest);
   if(u.pathname.endsWith('/submissions/summary'))return ok({total:0,pending:0,verdicts:{}});
   if(u.pathname.endsWith('/team-round')&&method==='GET')return ok({team_size:4,discussion_seconds:120,selection_opens_at:null,allocation_locks_at:null,submit_deadline:null,seeded_at:null,published_at:null,allocation_locked_at:null,rank_sum_spread:null,project:null,parts:[],benchmark:{enabled:true,input_sha256:sha}});
   if(u.pathname.endsWith('/team-round/benchmarks'))return ok(runs);
   if(u.pathname.endsWith('/team-round/benchmark-input')&&method==='POST'){upload=route.request().postDataBuffer().toString('latin1');sha=newSha;return ok({sha256:newSha,size_bytes:7});}
  });
  await page.goto(base+`/org/contests/${uid}#team-round`);
  await page.getByText(oldSha).waitFor();
  await page.getByText('Team 1 · Revision 2 · measured · 1.500 ms median · current input',{exact:false}).waitFor();
  await page.getByLabel('Input file',{exact:true}).setInputFiles({name:'hidden.in',mimeType:'application/octet-stream',buffer:Buffer.from('1 2 3\n')});
  await page.getByRole('button',{name:'Upload benchmark input',exact:true}).click();
  await page.getByRole('status').filter({hasText:`Benchmark input stored (SHA-256 ${newSha}).`}).waitFor();
  await page.getByText(newSha,{exact:true}).waitFor();
  assert.match(upload,/name="input"; filename="hidden.in"/);assert.match(upload,/1 2 3/);
  assert(dialogs.some(m=>m.startsWith('Replace the hidden benchmark input?')),'replacing asks for confirmation');
  await page.getByText('other input',{exact:false}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS benchmark input upload confirms replacement, shows the new sha256 and lists runs');
 }
 {
  const {page,errors}=await open('intern',({u,method,ok})=>{
   if(u.pathname===`/api/org/contests/${uid}`)return ok(contest);
   if(u.pathname.endsWith('/submissions/summary'))return ok({total:0,pending:0,verdicts:{}});
   if(u.pathname.endsWith('/team-round')&&method==='GET')return ok({team_size:4,discussion_seconds:120,selection_opens_at:null,allocation_locks_at:null,submit_deadline:null,seeded_at:null,published_at:null,allocation_locked_at:null,rank_sum_spread:null,project:null,parts:[],benchmark:{enabled:true,input_sha256:null}});
  });
  await page.goto(base+`/org/contests/${uid}#team-round`);
  await page.getByText('none uploaded').waitFor();
  assert(await page.getByRole('button',{name:'Upload benchmark input',exact:true}).isDisabled(),'interns cannot upload');
  assert.deepEqual(errors,[]);
  console.log('PASS benchmark upload is disabled outside TEAM_WRITERS');
 }
} finally {await browser.close();}
