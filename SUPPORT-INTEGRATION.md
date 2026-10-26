# Support inbox integration

This updates Shubh's participant-support-chat work against current main. Guest
issues stay contact-only; authenticated conversations allow plain-text replies,
resolution and reopening. The API remains the authorization boundary, including
intern exclusion and organization isolation. Contest context is optional and
is never proof of a guest's identity.

Selected conversations poll every 4–6 seconds, inboxes every 15–20 seconds and
the dashboard attention row every 30–45 seconds. Each owner has one in-flight
read, aborts on unmount, pauses when hidden, backs off failures and honors
Retry-After. The API proxy deadline includes response-body consumption and
propagates cancellation/cooldown headers. Status-change retries preserve their
original desired state rather than accidentally reopening a resolved issue.

Local validation: support and existing portal test files pass, as does the
full typecheck. Production build is blocked in this sandbox by DNS failures
fetching the existing Inter and Source Serif 4 fonts from Google. Typography
was not changed to hide that limitation. Require a complete build/CI result on
the final pushed commit before merging PR #4.

Deploy the API follow-up/migration 7ac291e0b46f before this portal and the proctor
release. ams-api/SUPPORT-QUALIFICATION.md documents the isolated production
fixtures, load script, cleanup and pending native acceptance. Packaged focus,
security/reconnect/expiry/announcement priority and timer behavior still require
Shubh's Windows checks and the matrix tracked in ams-access #167.
