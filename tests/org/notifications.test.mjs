import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileNotifications } from '../../src/lib/client/orgNotifications.ts';
const time='2026-10-24T08:00:00Z';
const raw = () => ({resumes:[],incidents:[],sessions:[]});
const resume = (uid,status='pending') => ({uid,status,display_name:'Person',login_id:uid,reason:'Restart',created_at:time});
test('pending resume history is retained without inventing a decision when it disappears', () => {
 const data=raw(); data.resumes=[resume('a')];
 const initial=reconcileNotifications([],'contest','resumes',data,time);
 assert.equal(initial[0].pending,true);
 const missing=reconcileNotifications(initial,'contest','resumes',raw(),time);
 assert.equal(missing.length,1); assert.equal(missing[0].status,'unconfirmed'); assert.equal(missing[0].pending,false);
 const returned=reconcileNotifications(missing,'contest','resumes',data,time);
 assert.equal(returned[0].pending,true);
});
test('locally acknowledged decisions remain visible after pending-only read', () => {
 const data=raw(); data.resumes=[resume('a','approved'),resume('b','rejected')];
 const initial=reconcileNotifications([],'contest','resumes',data,time);
 const next=reconcileNotifications(initial,'contest','resumes',raw(),time);
 assert.deepEqual(next.map(x=>x.status),['approved','rejected']);
 assert(next.every(x=>!x.pending));
});
test('incidents retain resolved history and remain isolated from resume snapshots and other contests', () => {
 const data=raw(); data.incidents=[{uid:'a',status:'open',display_name:'A',login_id:'a',message:'Help',created_at:time}];
 const first=reconcileNotifications([],'one','incidents',data,time);
 data.incidents[0]={...data.incidents[0],status:'resolved'};
 const next=reconcileNotifications(first,'one','incidents',data,time);
 assert.equal(next[0].pending,false); assert.equal(next[0].status,'resolved');
 assert.equal(reconcileNotifications(next,'one','resumes',raw(),time).length,1);
 assert.equal(reconcileNotifications(next,'two','incidents',raw(),time).length,0);
});
test('flag snapshots aggregate by session, advancing timestamp only when count changes', () => {
 const data=raw(); data.sessions=[{uid:'s',display_name:'A',login_id:'a',violation_count:2},{uid:'none',violation_count:0}];
 const first=reconcileNotifications([],'c','sessions',data,time);
 assert.equal(first.length,1); assert.equal(first[0].count,2); assert.equal(first[0].pending,false);
 const later='2026-10-24T08:01:00Z';
 const same=reconcileNotifications(first,'c','sessions',data,later);
 assert.equal(same[0].createdAt,time);
 data.sessions[0].violation_count=3;
 const updated=reconcileNotifications(same,'c','sessions',data,later);
 assert.equal(updated.length,1); assert.equal(updated[0].count,3); assert.equal(updated[0].createdAt,later);
});

test('unchanged polling preserves the list and individual notification references', () => {
 const data=raw(); data.resumes=[resume('a'),resume('b')];
 const first=reconcileNotifications([],'c','resumes',data,time);
 const same=reconcileNotifications(first,'c','resumes',structuredClone(data),'2026-10-24T08:02:00Z');
 assert.equal(same,first);
 data.resumes[0].reason='Changed reason';
 const changed=reconcileNotifications(same,'c','resumes',data,time);
 assert.notEqual(changed,same);
 assert.notEqual(changed.find(x=>x.id==='resume:a'),first.find(x=>x.id==='resume:a'));
 assert.equal(changed.find(x=>x.id==='resume:b'),first.find(x=>x.id==='resume:b'));
});
test('aggregate flags require a real session identifier', () => {
 const data=raw(); data.sessions=[{violation_count:3},null,{uid:'',violation_count:2}];
 assert.deepEqual(reconcileNotifications([],'c','sessions',data,time),[]);
});

test('flat polling rows preserve identity without masking changed session fields', async () => {
 const { reuseNotificationRows } = await import('../../src/lib/client/orgNotifications.ts');
 const original=[{uid:'a',status:'active',idle_seconds:0},{uid:'b',status:'active',idle_seconds:null}];
 assert.equal(reuseNotificationRows(original,structuredClone(original)),original);
 const next=reuseNotificationRows(original,[{...original[0],idle_seconds:10},{...original[1]}]);
 assert.notEqual(next,original);
 assert.notEqual(next[0],original[0]);
 assert.equal(next[1],original[1]);
 assert.notEqual(reuseNotificationRows(original,[original[1],original[0]]),original);
 assert.notEqual(reuseNotificationRows(original,[original[0]]),original);
 const optional=[{uid:'a',status:undefined}];
 assert.notEqual(reuseNotificationRows(optional,[{uid:'a'}]),optional);
});

test('large unchanged notification streams reuse list and preserve changed ordering', () => {
 const data=raw(); data.resumes=Array.from({length:5000},(_,index)=>resume(String(index)));
 const original=reconcileNotifications([],'contest','resumes',data,time);
 assert.equal(reconcileNotifications(original,'contest','resumes',structuredClone(data),time),original);
 data.resumes[4999]={...data.resumes[4999],created_at:'2026-10-24T09:00:00Z'};
 const changed=reconcileNotifications(original,'contest','resumes',data,time);
 assert.equal(changed[0].id,'resume:4999');
 assert.equal(changed.find(row=>row.id==='resume:1'),original.find(row=>row.id==='resume:1'));
});
