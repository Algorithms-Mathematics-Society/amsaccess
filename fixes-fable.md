# fixes-fable.md — Cross-Repo Production-Readiness Audit

**Date:** 2026-06-13
**Auditor pass:** senior tester, read-only, evidence-backed (every finding quotes both sides).
**Scope:** sync bugs across the three repos for contest area, submissions, email, invitations,
question setting/testing, code submissions, and cloud cost safety.

## Repos & roles
- **DASH** = organizer dashboard (Next.js): `/home/user/AMS Access`
- **GO** = authoritative backend (live): `/home/user/AccessGolang/ams-golang`
  *(note: `/home/user/access-ams/api` is a STALE copy from 2026-06-01 — ignore it; the live
  code is AccessGolang, last commit 2026-06-08.)*
- **STU** = student runtime (Tauri + web): `/home/user/AccessSoftware/ams-access`

## How to read severities
- **P0** — breaks contest day, loses data, or is a security/cost blowout. Fix before next contest.
- **P1** — functional sync bug producing wrong results or duplicate side effects.
- **P2** — missing guardrail / degraded UX / integrity gap.
- **P3** — hygiene / polish.

---

## Compute "forgot to Stop" safety UX — 2026-06-13 (follow-on to P0-1)

User concern: starting compute for question authoring/testing and forgetting to Stop it. The P0-1
backend TTL already hard-stops a forgotten `MANUAL_ON` (auto-reverts to AUTO after ~4h → fleet to 0
when idle), but it wasn't visible and 4h is long. Added **visibility + a nudge** (backend stays the
hard safety net). Verified: Go build/vet/test pass; dashboard tsc + lint clean.

- **GO `internal/handler/org/judge_capacity.go`:** the `GetJudgeCapacity` response now includes
  `manual_until` (TTL-aware: nil under AUTO/expired). Refactored the mode read into
  `getJudgeControl(r) (mode, *manualUntil)`. No migration (column already exists); the Next proxy
  routes pass the body through unchanged.
- **DASH `src/app/(org)/org/contests/[id]/page.tsx`:** header now shows a live
  "Compute auto-stops in Xh Ym" countdown while `MANUAL_ON`; when it elapses the dashboard refreshes
  to reflect the wind-down. Added a dismissible "Compute is still running — Stop?" nudge after
  **30 min** of inactivity (pointerdown/keydown tracked; **Dismiss** snoozes 10 min; thresholds are
  named constants `IDLE_NUDGE_MS`/`IDLE_SNOOZE_MS`). Disarms when compute isn't MANUAL_ON.

---

## Review pass — 2026-06-13 (3 specialized reviewers on all fixes so far)

Spawned 3 principal-level reviewers (judge P0-1, email cluster, dashboard UI). Outcome + fixes applied:

**Judge P0-1 (`judge_autoscaler.go`):**
- **Fixed (real regression I introduced):** my "AUTO caps down to floor exactly" change would yank a load-scaled fleet down to `JudgeWindowReplicas` *mid-contest* when a manual TTL expired, and kill load scaling. `sync` now **never caps down while a contest is in-window** (`MANUAL_ON || inWindow` → never below `current`); it only releases to 0 when idle. Cost fix preserved, outage risk removed.
- **Fixed:** removed the GCP side-effect from `expireManualMode` (DB-only revert) so `sync()` is the single authority for autoscaler/Resize — eliminates the double `setAutoscaler` call and the window where a stale revert could clobber a concurrent Start/Stop.
- **Fixed:** `setAutoscaler` now no-ops when the policy already matches (less GCP churn, smaller clobber window).
- **Verified correct by reviewer:** atomic DB revert claim, NULL-`manual_until`-as-expired on all readers, pgx `*time.Time`/`ErrNoRows` handling, TTL≤0 clamp, steady-state has no per-tick GCP writes.
- **Known limitation (not changed):** GCP autoscaler Update is a blind read-modify-write with no fingerprint (pre-existing pattern in the handler too). Residual clobber race now only exists when idle (no contest near, no operator likely clicking Start). Acceptable; fingerprinted Patch deferred as a separate hardening.

