import test from 'node:test';
import assert from 'node:assert/strict';
import { teamAction, validateTeamBody, TEAM_WRITERS } from '../../src/lib/teamSetup.ts';
import { boundedForm } from '../../src/lib/server/boundedUpload.ts';
const uid = '3fbf9cee-8b6e-4872-947f-c52b46bb572e';
test('proxy route allowlist excludes traversal and unsupported operations', () => {
  assert.equal(teamAction('POST', ['seed']), '/seed');
  assert.equal(teamAction('GET', ['teams']), '/teams');
  assert.equal(teamAction('PUT', []), '');
  for (const action of [['unpublish'], ['..'], ['teams', uid, 'rejudge'], ['seed/../../end']]) assert.equal(teamAction('POST', action), null);
  assert.equal(teamAction('DELETE', []), null);
});
test('seeding supports 136 players while rejecting ambiguous input', () => {
  const body = { source_contest_uid: uid, take: 133, add_user_uids: [uid], method: 'banded', bands: 4, reset: false };
  assert.deepEqual(validateTeamBody('/seed', body), body);
  for (const bad of [{...body,take:0}, {...body,take:2.5}, {...body,method:'random'}, {...body,add_user_uids:[uid,uid]}, {...body,reset:'false'}, {...body,source_contest_uid:'../other'}, {...body,extra:true}]) assert.throws(() => validateTeamBody('/seed', bad));
});
test('timeline cannot lock during discussion or after submission deadline', () => {
  const body = { project_uid: uid, team_size:4, discussion_seconds:120, selection_opens_at:'2026-11-11T12:00:00Z', allocation_locks_at:'2026-11-11T12:10:00Z', submit_deadline:'2026-11-11T15:00:00Z' };
  assert.deepEqual(validateTeamBody('', body), body);
  assert.throws(() => validateTeamBody('', {...body,allocation_locks_at:'2026-11-11T12:01:00Z'}));
  assert.throws(() => validateTeamBody('', {...body,submit_deadline:'2026-11-11T12:05:00Z'}));
  assert.throws(() => validateTeamBody('', {...body,team_size:6}));
  assert.equal(TEAM_WRITERS.includes('intern'),false);
});
test('multipart reader bounds chunked input without trusting Content-Length', async () => {
  let cancelled = false;
  const request = new Request('https://example.test', {method:'POST',duplex:'half',body:new ReadableStream({pull(c){c.enqueue(new Uint8Array(16));},cancel(){cancelled=true;}})});
  await assert.rejects(boundedForm(request,20),/size limit/);
  assert.equal(cancelled,true);
});
test('bounded multipart reader preserves package bytes', async () => {
  const form = new FormData(); form.set('package',new Blob(['fixture']),'sample.cxxpkg');
  const parsed=await boundedForm(new Request('https://example.test',{method:'POST',body:form}),1024);
  assert.equal(await parsed.get('package').text(),'fixture');
});
