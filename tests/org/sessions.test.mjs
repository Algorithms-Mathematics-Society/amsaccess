import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrgSessionStore } from '../../src/lib/client/orgSessions.ts';
import { enteredParticipantKeys } from '../../src/lib/client/orgEntry.ts';
const flush = async () => { for (let i=0;i<24;i++) await Promise.resolve(); };
const row = (uid='a', extra={}) => ({uid:`session-${uid}`,user_uid:uid,started_at:'2026-10-25T10:00:00Z',...extra});
function environment() {
 const old = {document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch,setTimeout,clearTimeout};
 globalThis.document=Object.assign(new EventTarget(),{visibilityState:'visible'});
 globalThis.window=new EventTarget();
 const timers=new Map(); let id=0; const calls=[];
 globalThis.setTimeout=(fn,delay)=>{timers.set(++id,{fn,delay});return id;};
 globalThis.clearTimeout=id=>timers.delete(id);
 globalThis.fetch=(url,options)=>new Promise((resolve,reject)=>calls.push({url,options,resolve,reject}));
 const respond=(index,rows)=>calls[index].resolve({ok:true,json:async()=>rows});
 const tick=async delay=>{const entries=[...timers].filter(([,v])=>v.delay===delay);for(const [key,value] of entries){timers.delete(key);value.fn();}await flush();};
 return {calls,timers,respond,tick,restore:()=>Object.assign(globalThis,old)};
}

test('three subscribers share one live source; new subscriber refreshes immediately; last unmount aborts',async()=>{
 const env=environment(); const store=createOrgSessionStore('one'); const stops=[];
 try {
  stops.push(store.subscribe(()=>{}));stops.push(store.subscribe(()=>{}));stops.push(store.subscribe(()=>{}));
  assert.equal(env.calls.length,1);env.respond(0,[row()]);await flush();
  assert.equal([...env.timers.values()].filter(t=>t.delay===10000).length,1);
  await env.tick(10000);assert.equal(env.calls.length,2);env.respond(1,[row()]);await flush();
  stops.push(store.subscribe(()=>{}));assert.equal(env.calls.length,3,'joining settled source reads fresh data');
  stops.shift()();await flush();assert.equal(env.calls[2].options.signal.aborted,false);
  stops.splice(0).forEach(stop=>stop());await flush();assert.equal(env.calls[2].options.signal.aborted,true);
  assert.equal(env.timers.size,0);
 } finally {stops.forEach(stop=>stop());await flush();env.restore();}
});

test('equivalent sessions retain membership snapshot identity while notification rows remain current',async()=>{
 const env=environment();const store=createOrgSessionStore('one');const stop=store.subscribe(()=>{});
 try {
  env.respond(0,[row('a',{idle_seconds:1}),row('b',{started_at:null})]);await flush();
  const membership=store.getEntrySnapshot();const rows=store.getSnapshot().rows;
  const read=store.refresh();env.respond(1,[row('b',{started_at:null}),row('a',{idle_seconds:10})]);await read;
  assert.equal(store.getEntrySnapshot(),membership);assert.notEqual(store.getSnapshot().rows,rows);
  const next=store.refresh();env.respond(2,[row('b')]);await next;
  assert.notEqual(store.getEntrySnapshot(),membership);assert.deepEqual([...store.getEntrySnapshot().entered],['uid:b']);
 }finally{stop();await flush();env.restore();}
});

test('failed refresh retains membership and recovers; hidden/focus work is shared',async()=>{
 const env=environment();const store=createOrgSessionStore('one');const stop=store.subscribe(()=>{});
 try {
  env.respond(0,[row()]);await flush();const entered=store.getEntrySnapshot().entered;
  const failure=store.refresh();env.calls[1].reject(new Error('offline'));await assert.rejects(failure);
  assert.equal(store.getEntrySnapshot().entered,entered);assert.match(store.getEntrySnapshot().error,/refresh/);
  document.visibilityState='hidden';document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));
  assert.equal(env.calls.length,2);assert.equal(env.timers.size,0);
  document.visibilityState='visible';document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));
  assert.equal(env.calls.length,3);env.respond(2,[row()]);await flush();
  assert.equal(store.getEntrySnapshot().error,'');assert.equal(store.getEntrySnapshot().entered,entered);
 }finally{stop();await flush();env.restore();}
});