**Email cluster (`student_provisioning.go`):**
- Reviewer **disproved both of my own high-risk suspicions** by reading the source: the dropped check-constraint name (`email_dispatch_recipients_status_check`) is correct per the repo's migration convention, and binding a Go `time.Duration` to `$2::interval` is supported by pgx v5.7.5 (`durationWrapper` → `interval`). No fix needed.
- **Fixed (P3 hardening):** a recipient with no matching `contest_students` row is now marked FAILED ("no provisioned credentials") instead of sending a blank-`{{username}}`/`{{password}}` email.
- **Accepted as-is:** a retry firing while the original runner is still in-flight can stall ≤60s before the reaper re-drives it (self-healing, no loss) — not worth added concurrency complexity. Migration-runner advisory lock + `NOT VALID` constraint re-add noted as pre-existing/theoretical; not changed.

**Dashboard UI (`page.tsx`, `CPProblemStudio.tsx`):**
- **Fixed (P0 data-corruption, latent in the file I edited):** the parse↔compose effect pair rewrote a loaded statement into canonical form on open, so merely fixing a title + saving silently mutated/normalized the statement (empty-bodied sections were dropped). Compose now compares against a **canonical baseline** captured at parse time, so it only writes back on a genuine field edit — opening never rewrites. Factored the join into `composeStatementMarkdown`.
- **Fixed (P1):** `handleCancel` dirty-check was title-only → statement/markov/follow-up edits were discarded with no confirm. Now compares description/points/limits/type and the per-type content (follow-up parts, markov chain). Safe to compare `description` now that the compose fix makes it change-only.
- **Fixed (P1):** type-change warning now states the statement/answer-key/follow-up content can be overwritten (not just grading config), and suggests creating a new question instead.
- **Fixed (P2):** the container-width effect restored a hardcoded `max-w-4xl` while the real base class is `max-w-5xl`, permanently narrowing the whole contest page after any form open/close. Now snapshots and restores the original className verbatim.
- **Fixed (P2):** follow-up part points input `min=0`→`min=1` to match save validation.
- **Verified correct by reviewer:** no infinite loop between the effects, the empty-description deadlock fix is genuine, `getCpConfig` synchronous read, save-flow validation, `key`-based remount, delete two-step timers (keyed on id, no wrong-item risk), `normalizeQuestionType` robustness.

**Verification after fixes:** Go `build`/`vet`/`test` all pass, gofmt clean; dashboard `tsc --noEmit` passes, lint shows only the pre-existing `activeGenerator` warning.

---

## P0 — must fix before production

### P0-1 — Judge fleet manual mode is sticky AND global (cost blowout + contest-day outage + cross-tenant) — ✅ FIXED 2026-06-13 (GO)

**Fix shipped (sticky-mode half — the cost/outage blowout):** manual overrides are now
**time-boxed** and auto-revert to AUTO; on revert the GCP autoscaler floor left by Start is
released, so the fleet returns to the intended AUTO steady state (scales to 0 outside a contest
window, floors during one). This preserves the operator-override semantics — Start/Stop still work
immediately — but bounds their lifetime so a forgotten click can no longer pin the shared fleet up
(cost) or down (outage). Verified: `go build ./...`, `go vet`, `go test ./internal/handler/org/...`
all pass.

- `internal/db/migrations/025_judge_manual_mode_ttl.sql` — adds `manual_until timestamptz`. A
  `MANUAL_*` row with `NULL` manual_until is treated as already-expired, so deploying this clears any
  lingering override (incl. the pre-migration global row) back to AUTO on the first autoscaler tick.
- `internal/config/config.go` — new `JudgeManualModeTTLMinutes` (`JUDGE_MANUAL_MODE_TTL_MINUTES`,
  default **240**).
- `internal/handler/org/judge_capacity.go` — `setJudgeControlMode` stamps `manual_until = now()+TTL`
  for `MANUAL_*` (NULL for AUTO); `getJudgeControlMode` reports an expired/unstamped override as AUTO
  so the dashboard mode badge stays honest.
