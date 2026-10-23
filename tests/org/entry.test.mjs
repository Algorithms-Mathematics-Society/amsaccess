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
