# Admin audit: scheduling a 500-seat contest

11 October 2026. Walked the whole organisation console as an admin, created a
500-person contest on the three test problems, imported the roster, issued
credentials, published it and watched the fleet size itself. Every claim below
was reproduced in a browser or against the API; nothing is inferred from
reading the code alone. Screenshots of every step are in
`~/admin-audit-oct11/`.

**Where this ran.** Against a private database and a local `ams-api`, not
production. `ayush@amsaccess.dev` does not exist in the Cognito pool
(`UserNotFoundException`), there is no recorded password for `ayush@ams`, and
granting admin to a new account needs a write to the production database.
So the audit ran on the same portal and API code with a seeded org, an admin,
an intern and three `is_test` problems. The contest described here exists
locally; see **Putting it on production** at the end.

The contest: `Scale Rehearsal 500`, three test problems A/B/C at 100 points,
30-minute scoreboard freeze, 500 on the roster, published. Fleet plan answered
`floor: 2, ceiling: 4` for it, which is the multi-VM case working.

---

## What works

Worth saying first, because most of it does.

- The judging panel answers the real question once the contest is live:
  **"500 on the roster → 2 judges · 0 of 2 running"**, with the 90-second
  launch time stated. That is the right sentence in the right place.
- The 500-row directory import ran in 12 s and reported `500 added, 0 updated`.
  Adding all 500 to the contest and issuing their credentials took 3 s.
- `effective_status`, the draft gate, the invite code, reschedule with a
  "Start now (3h)" shortcut, the per-contest invigilation and submissions tabs
  all behave.
- Four judge autoscaling groups exist and have all launched successfully
  (`ap-south-1` and `us-east-1` max 4, `ap-southeast-1` and `eu-west-1` max 2).
  The September EC2 block is cleared.

---

## Blockers for a 500-seat round

### 1. Credential email dead-ends at "Send to 0"

After adding 500 people, **Credentials by email** reads:

```
1. Issue   Everyone on the roster has a credential.
2. Send    0 ready - credential, no passphrase yet, has an email
           500 already hold a passphrase (slip or earlier email)
           [ ] Also send to the 500 who already hold one. Rotates their
               passphrase - the slip or earlier email stops working.
           [ Send to 0 ]
```

Nobody has been sent anything. `participants/from-directory` issues the
passphrase at add time, so every person is instantly a "holder", and the only
path to mailing 500 candidates is the rotate checkbox behind a confirm dialog
warning that their slips will stop working.

The state being tracked is "has a passphrase". The state that matters is "has
been *given* one". `mail_status` is already on every roster row; the Send step
should count people whose credential has never been delivered.

`src/components/org/ParticipantsPanel.tsx:716-800`

### 2. 500 seats earns 2 judges, against a design that says 10

`ams-api/src/ams_api/services/fleet.py:232`

```python
PARTICIPANTS_PER_INSTANCE = 250
```

The comment immediately above it argues at length for **50** - "at 200 a
1,000-seat contest opens on 5 instances ... if a good fraction of the hall
submits in the first minute the queue is deep before backlog scaling has even
noticed", and "contests smaller than ~200 seats are unaffected", which is only
true at 50.

`git log -L` on that line: set to 50 on 2026-09-30 in `f1bc6e9`
("warm enough judges for a full hall"), then changed to 250 on 2026-10-03 in
`aaa3acb` - *"feat(participants): email is the identity key, not an
afterthought"* - an unrelated commit, with the rationale left untouched.

Effect on this contest: 500 → 2 judges → **6.4 judged jobs/s** at the opening
pistol, where the written design wants 10 (clamped to the ceiling of 4, i.e.
12.8 jobs/s). Backlog scaling will catch up, but an instance is ~90 s from
launch and the controller ticks once a minute, so the first wave waits.

Either restore the constant or rewrite the comment, but the two must not
disagree about a number this load-bearing.

### 3. The intern role leaks real contests through the fleet endpoint

Same intern, same session:

