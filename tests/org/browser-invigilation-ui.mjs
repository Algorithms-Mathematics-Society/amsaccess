// UI regression only. All service reads and writes are intercepted locally.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ORG_TEST_URL || 'http://localhost:3140';
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
await context.addCookies([{name:'ams_session',value:`test.${Math.floor(Date.now()/1000)+3600}.test`,url:base}]);
const page = await context.newPage(), errors=[], writes=[];
page.on('pageerror',e=>errors.push(e.message));
const now = new Date().toISOString();
const session = (uid,status,idle_seconds) => ({uid,user_uid:uid,login_id:`${uid}-long-readable-handle`,display_name:`Candidate ${uid}`,status,started_at:now,last_seen_at:now,violation_count:uid==='quiet'?3:0,resume_count:0,idle_seconds,resume_pending:false,has_entry_photo:uid==='quiet',has_exit_photo:false,entry_photo_at:now,exit_photo_at:null});
let overrides=[];
await page.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.origin!==base)return route.abort();
 if(!url.pathname.startsWith('/api/'))return route.continue();
 const ok=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 if(url.pathname==='/api/auth/me')return ok({role:'admin'});
 if(url.pathname==='/api/org/contests/a')return ok({uid:'a',title:'Invigilation UI fixture',status:'running',starts_at:'2026-01-01',ends_at:'2027-01-01',is_practice:false,problems:[],frozen:false});
 if(url.pathname.endsWith('/submissions/summary'))return ok({total:0,pending:0,verdicts:{}});
 if(url.pathname.includes('/invigilation/photo/'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7XkAAAAASUVORK5CYII=','base64')});
 if(url.pathname.endsWith('/invigilation')){
  if(req.method()==='POST'){
   const action=url.searchParams.get('action'); writes.push({action,body:req.postDataJSON()});
   if(action==='grant-override'){
    assert.deepEqual(req.postDataJSON(),{device_fingerprint:'device-full-fingerprint-for-fixture',check_kind:'camera',reason:'Verified in person',minutes:120});
    overrides=[{uid:'grant',device_fingerprint:'device-full-fingerprint-for-fixture',check_kind:'camera',reason:'Verified in person',expires_at:'2027-01-01T00:00:00Z',revoked:false,granted_by:'fixture'}];
   }else {assert.equal(action,'revoke-override');assert.equal(url.searchParams.get('uid'),'grant');overrides=overrides.map(o=>({...o,revoked:true}));}
   return ok({});
  }
  switch(url.searchParams.get('view')){
   case 'sessions':return ok([session('quiet','active',25000),session('finished','submitted',25000),session('recent','active',10)]);
   case 'readiness':return ok([{uid:'device',device_fingerprint:'device-full-fingerprint-for-fixture',os_name:'macos',app_version:'1',passed:false,failed_checks:['camera'],display_name:'Candidate quiet',created_at:now}]);
   case 'overrides':return ok(overrides);
   case 'incidents':case 'resume-requests':return ok([]);
  }
 }
 throw Error(`Unexpected request ${req.method()} ${url.pathname}`);
});
try{
 await page.goto(base+'/org/contests/a#invigilation');
 const table=page.getByRole('table',{name:'Live contest sessions'});
 await table.waitFor();
 const quiet=table.getByRole('row').filter({hasText:'Candidate quiet'});
 const finished=table.getByRole('row').filter({hasText:'Candidate finished'});
 await quiet.getByText('No recent contact',{exact:true}).waitFor();
 assert.equal(await finished.getByText('No recent contact',{exact:true}).count(),0);
 assert.equal(await table.getByText('No recent contact',{exact:true}).count(),1);
 await quiet.getByText('3 flags',{exact:true}).waitFor();
 await quiet.getByRole('button',{name:'Candidate quiet at check-in'}).click();
 const dialog=page.getByRole('dialog',{name:'Identity photos for Candidate quiet'});
 await dialog.getByText('At check-in',{exact:true}).waitFor();
 await dialog.getByText('At the end',{exact:true}).waitFor();
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 const reports=page.getByRole('table',{name:'Entry-gate device reports'});
 await reports.getByRole('button',{name:'Waive…',exact:true}).click();
 await page.getByRole('textbox',{name:'Reason for waiver'}).fill('Verified in person');
 await page.getByRole('button',{name:'Grant',exact:true}).click();
 await page.getByRole('table',{name:'Device check waivers'}).waitFor();
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 assert(await page.getByRole('button',{name:'Revoke',exact:true}).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Last row action remains clear of floating notifications');
 await page.screenshot({path:'/tmp/invigilation-ui-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await table.waitFor({state:'detached'});
 await page.getByRole('button',{name:'Revoke',exact:true}).click();
 await page.getByText('Revoked',{exact:true}).waitFor();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No mobile document overflow');
 await page.screenshot({path:'/tmp/invigilation-ui-mobile.png',fullPage:true});
 assert.equal(writes.length,2);assert.deepEqual(errors,[]);
 console.log('PASS: desktop/mobile layout, quiet vs finished status, flags, identity dialog, unchanged waiver grant/revoke payloads, no runtime errors');
}finally{await browser.close();}
