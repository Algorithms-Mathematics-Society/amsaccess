# Running a contest

> ## ⚠ Current limit: the judging fleet cannot scale
>
> **As of 2026-09-30 the AWS account is blocked from launching EC2 instances**
> — `This account is currently blocked and not recognized as a valid account`,
> on every region, needing an
> [account-verification support case](https://support.console.aws.amazon.com/support/home#/case/create?issueType=customer-service&serviceCode=account-management&categoryCode=account-verification).
> It began between 18:05 and 18:25 UTC on 2026-09-29.
>
> Everything else works: the API, the portal, the proctoring, and the one
> always-on worker on `ams-app`, which judges at **~1.3 submissions/second**
> (measured, 1,000 jobs, 2026-09-30).
>
> **So until the block is lifted:** a contest up to roughly **50 people** runs
> normally. Anything larger will queue — at 1.3/s, 1,000 submissions take about
> 13 minutes, not the ~60 seconds the capacity table below promises. Every
> number in *How much judging capacity there is* assumes instances can launch.
>
> The Judging page will show AWS's own refusal in red while this lasts. Delete
> this block once `gh` shows launches succeeding again.

Everything here happens at **amsaccess.com/org** as owner or admin. Nothing
needs a terminal, and nothing needs you to touch AWS.

The short version: **you never start the judges.** They warm themselves before
a contest and shut themselves off afterwards. The Judging page exists so you
can see that happening, not so you can drive it.

---

## Before the day

### 1. Problems — `/org/problems`

A problem is two steps: create it, then upload a cxxprobe package built with
`cxxprobe package`.

Upload does a **dry run first** and shows you what it found — testcase count,
checker, symbolic rules — before anything is committed. Read that screen. It is
the only place a package with, say, zero testcases is visible before a
candidate hits Submit and gets a verdict of `AC` on nothing.

A problem with no package **cannot be added to a contest**. The Problems list
says so on the card.

### 2. Contest — `/org/contests` → New contest

| Field | For a 1-hour test |
|---|---|
| Title | whatever you like |
| Starts / Ends | one hour apart |
| Freeze scoreboard | 0 (never freezes) |
| Practice contest | **leave unchecked** |

Leave "Practice" off for anything you want to behave like a real round.
A practice contest is *always* open and is deliberately excluded from judge
pre-warming — useful for letting people explore, wrong for a rehearsal that is
meant to prove contest-day behaviour.

Then open the contest and add your two problems on the **Problems** tab. Each
gets a label (A, B) and a score.

### 3. Participants — the contest's **Participants** tab

Two routes in:

- **Add participants** — type names, get credentials back immediately.
- **Import CSV** from `/org/participants` first, then add them to the contest.
  Columns: `display_name,email,college,external_ref` (a template is
  downloadable on that page).

**Include the email column.** A row without one still imports, but lands on a
synthetic `@participants.invalid` address, and that participant cannot be
mailed their credentials — you would be reading login IDs down a phone.

Issuing credentials shows them **once**. Download the CSV there and then, or
mail them from `/org/mails`. They are not recoverable afterwards; they are
reissuable, which is a different thing and invalidates the old one.

### 4. The client

Candidates need AMS Access installed — `amsaccess.com/download`. It is
unsigned on Windows, so SmartScreen shows "Windows protected your PC" and hides
the Run button behind *More info*. Tell people that in advance, and send the
SHA-256 from the release page **through a different channel than the download
link**.

---

## On the day

### Judges: nothing to do

The autoscaler runs every minute. For each non-practice contest that is running
or starting within its verification window (default 30 min), it sizes a fleet
from the roster — one instance per 50 registered candidates, minimum 4 — and
raises the AWS scaling groups to match. When the contest ends and the queue
goes quiet for three consecutive ticks, it takes them back to zero.

So the timeline takes care of itself:

```
T-30   judges start launching        (verification_window_minutes)
T-28   first ones register and idle
T-0    contest opens, judges warm
...    queue depth scales above the floor if submissions pile up
T+end  quiet for 3 min → back to zero
```

**Check it at T-20, not T-0.** Open `/org/fleet` (Judging). You want:

- a green status line saying judges are up
- a recent successful **probe** — one synthetic submission that really compiled
  and ran. This is the only check that catches a fleet that booted but judges
  nothing, which has happened: instances up, scaling group at target, nothing
  judged.

If it is not green, the one button that matters is **Start judges now**. It
holds a floor for a few hours and expires by itself.

### During

- The contest console's **Submissions** tab is the live feed with verdicts.
- **Invigilation** is the proctoring view — sessions, incidents, help requests.
- **Scoreboard** is on the contest page.

### Ending

A contest ends on its own clock. To stop one early, use **End now** on the
contest card in `/org/contests`. That releases the judges on the next tick.

Afterwards: **Archive** files it away with every result intact. Delete is
refused for any contest that has submissions unless you explicitly override,
because deleting cascades to submissions, results, sessions and incidents and
there is no undo.

---

## How much judging capacity there is

A hard wall, not a budget. The AWS account is on the Free Tier plan, which
allows only free-tier-eligible instance types (2 vCPU each) and caps vCPU per
region — so the fleet is spread across 17 regions and tops out at:

**40 instances = 80 vCPU ≈ 32 judged submissions/second.**

Measured, not estimated: 1,000 real submissions judged in 105 s on 24 vCPU
(2026-09-20).

What that means in practice:

| Roster | Warm judges | Throughput | 1,000 submissions at once |
|---|---|---|---|
| ≤200 | 4 | 3.2/s | 5 min |
| 500 | 10 | 8/s | 2 min |
| 1,000 | 20 | 16/s | ~1 min |
| 2,000+ | 40 (ceiling) | 32/s | ~30 s |

The pre-warm ratio is what makes the burst survivable. Backlog scaling cannot
rescue an opening rush on its own: the controller ticks once a minute and an
instance is ~90 s from launch to its first job, so extra capacity arrives
roughly **150 s after** the queue builds. Whatever a full hall throws at T+0
has to land on judges that are already warm.

### Proving it before you trust it

`/org/fleet` → Details → **Load test**. Put 1,000 in the box and run it. It
enqueues 1,000 synthetic submissions through the real path — same queue, same
workers, same cxxprobe — and reports throughput with p50/p90/p99.

It is **refused while a contest is running or about to start**, deliberately: a
load test shares the queue and the workers with live judging, so running one
then is a self-inflicted outage. Do it the day before.

Costs about $0.10.

---

## Things that will bite you

| Symptom | Cause |
|---|---|
| "This problem cannot be added to a contest" | no package uploaded |
| Credentials issued but nobody got an email | roster rows had no `email` column |
| Judging page green, submissions stay queued | check the probe, not the instance count |
| Load test refused | a contest is live or starts within 30 min |
| Judging page red, "account is currently blocked" | the EC2 block above — only the always-on worker is judging |
| "Windows protected your PC" | the client is unsigned; *More info* → Run |
| Practice contest never pre-warms judges | by design — practice contests are excluded |
