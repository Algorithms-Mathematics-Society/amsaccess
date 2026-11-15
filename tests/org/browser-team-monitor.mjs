// Production bundle, mocked API only. Never use real participant data or credentials.
// HEADED=1 opens a visible browser and leaves it open so you can click around.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.ORG_TEST_URL || 'http://127.0.0.1:3124';
const headed=process.env.HEADED==='1';
const uid='3fbf9cee-8b6e-4872-947f-c52b46bb572e';
const now=Date.now();const iso=(ms)=>new Date(now+ms).toISOString();const min=60_000;
// Running round, parts already locked: the "building" phase.
const round={team_size:3,selection_opens_at:iso(-40*min),discussion_seconds:300,allocation_locks_at:iso(-20*min),allocation_locked_at:iso(-20*min),submit_deadline:iso(45*min),seeded_at:iso(-2*3600e3),published_at:iso(-90*min),project:{uid,name:'Sample'},parts:['A','B','C'].map(label=>({label})),rank_sum_spread:1};
const member=(t,n,part,auto=false)=>({user_uid:`u${t}${n}`,username:`user${t}${n}`,display_name:`Tester ${t}.${n}`,seed_rank:t*3+n,part_label:part,assigned_by:auto?'auto':'self'});
const team=(n,extra)=>({uid:`t${n}`,number:n,name:`Team ${n}`,revision:0,votes:0,submitted_revision:null,submitted_by:null,last_result:null,members:[1,2,3].map(m=>member(n,m,'ABC'[m-1])),...extra});
const teams=[
 team(1,{revision:4,submitted_revision:4,submitted_by:'vote',last_result:{revision:4,verdict:'AC',passed_count:12,total_count:12,substitutions:[]}}),
 team(2,{revision:3,votes:2}),
 team(3,{revision:2}), // one member offline
 team(4,{revision:5,submitted_revision:5,submitted_by:'vote',last_result:{revision:4,verdict:'WA',passed_count:7,total_count:12}}), // judging
];
teams[2].members[2].assigned_by='auto';
const sessions=teams.flatMap(t=>t.members).filter(m=>m.user_uid!=='u33').map(m=>({user_uid:m.user_uid,status:'active',idle_seconds:20}));
const voice=teams.flatMap(t=>t.members.slice(0,2).map(m=>({at:iso(-10*min),team:t.name,username:m.username,kind:'join'})));
const board={teams:teams.map((t,i)=>({uid:t.uid,rank:i+1,score:100-i*10,integration_passed:i===0}))};

const browser=await chromium.launch({headless:!headed,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try {
 const context=await browser.newContext({viewport:{width:1400,height:900}});
 await context.addCookies([{name:'ams_session',value:`synthetic.${Math.floor(now/1000)+3600}.synthetic`,url:base}]);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!==base)return route.abort();
  if(!u.pathname.startsWith('/api/'))return route.continue();
  const ok=(data)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  if(route.request().method()!=='GET')return route.fulfill({status:405,body:'mock is read-only'});
  const p=u.pathname;
  if(p==='/api/auth/me')return ok({role:'admin'});
  if(p===`/api/org/contests/${uid}`)return ok({uid,title:'Team test',slug:'team-test',status:'running',starts_at:iso(-60*min),ends_at:iso(60*min),invite_code:'TEST',is_practice:true,problems:[],joined:false,frozen:false});
  if(p.endsWith('/submissions/summary'))return ok({total:0,pending:0,verdicts:{}});
  if(p.endsWith('/team-round'))return ok(round);
  if(p.endsWith('/team-round/teams'))return ok(teams);
  if(p.endsWith('/team-round/board'))return ok(board);
  if(p.endsWith('/team-round/voice-events'))return ok(voice);
  if(p.endsWith('/invigilation')&&u.searchParams.get('view')==='sessions')return ok(sessions);
  return ok([]);
 });
 await page.goto(base+`/org/contests/${uid}#team-round`);
 const monitor=page.getByRole('region',{name:'Live teams'});
 await monitor.getByRole('cell',{name:'Team 4',exact:true}).waitFor();
 for(const text of ['8/12','Deadline in','passed','Voting 2/3 on rev 3','Member not online','judging'])
  assert(await monitor.getByText(text,{exact:false}).first().isVisible(),`missing "${text}"`);
 await monitor.getByRole('button',{name:/Needs attention/}).click();
 assert(await monitor.getByRole('cell',{name:'Team 3',exact:true}).isVisible());
 assert(!(await monitor.getByRole('cell',{name:'Team 1',exact:true}).isVisible()),'filter should hide Team 1');
 await monitor.getByRole('button',{name:/All 4/}).click();
 await monitor.getByRole('button',{name:'Details for Team 4'}).click();
 assert(await monitor.getByText('rev 4 · WA · 7/12 tests').isVisible());
 assert.deepEqual(errors,[]);
 console.log('PASS live team monitor: phase, per-team status, attention filter, details');
 await page.screenshot({path:process.env.SCREENSHOT || '/tmp/amsaccess-team-monitor.png',fullPage:true});
 if(headed){console.log('Browser left open; close it or press Ctrl+C when done.');await new Promise(r=>browser.on('disconnected',r));}
} finally {await browser.close().catch(()=>{});}
