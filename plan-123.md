# Current /org implementation and release plan

Base: current main fa8a2b7 (2026-10-22). The older implementation and original plan remain safely preserved in refs/codex/backups/pre-latest-web-20261023. Do not restore retired pages or backend contracts.

## Scoped implementation

1. ParticipantsPanel reads the existing contest invigilation sessions view independently of the roster. A valid started_at confirms entry; pending check-in, credential sign-in and email delivery do not. Match user_uid, falling back to the exact unique login_id for older responses without user_uid. Green names include accessible text. Requests are contest-scoped, abort on unmount/context change, pause when hidden, refresh every 10 seconds after completion during scheduled/running contests, and retain last confirmed results with an error indicator. The API session view caps at 5000 rows: missing data is unconfirmed, not evidence of absence.
2. ContestConsole starts submissions and summary reads in parallel (previous inner await serialized them). Deduplicate pending reads and schedule polls after completion; pause hidden-page polling. After rejudge, wait for any old read before fresh reconciliation. Reset contest-local state on contest UID changes.
3. StudentsView starts students/facets reads concurrently, aborts superseded requests immediately on filter change, guards stale results and unmounts, retains loaded rows, and shows background refresh status. Existing debounce and write contracts remain unchanged.

No backend/API routes, database, cloud configuration, candidate app, auth, dependencies, lockfiles, marketing, or fleet controls may change. Existing current-main improvements are preserved. The previous legacy patch is not applied.

## Validation and release

- Focused entry and polling tests; TypeScript and scoped lint.
- Isolated production build without environment secrets.
- Mocked browser checks: started versus pending sessions, older response compatibility, contest isolation, concurrent GETs, and late student search responses.
- Independent scoped review before staging an explicit file allowlist.
- Push dedicated work/org-admin-latest branch first; inspect exact SHA Vercel status and deployment URL.
- Promote only the reviewed commit onto unchanged main with a normal fast-forward push; never force push. Re-fetch first and reassess if main advanced.
- Verify Vercel reports successful production deployment for the exact pushed SHA. Authenticated production operations remain untested; do not send mail, create users, run judges, or change cloud resources to verify this UI change.

## Verified before push

Independent scoped review: no concrete blockers. All 91 existing/new Node tests passed; full TypeScript and scoped ESLint passed; git diff --check passed. Isolated Next 15 production build passed (one transient Google Fonts DNS retry recovered). Browser tests against that build passed: started and pending distinction, exact legacy identity fallback, contest isolation, actual concurrent submission/summary and student/facet reads, and protection from slow older search responses. Browser APIs were mocked and all writes forbidden. No production candidate, email, judge, or cloud operations were used.
