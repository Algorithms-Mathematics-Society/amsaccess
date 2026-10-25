import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesRosterView } from '../../src/lib/client/rosterViews.ts';
const person = { revoked: false, has_passphrase: true, email: 'fixture@example.test', mail_status: '' };
test('attention distinguishes actionable issues from ordinary non-entry and revoked accounts', () => {
  assert.equal(matchesRosterView(person, false, 'attention'), false);
  assert.equal(matchesRosterView(person, false, 'not-entered'), true);
  assert.equal(matchesRosterView(person, true, 'not-entered'), false);
  assert.equal(matchesRosterView({...person, has_passphrase:false}, true, 'attention'), true);
  for (const mail_status of ['failed','bounced','complained']) {
    assert.equal(matchesRosterView({...person, mail_status}, false, 'email-failed'), true);
    assert.equal(matchesRosterView({...person, mail_status, revoked:true}, false, 'attention'), false);
  }
  assert.equal(matchesRosterView({...person,email:''}, false, 'email-unsent'), false);
  assert.equal(matchesRosterView({...person,mail_status:'queued'}, false, 'email-unsent'), false);
  assert.equal(matchesRosterView({...person,revoked:true}, false, 'not-entered'), false);
  assert.equal(matchesRosterView({...person,revoked:true}, false, 'revoked'), true);
});