- `internal/orchestrator/judge_autoscaler.go` — `sync` now calls `expireManualMode` (durable
  `UPDATE … → AUTO` + `setAutoscaler(0,"OFF")` to drop the leftover floor) before reading the mode;
  the AUTO/MANUAL_OFF path now enforces the window floor *exactly* (caps down leftover capacity,
  safe because AUTO runs with the autoscaler OFF and thus has no load-driven scaling), while
  MANUAL_ON still never caps load-driven capacity down. `getJudgeControlMode` is TTL-aware defensively.

**Still OPEN (the cross-tenant authorization half) — deliberately not changed:** the control row is
intentionally **global** because the architecture is a single shared judge MIG, so per-org sharding
would be wrong; and `StartJudgeCapacity`/`StopJudgeCapacity` still read `OrgIDFromContext` and discard
it. The TTL neutralizes the worst impact (no org can pin the fleet indefinitely), but **any org admin
can still start/stop the shared fleet for everyone within the TTL window.** Proper fix is an
authorization decision (restrict manual control to platform-admin, or keep org-admin control as
intended) — flagged for the owner rather than risk changing the intended Start/Stop access model.
Tracking as **P1-NEW (judge-capacity authorization)**.

<details><summary>Original finding (for reference)</summary>
**Where:**
- GO `internal/handler/org/judge_capacity.go:174-200` (`StartJudgeCapacity` → `setJudgeControlMode(r,"MANUAL_ON")`),
  `:202-226` (`StopJudgeCapacity` → `"MANUAL_OFF"`).
- GO `internal/handler/org/judge_capacity.go:41-54` (`setJudgeControlMode`) writes a single row
  `judge_capacity_control WHERE id = 'global'` — **one shared row for the whole platform.**
- GO `internal/orchestrator/judge_autoscaler.go:106-145` reads that global mode every tick:
  `MANUAL_ON → minFloor=1` forever; `MANUAL_OFF → forceZero` forever. **Nothing ever resets it.**
  (`grep MANUAL_ON/MANUAL_OFF` across `internal/` shows the only writers are Start/Stop.)
- GO `judge_capacity.go:128,175,203` read `OrgIDFromContext` and **discard it** (`_ = …`).

**Why it breaks (two ways, both bad):**
1. **Outage:** an admin clicks Stop after a test → mode pinned `MANUAL_OFF` → the AUTO prewarm in
   `judge_autoscaler.go:118-122` is overridden, so when a real contest goes ACTIVE the fleet is
   forced to 0 and **no submissions can be judged.** Silent until contest day.
2. **Runaway cost:** an admin clicks Start → mode pinned `MANUAL_ON` (min 1 + autoscaler ON) and
   never clears, so the fleet runs **indefinitely after the contest ends** (`refreshContestStatuses`
   only flips the contest *status*, never the capacity mode).
3. **Cross-tenant:** because the row is global and org is discarded, **any org admin starts/stops the
   shared fleet for all orgs** — one tenant can DoS another's contest or spend on their behalf.

**Proposed fix (GO):**
- Make manual mode **expiring/scoped**: store `mode`, `manual_until` (timestamp) and revert to AUTO
  in `judge_autoscaler.sync` once `manual_until < now()` OR once `!hasContestInWindow`. Simplest
  correct behavior: **auto-revert MANUAL_* → AUTO when no contest is in the prewarm/cooldown window.**
- Scope the control row per-org (or restrict Start/Stop to platform-admin), and stop discarding `orgID`.
- Belt-and-suspenders: the autoscaler should force the fleet to 0 when `!inWindow` regardless of a
  *stale* manual flag.
**Verification:** leave mode MANUAL_ON, end the contest → fleet must scale to 0 within cooldown.

</details>

### ✅ EMAIL CLUSTER (P0-2 + P1-1 + P1-2) — FIXED 2026-06-13 (GO)

