# Participant support

Participant support is available at `/org/support`, with an open-issue summary on
the main dashboard. It is independent of any contest and includes participants
who cannot sign in. The sidebar hides Support from interns; the API enforces
organization membership and participant-data roles on every read and action.

Participants enter email, phone number, name and their issue before starting a
private conversation in the Access app. These contact details are self-reported
and unverified. A support conversation never authorizes an account login,
credential reset, extra exam time or a change to assessment policy.

## Staff workflow

1. Open **Support** or use **Open support inbox** on the dashboard.
2. Select an issue to read its contact information and message history.
3. Reply, then use **Resolve issue** when the participant's issue is handled.
4. Use the **Resolved** filter and **Reopen issue** for further follow-up.

The inbox refreshes every ten seconds, open conversations every four seconds,
and the dashboard summary every fifteen seconds while the document is visible.
Requests are serialized within each poller. Refresh failures retain the last
conversation and show an explicit warning. History is fetched in bounded pages.

Reply drafts and pending message identifiers are saved separately for each
conversation in this browser tab's session storage. Switching conversations or
reloading the tab preserves safe retries. If an acknowledgement is lost, **Retry
reply** resends the same message identifier; the server stores it once. If storage
is unavailable, the page warns staff to keep the conversation open until the
reply is confirmed. Closing the browser tab removes this local draft recovery;
confirmed conversations and messages remain stored on the server.

A reply awaiting confirmation prevents resolution. If another staff member
resolves the issue while a reply is pending, retry the saved reply to confirm
delivery without reopening it. A reply already stored is acknowledged safely.
If the server rejects an unsent reply because the issue is resolved, use **Reopen
issue** before retrying. New replies require an open issue. Reopening and
resolving do not remove its history.

## Deployment

Deploy the matching `ams-api` support endpoints and database migration
`f14d8c2a907b` before releasing this portal and the Access app changes. The portal
uses its existing signed session and internal API proxy. It never receives the
participant's private conversation token. No additional environment variables
or service dependencies are required.
