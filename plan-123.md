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

## Leaderboard attendance follow-up

Requested: apply green entry marking inside the leaderboard, with entrants above other participants. Use the same existing contest session evidence as Participants, independently of scores. Preserve server ranks/scores and relative scoring order within each group; the display explains the grouping. CSV export remains the authoritative scoring export. Missing session evidence is unconfirmed, not definitive absence (the existing session endpoint caps at 5000).

Scope: LeaderboardPanel, a stable O(n) grouping helper in orgEntry, focused tests and this report. Grouping is memoized independently of search. Scoreboard and session reads start together and render independently; a failed session read retains the last confirmed evidence. Manual refresh, focus and polling share one in-flight request, polling waits for completion and pauses hidden pages; contest changes/unmount abort pending reads. No backend, cloud, API route, candidate app or dependency changes.

Follow-up verification: independent review found no blockers; all 92 Node tests, TypeScript, scoped ESLint, diff whitespace check and isolated production build passed. Mocked production-browser checks passed for entrant-first grouping, green names, preserved ranks, search, slow/failed evidence, refresh deduplication and contest isolation. No real API mutations were used.

## Admin performance follow-up — all seven approved items

Implemented the first five request-level optimizations and the remaining cache/rendering work together. Mail reads start concurrently; mail and invigilation polling shares pending reads, pauses while hidden and waits for completion; the parent mail list stops polling while details are open. Post-action reconciliation waits out any older read before fetching fresh data. Invigilation sections render independently and retain their previous data on failed/null responses. Add-from-Access searches cancel superseded requests; Students loads immediately and debounces only text searches.

Existing admin caching is hardened with stable per-key snapshots and stale-response rejection after invalidation/account reset. Problems, Contests and Dashboard reuse in-tab data while revalidating on entry; archive variants remain separate. Catalogue mutations, contest edits and problem publication invalidate affected reads. Admin login/signup clears the cache and broadcasts a reset to other tabs using a nonce only (no participant data is persisted). Authentication/API contracts are unchanged.

Invigilation mounts only the matching desktop/mobile row tree at the existing 768px breakpoint; derived invigilation collections and roster counts/membership keys are memoized. No cache expansion into candidate pages, new dependencies, backend/API edits, database changes, cloud configuration or fleet-control changes.

Review: independent scoped cache review found no blockers; local review covered polling, post-write reads, search cancellation and responsive behavior. Validation includes 97 Node tests, full TypeScript, scoped ESLint, isolated production build and all four mocked browser suites: cache navigation/invalidation/account resets, concurrency/polling/search/filter timing/resizing, existing participant/student flows, and leaderboard ordering. No real email, candidate, proctoring or judge writes were used. Release via review-branch preview first, then guarded fast-forward of unchanged main and exact-SHA production verification.

## Contest notification drawer

Synced with main at 42d0658 before starting; no remote changes were pending. Scoped agents implemented the data feed and controlled drawer independently; a third reviewed backend contracts read-only and reviewed the completed integration. Main integrated existing panels and ran browser validation.

Scope: bottom-right drawer across tabs of the currently open contest, grouped Waiting / Flags / History, with short arrival previews that can dismiss without deleting records. Resume actions use existing approve/reject endpoints; Block request denies that re-entry request, not the account. Help can be resolved; aggregate flag counts link to participant evidence. Reviewed flags remain visible and become attention items again when the count increases. History is in memory for the current contest visit, not a new server notification archive.

One shared per-contest feed: pending resume/help reads about every 3 seconds, aggregate sessions about every 10 seconds while visible, completion-based with bounded GET timeouts, no duplicate in-flight stream reads, immediate focus refresh and hidden-tab pause. Existing Participants/Leaderboard share sessions reads; Invigilation consumes the same live raw arrays. No SSE endpoint exists, so latency depends on API response time. Pending requests and incidents are capped at 200 by existing APIs; sessions at 5000. Missing pending records are unconfirmed, not inferred approved/rejected.

Only authorized staff roles subscribe. Account changes clear/abort retained notifications and suspend decisions until reload. Actions have synchronous shared per-item locks and no automatic POST retry. Successful decisions remain in History and cannot be reverted by stale reads. Failed/uncertain actions remain disabled through delayed or failed reconciliation until a successful current source read confirms state. The review found this uncertainty-lock issue and the fix passed re-review.

UX: memoized stable item identity, 50-item progressive rendering, 200ms transform/opacity transitions with reduced-motion support, responsive safe-area sizing, nonmodal keyboard dismissal/focus restoration and inline errors/freshness. No backend/API, infrastructure, database, candidate-app or dependency changes. Tests use synthetic data and block external browser requests; no real approval, rejection, mail or judge operations were performed.

Notification validation: 103 Node tests, full TypeScript, scoped ESLint, isolated production build and all five mocked browser suites passed. Desktop/mobile captures reviewed. Independent action-safety review and follow-up re-review found no remaining blockers.