Fixed together since they share `internal/handler/org/student_provisioning.go`. Verified:
`go build ./...`, `go vet ./...`, `go test ./...` all pass; gofmt clean.

**Migration `027`→ actually `026_email_dispatch_durability.sql`:**
- adds `claimed_at` + a `SENDING` recipient status (atomic claim / re-claim of a stale send);
- partial unique index `email_dispatch_jobs_one_active_per_contest` forbidding >1 active
  (QUEUED/RUNNING) job per contest.

**P1-1 (idempotency / duplicate emails):** `StartEmailDispatchJob` now rejects a second dispatch
while one is active (pre-check + the unique index as the race-safe backstop, returning
`409 DISPATCH_IN_PROGRESS`). The worker claims each recipient atomically
(`UPDATE … SET status='SENDING' … WHERE status='QUEUED' … FOR UPDATE SKIP LOCKED RETURNING`), so
concurrent runners (e.g. a retry firing while a run is in flight) split the work instead of
double-sending.

**P1-2 (counter inflation):** removed the per-recipient `sent_count = sent_count + …` increment
(and the now-unused `mapBoolToInt`). Counters are **recomputed** from the recipients table
(`recomputeJobCounters`) after each send, on retry, and at finalize — so a retry can never push
`failed_count`/`sent_count` past the real numbers.

**P0-2 (durability):** dispatch is still triggered in-process for responsiveness, but is now
crash-safe and resumable: recipients are claimed one at a time (so a crash loses at most the
in-flight one), stale `SENDING` claims are re-acquired after `staleEmailClaim` (5 min), and a new
**`StartEmailDispatchReaper`** (wired in `cmd/api/main.go`, 60 s tick) resumes any job left RUNNING
with pending/stale recipients after an instance restart or a sender that died mid-send.
`finalizeEmailJob` only marks a job terminal once no recipient is QUEUED/SENDING, and an in-process
`sync.Map` guard stops the request and the reaper from driving the same job at once.
Delivery is deliberately **at-least-once** (a rare duplicate credential email on crash recovery is
far better than a student who never receives a login); double-clicks are still prevented by P1-1.

Files: `internal/db/migrations/026_email_dispatch_durability.sql`,
`internal/handler/org/student_provisioning.go`, `cmd/api/main.go`.

<details><summary>Original findings (for reference)</summary>

### P0-2 — Credential emails are sent from a detached, non-durable goroutine
**Where:** GO `internal/handler/org/student_provisioning.go:379` and `:478`
(`go runEmailDispatchJob(context.Background(), jobID, contestID)`); the worker body is `:485-611`.

**Why it breaks:** the dispatch runs in-process on the API (Cloud Run) with `context.Background()`.
If the instance is recycled, deployed, or scaled-in mid-send (routine on Cloud Run), the job is
**stranded in `RUNNING` forever and a chunk of students never receive their username/password** —
they cannot log in on contest day, with no automatic recovery. The job row shows RUNNING but nothing
is processing it.

**Proposed fix (GO):** move dispatch to the existing worker/pubsub path (there is already a worker
service + `internal/pubsub`), or at minimum add a reaper that re-queues jobs stuck in `RUNNING` past a
threshold and process recipients with `SELECT … FOR UPDATE SKIP LOCKED` so a restart resumes safely.

</details>

---

## P1 — functional sync bugs

### P1-1 — Email dispatch has no idempotency → duplicate credential emails — ✅ FIXED (see EMAIL CLUSTER above)
**Where:** GO `student_provisioning.go:293-389` (`StartEmailDispatchJob`) always `INSERT`s a new job
+ all recipients with no check for an existing active job; `:438-482` (`RetryFailedEmails`) starts
another `go runEmailDispatchJob` with no "already running" guard, and the worker reads QUEUED rows
**without row locking** (`:514-519`).

**Why it breaks:** a double-click on "Send", or Retry while a run is in flight, produces two jobs /
two goroutines that both see the same `QUEUED` recipients → **students get the credential email
twice (or N times)**, and Resend volume doubles. Race is real because status is read before update
with no `FOR UPDATE SKIP LOCKED`.