```
GET /api/org/contests  →  []
GET /api/org/fleet     →  upcoming: [{ "contest_uid": "e74c34c3-...",
                             "title": "Scale Rehearsal 500",
                             "starts_at": "2026-10-11T22:16:00+05:30",
                             "participants": 500, "instances": 2 }]
```

The contest list correctly hides a non-practice contest from an intern. The
fleet view hands the same intern its uid, title, exact schedule and roster
size. `/fleet` gates on `require_org_staff`, which includes `intern`, and
`upcoming[]` is not filtered.

The same page also renders **Start judges now** to that intern; pressing it
returns 403 and the console prints the API's internal string **`insufficient
role`** as the error.

---

## What is missing from the admin's hands

### 4. Nothing asks how many people are coming

The create form is five fields: title, starts, ends, freeze minutes, practice
checkbox. There is no expected headcount, so at the moment the admin is
deciding anything, nothing on screen can say what this round will need.

Capacity only becomes visible once the contest is **published** *and* inside
the warm window (`starts_at - verification_window_minutes`, within a 2-hour
horizon). Until then the strip reads:

> No judges held for this contest - judges start on their own about half an
> hour before the contest opens.

`src/components/org/ContestScale.tsx:44-50`

For a 500-seat round, T-30 is far too late to learn you wanted more judges.

### 5. A draft contest silently gets zero judges, and is told the opposite

Reproduced: 500 on the roster, start moved to 20 minutes out, status `draft`.

```
/fleet/plan → floor 0,  "0 contest(s) want 0"
```

After pressing Publish, same contest, same roster:

```
/fleet/plan → floor 2,  "1 contest(s) want 2"
```

Through all of that the judging strip kept saying judges "start on their own
about half an hour before the contest opens". For a draft they never will.
`demand()` filters on `effective_status`, and a draft is neither `running` nor
`scheduled`.

### 6. There is no per-contest capacity control

The only lever is platform-wide **Start judges now**, which posts:

```ts
post("/api/org/fleet?action=warm", { instances: 8, minutes: 240 })
```

`src/components/org/FleetPanel.tsx:307`

`CEILING_INSTANCES` is 4, so `set_override` clamps that 8 to 4 - the button
asks for twice what the same panel displays as **"Most we can run: 4"** (a
leftover from when a judge was a 2 vCPU box). There is no instance picker, no
duration picker, no cost anywhere, and no confirmation on a control that holds
up to four instances for four hours.

**Switch judging off** - platform-wide, four hours, affects every contest - is
a small red text button with no confirmation dialog at all.

### 7. The console is role-blind except for one line

```ts
const nav = role === "intern" ? NAV.filter(...) : NAV;
```

`src/components/org/OrgShell.tsx:49` is the only place in the entire org
console that reads the signed-in role. Every spending and destructive control -
Start judges, Switch judging off, Run load test, Delete contest - renders for
every staff role and fails only when pressed, with the raw server wording.

### 8. `verification_window_minutes` cannot be set

It is both the pre-contest arrival window and the fleet's warm lead time
(`fleet.py:258 warm_window`). It is returned in `ContestOut` and read by the
dashboard, but it is in neither `ContestCreate` nor `ContestReschedule`. For
500 candidates running device checks, 30 minutes is a default the admin has no
way to change.

### 9. No timezone, anywhere

Both datetime fields are browser wall-clock with no label, no offset, and no
duration readout. The only mention of a timezone in the whole console is a
footnote on the dashboard schedule card: "Dates and times are in your local
time zone." A contest typed on a laptop set to the wrong zone is silently
hours out, and AMS Ascent is scheduled in IST by people who may not be.

### 10. The import help text omits the one column that matters

The directory import panel says:

> Only `display_name` is required. Also accepted: college, branch,
> graduation_year, linkedin_url, github_url, resume_url, contact_email, phone,
> location, external_ref.

`email` is not in that list. It is accepted, and `students.py:295-312` is
explicit that without it a student gets an `@participants.invalid` address the
mail layer refuses to send to. Follow the UI and you get 500 unmailable people
and find out at credential time.

### 11. The directory does not refresh after an import

"**500** added, **0** updated" renders directly above "0 students - No students
yet". Screenshot: `~/admin-audit-oct11/53-import-done.png`.

### 12. 500 roster rows, no pagination, no search

The contest participants tab renders all 500 rows at once: **19,478 px** of
page, ~4 s to paint, and no search, filter or pagination control exists on that
tab at all. `/api/org/students` likewise returns the whole directory as one
array (500 objects here). The Ascent roster is already 1,009.

### 13. Roster size appears in no list view

The dashboard contests table shows status, start, problems and invite code.
The contest cards show problems and invite code. Neither shows how many people
are registered - the number that decides the judge count.

### 14. Bulk work has no progress

The 500-row import is a single request with a spinner: no row counter, no
"keep this tab open", no partial result. Server-side the error list is
truncated to the first 50 with no indication more were dropped.

### 15. "All clear" can sit on top of an unreadable queue

The dashboard header read **"All clear. Nothing needs you right now."** while
the judging card read **"The submission queue could not be read."** That is
deliberate (`dashboard/derive.ts:136-138`, "say so quietly; never guess a
count") and it is right on a quiet Tuesday. Fifteen minutes before a 500-seat
round it is the one unknown that should not be quiet.

### 16. The problem picker is a bare `<select>`

One native dropdown listing every problem version, one problem at a time:

```
Choose...
Test A: Sum of Two - v1
Test B: Reverse a String - v1
Test C: Count Primes - v1
```

No search, no filter, no statement preview, no multi-select, and - relevant to
the intern scoping - no sign of which problems are **test** problems, although
`Problem.is_test` exists. Per-contest time and memory overrides are supported
by the API (`custom_time_limit_ms`, `custom_memory_limit_mb`) and exposed
nowhere.

### 17. Form plumbing

No `id`, `name` or `autocomplete` on the contest form fields or the org login
fields, and no label is associated with its control. Clicking a label does not
focus the field and password managers cannot fill the sign-in form.

### 18. The avatar overlaps the footer

The account button in the sidebar sits on top of "Judged by cxxprobe" on every
page of the console.

---

## Capacity, for the record

| | |
|---|---|
| Roster | 500 |
| `instances_for(500)` | 2 |
| Throughput at 2 judges | ~6.4 judged jobs/s |
| Ceiling | 4 instances, ~12.8 jobs/s |
| Warm lead time | 30 min before start, from `verification_window_minutes` |
| Backlog trigger | 1 extra instance per 96 waiting jobs |
| Cold start | ~90 s from launch to first job |

Two judges carry 500 people comfortably in steady state. The exposure is the
opening minute, which is exactly what the stale `PARTICIPANTS_PER_INSTANCE`
comment was written about.

Worth knowing: every recorded scaling activity across all four regions has
been 0 to 1 and back, most recently 2026-10-08. **The multi-instance path has
never actually run.** Before Ascent, one load test at 4 instances is cheap
insurance - the Judging panel's "Run load test" does exactly this and is
refused while a real contest needs the judges.

---

## Suggested order of work

1. Fix the credential-send counter (#1). Without it a 500-person contest
   cannot be told its own logins.
2. Decide the sizing constant (#2) and make the code and the comment agree.
3. Filter `upcoming[]` for interns and hide `/org/fleet` from them (#3).
4. Put an expected-headcount field on the create form and show "this will run
   on N judges" from it, before anything is published (#4, #5).
5. Gate the spend and destroy controls on role in the UI, not only in the API
   (#7).
6. Paginate the roster (#12) and add `email` to the import help (#10).

---

## Putting it on production

Everything above was done on a private stack. To create `Scale Rehearsal 500`
on `amsaccess.com` I need one of:

- the password for an existing admin (`ayush@ams` is `CONFIRMED` in the pool), or
- permission to create `ayush@amsaccess.dev` in Cognito and grant it `admin`
  in the production database - the Cognito user does not exist today, and the
  role grant is a database write.

The steps on production are the same ones walked here: create the contest
(not practice, or the fleet will never warm for it), add the three test
problems, import the roster into Participants with an `email` column, add them
to the contest, publish, then confirm the judging strip reads
"500 on the roster → N judges" before the warm window opens.
