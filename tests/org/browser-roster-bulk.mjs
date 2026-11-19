// Production bundle, mocked API only. Never use real participant data or credentials.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.ORG_TEST_URL || 'http://127.0.0.1:3124';
const uid='3fbf9cee-8b6e-4872-947f-c52b46bb572e';
const person=(n,extra={})=>({user_uid:`u${n}`,login_id:`p${n}`,display_name:`Person ${n}`,revoked:false,last_login_at:null,has_passphrase:true,email:`p${n}@example.test`,mail_status:'sent',college:'Test College',device_os:'Linux',...extra});
const roster=[person(1),person(2),person(3),person(4,{revoked:true})];
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try {
 const context=await browser.newContext({viewport:{width:1400,height:900}});
 await context.addCookies([{name:'ams_session',value:`synthetic.${Math.floor(Date.now()/1000)+3600}.synthetic`,url:base}]);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const revokes=[];
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!==base)return route.abort();
  if(!u.pathname.startsWith('/api/'))return route.continue();
  const ok=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  const p=u.pathname;
  if(p==='/api/auth/me')return ok({role:'admin'});
  if(p===`/api/org/contests/${uid}`)return ok({uid,title:'Bulk test',slug:'bulk-test',status:'scheduled',starts_at:'2026-12-01T10:00:00Z',ends_at:'2026-12-01T13:00:00Z',invite_code:'TEST',is_practice:false,problems:[],joined:false,frozen:false});
  if(p.endsWith('/participants')&&route.request().method()==='GET')return ok(roster);
  const m=p.match(/\/participants\/(p\d)$/);
  if (m && u.searchParams.get("action") === "revoke") {
    revokes.push(m[1]);
    if (m[1] === "p2") return ok({ error: "Mock failure" }, 500);
    const row = roster.find((row) => row.login_id === m[1]);
    row.revoked = true;
    return ok(row);
  }
  if(route.request().method()!=='GET')return ok({error:'unexpected write'},405);
  return ok(p.endsWith('/summary')?{total:0,pending:0,verdicts:{}}:[]);
 });
 await page.goto(base+`/org/contests/${uid}#participants`);
 await page.getByText('Person 3',{exact:true}).waitFor();
 await page.getByRole('checkbox',{name:'Select all 4 shown'}).check();
 await page.getByText('4 selected · 0 can be emailed · 3 can be revoked').waitFor();
 await page.getByRole('button',{name:'Revoke selected'}).click();
 const dialog=page.getByRole('dialog');
 assert.match(
   await dialog.innerText(),
   /across all of that person’s contests.*hidden by filters.*Undo revoke/s,
 );
 const go=dialog.getByRole('button',{name:'Revoke 3'});
 assert(await go.isDisabled(),'typed confirmation required');
 await dialog.getByRole('textbox').fill('revoke');
 await go.click();
 await page.getByText('2 revoked · 1 failed · 0 skipped',{exact:false}).waitFor();
 assert.deepEqual(revokes.sort(),['p1','p2','p3'],'already-revoked p4 is not sent');
 const row = (name) =>
   page
     .getByRole("row")
     .filter({ has: page.getByRole("button", { name, exact: true }) });
 await row("Person 1")
   .getByRole("button", { name: "Undo revoke", exact: true })
   .waitFor();
 await row("Person 3")
   .getByRole("button", { name: "Undo revoke", exact: true })
   .waitFor();
 await page.getByText('1 selected',{exact:false}).waitFor();
 assert(await page.getByRole('checkbox',{name:'Select Person 2 (p2)'}).isChecked(),'the failure stays selected for retry');
 assert.deepEqual(errors,[]);
 console.log('PASS roster bulk: header select-all, typed bulk revoke, skips revoked, failure stays selected');
} finally {await browser.close();}