**Proposed fix (GO):** unique/partial index to forbid a second active job per contest (or `ON CONFLICT`
guard); claim recipients atomically (`UPDATE … SET status='SENDING' … WHERE status='QUEUED' RETURNING`
or `FOR UPDATE SKIP LOCKED`). DASH: disable the Send button while a job is QUEUED/RUNNING.

### P1-2 — Email retry inflates progress counters — ✅ FIXED (see EMAIL CLUSTER above)
**Where:** GO `student_provisioning.go:459-475` (Retry resets recipients to QUEUED, sets job RUNNING)
but never resets `sent_count`/`failed_count`; the worker then **adds** to the old totals at `:599-603`.

**Why it breaks:** after a retry, `failed_count` keeps counting old failures and `sent_count` can
exceed `total_count`; the dashboard progress (sent/failed of total) becomes wrong and can never reach
a clean "all sent" state. Operator can't trust the delivery report.

**Proposed fix (GO):** on retry, recompute counters from `email_dispatch_recipients` (or zero them and
recount) instead of incrementally adding; or compute counts in `GetEmailDispatchJob` from the recipients
table rather than storing running totals.

### P1-3 — Markov questions are graded by exact state-ID match (wrong verdicts)
**Where:**
- GO grader `internal/handler/public/sessions.go:531-590` (`checkMarkovAnswer`): requires
  `len(states)` equal, each answer state found in student by **exact `ID` + isInitial + isAccepting**,
  and transitions matched by exact `from→to` ID pair.
- STU editor `apps/web/src/components/MarkovEditor.tsx:129` assigns IDs as `` `q${nextIdx.current++}` ``
  — i.e. **by click/creation order**, and the student cannot rename them.

**Why it breaks:** the answer key's labels (`q0,q1,…`) are author-assigned and **hidden** from the
student. A student who builds a structurally identical, correct chain but adds states in a different
order gets `q0/q1` mapped to different nodes → **marked wrong.** Two students with the same correct
automaton can get different verdicts purely from click order. This is a correctness bug, not cosmetic.

**Proposed fix (GO):** grade up to relabeling — compare as labeled graphs by structure: same number of
states, a bijection matching initial/accepting roles and preserving the transition multiset with equal
probabilities (`parseProb` already normalizes `"1/3"`). For small chains a backtracking isomorphism
check is fine. *(Confirm intended semantics first — if problems are authored to require specific named
states, the statement/editor must surface those labels to the student instead.)*

### P1-4 — Model solution in **C** is offered in the UI but rejected by the backend
**Where:**
- DASH `src/components/CPProblemStudio.tsx:2211` offers `<option value="c">C</option>`, and `:994`
  sends `model_lang: … testingLang === "c" ? "c" : "cpp17"`.
- GO `internal/handler/org/cp.go:85-86` rejects anything not in
  `{cpp17, cpp20, python3, java17, pypy3}` → `INVALID_MODEL_LANG`.
- Yet GO `internal/worker/runner.go:1201` **does** compile/run `c`/`c11`/`c99`. So the judge supports
  C; only the cp-config validation blocks it.

**Why it breaks:** an author selects C for the model solution (a presented option), saves/prejudges,
and gets a hard validation error — a dead feature and a confusing failure.

**Proposed fix (GO):** add `"c"` to the allowlist in `cp.go:85` (the runner already handles it).
*(Cheapest correct fix; alternative is removing C from the DASH selector, but the judge supports it so
allow it.)*

---

## P2 — guardrails & integrity

### P2-1 — Dashboard offers **Go** and **Rust** the judge cannot run
**Where:** DASH `src/app/(org)/org/contests/new/page.tsx:153`
(`["C++17","Python3","Java17","Go","Rust"]`). GO `internal/worker/runner.go` language switch has no
Go/Rust case. STU already self-defends: `client.tsx:73` `WORKER_SUPPORTED_LANGUAGES` excludes them.
**Impact:** organizer enables Go/Rust, the allowed-languages chips advertise them, but students never
see them (filtered) → confusion / "where did my language go". **Fix (DASH):** drop Go/Rust from the
selector (or label "coming soon" and disable), keeping it in sync with `WORKER_SUPPORTED_LANGUAGES`.

