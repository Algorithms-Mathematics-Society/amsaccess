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

test('roster selection CSV quotes cells and defangs spreadsheet formulas', async () => {
  const { rosterCsv } = await import('../../src/lib/client/rosterViews.ts');
  const csv = rosterCsv([{ login_id: 'p1', display_name: '=HYPERLINK("x")', email: 'a@example.test', college: '+1', revoked: false, last_login_at: null, mail_status: 'sent' }]);
  const [header, row] = csv.split('\n');
  assert.equal(header, 'login_id,display_name,email,college,revoked,signed_in,mail_status');
  assert.equal(row, `"p1","'=HYPERLINK(""x"")","a@example.test","'+1","false","no","sent"`);
});
