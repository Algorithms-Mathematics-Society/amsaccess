import test from 'node:test';
import assert from 'node:assert/strict';
import { enteredParticipantKeys, participantEntered } from '../../src/lib/client/orgEntry.ts';
test('only started sessions identify entrants, including finished sessions without submissions', () => {
 const keys=enteredParticipantKeys([{user_uid:'a',started_at:'2026-10-23T10:00:00Z'}, {user_uid:'b',started_at:null}, {user_uid:'c',started_at:'invalid'}]);
 assert(participantEntered(keys,{user_uid:'a',login_id:'alice'}));
 assert(!participantEntered(keys,{user_uid:'b',login_id:'bob'}));
 assert(!participantEntered(keys,{user_uid:'c',login_id:'carol'}));
});
test('legacy session handles match exactly and never by display name or email', () => {
 const keys=enteredParticipantKeys([{login_id:'alice',started_at:'2026-10-23T10:00:00Z'}]);
 assert(participantEntered(keys,{user_uid:'a',login_id:'alice'}));
 assert(!participantEntered(keys,{user_uid:'b',login_id:'alice2'}));
});
test('each contest snapshot is independent and unknown identity is not evidence', () => {
 const a=enteredParticipantKeys([{user_uid:'a',started_at:'2026-10-23T10:00:00Z'}]);
 const b=enteredParticipantKeys([{started_at:'2026-10-23T10:00:00Z'}]);
 assert(participantEntered(a,{user_uid:'a',login_id:'alice'}));
 assert(!participantEntered(b,{user_uid:'a',login_id:'alice'}));
});

test('leaderboard groups entrants first without changing scoring order, ties or ranks', async () => {
 const {groupLeaderboardByEntry}=await import('../../src/lib/client/orgEntry.ts');
 const rows=Object.freeze([
  Object.freeze({user_uid:'absent',username:'absent',rank:1,score:10}),
  Object.freeze({user_uid:'entered',username:'entered',rank:2,score:8}),
  Object.freeze({user_uid:'pending',username:'pending',rank:3,score:8}),
  Object.freeze({user_uid:'legacy',username:'legacy',rank:4,score:0}),
 ]);
 const keys=enteredParticipantKeys([{user_uid:'entered',started_at:'2026-10-23T10:00:00Z'},{login_id:'legacy',started_at:'2026-10-23T10:00:00Z'},{user_uid:'pending',started_at:null}]);
 const grouped=groupLeaderboardByEntry(rows,keys);
 assert.deepEqual(grouped.map(x=>x.row.user_uid),['entered','legacy','absent','pending']);
 assert.deepEqual(grouped.map(x=>x.row.rank),[2,4,1,3]);
 assert.deepEqual(grouped.map(x=>x.entered),[true,true,false,false]);
 assert.equal(grouped[0].row,rows[1]);
 assert.deepEqual(rows.map(x=>x.rank),[1,2,3,4]);
 assert.deepEqual(groupLeaderboardByEntry(rows,new Set()).map(x=>x.row),rows);
 assert.deepEqual(groupLeaderboardByEntry([],keys),[]);
});