### P2-2 — No server-side validation of submission language / problem ownership / size
**Where:** GO `internal/handler/public/sessions.go:214-275` (`CreateSubmissionAttempt`) only checks
non-empty `problem_id`/`language` and session status; it does **not** verify the language is in the
contest's `allowed_languages`, that `problem_id` belongs to the contest, or bound `source_code` size.
**Impact:** a crafted client bypasses language restrictions, submits to foreign problems, or posts huge
blobs (DB bloat + judge load = cost). **Fix (GO):** validate `language ∈ allowed_languages` (map
display↔wire ids consistently — STU `client.tsx:60-77` is the canonical map), check problem belongs to
contest, cap source size (e.g. 256 KB), and add a per-session submission rate limit.

### P2-3 — Contest `status` / `scoring_type` / `timezone` not validated on the server
**Where:** GO `internal/handler/org/contests.go:128-145`: `status` and `scoring_type` are merely
upper-cased (any string accepted); `timezone` defaults to `"UTC"` but isn't validated as an IANA zone;
`plugin_type` *is* validated (good).
**Impact:** a typo'd status (e.g. `"ACTIV"`) is stored; the autoscaler's window query
(`judge_autoscaler.go:203` `status IN ('SCHEDULED','ACTIVE')`) silently ignores it → no prewarm, no
auto-end. **Fix (GO):** validate against enums (`DRAFT|SCHEDULED|ACTIVE|ENDED`,
`ICPC|IOI|…`) and `time.LoadLocation(timezone)`.

### P2-4 — Email body can ship a blank `{{contestcode}}`
**Where:** GO `student_provisioning.go:499-501` best-effort-fetches an active session code; if none is
active `contestCode=""` and `:547` substitutes empty. No guard before dispatch.
**Impact:** students receive a login email with a blank contest code → cannot join. **Fix (GO):** if the
template contains `{{contestcode}}` and no active session code exists, fail the job with a clear error
(DASH already surfaces job errors), or block Send until a code is active.

### P2-5 — Follow-up answers: feedback oracle + duplicate accumulation
**Where:** GO `sessions.go:386-460` (`SubmitFollowUpAnswer`) returns `{correct, points}` on every call
with no attempt cap/rate limit, and appends each submission to a JSON array (`:440-448`) without
de-duping per part.
**Impact:** a contestant can brute-force short-answer parts (immediate correct/incorrect oracle,
case-insensitive + trimmed at `:423`), and the stored answer history grows unbounded with repeats.
**Fix (GO):** cap attempts per part (or remove the correctness signal until contest end), and store one
latest entry per `part_index`.