test('logout rejects pending old-account body and suspends subsequent reads',async()=>{
 const env=environment();const store=createOrgSessionStore('one');const stop=store.subscribe(()=>{});
 try {
  let finishBody;env.calls[0].resolve({ok:true,json:()=>new Promise(resolve=>{finishBody=resolve;})});await flush();
  window.dispatchEvent(new Event('ams:org-session-reset'));await flush();
  finishBody([row('secret')]);await flush();
  assert.equal(store.getSnapshot().rows.length,0);assert.equal(store.getEntrySnapshot().entered.size,0);
  await assert.rejects(store.refresh(),/Session changed/);assert.equal(env.calls.length,1);
 }finally{stop();await flush();env.restore();}
});

test('contest stores isolate inflight work and cancellation never affects another contest',async()=>{
 const env=environment();const a=createOrgSessionStore('a');const b=createOrgSessionStore('b');const stopA=a.subscribe(()=>{});const stopB=b.subscribe(()=>{});
 try {
  assert.equal(env.calls.length,2);stopA();await flush();assert.equal(env.calls[0].options.signal.aborted,true);assert.equal(env.calls[1].options.signal.aborted,false);
  env.respond(0,[row('old')]);env.respond(1,[row('new')]);await flush();
  assert.equal(a.getSnapshot().rows.length,0);assert.deepEqual([...b.getEntrySnapshot().entered],['uid:new']);
 }finally{stopB();await flush();env.restore();}
});

test('post-action refresh waits out stale read then starts new snapshot; body timeout releases the flight',async()=>{
 const env=environment();const store=createOrgSessionStore('one');const stop=store.subscribe(()=>{});
 try {
  env.calls[0].resolve({ok:true,json:()=>new Promise(()=>{})});await flush();
  const after=store.refreshAfterWrite();await env.tick(12000);
  assert.equal(env.calls[0].options.signal.aborted,true);assert.equal(env.calls.length,2);
  env.respond(1,[row('fresh')]);await after;
  assert.deepEqual([...store.getEntrySnapshot().entered],['uid:fresh']);
 }finally{stop();await flush();env.restore();}
});

test('inactive subscriber gets initial/focus reads but no periodic work; live subscriber departure restores that',async()=>{
 const env=environment();const store=createOrgSessionStore('one');const stop=store.subscribe(()=>{},false);let stopLive;
 try {
  env.respond(0,[]);await flush();assert.equal(env.timers.size,0);
  stopLive=store.subscribe(()=>{},true);env.respond(1,[]);await flush();assert([...env.timers.values()].some(t=>t.delay===10000));
  stopLive();await flush();assert.equal(env.timers.size,0);
  window.dispatchEvent(new Event('focus'));assert.equal(env.calls.length,3);env.respond(2,[]);await flush();assert.equal(env.timers.size,0);
 }finally{stop();await flush();env.restore();}
});

test('entry identity handles duplicates, legacy fallback, reorder and invalid timestamps',()=>{
 const previous=enteredParticipantKeys([row('a'),{login_id:'legacy',started_at:'2026-10-25T10:00:00Z'}]);
 assert.equal(enteredParticipantKeys([{login_id:'legacy',started_at:'2026-10-25T10:00:00Z'},row('a'),row('a'),row('bad',{started_at:'bad'})],previous),previous);
 assert.notEqual(enteredParticipantKeys([row('b')],previous),previous);
});

test('post-action waiter cannot restart a disposed source after unmount',async()=>{
 const env=environment();const store=createOrgSessionStore('one');const stop=store.subscribe(()=>{});
 try {
  const after=store.refreshAfterWrite();const rejected=assert.rejects(after,/source changed/);
  stop();await flush();await rejected;
  assert.equal(env.calls.length,1);assert.equal(env.timers.size,0);
 }finally{await flush();env.restore();}
});