### P2-6 — Generated student passwords stored in plaintext
**Where:** GO `student_provisioning.go:201` inserts `generated_password` plaintext into
`contest_students`; the GET job endpoint doesn't return it (good), but it's at rest in the DB and read
back at `:315` for emailing.
**Impact:** DB compromise exposes all contest credentials. Acceptable only if these are disposable
per-contest creds. **Fix:** if reuse/PII matters, store a hash and email the password once at generation
time (don't persist it); otherwise document the accepted risk.

---

## P3 — hygiene / polish

- **P3-1 — New-contest page has no schedule picker.** DASH `contests/new/page.tsx:30-41` hardcodes
  `start_at = now`, `end_at = now+1h`; the organizer must remember to set real times in settings before
  flipping to SCHEDULED/ACTIVE. Add start/end inputs (with the contest timezone) on creation.
- **P3-2 — Editor shows times in the *browser* timezone, not the contest's.** DASH `contests/[id]/page.tsx`
  `toDateTimeLocalValue` uses local `Date` getters; data is stored UTC so it's display-only, but an admin
  in another tz sees shifted times. Render against `contest.timezone`.
- **P3-3 — Judge-capacity polling hits GCP compute APIs every ~2.5 s per viewer** (DASH
  `contests/[id]/page.tsx:373-376` → `GetJudgeCapacity` → `Get` + `ListManagedInstances`). Many open tabs
  = GCP API quota pressure. Back off when the fleet is stable/stopped or the tab is hidden.
- **P3-4 — Three divergent markdown/statement renderers** (carried from the prior UI audit, item C3):
  DASH `renderMarkdownPreview` + `CPProblemStudio.renderStatementHtml` vs STU `marked`+DOMPurify+math.
  Math/lists/code/inline-`<code>` widgets render differently in authoring vs contest. Extract one shared
  renderer (or render the DASH preview through the same `marked`+DOMPurify config as STU). Related: inline
  `<code>` interactive widgets in statements are stripped by DOMPurify on the student side (C2) — decide
  whether to support sandboxed widgets or drop the feature.
- **P3-5 — `MarkovEditor.tsx` is a drifted copy** in DASH and STU (canvas size/helpers differ; only
  `normalizeChain` still matches). Move to a shared package or add a contract test on the JSON shape so
  P1-3's fix can't silently desync again.

---

## Verified CORRECT (checked, no change needed)
- **Follow-up answer leakage (prior suspicion C1) is NOT present.** GO `contests.go:222-253`
  (`stripFollowUpExpectedAnswers`) removes `expected_answer` before serving students, and grading is
  server-side only (`sessions.go:386-460`). `markov_answer_json` is never selected by the public
  questions query (`contests.go:198-204`), so the answer key isn't shipped either.
- **Student language mapping is correct and defensive.** STU `client.tsx:60-77` maps display labels →
  wire ids (`C++20→cpp20`, `PyPy3→pypy3`, …) and filters Go/Rust; the GO runner switch
  (`runner.go:1171-1277`) accepts all of those wire ids.
- **Invite + provisioning upserts are idempotent.** `contests.go:624-626` and
  `student_provisioning.go:201-215` use `ON CONFLICT (contest_id,email) DO NOTHING`.
- **Contest auto-status + AUTO-mode scale-down work.** `judge_autoscaler.go:174-211` transitions
  SCHEDULED→ACTIVE→ENDED and, *in AUTO mode*, floors to 0 outside the window. The danger is solely the
  sticky manual override (P0-1).
- **The autoscaler is actually wired up.** `cmd/api/main.go:76` starts it.
- **Verdict enum is internally consistent** across GO bridge/worker (`AC/WA/TLE/MLE/RE/CE`, status
  `QUEUED/RUNNING/DONE/FAILED`): `bridge/result_writer.go`, `bridge/protocol/packets.go:56-66`. Student
  list endpoint returns the same fields (`sessions.go:291-319`). *(Not re-verified line-by-line against
  STU verdict-display strings — recommend a quick pass when fixing P2-2.)*
- **Timezone storage is consistent**: DASH sends `toISOString()` (UTC) + IANA tz string; GO stores both;
  no double-conversion at write time.

---

## Proposed fix order (smallest-blast-radius first within each priority)
1. **P0-1** judge manual-mode auto-revert + per-org scope (GO) — prevents both outage and runaway spend.
2. **P0-2 / P1-1 / P1-2** email durability + idempotency + counter fix (GO) — credential delivery is
   contest-critical; do these together since they touch the same file.
3. **P1-4** allow `"c"` model lang (GO, one line) + **P2-1** remove Go/Rust from DASH selector.
4. **P1-3** markov isomorphism grading (GO) — confirm semantics first.
5. **P2-2** submission validation/limits (GO) + **P2-3** contest enum validation (GO).
6. **P2-4 / P2-5 / P2-6** email-code guard, follow-up attempt cap, password-at-rest (GO).
7. **P3** schedule picker, tz display, polling backoff, shared renderer, shared MarkovEditor (DASH/shared).

> Note: most fixes land in **GO** (the authoritative backend). The earlier round was DASH-UI-only;
> this round will need backend edits. Flagging so the GO changes get the review/deploy they require.
