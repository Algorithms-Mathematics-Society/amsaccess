# Organizer console UX audit, 13 November 2026

Scope: every organizer screen under `/org/**`, covering `src/app/(org)/**`, `src/components/org/**`, and the shared `Modal`, `CommandMenu` and `src/lib/client/*` hooks they use. This document only records problems; no code was changed. Constraint for every fix: keep the existing colours, theme tokens and logos. Fixes change structure and behaviour, not paint.

**How this was produced.** Two independent passes:
1. **Source review.** Every org screen was read and each behaviour reproduced from the click handlers. Phrases like "no confirm" mean the handler was checked.
2. **Automated checker and browser run.** The Impeccable design checker was run, and pages were rendered in a browser at 1440×900 and 390×844.

The browser run had no data: there is no `.env.local`, no local `ams-api`, and production was deliberately not used. So only error, empty and loading states were captured live. Behaviour with real data comes from the code.

**Spot-checked again against the code** (13 Nov):
- End now: `ContestsView.tsx:179-187`, calls `act()` directly.
- Delete on the first click: `:213-227`.
- Rejudge "Everything": `ContestConsole.tsx:1305-1312`, calls `run("")` directly.
- Revoke: `ParticipantsPanel.tsx:1546-1557`. The only `window.confirm` in that handler is for review-retry, at :1212.
- No restore API: `api/org/contests/[uid]/participants/[loginId]/route.ts:21` accepts only `revoke|credentials|reemail`.
- Intern feeds off: `ContestConsole.tsx:168-177`.
- Students page size: `StudentsView.tsx:30`, `PAGE = 200`.

## Summary

**Nielsen heuristics: 16 / 40.** Engineering quality is high: delivery uncertainty, idempotent retries and the announcement flow are all handled well. The console fails as an **operations tool**:
- **No live view.** A running contest shows no time left, sitting count, queues or judge health.
- **Unguarded destructive actions.** End now, Delete, Rejudge everything, Revoke (with no restore), Send credentials to N, Queue send and Start now (3h) are all single clicks.
- **No bulk handling.** "Email selected" is the only bulk action; Students stop at 200; no table can be sorted or has a header that stays visible while scrolling.
- **Scattered person context.** One candidate's state is spread over roster, invigilation, drawer, profile (read-only), support (a separate system) and mails.
- **Two inboxes.** Invigilation "Help requests" and Support "issues" are separate and unlinked.
- **False empties for interns.** Interns see Invigilation empty states while candidates are waiting.

**Second pass added about 130 more findings (Part 2, §9–§13), bringing P0 to 14 in total. See §13 for totals and how they change the plan.** Proposed screens for review: https://claude.ai/artifact/QXa3hTtVXGcn1YGUxCB8Rq (private until shared).

Counts by severity (first review): P0 = 10 findings across 4 themes, P1 ≈ 35, P2 ≈ 40, P3 ≈ 10.

### P0 register (fix before the next large contest)
| ID | What | Where |
|---|---|---|
| C1 | End now: one click, no confirm, on the list card next to Archive | ContestsView.tsx:179-187 |
| C2 | Delete deletes on the first click when the server allows it | ContestsView.tsx:213-227, 115-131 |
| S1 | Rejudge "Everything": no confirm, no count, no scope | ContestConsole.tsx:1305-1312 |
| P1 | Revoke: one click, no confirm, and no Restore in the UI **or API** | ParticipantsPanel.tsx:1546-1557; participants/[loginId]/route.ts:21 |
| P4 | "Send to N" credential email from a popover with no confirm; names of people with no email appear only in tooltips | ParticipantsPanel.tsx:1814-1942 |
| M1 | Mails "Queue send": no confirm, no resolved recipient count, no preview, no test send | MailConsole.tsx:417-439 |
| CC4 | Reschedule a running contest with no confirm; "Start now (3h)" rewrites start and end | ContestConsole.tsx:623-773, 748-761 |
| CC1 | No live status on a running contest (time left, sitting, judging queue, waiting to resume, help, judges) | ContestConsole.tsx:441-449 |
| I1 | Interns (and unknown role) get disabled feeds, so the panel says "Nobody has asked for help" or "Nobody has started" while people are waiting | ContestConsole.tsx:168-177 → InvigilationPanel.tsx:262-265, 421, 580, 741 |
| P2 | Bulk selection exists only for emailing (no select-all, ineligible rows disabled); no bulk revoke, restore, remove, resend, print or move | ParticipantsPanel.tsx:1114, 1396-1406, 1423, 1466-1467 |

---

## 1. Organizer job inventory

### 1.1 Shell and navigation (`src/components/org/OrgShell.tsx`)
| Job | Path | Ref |
|---|---|---|
| Move between sections | Sidebar: Dashboard / Problems / Contests / Students / Support / Mails | OrgShell.tsx:11-18 |
| Intern view | Problems, Students, Mails, Support and Fleet are hidden (cosmetic only) | :26-35, :47 |
| Skip to content | Keyboard skip link | :129-134 |
| Sign out, see who I am or my role, switch org, manage staff | **Not possible.** There is no sign-out, no identity and no role badge anywhere in the shell. A grep for logout or sign-out across `src/components/org` and `src/app/(org)` finds nothing. | :136-162 |
| Command palette | **None in org.** `src/components/CommandMenu.tsx:7-11` only lists marketing routes (Download, Contact, Changelog) and is never mounted in org. | — |
| Reach Judging (fleet) | Not in the nav (:31-34 comment). Only reachable through dashboard links or the contest's Judging tab. | — |

### 1.2 Dashboard (`DashboardView.tsx`, `dashboard/*`)
| Job | Path | Ref |
|---|---|---|
| See what needs attention (live contests, unpublished drafts, contests with no problems, problems with no package, judging state) | Needs attention list, each item with an action link | DashboardView.tsx:284-410; derive.ts:288-398 |
| Glance counts (running, starting in 24h, drafts, problems ready) | At a glance tiles | :420-488 |
| Browse contests with a filter | ContestsCard segmented control | dashboard/ContestsCard.tsx:135-144, 255-268 |
| Judging status and schedule calendar | Right rail | RailCards.tsx:56-116; ScheduleCard.tsx:109-170 |
| See the open support count, then go to the inbox | SupportAttention ("N+ open issues"), "Open support inbox" | SupportInbox.tsx:31-90 |
| Refresh | "Refresh" button. **Nothing polls.** The page states "never writes or polls". | :110-115, 174-181 |
| New contest | Button only routes to `/org/contests`. It does not open the create form. | :182-186 |
| First-run checklist | GettingStarted. Steps 3 and 4 are hard-coded `done:false` and have no link. | :513-538 |

### 1.3 Problems (`ProblemsTabs.tsx`, `ProblemsView.tsx`, `authoring/*`)
| Job | Path | Ref |
|---|---|---|
| Create a problem (title only) | Catalogue → New problem → Title → Create | ProblemsView.tsx:47-55, 89-142 |
| Upload a package, with a dry-run preview, then commit a version | Card → Upload package → review → Create version | ProblemsView.tsx:249-405 |
| Preview as a candidate | Click title or eye icon → ProblemPreviewModal | :165-176, 221-229 |
| Tag topics | TopicPicker on the card | :181-185; TopicPicker.tsx |
| Delete a problem or a version | Trash → inline arm-confirm | :190-194, 230-235, 410-490 |
| Author in the portal (drafts → 7-step editor → verify and publish) | Problemsetting tab → New draft → editor steps | ProblemSetting.tsx; ProblemEditor.tsx:26-32 |
| Discard a draft | Trash icon. **Deletes immediately; no confirm and no error handling.** | ProblemSetting.tsx:65-71, 155-162 |
| Search, filter by tag, see where a problem is used | **Missing** | — |

### 1.4 Contests list (`ContestsView.tsx`)
| Job | Path | Ref |
|---|---|---|
| Create a contest (title, start/end, freeze, judges, expected, practice) | New contest → inline form → Create. Stays on the list and does **not** open the new contest. | :51-58, 62-69, 265-461 |
| Open a contest | Title link on its card | :143-148 |
| End a live contest now | Card → "End now". **No confirm.** | :179-187 |
| Archive / restore | Card → Archive / Restore (no confirm) | :189-211 |
| Delete | Card → Delete. The first click deletes outright if the server allows it. A second "Delete anyway" (purge) appears only after the server refuses. | :213-227, 115-131 |
| Show archived | Toggle | :41-50 |
| Search, sort, filter by status, duplicate a contest | **Missing**, although the dashboard card has filters | — |

### 1.5 Contest console (`ContestConsole.tsx`, the main live-contest screen)

**Header (:405-485)**
- Back to Contests.
- Status pill, plus "practice" and "scoreboard frozen" badges.
- Schedule line: start → end, then the time relative to the start.
- **Reschedule**, opening an inline form: Starts / Ends / Judges / Expected, then Save, "Start now (3h)" or Cancel (:623-773).
- **Publish**, shown only for drafts. No confirm and no preflight (:789-836).
- **Issue announcement**, shown when not a draft. It opens a 2-step modal with a candidate preview, the sitting count and read receipts (:462-471; IssueAnnouncementModal.tsx).
- **Invite code**, with copy (:838-875).
- Draft warning banner (:476-484).

**Tabs (:69-78, 496-517).** There are 8: problems, team-round, participants, leaderboard, analytics, submissions, invigilation, judging. The selected tab is stored in the URL hash. The default is **Problems** (:88, 166).

| Tab | What an organizer can do | Ref |
|---|---|---|
| **Problems** | Add a problem version (version, label, score); remove one (inline arm-confirm). Score, label and order **cannot be edited**. | :877-1110, 1321-1389 |
| **Team round** | Inspect or import a `.cxxpkg`, or paste a **raw project UID**. Set size, discussion and 3 datetimes. Draw teams from a **raw source-contest UID**, with **raw user UIDs** as extras. Review, publish teams, lock allocation. Every step uses `window.confirm`. | TeamRoundPanel.tsx:95-155 |
| **Participants** | See stats (active, signed in, awaiting passphrase, revoked). Issue credentials, then send credential email to N (popover). Export roster CSV. Add test candidates (practice only). Add from another contest's roster. Add from Access (picker modal). Add participants from a CSV of emails (resolve preview). The one-time credential screen offers Download CSV, Print slips or Copy all, and Done stays disabled until one of them is used. Roster views: 7 chips. Search, OS and college filters, `/` to focus search, Esc to clear. "Select eligible shown", then "Email selected" (`window.confirm`). Per row: Send / Resend / Review-retry email; **Show Credentials** (modal, copy message); **Revoke (no confirm)**; click the name to open a profile modal. | ParticipantsPanel.tsx:243-280, 430-644, 676-885, 907-1040, 1046-1089, 1372-1437, 1446-1562, 1606-1727, 1738-1944 |
| **Leaderboard** | Search plus OS and college filters, Refresh, Export standings. Click a name to open the profile modal. Auto-polls every 20s when live. | LeaderboardPanel.tsx:182-213, 63, 105 |
| **Analytics** | Read-only funnel, colleges, per-problem table, verdicts, with manual refresh | AnalyticsPanel.tsx:57-290 |
| **Submissions** | Verdict count chips, a table of the 200 most recent (time, who, problem, verdict, tests, time, memory). Rejudge → "Failed only (SE)" or "Everything" (**no confirm**). Standings CSV, Submissions CSV. Rows are **not clickable**: no filter, no source view, no single rejudge. | :533-557, 1112-1319 |
| **Invigilation** | Waiting to resume: "Let them back in" / "Refuse" (no confirm). Help requests: "Mark resolved" only. Live sessions: photo thumbnail → entry/exit compare dialog; name → profile modal; flag **count** only. Entry-gate reports: "Waive…" (check + reason, fixed 2h). Waivers: Revoke (no confirm). Polls every 10s. | InvigilationPanel.tsx:313-404, 408-478, 483-671, 682-803, 806-904, 911-986 |
| **Judging** | Contest judge-scale strip, plus the shared FleetPanel: Start judges now (confirm), Test judging (probe), Switch judging back on, Details, Switch judging off (confirm), Run load test (**no** confirm, see CP-7) | ContestJudging.tsx; ContestScale.tsx; FleetPanel.tsx:355-410, 445-560 |

**Floating notification drawer** (contest page only; `ContestNotifications.tsx`, `OrgNotificationDrawer.tsx:226-257`):
- Groups: Entries, Help, Flags, History.
- Allow re-entry / Block request / Mark resolved, each **with** an inline confirm (:75-82).
- "Review" on a flag opens the profile modal.
- 8s toasts.

### 1.6 Students directory (`StudentsView.tsx`) and profile
| Job | Path | Ref |
|---|---|---|
| Search; filter by college, branch, graduation year and mailable; sort; clear; export filtered CSV | Top bar | :137-223 |
| Import a students CSV | Import CSV → file input. **Uploads the moment a file is picked; no preview or mapping.** | :147-154, 624-712 |
| Add one student | Add student → inline form | :155-162, 552-622 |
| View, edit or delete a student | Click the card to expand into an always-editable form → "Save profile". Upload or open the resume. Trash → "Confirm" (delete, or disable if they have submissions). History panel. | :319-376, 391-550, 721-842, 844-898 |
| Open the full profile | Click the name → `/org/participants/[handle]` | :339-345 |
| More than 200 students | **Impossible**: "Showing 200 of N" with no next page | :30, 247-248 |
| Profile page or modal | **Read-only.** Identity, stats, current OS, contests list, invigilation timeline (frames plus flags with images and labels), submissions (click to view source), topics, verdicts, activity. | ParticipantProfile.tsx:187-486 |

### 1.7 Support (`SupportInbox.tsx`)
| Job | Path | Ref |
|---|---|---|
| List open or resolved issues, 50 per page with Previous/Next | Toggle buttons and pager | :146-165, 221-234 |
| Open a conversation | "Open conversation with {name}" button on every row | :206-218 |
| Reply (draft survives reload, idempotent retry) and resolve / reopen | Conversation pane | :257-589 |
| Search, filter by contest or category, assign, add an internal note, use a canned reply, link to the student or contest, see a person's other tickets | **Missing** | — |

### 1.8 Mails (`MailConsole.tsx`)
| Job | Path | Ref |
|---|---|---|
| See sends with progress; open a batch; filter its recipients by status; retry failed (single or all) | Sends tab → row → BatchView | :138-257, 445-621 |
| New send (template, optional contest roster, label, pasted recipients) | New send → "Queue send". **No confirm, no recipient count for the roster, no rendered preview.** | :280-443 |
| Templates: list, create defaults, new, edit, preview (saved version only), delete (`window.confirm`) | Templates tab | :625-993 |

### 1.9 Fleet (`/org/fleet`, FleetPanel inset)
- Watch judges, run a probe, start judges now, load test, view diagnostics (FleetPanel.tsx:312-673).

### 1.10 Login and signup
- **Login** (Astryx): email, password with show/hide, error banner, "Need help…" → /contact. There is **no password reset** (login/page.tsx:58-125).
- **Signup** (raw Tailwind): Name / Email / Password → confirmation code (signup/page.tsx:72-147).

### 1.11 Jobs organizers need that are missing or awkward
| Need | Status today |
|---|---|
| Bulk select plus bulk action on the roster (revoke, restore, remove, resend, add to another contest, export selection, print slips) | Only "Email selected". Selection is limited to rows eligible for email (ParticipantsPanel.tsx:1466-1467), and there is no header select-all checkbox (:1423). |
| **Restore a revoked login** | Missing. There is no API action either: the participant route only allows `revoke`, `credentials` and `reemail` (`src/app/api/org/contests/[uid]/participants/[loginId]/route.ts:21`). Yet a tooltip says "Restore this login before emailing" (ParticipantsPanel.tsx:1521). |
| Remove someone from a contest roster | Missing |
| **Extend time for one person or a group** | Missing. The resume copy even says approving "does not give extra time" (InvigilationPanel.tsx:323-325). |
| Reset or unlock a session, force-submit, kick, reopen a submitted session | Missing |
| Message one participant in-app during the contest | Missing. There is only the broadcast announcement, and support chat is a separate, unlinked system. |
| **One 360° view per participant**: roster status, session, flags, photos, help requests, tickets, submissions, mail log | Spread across Participants, Invigilation, the notification drawer, Profile, Support and Mails |
| Flag review workflow (mark reviewed, dismiss, escalate, note, disqualify) | Missing. Invigilation shows counts only; detail exists only in the profile timeline. |
| Support triage (assign, priority, contest and category filter, search, canned replies, internal notes, unread or waiting-on-staff state) | Missing |
| Two issue channels (Invigilation "Help requests" vs Support "issues") unified, or at least cross-linked | Not linked |
| Submissions: filter by person, problem or verdict; view source; rejudge one submission, person or problem | Missing in the console. Source is reachable only through the profile. |
| Contest controls inside the console: end now, extend the whole contest, pause, freeze/unfreeze toggle, unpublish, clone | "End now" exists only on the list card. Freeze is set only at creation. No clone or unpublish. |
| Pre-publish or go-live checklist (problems, roster, credentials sent, judges warm, probe passed) | Only a draft banner, and a separate Judging tab |
| Students beyond 200; multi-select; add selected to a contest | Missing |
| CSV import mapping, preview, dry-run, error-row download (Students) | Missing. Contest import does have a resolve preview. |
| Create unknown emails during a contest import | Missing ("add them on Participants first, then import again", :580-584) |
| Undo, as a toast, for anything | Missing everywhere |
| Audit log of org actions (who revoked, waived, rejudged, ended) | Missing. Waivers carry `granted_by`/`reason` in their data but the UI never shows them (InvigilationPanel.tsx:33-41 vs 858-862). |
| Saved views, filters held in the URL, persisted tab state (Mails, Problems) | Missing |
| Global person search, command palette, cross-contest notifications | Missing |
| Sign out, account, role, staff management | Missing |
| Mail: test-send to self, preview with real data, schedule, cancel a queued batch | Missing |

---

## 2. Per-screen issue list

Severity scale: P0 blocks a contest-day task or risks a wrong destructive action; P1 is major friction; P2 minor; P3 polish.

### 2.0 Cross-cutting
| ID | Where | Problem | Why it matters | Fix | Sev |
|---|---|---|---|---|---|
| X1 | ContestsView.tsx:179-187; ContestConsole.tsx:1305-1312; ParticipantsPanel.tsx:1546-1557; ContestsView.tsx:213-227; MailConsole.tsx:417-426; ParticipantsPanel.tsx:1915-1930; ContestConsole.tsx:748-761; ProblemSetting.tsx:155-162 | One-click, unguarded, high-impact actions: **End now; Rejudge Everything; Revoke; Delete on first click; Queue send; Send credential email to N; Start now (3h); Discard draft** | Under time pressure, one misclick ends a 500-seat contest, re-judges every result, locks a candidate out, or emails a whole roster, and none of these can be undone | One confirmation pattern (a dialog that states the consequence and the count, with typed confirm for End and Rejudge-all). Add undo toasts where reversible, and a Restore for revoke. | **P0** |
| X2 | 11× `window.confirm` (e.g. ParticipantsPanel.tsx:1212, 1290; FleetPanel.tsx:376, 487; TeamRoundPanel.tsx:107-152; MailConsole.tsx:830); inline arm-confirm (ContestConsole.tsx:1330-1388, StudentsView.tsx:844-898, ProblemsView.tsx:410-490); two-step modal (IssueAnnouncementModal); drawer inline confirm (OrgNotificationDrawer.tsx:75-82); none (X1) | 4 different confirmation idioms, plus none | Organizers cannot predict when a click is final | Pick one: a shared `ConfirmDialog` on `Modal` | P1 |
| X3 | `src/components/Modal.tsx:114-205` (unused by org); hand-rolled dialogs: CredentialModal (ParticipantsPanel.tsx:1606-1727), IdentityDialog (InvigilationPanel.tsx:122-220), ParticipantModal.tsx:149-174, AddFromAccess.tsx:126-131, IssueAnnouncementModal.tsx:171-182, ProblemPreviewModal, SubmissionSourceModal, InvigilationTimeline:175 | 8 custom dialogs. None traps focus (no Tab handling anywhere in org). AddFromAccess has no Escape. CredentialModal has no backdrop close. | Keyboard and AT users lose focus behind overlays, and behavior differs dialog to dialog | Route all of them through `Modal` (or an Astryx Dialog). Use a side drawer for the person view. | P1 |
| X4 | Dashboard, Support and Login are Astryx (DashboardView.tsx:118, SupportInbox.tsx:94, login/page.tsx); everything else is raw Tailwind slate | Two component vocabularies (Astryx Button/Banner/Token/StatusDot vs Tailwind pills) | The console reads as two products. Support looks nothing like Invigilation even though both handle participant issues. | Converge on one set of primitives within the existing tokens | P2 |
| X5 | Nav "Students" (OrgShell.tsx:15) vs URL `/org/participants`; back link "Participants" (ParticipantProfile.tsx:521); import copy links to "Participants" (ParticipantsPanel.tsx:519, 582); tab "participants"; "Candidate" (InvigilationPanel.tsx:591, LeaderboardPanel.tsx:261); "test candidates" (:851); "Participant support" | The same person goes by 4 names, and a link labelled "Participants" lands on the page titled "Students" | Recall cost; "go to Participants" in the import help is ambiguous between the contest tab and the directory | Glossary: Student = directory record, Participant = contest roster entry. Apply it everywhere. | P2 |
| X6 | "passphrase" (ParticipantsPanel.tsx:233, 1504), "credential", "Show Credentials" (:1544), "Password" (:1690); "Entry-gate", "Waive", "probe", "fleet", "Judging" (fleet/page.tsx title) | Internal jargon | Interns and first-timers have to decode the vocabulary | One term ("password") with plain names: "Device check", "Test judging" | P2 |
| X7 | orgTypes.ts:134-141 (`formatWhen`); `toLocaleTimeString` (ContestConsole.tsx:1200, InvigilationPanel.tsx:346, 448, LeaderboardPanel.tsx:315); `toLocaleString()` (SupportInbox.tsx:204, 503); forced `"en"` (OrgNotificationDrawer.tsx:24); `2-digit` (IssueAnnouncementModal.tsx:76) | 5+ date/time formats, **no timezone shown anywhere**. `datetime-local` inputs carry no TZ hint (ContestsView.tsx:342-362; ContestConsole.tsx:690-706), while TeamRound says "(your local time)" (TeamRoundPanel.tsx:126). | Scheduling across staff in different zones invites off-by-hours errors. Submission times show no date. | One `<Time>` helper with absolute time + relative + TZ abbreviation in a tooltip; a TZ label on every input | P1 |
| X8 | org-theme-bridge.css:46 (`--org-text-hint` ≈ #8c8c8c on white, about 3.4:1); `text-slate-300` is unmapped (StudentsView.tsx:348 "no college", LeaderboardPanel.tsx:332) | Hint text fails WCAG AA for small text, yet carries meaning: handles, relative times, "@access", solve minute | Unreadable on projectors and laptops in bright halls | Point hint at `--color-text-secondary` (#5b5b5b, which passes) for meaningful text; keep the 70% mix for decoration only | P2 |
| X9 | No `sticky` headers in any org table; no `aria-sort` or column sort (grep). Roster renders 1,300+ rows (ParticipantsPanel.tsx:1332-1352); leaderboard renders every roster row | No sort, no sticky header, no pagination or virtualization on 500+ row tables | Columns become unidentifiable when scrolling; cannot sort by flags, last contact or score | Shared DataTable: sticky header, sortable columns, virtualization, column chooser | P1 |
| X10 | Polling pauses when the tab is hidden (orgPolling.ts:10-27); drawer exists only on the contest page (ContestConsole.tsx:607-611); dashboard never polls (DashboardView.tsx:110-115) | No awareness across tabs or contests | An admin in Support or Mails misses resume requests; locked-out candidates wait | Global, nav-level live badge (help + resume + flags) with title/favicon count, polling while hidden at low frequency, optional sound | P1 |
| X11 | No sign-out or identity (OrgShell.tsx:136-162) | Staff cannot sign out on shared hall machines and cannot confirm which role they are using | Security and confusion on shared invigilation laptops | User menu in the sidebar footer: name, role, sign out | P1 |
| X12 | Hard-coded `px-8` (StudentsView.tsx:136, ContestsView.tsx:33, MailConsole.tsx:109, ProblemsTabs.tsx:21) vs responsive PageHeader (OrgShell.tsx:221) | Content misaligns with the header and is cramped on narrow screens. Problem editor padding doubles (ProblemsTabs:21 + ProblemEditor.tsx:203). | Floor staff often use phones or tablets | Shared page container with the same padding scale | P2 |
| X13 | Tabs: ContestConsole (:496-517) uses plain buttons with no `role=tab`/`aria-selected`; ProblemsTabs (:22-44) has `role=tab` but no tabpanel or arrow keys and a **violet** active fill; Mails (:110-130) uses an underline; Support (:146-165) uses Astryx primary/secondary buttons; the drawer (:244-246) uses black pills | 5 tab idioms | Inconsistent patterns and broken AT semantics | One Tabs component (underline style, ARIA tabs pattern) | P2 |
| X14 | Explanatory prose everywhere: page subtitles (participants/page.tsx:12-13, mails/page.tsx:12, fleet/page.tsx:12); "Green names…" (ParticipantsPanel.tsx:349-351, LeaderboardPanel.tsx:222-225); entry-gate (InvigilationPanel.tsx:687-691) | Paragraphs of rationale above the tools | Lowers density and buries the controls. Organizers learn it once, then pay for it on every visit. | Move it into "?" popovers or a legend; keep one-line subtitles | P2 |

### 2.1 Shell, nav and command palette
| ID | Ref | Problem | Fix | Sev |
|---|---|---|---|---|
| N1 | OrgShell.tsx:11-18, 31-34 | Judging/Fleet is missing from the nav, yet CONTEST-DAY.md tells admins to "Open `/org/fleet`" at T-20 | Add "Judging" to the nav for admins, or a status chip in the shell | P1 |
| N2 | CommandMenu.tsx:7-11 | The palette is marketing-only and not mounted in org | Org palette (⌘K): jump to contest or tab, find person by name/handle/email, actions such as "Issue announcement" | P1 |
| N3 | OrgShell.tsx:136-162 | No "current or live contest" shortcut in the nav | Pin live contests under Contests with a live dot | P2 |

### 2.2 Dashboard
| ID | Ref | Problem | Why | Fix | Sev |
|---|---|---|---|---|---|
| D1 | DashboardView.tsx:110-115 | Never polls; stale on contest day | A state like "All clear" can be wrong for minutes | Poll at 30s; show "Updated hh:mm" | P1 |
| D2 | derive.ts:324-332 | "X is live → Open contest" lands on the **Problems** tab (ContestConsole.tsx:88) | The first click during a live contest goes to the least useful tab | Link live items to `#invigilation` or a new Overview tab | P1 |
| D3 | DashboardView.tsx:182-186 | "New contest" just navigates to the list | Extra click; the action does not do what it says | Route to `/org/contests?new=1` and auto-open the form | P2 |
| D4 | DashboardView.tsx:528-537 | Getting-started steps 3 and 4 never complete and have no action | First-timers stall at "Add participants" | Derive completion; link to the contest's Participants tab | P2 |
| D5 | SupportInbox.tsx:79 | "50+ open issues need resolution" counts one page | Imprecise and alarming | Server count; show the oldest wait time | P3 |
| D6 | DashboardView.tsx:194 vs ContestsCard | No open help or resume counts per live contest | The dashboard cannot answer "who is locked out right now" | Add per-live-contest counts (sitting / waiting / help / flags) | P1 |

### 2.3 Contests list
| ID | Ref | Problem | Fix | Sev |
|---|---|---|---|---|
| C1 | ContestsView.tsx:179-187 | **End now, no confirm**, sitting on a card next to Archive and Delete | Confirm dialog with sitting count and "type END"; also put it in the console header | **P0** |
| C2 | :213-227, 115-131 | **Delete has no confirm on the first click** when the server permits (roster, invite code and problems vanish). The purge confirm appears only after a server refusal. | Always confirm; list what is lost | **P0** |
| C3 | :64-67 | After Create, the user stays on the list and must find the new card | Navigate to `/org/contests/{uid}#problems` | P1 |
| C4 | :87-91 | No search, status filter or sort, though the dashboard card has filters (ContestsCard.tsx:255-268) | Reuse the dashboard filter and add search; group by Live / Upcoming / Draft / Past | P2 |
| C5 | :162-165 | `Users` icon next to "N problems"; no roster count or end time | Correct icon; show participants and the window | P3 |
| C6 | :265-461 | No duplicate or "create from template" (same round as practice then real) | "Duplicate" card action | P2 |

### 2.4 Contest console: header and structure
| ID | Ref | Problem | Why | Fix | Sev |
|---|---|---|---|---|---|
| CC1 | ContestConsole.tsx:441-449 | During a live contest the header shows start → end plus a **relative start** ("2 hours ago"). There is no countdown, time left, sitting count, queue depth, help or resume waiting, or judges state. | No situational awareness on the screen used all day | Sticky live status strip: time left, sitting/roster, pending judging, waiting-to-resume (red), help open, judges OK; each item clickable to its tab | **P0** |
| CC2 | :69-78, 496-517 | 8 equal-weight tabs; no badges except the Submissions count | Help and resume queues are invisible unless you are on Invigilation | Count badges on Invigilation and Participants (attention); demote Analytics and Team round (show Team round only when configured) | P1 |
| CC3 | :88, 166 | Default tab is Problems even when running | — | Default by status: draft → Problems, running → Overview or Invigilation, ended → Leaderboard | P1 |
| CC4 | :448, 623-773 | Reschedule on a **running** contest has no confirm. "Start now (3h)" rewrites both start and end (:748-761) and sits in a header popover. Judges and Expected are saved alongside the time change. | Can silently shorten or reset a live contest | Hide "Start now" unless draft or scheduled; confirm with a before → after diff; separate "Extend contest by N min" | **P0** |
| CC5 | :789-836 | Publish has no confirm and no preflight | Publishing without problems, roster or credentials surfaces only as a server error | Preflight checklist (problems ≥ 1, roster, credentials sent, judges sized, probe passed) then Publish | P1 |
| CC6 | ContestsView.tsx:179 | End, extend, freeze/unfreeze and archive are not in the console | Admins must leave the live screen to end it | Contest "Actions" menu in the header | P1 |
| CC7 | :358-365 | Contest load error has no Retry | — | Add Retry | P2 |
| CC8 | :168-177 | `notificationsEnabled` excludes interns **and** unknown role, while `canSpend` treats unknown as allowed (useOrgRole.ts:279-282) | Inconsistent; a role-fetch blip hides every live alert | Treat unknown consistently; show "Alerts unavailable for your role" explicitly | P1 |
| CC9 | :838-875 | Invite code shown in draft, where joining is refused | Gets shared prematurely | Show it disabled with "Active after publish" | P3 |

### 2.5 Problems tab (in contest)
| ID | Ref | Problem | Fix | Sev |
|---|---|---|---|---|
| CP1 | :919-955 | Score and label cannot be edited, no reorder; a typo means remove and re-add (refused once there are submissions) | Inline edit plus drag order | P2 |
| CP2 | :1360-1367 | Remove is icon-only with a `title` and no `aria-label` | Add `aria-label` | P2 |
| CP3 | :1037-1043, 1062-1086 | `<label>`s are not associated with inputs. Score accepts NaN (`Number("")`). | `htmlFor`/`id`; validate | P2 |
| CP4 | :1040-1051 | Version select lists every problem flattened, with no search, test-problem marker or tags | Combobox with search; mark the latest version | P3 |

### 2.6 Participants tab (roster)
| ID | Ref | Problem | Why | Fix | Sev |
|---|---|---|---|---|---|
| P1 | :1546-1557 | **Revoke: one click, no confirm, no Restore** (no API either). The row then fades to 50% opacity. | Mid-contest misclick locks a candidate out with no way back | Confirm with name; Restore action and API; undo toast | **P0** |
| P2 | :1114, 1396-1406, 1466-1467, 1423 | Selection exists only for **emailing**. Checkboxes are disabled for ineligible rows. No header select-all. "Select eligible shown" is the only bulk select, and "Email selected" the only bulk action. | Bulk revoke, restore, remove, resend, print or move are impossible for 500 people | General selection model: header checkbox, shift-range select, "select all N matching", and a bulk action bar listing the actions that apply with per-action eligibility counts | **P0** for 500 seats |
| P3 | :243-280 | Toolbar holds up to 6 buttons with 4 different "add" mechanisms (CSV, from roster, from Access, test candidates) plus the credentials popover and export, each with a different UI (inline panel, inline select, modal, popover) | High choice load; the primary path is unclear | One "Add participants ▾" menu (CSV / Directory / Another contest / Test candidates), opening the same drawer | P1 |
| P4 | :1814-1942 | "Credentials by email" is an absolutely positioned popover with no Escape, outside-click or focus management. "Send to N" has **no confirm**. Names of no-email people appear only in `title` tooltips (:1886, 1893). | Mass email from a popover; hidden people list | Dedicated step in a dialog: counts, expandable names, explicit confirm | **P0** |
| P5 | :1446-1561 | Row shows no live state (last contact, flags, open help, score, submissions). Name opens a read-only profile. | To handle a person, staff juggle Participants, Invigilation and Support | Row columns for Live state / Flags / Help; click opens a **person drawer** with every action (see §5) | P1 |
| P6 | :1490-1511 vs 1481-1483 | "signed in" pill (any past login) next to the "Entered" label, plus an explanatory paragraph (:349-351) | Two near-synonyms need a legend | Single status ladder: Not issued → Ready → Emailed → Signed in → Entered → Finished, or Revoked | P2 |
| P7 | :1411-1433 | Table `min-w-[1120px]`, no sticky header, no sort, no virtualization; a 1,300-row DOM | Slow, and you lose your place | DataTable (X9) | P1 |
| P8 | :1372-1395 | 7 view chips + search + OS + college + Reset + filter chip row + "Chip counts cover the full roster" text = about 14 controls before the table | Cognitive load | Collapse to Views (segmented, top 4 plus overflow) and one filter bar; persist in the URL | P2 |
| P9 | :430-644 | CSV import: only the first 50 "to add" rows shown with no "…and N more" (:560). Unknown emails send you to another page, then a re-import. No "copy unknowns". | Round-trips during setup | "+N more" and download/copy unknowns; offer "Create N students now" inline (admin) | P1 |
| P10 | :676-800 | "Add from roster" adds immediately from a select, with no confirm or preview | Adds hundreds people with one click | Preview count and overlap, then confirm | P2 |
| P11 | :389-399 | Empty state has no action buttons | First-timers do not see where to start | Primary CTAs in the empty state | P2 |
| P12 | :1606-1727 | Show Credentials reveals the password to any role (interns are not hidden here, :259) | Role clarity and exposure | Hide for intern or log the reveal | P2 |
| P13 | ParticipantsPanel uses `useContestRead("participants")`; only entry status polls (orgSessions.ts:89) | Mail status on rows goes stale unless you act on them | — | Light roster poll during the send window, or a visible refresh | P2 |

### 2.7 Leaderboard
| ID | Ref | Problem | Fix | Sev |
|---|---|---|---|---|
| L1 | LeaderboardPanel.tsx:253-271 | No sorting (penalty, last solve, a single problem); no sticky header or first column | DataTable | P2 |
| L2 | :302-306 | Cells not clickable; cannot drill into a person's attempts on a problem | Cell opens the person's submissions for that problem | P2 |
| L3 | :275-277 | Non-entrants have a blank rank but share the table, at roster length (1,300) | Toggle "Entrants only" (default on) | P2 |
| L4 | :207-213 vs ContestConsole.tsx:543-549 | Standings export duplicated on two tabs with different styles | Single Export menu in the console header | P3 |
| L5 | — | No freeze/unfreeze control; frozen state is only displayed (:191-196) | Toggle in the contest actions menu | P2 |

### 2.8 Submissions
| ID | Ref | Problem | Fix | Sev |
|---|---|---|---|---|
| S1 | ContestConsole.tsx:1305-1312 | "Everything" rejudge: no confirm, no count, no scope (problem, person) | Rejudge dialog: scope (verdict, problem, person, selected) with count preview and confirm | **P0** |
| S2 | :1183-1230 | Rows not clickable (no source), no filter or search by person, problem or verdict | Filter bar plus row → SubmissionSourceModal (it already exists in the profile) plus single rejudge | P1 |
| S3 | :1199-1201 | Time only, without date, timezone or elapsed-into-contest | "+01:23 into contest" with absolute time on hover | P2 |
| S4 | :1175-1181 | Capped at 200 rows; "export the CSV for every row" | Server pagination | P2 |
| S5 | :1163-1172 | Verdict chips are not filters | Make the chips toggle filters | P2 |

### 2.9 Invigilation
| ID | Ref | Problem | Why | Fix | Sev |
|---|---|---|---|---|---|
| I1 | ContestConsole.tsx:168-177 → InvigilationPanel.tsx:223, 262-265 | For **interns** (and on an unknown role) notifications and polling are disabled, so the panel shows false empties: "Nobody has asked for help" (:421), "Nobody has started this contest yet" (:580), "No devices have reported yet" (:741) | The intern invigilator is told the room is empty while it is not | If the role is not allowed, say so; if it is allowed, enable the feeds | **P0** |
| I2 | :365-398 vs OrgNotificationDrawer.tsx:66-82 | Approve/Refuse resume have **no confirm** here but do in the drawer, and the labels differ ("Let them back in / Refuse" vs "Allow re-entry / Block request") | Same action, two behaviors | One component and one label set; confirm Refuse only | P1 |
| I3 | :483-671 | Live sessions table (up to 500 rows): no search, filter (quiet, flagged, waiting, OS), sort or pagination; no per-row actions | Finding "the one row that's wrong" means scrolling | Filter chips (Quiet / Flagged / Waiting / Finished) plus search plus sort by flags or idle; row actions: message, extend, reset, revoke, open person | P1 |
| I4 | :652-663 | Flags shown as a count only; kinds, images and times live only in the profile timeline | Investigation needs 2 hops and a modal | Inline expandable flag list with thumbnails; "Mark reviewed" | P1 |
| I5 | :408-478 | Help requests: only "Mark resolved"; no reply, note, assignee; resolved items stay inline at 60% opacity; no link to the person or profile | Invigilators cannot answer or record what they did | Reply or note plus assignee; collapse resolved; name opens the person drawer | P1 |
| I6 | :682-803 | Entry-gate candidate names not clickable; fingerprint truncated to 20 chars; waiver duration fixed at 120 min (:729, 960); no bulk waive (a misfiring detector hits many people) | — | Link the name; choose a duration; "Waive this check for all affected" with confirm | P2 |
| I7 | :855-899 | Waivers table hides the candidate, reason and granted_by (all present in data :33-41); Revoke waiver has no confirm | No accountability or audit | Show who, why and by whom; confirm revoke | P2 |
| I8 | :122-220 | IdentityDialog: no focus move or trap; Escape only | AT and keyboard | Use `Modal` | P2 |
| I9 | :303-905 | 5 stacked sections, so the page gets long. The help list is not capped. | Live sessions are pushed below the fold | Two-column layout: queues (resume, help) on the left, room on the right; or sub-tabs with counts | P2 |

### 2.10 Notification drawer
| ID | Ref | Problem | Fix | Sev |
|---|---|---|---|---|
| ND1 | OrgNotificationDrawer.tsx:226-256; ContestConsole.tsx:607 | Exists only inside one contest page; history is "this visit" only (:238) | Global and persistent | P1 |
| ND2 | :228-235 | Toast auto-dismisses after 8s, with no sound or title badge; polling stops when hidden | Persistent badge plus document title "(3) …" | P1 |
| ND3 | :62, 59 | A flag item says "N flags" with no kinds | Show the latest flag kind | P3 |

### 2.11 Analytics and Team round
| ID | Ref | Problem | Fix | Sev |
|---|---|---|---|---|
| T1 | TeamRoundPanel.tsx:112, 136, 140 | Raw **UID** text inputs for the project, the source contest and extra participants | Pickers (contest select, people search) | P1 |
| T2 | ContestConsole.tsx:69-78, 521 | The Team round tab shows on every contest and renders outside the padded container, with its own styling (TeamRoundPanel.tsx:10-11) | Show it only when enabled; consistent styling | P2 |
| T3 | docs/team-round-setup.md "use Refresh state" | No such button exists in the panel | Add a "Refresh state" button | P2 |
| A1 | AnalyticsPanel.tsx:89-91 | Manual refresh only | Fine post-contest; add "updated at" | P3 |

### 2.12 Students directory and profile
| ID | Ref | Problem | Why | Fix | Sev |
|---|---|---|---|---|---|
| ST1 | StudentsView.tsx:30, 247-248 | **Hard cap at 200**: "Showing 200 of 2,500" with no next page | Students beyond 200 cannot be browsed without search | Pagination or infinite scroll with a total | P1 |
| ST2 | :266-275 | Card or accordion list, not a table; no selection or bulk actions (add to contest, email, export selection, delete) | Directory work is one person at a time | Table plus selection plus bulk bar, including "Add selected to contest…" | P1 |
| ST3 | :624-712, 668-676 | Import fires on file select; no column mapping, preview or dry run; errors are a flat list | One bad file creates or updates hundreds of records | Mapping, preview, then commit (as in the contest import's resolve step) | P1 |
| ST4 | :391-550 | Expanded card is an always-editable form; easy to change a field by accident; Save in the corner | Accidental edits | Read view → Edit | P2 |
| ST5 | :867-893 | Trash icon has no `aria-label`; "Confirm" does not say whether it deletes or disables | Ambiguous destructive action | "Delete student" / "Disable (has submissions)" labels | P2 |
| ST6 | :140-145 | Search input has no label (placeholder only) | a11y | `aria-label` | P2 |
| PR1 | ParticipantProfile.tsx:187-486 | Profile is **read-only**: no actions (edit, revoke, resend, message, contests), no tickets, no mail history; `notes` is in the type (:115) but never rendered | Profile is where staff look a person up, but they can't act on anything there | Make it the person hub (§5) | P1 |
| PR2 | :369 | Invigilation section `count={0}` hard-coded | Hides how many flags | Real count | P3 |
| PR3 | ParticipantModal.tsx:159 | `aria-label="Participant"` (generic); no focus trap; in-contest modal is not contest-scoped (shows every contest) | — | Label with the name; default focus on this contest's section | P2 |
| AF1 | AddFromAccess.tsx:87-93, 173-214 | Comment says on-roster people are "shown, greyed"; the code hides them. No select-all and no facets; one click per person. | Adding 300 people means 300 clicks | "Select all N results" plus college/branch/year facets | P1 |

### 2.13 Support
| ID | Ref | Problem | Why | Fix | Sev |
|---|---|---|---|---|---|
| SU1 | SupportInbox.tsx:146-165, 181-220 | Only an Open/Resolved toggle; no search, contest or category filter, sort, unread or "waiting on staff" state, age, or message preview | Triage across 50+ issues is blind | Inbox table: person, contest, category, last message preview, waiting time, assignee; filters plus search | P1 |
| SU2 | :206-218 | Every row is a full-width secondary **button** with a long label | Visual noise; low density | Whole row clickable and selected state | P2 |
| SU3 | :461-463 | "Contest context: {raw uuid}" | Meaningless to humans | Contest title link | P1 |
| SU4 | :458-460 | Email and phone are not linked to the Student record; no other tickets, flags or submissions shown | No per-person context | Match to the student, then the person side panel | P1 |
| SU5 | :109, 244 | `setData(null)` on every refresh, including after each reply, flashes the list to "Loading issues…" and drops your place | Jarring while working | Keep the previous data while refreshing | P2 |
| SU6 | — | No assignment, internal notes, canned replies or bulk resolve | Teams double-handle the same ticket | Assignee plus notes plus macros | P1 |
| SU7 | OrgShell.tsx:30 | Hidden from interns, who handle help requests in Invigilation, which is a different system | Two inboxes for "participant has a problem" | Unify (or cross-link) Help requests and Support issues | P1 |

### 2.14 Mails
| ID | Ref | Problem | Fix | Sev |
|---|---|---|---|---|
| M1 | MailConsole.tsx:417-439 | Queue send: no confirm, no resolved recipient count for the roster ("everyone on the roster with an email"), no render preview, no test send to self | Review step: count, sample rendered email, "send test to me", confirm | **P0** |
| M2 | :380-384 | Roster dropdown lists every contest unsorted, without status or dates | Grouped select with status | P2 |
| M3 | :227-231, 740-744 | Clickable `<tr onClick>` rows are not keyboard-focusable | Link or button in the first cell | P2 |
| M4 | :482, 506-520 | "Retry failed" excludes bounced; no batch cancel; no recipient search | Add search and cancel queued | P2 |
| M5 | :844, 800-801, 938 | Template editor: Back discards unsaved edits without a warning; preview renders only the saved version | Dirty-state guard; preview the draft | P2 |
| M6 | :106 | Tab not in the URL | Hash or route | P3 |

### 2.15 Problems catalogue and authoring
| ID | Ref | Problem | Fix | Sev |
|---|---|---|---|---|
| PB1 | ProblemSetting.tsx:65-71, 155-162 | Discard draft: one click, no confirm, error swallowed | Confirm plus error | P1 |
| PB2 | ProblemsView.tsx:26-86 | No search or filter (tag, has-package, used-in) | Filter bar | P2 |
| PB3 | ProblemsTabs.tsx:39 | Active tab uses `bg-violet-600`, the only violet fill in the console | Use the standard tab style | P3 |
| PB4 | ProblemsTabs.tsx:18; ProblemSetting.tsx:73 | Tab and open draft are not in the URL; reload loses the editor | URL state | P2 |
| PB5 | ProblemEditor.tsx:212 + PageHeader h1 | Two `h1`s | Demote to h2 | P3 |

### 2.16 Fleet, login and signup
| ID | Ref | Problem | Fix | Sev |
|---|---|---|---|---|
| F1 | ContestScale.tsx:62, ContestConsole.tsx:731-732 ("an hour before") vs CONTEST-DAY.md (T-30) | Contradictory warm-up timing in copy | Single source of truth | P2 |
| LG1 | login/page.tsx:124-125 | No password reset; only "contact" | Reset flow | P2 |
| LG2 | signup/page.tsx:139-147 | Labels not associated; no password rules; signup uses raw Tailwind while login uses Astryx | Match login | P2 |

---

## 3. Heuristics, specificity, cognitive load, emotional journey

### Nielsen's 10 heuristics (0–4)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Strong per-action states ("queued, not delivered", "unknown outcome", "Updated hh:mm"). But no contest-level live strip (CC1), the dashboard doesn't poll (D1), and polling pauses when the tab is hidden (X10). |
| 2 | Match with the real world | 2 | Jargon (passphrase/credential/password, probe, fleet, entry-gate, waiver) and raw UIDs (T1, SU3); 4 names for a person (X5). |
| 3 | User control and freedom | 1 | No undo anywhere; Revoke has no restore (P1); End and Rejudge cannot be reversed; Back in the template editor drops work. |
| 4 | Consistency and standards | 1 | Two design systems, 8 bespoke dialogs, 5 tab idioms, 4 confirm idioms, different labels for the same resume action (I2), 5+ date formats. |
| 5 | Error prevention | 1 | Excellent in places (announcement 2-step, credential save gate, bulk-email revalidation at ParticipantsPanel.tsx:1302-1309), but End now, Rejudge everything, Revoke, Delete, Send to N, Queue send and Start now are unguarded. |
| 6 | Recognition rather than recall | 1 | Raw UIDs; flags as bare counts; filters and tabs (Mails, Problems) not persisted; a person's context must be remembered across 5 screens. |
| 7 | Flexibility and efficiency | 1 | Only `/` and Esc on the roster; no ⌘K; no sort; bulk is email-only; no saved views. |
| 8 | Aesthetic and minimalist design | 2 | Restrained visuals, but prose-heavy (X14), with up to 14 controls above the roster. |
| 9 | Recognize, diagnose, recover from errors | 3 | Error copy is thoughtful (IssueAnnouncementModal.tsx:61-71, support idempotent retry, "unknown, check before retrying"). A few dead ends (CC7, StudentsView error without retry). |
| 10 | Help and documentation | 2 | Inline rationale is abundant, but docs disagree with the UI (CONTEST-DAY says "type names, get credentials" and "open /org/fleet"; team-round docs mention a missing "Refresh state"). No contextual checklist. |
| | **Total** | **16 / 40** | |

### Design-specificity verdict
The interaction thinking is unusually specific: the comments show real contest-day scars (the 24 Oct postponement, swapped candidates, uncertain email delivery). The **visible design is generic**: Tailwind slate admin cards and pills, with a second Astryx look on Dashboard, Support and Login. None of the domain's shape reaches the layout. There is no live "control room" structure, no person-centric surface, and no time axis on the live screen. The care lives in copy paragraphs and edge-case code, not in the information architecture. Verdict: **competent but generic, not "AI-slop"**. A redesign should move structure, not paint, and can stay entirely within the current tokens: neutral ramp, black primary, violet accent on hover/focus, semantic amber/red/green.

### Cognitive load: decision points with more than 4 visible options
1. Contest tab strip: **8 tabs** (ContestConsole.tsx:69-78).
2. Participants toolbar: **up to 6 buttons**, 4 of which add people (ParticipantsPanel.tsx:243-280).
3. Above the roster table: 7 view chips + search + OS + college + Reset + filter chips + Select eligible + Clear + Email = **about 14 controls** (:1372-1408).
4. Students filter bar: search, Import, Add, College, Branch, Graduating, Mailable, Sort, Clear, Export = **10** (StudentsView.tsx:137-223).
5. Invigilation: **5 stacked sections**, each with its own actions (InvigilationPanel.tsx:313-904).
6. Reschedule popover: 4 inputs + 3 buttons including the dangerous "Start now (3h)" (ContestConsole.tsx:685-772).
7. Team round: 4 fieldsets and about 14 inputs, 3 of them raw IDs (TeamRoundPanel.tsx:95-155).
8. New contest form: 7 fields, with judges and expected-candidate semantics explained in prose (ContestsView.tsx:321-460).
9. Mails batch filter: up to 6 status chips (MailConsole.tsx:534-551). This one is acceptable.

### Emotional journey on contest day (peak-end)
- **T-60 to T-20, setup.** "Send to N" credential emails go out from a popover with no confirm (P4). Anxiety: "did I just mail 500 people the wrong thing?" Reassurance after the fact is good: per-row queued/sent status. Then the admin needs Judging, which is not in the nav (N1). They hunt for it.
- **T-0, open.** The admin opens the contest and lands on **Problems** (CC3). There is no countdown, sitting count or queue health (CC1). This is the highest-anxiety moment of the day, and the screen gives the least information here.
- **Peak: the rush.** Resume requests and help requests arrive.
  - Approve has a confirm in the drawer but not in the panel (I2).
  - Help requests can only be "resolved", not answered (I5).
  - Support tickets arrive in a different place (SU7).
  - A candidate's issue requires 3–5 screens.
  - A misclicked **Revoke** has no restore (P1). This is the worst possible peak.
- **Incident.** The **announcement flow is the emotional high point**: consequence stated, audience counted, candidate preview, read receipts climbing. Reuse this pattern for every high-stakes action.
- **End.** "End now" lives on a different page, has no confirm, and leaves no summary. Nothing marks closure: no "Contest ended — 487 sat, 3 open issues, exports ready". **The end is weak.**

High-stakes moments that currently get no reassurance: End now, Rejudge Everything, Revoke, Send credentials to N, Queue send, Start now (3h), Publish, Delete.

---

## 4. Persona red flags

**(a) Admin running a live 500-seat contest under time pressure**
- No live status strip; header shows only a relative *start* time (ContestConsole.tsx:441-447). The admin has no answer to "how long is left" or "how many are stuck".
- Lands on Problems by default (:88).
- Revoke is one click with no restore (ParticipantsPanel.tsx:1546-1557). Rejudge "Everything" has no confirm (ContestConsole.tsx:1305-1312). "End now" has no confirm and sits on another page (ContestsView.tsx:179-187).
- Cannot extend time for a candidate who lost 10 minutes to a crash (InvigilationPanel.tsx:323-325).
- Live sessions table: 500 rows, no search, filter or sort (:583-669). Roster: 1,120px-wide, 1,300 rows, no sort or sticky header.
- Alerts exist only on the contest page and stop when the tab is hidden (orgPolling.ts:10-27). Support inbox is separate and unlinked (SupportInbox.tsx:461).
- No bulk action beyond "Email selected" (ParticipantsPanel.tsx:1403).

**(b) Intern invigilator**
- The Invigilation tab shows false "nobody" empty states because feeds are disabled for interns (ContestConsole.tsx:168-177 → InvigilationPanel.tsx:262-265, 421, 580). No drawer, no toasts.
- Support is hidden (OrgShell.tsx:30), so when a candidate says "I filed a ticket" the intern cannot see it.
- Can see **Show Credentials** and **Revoke** buttons (only the add buttons are hidden, ParticipantsPanel.tsx:259), but has no idea which actions the server will refuse.
- Jargon: "Entry-gate reports", "Waive…", "waivers", "quiet", "passphrase".
- Flag counts without kinds; must open a profile modal to understand a flag (InvigilationPanel.tsx:652-663).
- No sign-out on a shared hall laptop (OrgShell.tsx:136-162).

**(c) First-time organizer setting up their first contest**
- The dashboard checklist never completes steps 3 and 4 and gives no link (DashboardView.tsx:528-537). "New contest" does not open the form (:182-186).
- After Create, they stay on the list (ContestsView.tsx:64-67).
- To add a problem, they must already have a `.cxxpkg` built with an external CLI; the alternative is a 7-step authoring editor in a sibling tab.
- To add people, there are 4 add buttons plus a separate "Credentials by email" popover with a two-step "1. Issue / 2. Send" model (ParticipantsPanel.tsx:1855-1931). The CSV import refuses unknown emails and sends them to a page labelled "Participants" that is titled "Students" (:577-584).
- Publish without a preflight checklist (ContestConsole.tsx:789-836). Judging timing copy is contradictory (F1). Datetime inputs carry no timezone (X7).
- CONTEST-DAY.md instructions no longer match the UI ("type names, get credentials back immediately"; "open /org/fleet").

---

## 5. Strengths, top 5 priorities, questions

### Strengths to keep
1. **Honest handling of uncertainty on irreversible communication.**
   - Credential email shows "queued, not delivered" and "unknown outcome — check before retrying" (ParticipantsPanel.tsx:1252-1263, 1320).
   - Bulk email revalidates each row before sending (:1302-1309).
   - Support replies are idempotent with a persisted pending reply (SupportInbox.tsx:355-398).
   - The announcement modal has a 2-step confirm, the audience count on the button, a candidate preview and live read receipts (IssueAnnouncementModal.tsx:388-453, 485-534). This is the template for every dangerous action.
2. **Place-preserving navigation in the contest.** Tabs are stored in the URL hash and reloads stay put (ContestConsole.tsx:179-206). Profiles open over the contest, not away from it (ParticipantModal.tsx:89-101).
3. **Good prioritisation instincts in invigilation.** Waiting-to-resume comes first, quiet sessions are highlighted, entry and exit photos are shown side by side, and there are card layouts for mobile (InvigilationPanel.tsx:311-671). The dashboard's derived "Needs attention" list is also good (derive.ts:288-398).

### Top 5 priority issues
1. **Guard the destructive actions and add undo or restore** (X1, C1, C2, CC4, S1, P1, P4, M1): End now, Rejudge everything, Revoke (add Restore), Delete, Send to N, Queue send, Start now. Use one confirm pattern modelled on the announcement modal.
2. **Build a person-centric hub.** A side drawer, reachable from any name anywhere (roster, sessions, leaderboard, support, drawer, ⌘K). It shows roster status, live session, flags with images, photos, help requests, support tickets, submissions and mail log. It carries every per-person action: resend, show credentials, revoke/restore, extend time, reset/unlock session, approve resume, message, waive, resolve, note. This fixes P5, PR1, I3-I5, SU4 and SU7.
3. **Real bulk operations and data tables.** A shared DataTable with sticky header, sort, virtualization, header select-all, "select all N matching", and a bulk action bar. Use it on the roster, sessions, Students (also removing the 200 cap), Add-from-Access, Support and Submissions (P2, X9, ST1, ST2, AF1, I3).
4. **Live control room for a running contest.** A sticky status strip (time left, sitting, judging queue, waiting to resume, help open, judges OK); default to Overview or Invigilation when live; tab badges; global cross-contest alerts that keep working when hidden; dashboard polling; and fix the intern false-empty Invigilation (CC1-CC3, X10, D1, D2, I1).
5. **Unify participant issues and triage.** Merge or cross-link Invigilation "Help requests" with Support "issues". Add a contest filter, search, assignee, waiting time, canned replies, internal notes, a contest title instead of the UUID, and links to the person hub (SU1-SU7, I5).

### Provocative questions
1. Is the contest console organised around *data types* (problems, submissions, leaderboard) when the organizer's day is organised around *people* and *time*? What if a live contest opened on a timeline plus a queue of people who need you?
2. Why can an organizer issue a broadcast that interrupts 500 people (heavily guarded), but lock one person out (unguarded) with no way back?
3. Should "Help request" and "Support issue" be the same object with a channel field? Who owns a participant's problem end-to-end?
4. If a candidate loses 12 minutes to a crash, what is the policy, and why can't the UI express it (extra time, or a logged decision)?
5. Which actions are *contest-day* actions versus *setup* actions? Should the console change shape (setup mode → live mode → wrap-up mode) instead of showing 8 tabs all the time?
6. Interns are trusted to sit in the hall. What exactly are they allowed to do, and why does the UI currently show them a room that looks empty?
7. Is there an audit trail requirement (who revoked, who waived, who rejudged)? The data partly exists (`granted_by`, `issued_by`) but the UI hides it.
8. Would a 200-student cap and email-only bulk action survive the first 2,000-person round you are planning?

---

## 6. Evidence from the automated checker and browser run

**Design checker** (`impeccable detect`, Impeccable v4.5 engine): 8 findings, all rule `gray-on-color`, **all false positives**. Seven are the `text-slate-400 hover:bg-red-50 hover:text-red-600` trash-icon pattern, where red applies only on hover (ContestConsole.tsx:1364, ProblemsView.tsx:463, StudentsView.tsx:873, ProblemSetting.tsx:157, steps.tsx:178/348/427). One is high-contrast slate-950 on an emerald-400 badge (OrgNotificationDrawer.tsx:255).

Two real issues sit behind those hits:
- At rest the trash icons are slate-400 on white, about 2.6:1, below the 3:1 minimum for non-text UI.
- The icon buttons at ContestConsole.tsx:1364, ProblemsView.tsx:463 and StudentsView.tsx:873 have a `title` but no `aria-label`.

**Browser, with the API unreachable on purpose:**
| ID | Page | Finding | Sev |
|---|---|---|---|
| B1 | /org/contests, /org/problems | "Cannot reach the API." with **no Retry**, and the loading skeleton stays on screen next to the error | P2 |
| B2 | /org/participants, /org/mails | Plain error box, no Retry | P2 |
| B3 | /org/contests/[uid] | Only the error box: no page title, no back link, no Retry | P2 |
| B4 | /org/dashboard | The Problems card error has no detail line, while the Contests card has one (inconsistent) | P3 |
| B5 | /org/support | Pager ("Previous / Next issues") and "Select an issue…" still show beside the error | P3 |
| B6 | Mobile nav strip | Scrolls horizontally with no scroll cue; on Support, "Contests" is clipped at the left edge | P2 |
| B7 | Problems | Violet segmented control; every other page uses black for the active state | P3 |

What passed:
- No horizontal page overflow at 390px.
- The skip link is the first tab stop.
- Nav focus ring is visible (2px violet).
- No React or hydration errors.

Screenshots are kept locally, outside the repo.

## 7. Backend (ams-api) gaps behind UI findings

These cannot be fixed in the portal alone:
| Need | Blocks |
|---|---|
| Restore (un-revoke) a participant login | P1 |
| Extend time for one participant or a group; extend the whole contest | CC6, I3, persona (a) |
| Reset, unlock or force-submit a session; remove someone from a roster | I3, §1.11 |
| Direct message to one participant | I5, §1.11 |
| Flag review state (reviewed, dismissed, note) | I4 |
| Rejudge by submission, person or problem | S1, S2 |
| Server-side pagination: students > 200, submissions > 200, support count | ST1, S4, D5 |
| Support triage fields (assignee, internal note, category or contest filter), and linking a ticket to a student and contest | SU1, SU3, SU4, SU6 |
| Audit log of org actions (revoke, waive, rejudge, end, reschedule) | §1.11, I7 |
| Cancel a queued mail batch; test send | M1, M4 |
| Staff sign-out endpoint (already exists at `/api/auth/logout`, but the org UI never uses it) | X11 |

## 8. Suggested order of work (not started)

1. **Safety.** One confirm dialog built on `Modal`, modelled on IssueAnnouncementModal: state the consequence and the count, and ask for typed confirmation on End and Rejudge-all. Restore for revoke; undo toasts where the action is reversible. *(C1, C2, S1, P1, P4, M1, CC4, PB1)*
2. **Live contest view.** A status strip that stays on screen, the default tab chosen by contest status, tab badges, global alerts that keep working in background tabs, dashboard polling, and the intern false-empty fix. *(CC1–CC3, X10, D1, D2, I1, ND1, ND2)*
3. **Shared data table and bulk actions.** Sort, fixed header, virtualization, select-all, "select all N matching", and a bulk action bar. Apply it to the roster, live sessions, Students, Add-from-Access, Support and Submissions. *(P2, X9, ST1, ST2, AF1, I3, S2)*
4. **Person panel.** A side drawer that opens from any name, holding every per-person action. *(P5, PR1, I4, I5, SU4)*
5. **One issue inbox.** Help requests and support tickets together, with triage. *(SU1–SU7, I5)*
6. **Consistency.** One component set, one tabs component, one time helper (with timezone), one glossary (Student vs Participant, "password"), a shell user menu with sign-out, and an org ⌘K palette. *(X2–X8, X11–X14, N1, N2)*

---

# Part 2: Additional findings (second pass, 13 Nov)

Four more read-only passes ran, each told to skip everything above. The rows below come from those passes. The P0s were re-checked against the code: HS-1 at `ContestsView.tsx:127`; HS-2 because `mintSessionValue` is only called from the login routes and `MAX_AGE_SECONDS = 12h`; A11Y-1 at `ContestConsole.tsx:1142,1153` plus `POLL_BUSY_MS = 2_000`; A11Y-3 with `className="hidden"` on the file inputs.

## 9. Forms, states and edge cases (HS)

34 findings: P0 2 · P1 14 · P2 12 · P3 6.

| ID | Where | Problem | Fix | Sev |
|---|---|---|---|---|
| HS-1 | ContestsView.tsx:127 | **Any** failed DELETE (timeout, an expired session's 401, an intern's 403, a 502) arms `confirmPurge`, so the next click sends `?purge=1` and destroys every result. | Arm purge only on the specific "has submissions" refusal and show its count; every other error keeps plain Delete. | **P0** |
| HS-2 | lib/server/session.ts:19; login/route.ts:44; useOrgNotifications.ts:59,91,109; orgPolling.ts:16 | The session is a fixed 12h and never slides. When it expires, every poll 401s and the feed says "Retrying automatically" every 3s forever. Stale queues still look actionable, and nothing says "session expired". | Sliding session (re-mint when under 2h is left). One global 401 handler: pause polling and show a blocking "Session expired, sign in again" with `?next=`. Warn 15 min before expiry. | **P0** |
| HS-3 | middleware.ts:157 vs login/page.tsx:50 | The redirect to login drops `?next=` and gives no reason. | `?next=<path#hash>&reason=expired` plus a banner | P2 |
| HS-4 | InvigilationPanel.tsx:222-224, 305 | Feed errors, loading state and `updatedAt` are never rendered in the tab (only the drawer shows them), so a dead feed looks like a quiet room. This affects admins too. | "Live feed unavailable · updated hh:mm:ss · Retry"; show empty states only after a successful load | P1 |
| HS-5 | InvigilationPanel.tsx:259 vs 284 | Action errors share state with the 10s poll, which clears them. The banner is also far from the row. | Keep action errors per row; never let a read clear them | P1 |
| HS-6 | InvigilationPanel.tsx:964-968 | The waiver form closes and clears the reason before the request settles; on failure the reason is lost. | Wait for the result; close only on success | P2 |
| HS-7 | ParticipantsPanel.tsx:184-210; ContestConsole.tsx:563, 610 | The one-time credentials screen is guarded only by `beforeunload`. Switching tabs, clicking a drawer item or a sidebar link drops the bulk CSV, and recovering means 500 single "Show Credentials" clicks. The copy contradicts itself (":152 only copy" vs ":953 view again"). | Block navigation while unsaved; move `issued` up to the console; fix the copy | P1 |
| HS-8 | IssueAnnouncementModal.tsx:128, 173 | Escape or any backdrop click (including a drag-select released outside) discards a typed announcement. | Close only when the click starts and ends on the backdrop; confirm discard when there is text | P1 |
| HS-9 | ContestConsole.tsx:326, 576-587 | Contest metadata is loaded once, so status, freeze badge and relative times never update. `live` comes from the stale status: opened at T-10, the leaderboard and roster never start polling at T-0. Another staff member's reschedule is invisible. | Poll metadata about every 30s and on focus; work out the phase from the clock | P1 |
| HS-10 | ContestConsole.tsx:631-660, 764 | The Reschedule form is seeded once and never resynced (Cancel keeps abandoned edits). Save sends all 4 fields with no version check, so it silently undoes a colleague's change. | Reset on open; send only changed fields; return 409 on a conflict | P1 |
| HS-11 | ContestConsole.tsx:642, 740; ContestsView.tsx:288, 303 | An empty `datetime-local` passes validation. `new Date("").toISOString()` throws outside the try (silent in Reschedule; raw "Invalid time value" in New contest). | Inline validation messages; explain why Save is disabled | P2 |
| HS-12 | ContestsView.tsx:307, 379; ContestConsole.tsx:657-660; api/org/contests/route.ts:61-74; [uid]/route.ts:104-121 | Judges and Expected candidates have no upper bound or integer check (a 50000 typo sizes a paid fleet 100× too big). Negative values pass through in Reschedule. Freeze can be at or beyond the contest length. | Clamp in the client and the route; confirm above a threshold; 0 ≤ freeze < duration | P1 |
| HS-13 | ContestConsole.tsx:448-462 | An archived or ended contest opened from a deep link looks fully editable: Announce, Reschedule, Add and Rejudge are all live, with no Restore. | Read-only mode with an "Archived · Restore" banner | P2 |
| HS-14 | ContestConsole.tsx:1335-1375 | Remove problem has no busy state (double DELETE), and an error permanently replaces the button. | Busy state; dismissible inline error | P2 |
| HS-15 | ContestConsole.tsx:1052-1057 | While problems load, "No problem has an uploaded package yet" shows anyway (false empty). With 26 labels used, Add is disabled with no reason. | Loading state; say why Add is disabled | P2 |
| HS-16 | ParticipantsPanel.tsx:528-537 | The documented recovery "import again" with the same file does nothing, because the input value is never reset. | Reset `value`; add a "Re-check file" button | P1 |
| HS-17 | ProblemsView.tsx:313-319; StudentsView.tsx:471-479, 666-674 | The same no-op on re-pick in package upload, resume upload and students import | Reset `value` on every path | P3 |
| HS-18 | ParticipantsPanel.tsx:1175-1181; orgSessions.ts:89 | The roster re-sorts on every 10s entry poll, so rows jump under the pointer next to one-click Revoke. | Keep the order fixed while the pointer or focus is in the table; "New entries · re-sort" pill | P1 |
| HS-19 | ParticipantsPanel.tsx:86-99 | The credentials CSV has no BOM (Excel garbles Indic and accented names on slips) and no guard against formula injection. | BOM; prefix `= + - @` with `'` | P2 |
| HS-20 | MailConsole.tsx:316-326, 431-433 | Pasted recipients are split on `,` only (a tab-separated paste from Sheets breaks). Lines without `@` are dropped silently; no dedupe or validation; the shown count is inflated. | Split on `,`, tab and `;`; validate; dedupe; "N valid · M rejected" | P1 |
| HS-21 | MailConsole.tsx:770, 789-794; mail/templates/[name]/route.ts:19-24 | "New template" is an upsert: an existing name, including `registration-approved`, is silently overwritten. Renaming after save creates a second template. | Create-only POST or a name check; switch to edit mode after save; ETag | P1 |
| HS-22 | MailConsole.tsx:106-131 | Switching Sends ↔ Templates unmounts drafts (pasted lists, template edits). | Keep both mounted or guard unsaved changes | P2 |
| HS-23 | authoring/ProblemEditor.tsx:77-98, 178-182 | Autosave drops the pending body before the PATCH, ignores non-OK responses, leaves rejections unhandled and keeps showing "Saved ✓". There is no unload guard and no concurrency check. | Requeue on failure; show "Not saved · Retry"; unload guard; version check | P1 |
| HS-24 | StudentsView.tsx:378-388, 543, 582-597; orgTypes.ts:37-40 | "Email" edits `contact_email`, but credentials go to `users.email`, which cannot be seen or edited. `display_name` is not editable. The "No email on record" condition is inverted. | Separate "Login email" from "Contact email"; make the name editable; fix the condition | P1 |
| HS-25 | StudentsView.tsx:271, 392-424 | Save PATCHes every field (overwriting a colleague's edits). Unsaved edits are lost on collapse or filter. A year typed as "2O25" becomes NaN, then null, and silently clears the year. | Send only changed fields; guard unsaved changes; numeric year with an inline error | P2 |
| HS-26 | StudentsView.tsx:563-571, 690-699 | The import error list is unbounded with no download. Add student gives no confirmation or link to the new record. | "+N more · Download errors CSV"; success notice with a link | P3 |
| HS-27 | ParticipantProfile.tsx:146-162; useApiQuery.ts:121; InvigilationTimeline.tsx:246 | The profile is cached for 30s, is not refetched on reopen and does not poll during a live contest. Edits are not invalidated, and there is no "as of" time. | Revalidate on open; poll while live; "Updated hh:mm" | P2 |
| HS-28 | AddFromAccess.tsx:84-94, 123, 166-171 | False empties: "Everyone in the directory is already on this roster" and "Nobody matches" are worked out from one page of results. | "N matches already on roster"; exclude on the server; totals | P2 |
| HS-29 | useOrgRole.ts:36-44 | The role promise is cached at module level for the whole session, including a failure, and is not reset on session reset. A re-login on a shared laptop keeps the previous person's role. | Reset on session reset and on failure; revalidate on focus | P2 |
| HS-30 | ParticipantsPanel.tsx:855-871; participants/route.ts:6 | Test candidates: `max=200` is not enforced and `MAX_PER_BATCH` is unused. Empty input disables the button with no reason. | Clamp with a message; enforce in the route | P3 |
| HS-31 | orgPolling.ts:1-34 | No offline indicator and no refresh on `online`. | Global offline banner; refresh immediately on reconnect | P2 |
| HS-32 | ContestConsole.tsx:1270-1278, 1315 | A rejudge failure looks the same as success (grey text). | Red error with dismiss; success with a timestamp | P3 |
| HS-33 | lib/client/fuzzy.ts:30-31; no `dir="auto"` in org | Search does no NFC normalisation or diacritic folding ("jose" ≠ "José"). RTL names have no bidi isolation. | Normalise and fold; `<bdi>` around names | P3 |
| HS-34 | dashboard/ScheduleCard.tsx:57-62 | A contest that crosses midnight is marked only on its start day. | Mark every day the window touches | P3 |

Not verified: upstream ams-api caps (HS-12, HS-21, HS-28).

## 10. Accessibility, WCAG 2.2 (A11Y)

28 findings: P0 2 · P1 2 · P2 13 · P3 11. Contrast values are calculated from the real tokens.

| ID | Where | WCAG | Problem | Fix | Sev |
|---|---|---|---|---|---|
| A11Y-1 | ContestConsole.tsx:1142, 1153 (+134, 301); ParticipantsPanel.tsx:227 | 4.1.3, 2.2.2 | A new `role="status"` "Refreshing submissions…" mounts on every poll (every **2s** while judging), so screen readers repeat it or say nothing, and the table jumps a line each time. The roster does the same with "Updating roster…". | One status region that is always present, filled only for user-started refreshes; fixed height | **P0** |
| A11Y-2 | IssueAnnouncementModal.tsx:139-141, 221-225, 274-279 | 2.4.3, 4.1.3 | After Review, focus drops to `<body>`, so a screen-reader user never hears "This cannot be unsent". The "Issued" confirmation is not announced. | Focus the warning heading or Back on the confirm step; announce "Issued" in a status region | **P0** |
| A11Y-3 | ParticipantsPanel.tsx:526-537; ProblemsView.tsx:314-331 | 2.1.1 | The file inputs are `display:none` behind a label that cannot be focused, so **roster CSV import and package upload cannot be done by keyboard**. StudentsView.tsx:480-492 does it correctly. | `sr-only` input with a visible focus ring, or a button trigger | P1 |
| A11Y-4 | InvigilationPanel.tsx:305-309, 365-398, 452-468; FleetPanel.tsx:304, 318-333, 419-432; ContestConsole.tsx:770, 833, 1316 | 4.1.3 | Contest-day action results and errors (resume, waive, judge test, rejudge, reschedule, publish) and judge-health changes are not announced. | `role="alert"` for errors; a shared status region for success; announce only real state changes | P1 |
| A11Y-5 | about 25 error paragraphs (MailConsole, ContestsView, ProblemsView, StudentsView, TopicPicker, AddFromAccess, ParticipantsPanel, ProblemPreviewModal, SubmissionSourceModal, VerifyPane) | 4.1.3 | Setup-screen errors have no live role. | A shared `<FormError role="alert">` linked with `aria-describedby` | P2 |
| A11Y-6 | ParticipantsPanel.tsx:209-222, 1546; InvigilationPanel.tsx:926-969; ContestConsole.tsx:674-680, 1362; ProblemsView.tsx:446-461; StudentsView.tsx:866; TopicPicker.tsx:118; OrgNotificationDrawer.tsx:183 | 2.4.3 | The focused control is removed or swapped and focus falls to `<body>`. The delete button turns into a dead span after an error. | Move focus to the new view, the next row or the heading; restore the button | P2 |
| A11Y-7 | ParticipantModal.tsx:37-44 with SubmissionSourceModal / InvigilationTimeline | 2.4.3 | One Escape closes both stacked dialogs. | Handle Escape per dialog with `stopPropagation`, or a dialog stack | P2 |
| A11Y-8 | ParticipantsPanel.tsx:264, 272; StudentsView.tsx:149, 157, 332; ProblemsView.tsx:49; MailConsole.tsx:178; ContestConsole.tsx:676, 895, 1288; InvigilationPanel.tsx:928; TopicPicker.tsx:124 | 4.1.2 | Disclosure buttons have no `aria-expanded` or `aria-controls` (only FleetPanel.tsx:447 does it right). | Add both | P2 |
| A11Y-9 | MailConsole.tsx:538-552; TopicPicker.tsx:157-171 | 4.1.2 | Toggle chips have no `aria-pressed`. | Add it | P2 |
| A11Y-10 | StudentsView.tsx:332-363 | 4.1.2, 1.1.1 | A link nested inside the accordion button; the GitHub, LinkedIn and resume icons have no text. | Make them siblings; add sr-only text to the icons | P2 |
| A11Y-11 | ProblemsView.tsx:121-133; AddFromAccess.tsx:153; TopicPicker.tsx:138; FleetPanel.tsx:522; authoring/steps.tsx:290-318; StudentsView.tsx:668; authoring/CodeBox.tsx:54-68 | 1.3.1, 4.1.2, 3.3.2 | More controls with no accessible name, including the CodeMirror editors. | `htmlFor`/`aria-label`; set CodeMirror's `contentAttributes` | P2 |
| A11Y-12 | authoring/CodeBox.tsx:54-68 | 2.1.2 | CodeMirror captures Tab (`indentWithTab` is on by default), and the Esc-then-Tab escape is never mentioned. | `indentWithTab={false}` or visible help text | P2 |
| A11Y-13 | ContestConsole.tsx:700-742; ContestsView.tsx:356-447; StudentsView.tsx:637; IssueAnnouncementModal.tsx:363; InvigilationPanel.tsx:969 | 3.3.1, 1.4.1 | Submit is disabled until the form is valid, there is no `aria-invalid`, and the Reschedule error is shown by colour only. | Validate when submit is pressed; `aria-invalid`, `aria-describedby`; text messages | P2 |
| A11Y-14 | ParticipantsPanel.tsx:1462; InvigilationPanel.tsx:430 | 1.4.3 | `opacity-50` revoked rows are 2.75:1 (the pill 2.2:1); resolved help rows are 3.5:1. | Drop the opacity; show the state with text or a pill | P2 |
| A11Y-15 | org-theme-bridge.css:96-99 | 1.4.11 | Input and select borders are #dedede on #fff, **1.35:1**, in about 40 places. | An `--org-input-border` token at ≥3:1, used for form controls only (no palette change) | P2 |
| A11Y-16 | ContestsView.tsx:254; InvigilationPanel.tsx:86-101; ParticipantsPanel.tsx:1501, 1521; InvigilationTimeline.tsx:118 | 1.3.1, 2.1.1 | Consequences and disabled reasons live only in `title`. | Visible or `aria-describedby` text; name buttons by their action | P2 |
| A11Y-17 | InvigilationPanel.tsx:540-545 | 1.1.1 | The mobile flag count is read as a bare number. | "{n} flags" | P2 |
| A11Y-18 | LeaderboardPanel.tsx:330-358 | 1.1.1 | Cells show "+2", "−3" or "·" with no text alternative. | sr-only "Solved at 34 min after 2 wrong attempts" | P3 |
| A11Y-19 | OrgNotificationDrawer.tsx:244; ParticipantsPanel.tsx:1080, 1372; InvigilationPanel.tsx:659 | 4.1.2 | `aria-label` on plain divs and spans with no role, so it is ignored. | `role="group"` / sr-only text | P3 |
| A11Y-20 | ProblemsView.tsx:164-174 | 1.3.1 | The problem `<h3>` is inside a button and loses its heading role. | `<h3><button/></h3>` | P3 |
| A11Y-21 | StudentsView.tsx:807-848; ContestConsole.tsx:925; MailConsole.tsx:570 | 1.3.1 | Tables with missing or empty `<th>`. | Add header cells with `scope` | P3 |
| A11Y-22 | ParticipantsPanel.tsx:1061-1075 | 2.1.4 | The `/` shortcut cannot be turned off and works outside the panel. | Scope it to the panel | P3 |
| A11Y-23 | ContestConsole.tsx:841-872; ProblemPreviewModal.tsx:93, 283; SubmissionSourceModal.tsx:123; ParticipantsPanel.tsx:975, 1700 | 4.1.3 | "Copied" is not announced. | Shared status region | P3 |
| A11Y-24 | LeaderboardPanel.tsx:105, 199-206 | 2.2.2, 2.4.3 | The 20s auto-refresh cannot be paused. Refresh is `disabled` during each poll, so a keyboard user on it loses focus. | Pause toggle; `aria-disabled` | P3 |
| A11Y-25 | ProblemPreviewModal.tsx:189-209 | 4.1.2 | Incomplete tabs pattern. | Full ARIA tabs, or pressed buttons | P3 |
| A11Y-26 | InvigilationPanel.tsx:365-468; ParticipantsPanel.tsx:1531-1558 | 2.4.6 | Repeated "Revoke" and "Let them back in" labels don't say whom they act on. | sr-only names: "Revoke <name>" | P3 |
| A11Y-27 | 19 files with `animate-pulse` or `animate-spin` | 2.3.3 (AAA) | No `motion-reduce`. | `motion-reduce:animate-none`, or one global rule | P3 |
| A11Y-28 | OrgNotificationDrawer.tsx:226; OrgShell.tsx:92-108 | 2.4.12 (AAA) | The launcher and toast partly cover focused controls at the bottom right. | `scroll-padding-bottom` | P3 |

Checked and fine: skip link, `aria-current`, the drawer's `inert` and announcements, roster checkbox names, chip `aria-pressed`, login form, `Modal.tsx` focus trap (unused by org screens), and semantic text colours (pass 4.5:1).
Not verified (needs a browser): what screen readers actually say, CodeMirror behaviour at runtime, reflow at 320px and 200% zoom, forced-colours mode.

## 11. Live data, render performance and workflow friction (LD / RP / WF)

27 findings: P1 11 · P2 12 · P3 4. Re-checked: `useOrgNotifications.ts:186` polls every 3s with no status gate; `orgPolling.ts` reschedules errors at the same interval with no backoff; ams-api `contests.py:1241` ranks rows with `enumerate(rows, start=1)`.

**Correction to P13:** the Participants tab never polls its own roster. It refreshes only as a side effect of the Leaderboard poll (LD-5).

**Request volume.** One visible console tab on a live contest makes about 76 requests a minute before its own tab reads (Submissions adds about 30 a minute). Fifteen staff with about 22 tabs open come to roughly 1,700–2,500 requests a minute through the portal to ams-api.

| Source | Interval | Polls on draft or ended contests? |
|---|---|---|
| resume-requests, incidents (useOrgNotifications.ts:186) | 3s | **yes** |
| sessions, up to 500 rows (orgSessions.ts:83, 89) | 10s | **yes** |
| submissions/summary (ContestConsole.tsx:134, 332) | 2s while pending, otherwise 20s | yes |
| scoreboard + **full roster** (LeaderboardPanel.tsx:99-106) | 20s | — |
| readiness + overrides (InvigilationPanel.tsx:262) | 10s | — |
| fleet + runs (FleetPanel.tsx:267) | 10s, **also in hidden tabs** | — |
| contest metadata (ContestConsole.tsx:326) | **never** | — |

| ID | Where | Problem | Fix | Sev |
|---|---|---|---|---|
| LD-1 | ContestConsole.tsx:326, 568-587 | Contest metadata is never re-read (same root cause as HS-9). After End now from the list, other staff still see "running/frozen" and the leaderboard keeps polling. | Poll every 30s, plus timers at `starts_at`, freeze start and `ends_at` | P1 |
| LD-2 | useOrgNotifications.ts:185-186; orgSessions.ts:83-89 | Feeds poll at 3s/10s whatever the contest status, and force `live=true`. A draft contest open for editing costs about 46 requests a minute. | Gate on status; 5–10s and 20–30s; one combined `?view=attention&since=` endpoint | P1 |
| LD-3 | orgPolling.ts:12-20 vs support-poll.ts:56-72 | No backoff, jitter, Retry-After, or stop on 401/403. A focus event fires every poller at once. Interns poll `summary` and get 403 forever. | Reuse the support poller's backoff and jitter; stop on 401/403 | P1 |
| LD-4 | InvigilationPanel.tsx:223-224, 302-310 | The feeds' loading, error and updated-at state is never rendered, so admins also see false empties on first load and on failure (overlaps HS-4). | Skeleton until loaded; "Could not refresh · last checked" | P1 |
| LD-5 | LeaderboardPanel.tsx:89, 98-106 | Re-downloads the whole 1,300-row roster every 20s just to filter by college and OS. | Fetch once, or join on the server; give the roster its own 60s poll | P2 |
| LD-6 | FleetPanel.tsx:267-271; IssueAnnouncementModal.tsx:115-119 | Raw `setInterval`, so it keeps polling in hidden tabs with no single-flight guard. | `startOrgPolling` | P2 |
| LD-7 | ParticipantsPanel.tsx:1751-1764, 1826, 1933 | If the credentials-plan read fails, the popover shows a **skeleton forever** with no error or retry. A slow earlier read can overwrite the plan after Issue. | Error + Retry when `plan === null`; abort and sequence guard | P1 |
| RP-1 | useOrgNotifications.ts:87-99; InvigilationPanel.tsx:223, 503-669 | `updatedAt` changes the snapshot on every read, so the 500-row sessions table re-renders about 70 times a minute (input jank, flicker). | Split `updatedAt` out; select by identity; memoised `SessionRow`; memo the panel | P1 |
| RP-2 | ContestConsole.tsx:586; LeaderboardPanel.tsx:71-75, 273-308 | A new `problemLabels` array on every render and no memo, so 1,300×(5+N) cells re-render every 2s; search has no deferral. | `useMemo`/`memo`, `useDeferredValue`, virtualise | P2 |
| RP-3 | ContestConsole.tsx:301, 1142, 1153; ParticipantsPanel.tsx:227; LeaderboardPanel.tsx:205 | Refresh lines inserted above tables on every poll, so the table jumps every 2s (same root cause as A11Y-1). | Fixed-height "Updated hh:mm:ss" slot, shown only for manual refreshes | P1 |
| RP-4 | InvigilationPanel.tsx:313, 503, 598 | The "Waiting to resume" section mounts on arrival and pushes the page down. Session rows re-order every 10s, so with the unconfirmed Approve (I2) a click can land on the wrong person. | Always reserve the section; anchor scroll; stable row order | P2 |
| RP-5 | InvigilationPanel.tsx:103-107; photo route | 36px thumbnails load **full-size** entry photos through a buffering proxy (contradicting the orgNotifications.ts:40 comment). | `?size=thumb`, stream the body, `decoding=async` | P2 |
| RP-6 | ProblemsTabs.tsx:4-5 → authoring/CodeBox.tsx:5-7 | CodeMirror grammars are statically imported, so every Problems visit loads them (56 `@codemirror` refs in the dev chunk). | `dynamic()` the ProblemSetting tab and the grammars | P2 |
| RP-7 | app/layout.tsx:3-11 | KaTeX CSS and the marketing fonts are loaded on every org route. | Move them to the routes that use them | P3 |
| RP-8 | (org)/org/layout.tsx; each page wraps `OrgShell`; useOrgRole.ts:47 | The shell remounts on every navigation, and interns see the full nav for one frame. This also blocks a global live badge. | Move `OrgShell` into the layout; seed the role synchronously | P3 |
| RP-9 | ParticipantsPanel.tsx:1262-1347 | "Email selected" sends one POST per person, causing about 1,000 tbody reconciliations for 500 people, so the roster freezes. | Batch state, or use the bulk-send endpoint with a list of login_ids | P3 |
| WF-1 | ContestConsole.tsx:907-910, 982-996; ProblemsView.tsx:58-61 | Add problem and New problem close after one item, and each reopen refetches all problems. | "Add another" + auto label; shared cache | P2 |
| WF-2 | ProblemsView.tsx:276-300 | The package is **uploaded twice** (inspect, then commit). | Inspect returns an upload token that commit reuses | P2 |
| WF-3 | ParticipantsPanel.tsx:515-521, 579-584 | The unknown-emails link replaces the page and loses the resolved import and the console. | New tab, or inline "Create N students and add" | P2 |
| WF-4 | orgNotifications.ts:80-83; OrgNotificationDrawer.tsx:61-79 | The drawer's re-entry card (the one with the confirm) drops `resume_count` and the fingerprint and has no photo or profile link. Context and safety live in different components. | Carry the context; add "Review participant"; merge with I2 | P1 |
| WF-5 | export/route.ts → ams-api contests.py:1216-1261 | The standings CSV ranks **every roster row** sequentially (non-entrants ranked, ties split, no score column), so it **disagrees with the on-screen board**. | Entered flag, score, tie-aware rank in the API; meanwhile relabel the export | P1 |
| WF-6 | LeaderboardPanel.tsx:207-213; ContestConsole.tsx:543-556 | Exports are same-tab links, so any error (timeout, intern 403) replaces the console with a raw JSON page. | fetch + Blob with a spinner and inline error | P2 |
| WF-7 | ContestConsole.tsx:644-661; [uid]/route.ts:24-30 | The PATCH route and ams-api already accept `freeze_minutes_before_end`, but no UI sends it, so the freeze can't be changed or lifted. **This is a UI-only fix.** | A freeze field in Reschedule plus "Lift freeze now" | P2 |
| WF-8 | ContestConsole.tsx:69-78; ams-api `_refuse_interns` | Interns get the Leaderboard, Analytics and Submissions tabs and exports that the API always refuses. | Hide them unless the contest is a practice one | P2 |
| WF-9 | ProblemPreviewModal.tsx:8-15 → problemStatement.ts | "Preview as candidate" renders with no math support although KaTeX ships. The candidate renderer was not checked. | Use the same katex pipeline | P2 |
| WF-10 | ContestConsole.tsx:1349-1356 | One failed Remove permanently replaces the control (same as HS-14). | Dismissible inline error | P3 |

### Workflow walkthroughs (from code)

**(a) Create contest → 3 problems → import 500 → email credentials → publish.** About **50 clicks, 6 package uploads, and 2 context switches (5 when unknown emails exist)**.
- New contest only navigates to the list (D3). After Create you stay on the list (C3).
- Leave the contest to create problems. Each one takes about 5 clicks and 2 uploads of the same file (WF-1, WF-2).
- Come back and find the card with no search (C4). Add problem refetches and closes after each one (WF-1).
- Participants → CSV: only 50 rows shown (P9). Unknown emails send you away and lose your state (WF-3); you then import on the Students page (ST3) and come back to re-pick the file.
- Credentials: an infinite skeleton if the plan read fails (LD-7), and Send to 500 has no confirm (P4).
- Delivery progress is visible only on the Mails page.
- Publish has no preflight (CC5), and after that the header never updates (LD-1).
- Judging is not in the nav (N1).

**(b) A candidate crashes mid-contest and needs re-entry and a help answer.** 2–3 clicks to decide, 3–6 to verify, 1 context switch to answer.
- The request reaches only non-interns, and only on a visible contest tab (X10, I1). The toast lasts 8s.
- The Invigilation section inserts at the top and shifts the page (RP-4).
- Drawer path: 3 clicks, but no reopen count, fingerprint or photo (WF-4). Panel path: 2 clicks, no confirm (I2).
- To verify identity you scroll 500 rows that re-order every 10s, and thumbnails load full photos (I3, RP-4, RP-5).
- A device failing the entry gate needs a waiver with a fixed 2h (I6). There is no way to give back lost time.
- The help request can only be resolved, not answered (I5). Answering means going to Support, a separate inbox (SU7).
- The panel re-renders about 70 times a minute (RP-1), and a failed feed is silent (LD-4).

**(c) Freeze lift → final standings → archive.** About 7 clicks and a forced reload.
- At `ends_at` the header still says running and frozen until a reload (LD-1).
- The freeze lifts silently, with no control and no confirmation (WF-7).
- The Submissions table jumps while judging finishes (RP-3).
- The standings CSV disagrees with the screen (WF-5), an export error breaks the console (WF-6), and interns are refused (WF-8).
- Archiving happens outside the console (CC6), and there is no wrap-up summary.

## 12. Copy, information architecture, responsive and visual hierarchy (CP / IA / RS / VH)

42 findings: P1 13 · P2 21 · P3 8. Re-checked: `contestTypes.ts:102-111` uses dark-theme `*-300` verdict text on light surfaces; the tab strip at `ContestConsole.tsx:496` is `overflow-x-auto md:overflow-visible`; the `window.confirm` at `FleetPanel.tsx:487` belongs to "Switch judging off".

**Correction to §1.5:** "Load test (confirm)" is wrong. The confirm belongs to *Switch judging off*, and Run load test has no confirm (CP-7).

**Duplicates across passes, merged:**
- CP-10 = HS-1 (purge armed on any failed DELETE).
- CP-9 = HS-24 (contact vs login email).
- RS-9 = HS-8 (announcement lost on backdrop click).
- IA-1 = HS-3, raised to **P1** because deep links shared mid-contest are lost.
- CP-17 = HS-14 / WF-10.
- RS-10 ≈ HS-5.

### Copy
| ID | Where | Problem | Fix | Sev |
|---|---|---|---|---|
| CP-1 | ParticipantsPanel.tsx:209-222, 1700-1702, 1770-1786; CONTEST-DAY §3 | Three sources disagree on whether a password can be recovered: the modal says "show again whenever needed", the save-gate forces a save, and the runbook says "shown once". "Issue N" displays nothing, although the runbook says it shows them. | Settle on one answer and write it once; neutral (not amber) styling | P1 |
| CP-2 | ContestConsole.tsx:1303; contestTypes.ts:121 | "Failed only (SE)" re-runs System Errors only, but organizers read "failed" as WA/RE/TLE. | "System errors only (SE) · N" | P1 |
| CP-3 | mails/page.tsx:11; MailConsole.tsx:207, 303-305; CONTEST-DAY §3 | The runbook and the subtitle say to send credentials from Mails, but Mails cannot send credentials. | Point both at Participants → Credentials by email | P1 |
| CP-4 | FleetPanel.tsx:129-192, 479, 593 | During an AWS launch refusal, /org/fleet shows **green "Ready"** (the always-on worker counts as live). `last_error` sits in collapsed Details, and the diagnostics appear only in the contest tab. | Warn tone when `last_error` is set; show the diagnostics on /org/fleet | P1 |
| CP-5 | ContestsView.tsx:418; ContestConsole.tsx:731 | The UI says the minimum is "one judge"; the runbook says the minimum is 4. | Derive the copy from the server's floor | P2 |
| CP-6 | ContestConsole.tsx:73, 437, 548; LeaderboardPanel.tsx:212, 247; ContestsView.tsx:372 | Leaderboard / standings / scoreboard / board are used for one thing, and the runbook says "Scoreboard". | One name everywhere | P2 |
| CP-7 | FleetPanel.tsx:394-418, 519-557 | The load test shows p50 only (the runbook promises p90/p99), the count input has no label, there is **no confirm** although it costs money and uses the shared queue, and "probe" vs "Test judging" | Show p90/p99, add the label, confirm with count and cost, use one term | P2 |
| CP-8 | StudentsView.tsx:653-677 | The runbook promises a downloadable template, but there isn't one. | Add a "Download template CSV" link | P2 |
| CP-9 | = HS-24 | | | P1 |
| CP-11 | ContestsView.tsx:183-254; ParticipantsPanel.tsx:1501, 1521, 1551, 1598; OrgNotificationDrawer.tsx:70; LeaderboardPanel.tsx:256; StudentsView.tsx:872; ContestConsole.tsx:1363 | Consequences ("no undo", "Reversible", "record is kept") and disabled-state reasons live only in `title`, which is invisible on tablets and on disabled buttons. | Inline helper text or put it in the confirm | P1 |
| CP-12 | ContestsView.tsx:216; ProblemsView.tsx:192, 229, 480; MailConsole.tsx:956; ContestConsole.tsx:1378; StudentsView.tsx:872; ParticipantsPanel.tsx:1555; InvigilationPanel.tsx:848, 894; FleetPanel.tsx:344, 474, 504 | Destructive verbs are inconsistent: "Revoke" means both a login and a waiver, the Ban icon says "the record is kept", and a bare "Confirm". | Glossary: Delete = permanent / Remove = detach / Disable = reversible / Withdraw = waiver; buttons repeat verb + object | P2 |
| CP-13 | ParticipantsPanel.tsx:1426, 1487, 1683; ParticipantProfile.tsx:200; StudentsView.tsx:340; LeaderboardPanel.tsx:289; InvigilationPanel.tsx:536 | The sign-in identifier is called Handle, Login ID or username across screens. | "Login ID", always with the same suffix | P2 |
| CP-14 | OrgNotificationDrawer.tsx:22, 249; InvigilationPanel.tsx:686; ParticipantsPanel.tsx:1481; SessionFreshness.tsx:17 | "Entry" has 4 meanings (re-entry, device check, started, session). | "Re-entry requests" / "Device checks" / "Started" | P2 |
| CP-15 | ParticipantsPanel.tsx:1493-1602; InvigilationPanel.tsx:470, 548, 636; ContestConsole.tsx:432, 437, 1160, 1212; ProblemsView.tsx:212; FleetPanel.tsx:555; ContestsCard.tsx:85-90 | Raw lowercase enums shown as text ("unsent", "complained", "queued"); mixed case; "Live" vs "Running" | One display-label map, sentence case | P2 |
| CP-16 | ContestsView.tsx:126; InvigilationPanel.tsx:285; FleetPanel.tsx:218; about 12 json helpers | Vague errors: "That did not work." / "Request failed." / "Could not load." | Name what failed and the next step | P2 |
| CP-17 | = HS-14 (also ProblemsView.tsx:443-449, StudentsView.tsx:863) | | | P2 |
| CP-18 | InvigilationPanel.tsx:543, 657; OrgNotificationDrawer.tsx:59 | "1 flags"; no noun on mobile | Pluralise | P3 |
| CP-19 | InvigilationPanel.tsx:551, 639; OrgNotificationDrawer.tsx:70; ContestConsole.tsx:1188, 1273 | Off-voice: "waiting on you", "Block request", "Who" | "Needs approval", "Decline request", "Participant" | P3 |
| CP-20 | ProblemsTabs.tsx:30-31; TeamRoundPanel.tsx:107 | Catalogue vs catalog; "Problemsetting" | "Catalog", "Authoring" | P3 |
| CP-21 | ContestConsole.tsx:745, 1098; ProblemsView.tsx:480 | "Add" / "Save" (which also saves judges) / "Confirm" | Labels that say what happens | P3 |

### Information architecture
| ID | Where | Problem | Fix | Sev |
|---|---|---|---|---|
| IA-1 | = HS-3 | Login drops `next` and the hash, so a shared deep link lands on the Dashboard. | | **P1** |
| IA-2 | dashboard/derive.ts:190-204 vs FleetPanel.tsx:155-162 | The dashboard says "No judges" while the Judging page says "Judges are running": a contradiction at peak stress. | One `judgingStatus()` used everywhere | P1 |
| IA-3 | ContestConsole.tsx:999-1003, 1052-1057 | Add problem silently hides problems that have no package. | "N problems hidden: no package (open Problems)" | P2 |
| IA-4 | FleetPanel.tsx:337-344 vs 463-476, 593 | The same metrics appear under two label sets on one screen, and /org/fleet shows less than the tab. | One component and one label set | P2 |
| IA-5 | dashboard/RailCards.tsx:89-116; derive.ts:297; OrgShell.tsx:31 | Interns get "Judging status unavailable" with a Retry that can never work, and links to refused routes. | Role-aware message; hide the link and tab | P2 |
| IA-6 | contests/[uid]/page.tsx:4; participants/[handle]/page.tsx:4 | Static document titles, so tabs and history entries can't be told apart. | `generateMetadata` + tab in the title | P2 |
| IA-7 | SupportInbox.tsx:101-105; StudentsView.tsx:124-129; ContestsView.tsx:25; ParticipantModal.tsx:29-36; Mails batch | Ticket, filters, archived toggle, open person and batch are not in the URL, and Back leaves the contest. | Query/hash state; Back closes the modal | P2 |
| IA-8 | (org)/org has no page.tsx | `/org` returns 404, though the runbook gives it as the entry URL. | Redirect to /org/dashboard | P2 |
| IA-9 | StudentsView.tsx:331-345 | Two destinations in one row (a link inside a button); opening the profile loses the filters. | Separate controls, or open the modal | P2 |
| IA-10 | signup/page.tsx | Orphan route: nothing links to it. | Link it on purpose, or remove it | P3 |

### Responsive and tablet (estimated from classes at 768, 1024 with sidebar, and 1280)
| ID | Where | Problem | Fix | Sev |
|---|---|---|---|---|
| RS-1 | ContestConsole.tsx:496, 504 | The 8 tabs need about 870px but have about 704–720px, and `md:overflow-visible` lets them spill, so **the page scrolls sideways at 768–1190px**. | Scroll with an edge fade at all widths, or "More ▾" | P1 |
| RS-2 | ParticipantsPanel.tsx:243, 1825; OrgShell.tsx:166 | The credentials popover is anchored right while its trigger is on the left, so it runs about 200px off-screen at 640–1100px and sits under the sticky header (z-10 vs z-30). | Collision-aware positioning, or a dialog | P1 |
| RS-3 | InvigilationPanel.tsx:375, 392, 456 | Large touch targets apply only below 768px, so tablets get about 30px "Let them back in" / "Refuse" buttons. | `pointer-coarse:` or `min-h-11` until lg | P1 |
| RS-4 | useOrgDesktopLayout.ts:5; InvigilationPanel.tsx:584, 745, 855 | The card-to-table switch at 768px with `min-w-[780px]` tables puts the **Flags column off-screen on iPads**. | Switch at about 1200px, or a container query | P1 |
| RS-5 | ContestConsole.tsx:677, 694-727, 1364, 1376; ProblemsView.tsx:226, 466; StudentsView.tsx:873, 883-892; ParticipantsPanel.tsx:1465, 1522-1552; ContestsView.tsx:255; InvigilationPanel.tsx:100 | Targets under 24px (WCAG 2.5.8) and most under 44px | Bigger hit areas on coarse pointers; padded labels for checkboxes | P2 |
| RS-6 | ParticipantsPanel.tsx:1408, 1411 | The sideways-scroll hint is hidden at lg, but the 1120px table only fits from about 1424px, so Actions are off-screen on laptops. | Hint when the table overflows; sticky Actions column | P2 |
| RS-7 | OrgNotificationDrawer.tsx:226, 254; ContestConsole.tsx:560 | The launcher and toast cover the last rows' Revoke and Show buttons (only Invigilation reserves `pb-20`). | Bottom padding while the drawer is mounted | P2 |
| RS-8 | SupportInbox.tsx:178-182, 216, 236 | Panes stack below about 824px, and selecting a ticket shows the conversation below 50 rows with no scroll. | Master/detail, or scrollIntoView | P2 |
| RS-9 | = HS-8 | | | P2 |
| RS-10 | ≈ HS-5 (InvigilationPanel.tsx:285, 304-308) | Errors render only at the top of the page. | Inline per section | P2 |

### Visual hierarchy (existing tokens only)
| ID | Where | Problem | Fix | Sev |
|---|---|---|---|---|
| VH-1 | contestTypes.ts:102-126 → ContestConsole.tsx:1168, 1210; ParticipantProfile.tsx:391, 453 | **Verdict pills use a dark-theme palette** (`*-300` on `/15` tints) on white, about 1.5–2:1, so AC and WA are almost unreadable in the live feed. | Use the light pairs already in use (emerald-50/700, red-50/700, amber-50/800) | P1 |
| VH-2 | FleetPanel.tsx:386, 396 | The costly "Start judges now" is the primary action even when status is green; the recommended "Test judging" is secondary. | Make Test primary; promote Start only on warn or bad | P2 |
| VH-3 | StudentsView.tsx:157, 308; ParticipantsPanel.tsx:273, 1376, 1403 | Solid black means both "selected" and "primary", so there are competing primaries. | Selected = border emphasis; one black primary per view | P2 |
| VH-4 | OrgNotificationDrawer.tsx:67, 255; InvigilationPanel.tsx:375, 470; InvigilationTimeline.tsx:315 | Green means "needs you"; the approve button and "resolved" are coloured differently across surfaces. | Attention = amber/red; one colour per state | P2 |
| VH-5 | orgTypes.ts:121-128; ContestsCard.tsx:85-90, 158; ContestConsole.tsx:431; ContestsView.tsx:169; StudentsView.tsx:533 | Archived is amber; draft and ended look the same; 4 different practice markers | One `ContestStatusPill` | P2 |
| VH-6 | LeaderboardPanel.tsx:282-287 vs ParticipantsPanel.tsx:1481 | "Entered" is shown by colour alone on the leaderboard (1.4.1). | A visible tag | P2 |
| VH-7 | ParticipantsPanel.tsx:1700; ProblemsView.tsx:239-243, 446; ContestsView.tsx:173; ContestConsole.tsx:1356 | Amber is used for non-warnings, which dilutes real ones. | Neutral = info, red = error, amber = attention | P3 |
| VH-8 | ContestConsole.tsx:852-858 | On a running contest the invite-code tile outweighs every action. | Compact inline code | P3 |
| VH-9 | ContestConsole.tsx:394, 1157-1162 | "judging" appears twice (pill + chip). | Keep one | P3 |
| VH-10 | ContestsView.tsx:141-143 | The whole card hovers but only the title is a link. | Make the whole card the link, or drop the hover | P3 |
| VH-11 | InvigilationPanel.tsx:313+; ContestsView.tsx:141; ProblemsView.tsx:153; ContestConsole.tsx:1034; ParticipantProfile.tsx:192; SupportInbox.tsx:128 | Mixed card radius, padding and page spacing | One card token, one page container | P3 |

**Status-pill inventory:** 3 shapes, 4 text sizes, bordered and borderless pills mixed, and the same state in different colours (archived, resolved, approve). Contest status: orgTypes.ts:121 via ContestsView.tsx:150, ContestConsole.tsx:421, ParticipantProfile.tsx:348, StudentsView.tsx:530, and the dashboard's Astryx Token (ContestsCard.tsx:85). Verdicts: contestTypes.ts:102 via ContestConsole.tsx:1168, 1210 and ParticipantProfile.tsx:391, 453. Roster: ParticipantsPanel.tsx:1492-1507. Mail: ParticipantsPanel.tsx:1584 (`MailPill`) vs MailConsole.tsx:82 (`StatusPill`, which has no "unsent"). Invigilation: InvigilationPanel.tsx:318, 413, 488, 548, 550, 636, 702, 812. Drawer: OrgNotificationDrawer.tsx:58, 255. Timeline: InvigilationTimeline.tsx:315.

---

## 13. Totals across both parts

| Part | P0 | P1 | P2 | P3 |
|---|---|---|---|---|
| Part 1 (first review + browser) | 10 | ≈35 | ≈45 | ≈12 |
| HS: forms, states, edge cases | 2 | 14 | 12 | 6 |
| A11Y: WCAG 2.2 | 2 | 2 | 13 | 11 |
| LD/RP/WF: live data, performance, workflows | 0 | 11 | 12 | 4 |
| CP/IA/RS/VH: copy, IA, tablet, hierarchy | 0 | 13 | 21 | 8 |

About 255 findings, about 245 after the merged duplicates. **P0 total: 14.** That is the 10 in the P0 register at the top, plus:
- **HS-1:** a failed delete arms the purge.
- **HS-2:** session expiry mid-contest is silent.
- **A11Y-1:** a status line re-announced every 2s.
- **A11Y-2:** the warning on the irreversible announcement is never read out.

**How the second pass changes the plan in §8:**
- **Step 1, safety:** add HS-1, HS-2, HS-7, HS-8, HS-23 and CP-11.
- **Step 2, live view:** first fix the polling foundation:
  - Re-read contest metadata (HS-9 / LD-1).
  - Gate the feeds on contest status (LD-2).
  - Add backoff (LD-3).
  - Show feed health (HS-4 / LD-4).
  - Stop render churn and layout jumps (RP-1, RP-3 / A11Y-1).
- **Step 3, tables:** add stable row order (HS-18, RP-4), verdict contrast (VH-1) and tablet breakpoints (RS-1 to RS-4).
- **New quick wins that are UI-only and need no API work:**
  - Freeze control (WF-7).
  - Rejudge label (CP-2).
  - Runbook copy fixes (CP-1, CP-3, CP-4).
  - `/org` redirect (IA-8).
  - File-input reset (HS-16).
  - CSV BOM (HS-19).

---

# Part 3: Enhancements, team rounds and the target workflow (13 Nov)

Two read-only research passes ran across amsaccess, ams-api (`3fd1a72`) and the desktop client. These were re-checked against the code:
- **Team round, redraw leak:** a redraw deletes only `RoundTeam` (`ams-api services/teams.py:220`).
- **Team round, vote quorum:** `needed = len(members_of(team))` (`:750`).
- **Team round, proxy:** the portal proxy allows only 6 actions (`src/lib/teamSetup.ts:5-11`).
- **Reference sheet:** the routes exist (`contests.py:1502-1524`) and nothing in `src/` references them.
- **Re-entry approval:** `ResumeReviewIn` takes `note` and `minutes` (`schemas/common.py:948-952`), and the UI sends neither.
- **Waivers:** fixed at `minutes: 120` (`InvigilationPanel.tsx:729, 791`).

Proposed screens for every step are on the design canvas (pages "Workflow: setup to wrap-up" and "Team round"): https://claude.ai/artifact/QXa3hTtVXGcn1YGUxCB8Rq

## 14. Target workflow: one contest, start to finish

Today flow (a) takes about 50 clicks, 6 package uploads and 2–5 page switches, with no preflight (§11). The proposal is **one setup stepper inside the contest**. It works as a checklist in any order, not a locked wizard.

| Step | Screen (canvas) | What changes vs today | Backend |
|---|---|---|---|
| 1 Basics | FlowStep1Basics | Start from blank, **duplicate** or **template**. Format is Individual, Team round or Practice. Duration instead of an end time, with the timezone shown. Freeze is editable later. Expected candidates default to the roster count. | Duplicate and template: partial (`ProblemCollection` unused; orchestrate in the portal). Freeze edit: **exists**, PATCH `freeze_minutes_before_end`. |
| 2 Problems | FlowStep2Problems | Add several at once from a searchable catalog. Label, points and order are edited inline. Packages flagged "newer version available". Hidden no-package problems are explained. Preview as candidate. | Inline edits need PATCH on the contest problem (already proxied: `problems/[cpUid]`). |
| 3 Participants | FlowStep3People | One import with column mapping, a dry-run summary and **create unknown students inline**. Bad rows can be downloaded. Pick from Students, copy a roster, or add test candidates as tabs. | Import template exists (`students.py:948`, not proxied). Create-on-import: the portal can chain the students import, then from-directory. |
| 4 Credentials | FlowStep4Credentials | Email and/or slips in one place, with a rendered preview, **test send to me**, **scheduled send** and auto-email for late additions. Delivery progress links to "fix bounced". | Preview and test send: templates exist. Scheduling and auto-email for late additions: **new**. |
| 5 Readiness | FlowStep5Ready | Preflight with 9 checks: packages verified, stale version, roster, credentials, judging capacity, **reference sheet**, **lockdown policy**, mock round, test judging at T-20. Staff on duty with **hall assignment**, a contest-day timeline and `.ics`. Publish with open items needs a confirm. | Data for the checks exists (see 15b). Halls and staff management: **new** (no membership API). |
| 6 Live | Live contest page, boards 1–5 | Control room, roster bulk actions, issue inbox, tablet invigilation | See Parts 1–2 |
| 7 Wrap-up | FlowStep7Wrap | Close-out checklist: judging done, issues resolved, **flag review decisions**, **reveal the leaderboard now or at a scheduled time**, **results email**, archive. Exports that match the screen, plus an integrity report and an activity log. **Notes for next time** are carried into duplicates. | Results mail: per-recipient `variables` exist (`common.py:610-613`). Flag decisions, activity log and notes: new or partial. |

## 15. Capabilities that exist server-side but no organizer UI reaches

### 15a. Quick wins (portal only, about S each)
| Capability | Backend | Today |
|---|---|---|
| **Reference-sheet editor** (draft, publish, versioned, 409 on conflict). Candidates already read it (`participant.py:733`) | `contests.py:1502, 1507, 1524` | Not proxied; **organizers cannot author it at all** |
| **Desktop lockdown policy** per contest (clipboard, keys, displays, remote access: block, warn or log) | `PATCH contests.py:319`; `common.py:124-147` | Not proxied; the create proxy drops `lockdown` (`app/api/org/contests/route.ts:52-72`) |
| Edit title, description, freeze and practice on a live contest | `contests.py:299-307` | The UI sends only times and sizing |
| Re-entry approval **window length and note** (1–720 min) | `common.py:946-952` | The UI sends `{}`, so every approval gets the 15-minute default |
| Waiver length up to 720 min | `common.py:1074` | Fixed at 120 |
| Submissions `verdict` and status filters | `contests.py:744-752` | The proxy forwards only `limit`. Note: the verdict filter runs *after* the page limit, so it needs a backend fix |
| Enroll one student; issue or email a permanent login | `students.py:1065, 726, 767` | **Proxies exist (`app/api/org/students/[uid]/…`) but no component calls them** |
| Students import template; re-download a problem package | `students.py:948`; `problems.py:337` | Not proxied |
| Docs-assistant exchange log | `assist.py:115` | Not proxied |
| Per-recipient mail-merge `variables`, enabling result mails | `common.py:610-613` | The paste box takes only `email, Name` |

### 15b. Data the backend already stores but the UI hides
- Waiver reason and granted_by.
- Resume `review_note`, `expires_at` and `consumed_at`.
- Readiness `unsupported_checks` and `app_version`.
- Violation **severity** and evidence, which `InvigilationFlagOut` drops.
- `Device` rows (fingerprint, OS, app version). Note that **`ip_address` is never written**.
- Incident diagnostics and resolved_by.
- Credential `failed_attempts` and `locked_until`. After 8 bad tries a login locks for 15 minutes, and staff can't see this (`services/participants.py:87-88, 306-309`).
- Per-user announcement acks.
- An unused `Rejudge` table with requester, reason and progress.
- Unused models: `Clarification`, `ContestRound`, `ContestRegistration`, `ProblemCollection`, `ApiKey`.
- `final_rank` and `final_score` are never written.

### 15c. Small backend changes with high value (P1)
1. Show login lockout and add an **unlock** route. "I can't log in" is the most common contest-day issue.
2. **Announcement unread list**, then "resend to the N who haven't seen it".
3. Expose violation severity, so flags can be sorted by severity.
4. Staff read access to a candidate's **autosaved drafts**, for crash appeals.
5. Staff read access to device history, to spot device swaps.
6. Make `verification_window_minutes` (check-in time) settable.
7. Write `Rejudge` rows, giving a history with who ran it and why.

### 15d. Missing entirely (no route or model)
- Staff, org and role management (members are created only in `seed.py`).
- Audit log. About 70% could come from the existing actor columns.
- Per-person time extension.
- Plagiarism similarity. Exact-duplicate detection via checksums is possible.
- Webhooks.
- Registration approval (the model exists, but there are no routes).
- Scheduled announcements.
- Certificates.

## 16. Team rounds

### 16a. How they work today
1. The `.cxxpkg` project has N parts, and team size must equal N.
2. **Seed** reads the source contest's live scoreboard and takes the top `take`, plus additions. The total must divide by the team size. The method is snake, tiered or banded, and the rank-sum spread is recorded.
3. **Publish teams.** This is irreversible.
4. **Lobby**, then **discussion**, which opens voice.
5. **Choosing.** Members claim parts and mark ready; the last ready member locks that team.
6. **Allocation lock** (manual, or by deadline). Unclaimed parts are auto-assigned.
7. **Build and vote.** Each part submission bumps the revision, and a unanimous vote triggers one integration run.
8. **Submit deadline.** Teams that haven't voted are auto-submitted, and missing parts use reference stand-ins worth 0 that also cancel the integration bonus.
9. The **team board** shows part scores plus an integration bonus only on a clean pass, with optional benchmark ordering.

### 16b. Organizer pain points (re-checked)
| # | Problem | Evidence |
|---|---|---|
| T-1 | Raw UID fields for the project, source contest and extra participants | TeamRoundPanel.tsx:112, 136, 140 |
| T-2 | The draw is saved immediately; there is no preview | services/teams.py:241-280 |
| T-3 | **A redraw leaves dropped people as contest participants on no team** (the lobby returns 403 to them) | services/teams.py:220 vs 276, 319 |
| T-4 | No unpublish, no manual edit or swap, no rename (always "Team N") | services/teams.py:242, 291 |
| T-5 | **One no-show blocks the whole team.** The vote and the ready check need every member, there is no substitute, and the absentee's part becomes a 0-point stand-in that also cancels the bonus | services/teams.py:497, 750; team_board.py:125-131; unique (contest, user) at models/team.py:181 |
| T-6 | No team standings in the portal (the board exists at `teams.py:441` but isn't proxied); `results.csv` isn't team-aware | contests.py:1216 |
| T-7 | No live monitoring. The panel never polls, and `/teams` omits ready state and per-team lock | TeamRoundPanel.tsx:79; teams.py:352-376 |
| T-8 | Teams don't appear in invigilation or the inbox; there are no team-level messages (announcements are contest-wide) | models/contest.py:279-302; models/support.py:31 |
| T-9 | Voice: only a join/leave log (not proxied); no failure telemetry; no live presence endpoint | assist.py:165; services/voice.py:157 |
| T-10 | Integration score and benchmark settings, upload and history exist but have no UI | teamSetup.ts:16; teams.py:408, 450 |
| T-11 | Limits don't match (UI size ≤5 vs API 20; take 4 vs 100); no backend check of the timeline order | teamSetup.ts:20; teams.py:215-226, 246 |

### 16c. Proposed team screens (canvas page "Team round")
- **T1 Team setup:**
  - Project picker with the part list and verification status.
  - Rules: size checked against parts, discussion length, **integration bonus**, **benchmark**, **no-show policy**.
  - A visual timeline: lobby → discuss → choose → lock → build → deadline → end, with the order validated in plain language.
- **T2 Draw teams:**
  - A **preview where nothing is saved**.
  - The source contest is checked: ended and judging finished.
  - "Take top 64 = 16 teams · next 4 become reserves".
  - Spread for each method side by side.
  - Rank-sum bars per team, drag to swap, and team names edited inline.
  - Reserves list and wildcards searched by name.
  - Export CSV.
  - Publishing can be undone until the lobby opens.
- **T3 Live team monitor:**
  - Phase bar with a countdown to the lock.
  - Counts: teams fully chosen, members not online, in voice, team issues, free reserves.
  - Team table: parts chosen, online, voice, "needs".
  - Team panel with each member's state.
  - **"Substitute with reserve" or "Mark absent"** before the lock.
  - Team activity, and message one team.
  - Tabs: Team standings, Individuals, Voice log, Integrity.

### 16d. Team enhancements by effort
| Enhancement | Backend | Effort |
|---|---|---|
| Team standings tab, rejudge a team, benchmark upload and history, voice log, integration and benchmark settings | **Exists.** Widen the proxy allowlist and build the UI | S–M |
| Pickers instead of UIDs | Partial: needs `GET /projects` | S–M |
| Team roster CSV export | Portal-only, from `/teams` | S |
| Fix the redraw participant leak; backend timeline validation; align limits; role-specific errors (ams-api #88) | Small backend PRs | S |
| Unpublish before the lobby opens; rename teams | New, small, guarded endpoints | S |
| Seed **preview** (dry run) | The order functions are pure; add a `preview` flag | M |
| Manual swap or move members | New PATCH under the round lock | M |
| Live monitor | `/teams` gets votes, revision and submitted; needs `ready_at`, team lock and phase; online state from sessions; voice presence needs an endpoint | M |
| Team issues in the inbox; integrity signals (shared device fingerprint) | Join membership at read time. **IP is not captured** (`Device.ip_address` is never set) and would need a privacy review | S–M |
| Team-level announcements | Needs a `team_id` audience | M |
| **No-show handling and substitutes** (quorum N−1, reserve carries the part) | New member status, a substitute endpoint, and desktop lobby changes | L |
| Post-round team report (claims, revisions per member, votes, integrations, voice, benchmark) | Data exists; needs an aggregate endpoint | M–L |

### 16e. Team-round checklist (until the product covers it)
- **T-1 day:**
  - Inspect the package and validate it with the judge toolchain, then import and bind it.
  - Confirm team size = parts.
  - Set the integration bonus (API only today).
  - Set **`allocation_locks_at`**. Without it there is no lobby gate.
  - Confirm the source contest's rejudges are finished, since seeding reads the live board.
  - Make `take` divide by the team size.
  - Draw, then review the spread.
  - Issue credentials, including for reserves.
  - Check TURN capacity.
- **T-2 h:**
  - Publish the teams (irreversible today), then publish the contest separately.
  - Check device readiness.
  - Have a manual plan for no-shows.
- **Lobby, discussion and choosing:**
  - Watch sessions to see who has signed in.
  - Refresh teams to watch claims.
  - "Lock allocation now" locks **every** team; use it only if the whole room is stuck.
- **Build and vote:**
  - Watch revisions, votes and integration results.
  - Look for teams with substitutions.
- **Deadline and wrap-up:**
  - Confirm every team was auto-submitted.
  - Pull the team board (API only).
  - Note that `results.csv` is not team-aware.
  - Review benchmark history and the voice and assistant logs.
  - Update issues amsaccess #8 and #11.

## 17. Recommended order (all parts combined)
1. **Safety and truth, before the next big contest:**
   - The P0 register.
   - HS-1 and HS-2.
   - Contest status re-read (LD-1).
   - Polling backoff and gating (LD-2, LD-3).
   - Verdict contrast (VH-1).
   - Tablet breakpoints (RS-1 to RS-4).
2. **Portal-only quick wins:**
   - §15a: reference sheet, lockdown, freeze and title edit, re-entry window, waiver length, student actions, import template.
   - The freeze control (WF-7).
   - The team proxy allowlist plus team standings.
3. **Workflow:**
   - The setup stepper (§14) with the preflight check.
   - The wrap-up checklist.
   - The person panel, bulk table and unified inbox (Parts 1–2).
4. **Small backend changes:**
   - §15c.
   - Team fixes: redraw leak, unpublish, rename, timeline validation.
5. **Medium and large:**
   - Team seed preview, swap and live monitor.
   - Clarifications.
   - Activity log.
   - Staff, roles and halls.
   - No-show substitutes.
   - Plagiarism checks.

---

# Part 4: Reloads, hydration and rendering (13 Nov)

Read-only pass against Next 15.5.27 and React 19.3. Stable React here does **not** export `<Activity>`. Re-checked:
- `login/page.tsx:30`: `useEffect(() => { clearApiCache(); }, [])`.
- The login `<form onSubmit>` has no `method`, and its inputs have `name="email"` and `name="password"`.
- There is no `loading.tsx` or `error.tsx` under `(org)`.
- The bulk-send loop `while (mounted.current …)` is at `ParticipantsPanel.tsx:1300`.

The clickable prototype (canvas page "Try it") shows the target behaviour: every action updates in place, with no reload.

## 18. Full reloads and lost state
| ID | Where | Problem → what the user sees | Fix | Sev |
|---|---|---|---|---|
| RH-1 | login/page.tsx:31, signup/page.tsx:24; useApiQuery.ts:9-20; ContestConsole.tsx:213-226; ParticipantsPanel.tsx:1122-1130; useOrgNotifications.ts:128-130; middleware.ts:138-144 | **Merely opening /org/login or /org/signup** clears the cache and broadcasts a session reset to **every other open console tab**. Each live-contest tab then shows "Your session changed. Reload this page", in-flight roster actions abort and the drawer stops. The website's "Sign in" link goes there, even for people already signed in. | Clear only after a login as a different subject; middleware sends signed-in users to the dashboard; on a real reset, re-key and refetch rather than hard-reload | **P1** |
| RH-2 | ContestConsole.tsx:543-556; LeaderboardPanel.tsx:207-213; ParticipantsPanel.tsx:246-252; StudentsView.tsx:215-221 | CSV exports are same-tab links. Any failure (expired session, intern 403, 502, the 60s timeout) **replaces the console with a raw JSON page** and loses selection, filters, dialogs and unsaved credentials. There is no progress indicator. (Extends WF-6.) | Stopgap: the `download` attribute. Proper: a `useDownload()` helper (fetch → blob, busy state, inline error) | **P1** |
| RH-3 | ContestConsole.tsx:521, 561-604; ParticipantsPanel.tsx:1114-1157, 1300 | Switching tabs **unmounts** the panel. This aborts requests and **silently stops a 500-person "Email selected" send mid-way**, with in-flight sends left in an unknown state. Filters, selection, the open person modal and scroll position are lost. (Widens HS-7 and HS-22.) | Keep visited panels mounted (`hidden`/`inert`, polling paused while inactive); move long jobs into the contest store; guard navigation while a send is running | **P1** |
| RH-4 | useContestRead.tsx:11-21; useOrgNotifications.ts:121-127, 189-197; OrgNotificationDrawer.tsx:101 | Leaving a contest disposes every store. Back gives a full skeleton, downloads the 1,300-row roster again, shows reviewed flags as new, and turns missed arrivals into the baseline so they never toast. **An in-flight approve is aborted and its lock cleared, so a second decision is possible.** | Per-contest store kept for about 5 min (LRU); never abort writes on unsubscribe | P2 |
| RH-5 | StudentsView.tsx:68-129, 340; ParticipantProfile.tsx:514-523 | Students filters live in component state, with no cache. "Back" **pushes** a new history entry. Result: filters reset, unsaved edits are lost, a skeleton shows, and scroll restoration fails. | Filters in `searchParams`; `useApiQuery`; `router.back()` | P2 |
| RH-6 | ProblemsTabs.tsx:18; ProblemSetting.tsx:29; SupportInbox.tsx:101-104; MailConsole.tsx:106; ParticipantModal callers | Sub-tabs, the open draft, the support conversation and the person modal are not in the URL. **Back with a profile open leaves the contest** instead of closing the profile. | `?tab=`, `?draft=`, `?t=`, `?person=` (or the intercepting route in A5) | P2 |
| RH-7 | login/page.tsx:75-109 | Before hydration (the page ships about 2 MB of dev JS), pressing Enter does a native GET, putting **the password in the URL**, history, logs and the Referer header. | `method="post"` plus a React 19 server action (progressive enhancement) | **P1** |
| RH-8 | no `loading.tsx` in `(org)` | On dynamic routes, a click shows nothing, not even the sidebar changing, until the server responds. | Console-shaped `loading.tsx` per dynamic segment | P2 |
| RH-9 | only root `src/app/error.tsx` (black marketing style) | Any render error, or a `ChunkLoadError` after a deploy, **blanks the whole live console** with no nav; Retry loses all state. | `(org)/org/error.tsx` inside the shell, plus a per-panel ErrorBoundary with "Reload panel" | **P1** |
| RH-10 | login/page.tsx:52-53; signup/page.tsx:68-69; DashboardView.tsx:185; SupportInbox.tsx:86; ScheduleCard.tsx:152; TeamRoundPanel.tsx:153; ParticipantProfile.tsx:342 | `push()` + `refresh()` fetches twice; buttons call `router.push` instead of `<Link>` (no prefetch, no Cmd-click); `<a href="#tab">` adds history entries; a link in the modal to the same contest leaves the modal open | `<Link>` everywhere; `setTab` for tabs; close the modal when a link is clicked | P3 |
| RH-11 | middleware.ts:104-118, 165-177 | The `org.` subdomain rewrite is dead or wrong (it gives 404s) | Remove it, or fix the order and matcher | P3 |

Checked and fine: no default form submits after hydration; no `location.assign`; `history.replaceState` is safe in 15.5; the only `key` remounts are correct.

## 19. Hydration
Every org `page.tsx` is a Server Component that renders only a client view inside a client `OrgShell` and passes **no data**. Login and signup are whole-page client components. There is **no date or locale mismatch today**, because every formatted value renders after a client fetch.

| ID | Where | Problem → what the user sees | Fix | Sev |
|---|---|---|---|---|
| RH-12 | useOrgRole.ts:46-62; OrgShell.tsx:46-48; FleetPanel.tsx:226-231; ParticipantsPanel.tsx:159; ContestConsole.tsx:167-177; SupportInbox.tsx:33-37 | The role starts as `null` on every mount, and the shell remounts on every navigation (RP-8). On every page an intern sees the full nav and admin or spend controls flash, then disappear. Support waits for the role before it **starts** fetching. | Read the role on the server in the org layout; provide it through context; `useSyncExternalStore` | P2 |
| RH-13 | app/layout.tsx:3-10; tailwind.config.ts:11-12 | Geist and JetBrains Mono come from `@fontsource` with `swap`, no preload and no metric-matched fallback, so text reflows and layout shifts on a cold load. | `next/font/local` (`geist`) with `adjustFontFallback` | P2 |
| RH-14 | globals.css:27; layout.tsx:41-55, 72 | The document root is dark (`color-scheme: dark`, `bg-black`) and only the shell wrapper is light, giving a dark scrollbar, dark overscroll and dark native controls. | Separate root layout for `(org)` with a light `<html>` and no marketing script | P3 |
| RH-15 | app/layout.tsx:25-31 | Title shows "Contests · AMS Access · AMS Access"; every contest tab is titled "Contest". | Bare titles plus `generateMetadata` | P3 |

Latent risks:
- `useOrgDesktopLayout` has a server snapshot of `false`, which would flip a server-rendered tree.
- `useNow` uses `useState(() => Date.now())`.

Both are safe today only because they render after a fetch.

## 20. Rendering and data flow
**Today, every screen runs in sequence:**
1. Skeleton HTML.
2. JS chunk.
3. Hydrate.
4. Effect.
5. `/api/org/*`.
6. ams-api.

No org data is server-rendered. There are no Suspense or streaming boundaries, no `useOptimistic`, and one `startTransition`.

**Relative dev chunk sizes:**
- problems 4.87 MB (CodeMirror)
- dashboard 3.69 MB (236 Astryx modules)
- login 1.98 MB
- support 1.95 MB
- contest 1.05 MB (well split)
- mails 0.60 MB, participants 0.56 MB, contests 0.47 MB

The two design systems are each shipped per route.

| ID | Where | Problem → what the user sees | Fix | Sev |
|---|---|---|---|---|
| RH-16 | ContestConsole.tsx:277, 310 | `setSummary` and `setSubmissions` store a new object on every poll with no equality check, and panels aren't memoised. The whole console and the 200-row table re-render **every 2s even when nothing changed**, causing input lag. | `equivalentJson` guard (already exists in contestReads.ts:9-28); `memo` the panels | P2 |
| RH-17 | ContestsView.tsx:111-131 | After End, Archive or Delete, the busy state clears before the refetch arrives, so the card shows the old status with its buttons **re-enabled**. A double click is easy, and with HS-1 that becomes a purge. | `useOptimistic`; keep busy until the refetch settles | P2 |
| RH-18 | orgQueryCache.ts:10-50; useApiQuery.ts:44-50 | Uneven caching. Dashboard, Contests, Problems and Profile show cached data instantly on Back. Students, Mails, Support, Fleet, Drafts and the contest console show a skeleton every time. The cache Map is never evicted, and every metadata read invalidates the contests list. | One query layer for every read; LRU of about 100 keys; a key scheme | P2 |
| RH-19 | app/layout.tsx:56-70 | Speculation rules **prerender /download and /contact in the background during a live contest**. | Move them to the marketing layout | P3 |

## 21. Target architecture (Next 15.5 / React 19)
| # | Change | Effort | Pri |
|---|---|---|---|
| A1 | **Persistent shell:** `OrgShell` in `(org)/org/layout.tsx` (fixes RP-8). `(org)` becomes its own root layout: light `<html>`, org fonts and CSS only (RH-13, RH-14, RP-7, RH-19). Login and signup go in a sibling group with no shell. | M | P1 |
| A2 | **Server-seeded session context:** the layout reads subject and role and renders `<OrgSessionProvider>`, so there is no role flash (RH-12). Clear the cache on a subject change, not on visiting login (RH-1). | M | P1 |
| A3 | **Boundaries:** `loading.tsx` per dynamic segment (RH-8); `error.tsx` inside the shell plus a per-panel ErrorBoundary around the `dynamic()` tabs (RH-9). | S | P1 |
| A4 | **Tabs that survive:** keep visited panels mounted, hidden with `hidden`/`inert`, and pass `active` so polling pauses. Use `<Activity mode="hidden">` once on Next 16 or Activity-capable React. **Not** route segments: parallel routes would remount and refetch for nothing, since the data is polled on the client. Long jobs move into the contest store with a navigation guard (RH-3, HS-7). | M | P1 |
| A5 | **Person panel as an intercepting route:** `contests/[uid]/@person/(.)participants/[handle]`. The contest stays mounted, Back closes the panel, and a shared link opens the full profile. Interim: `?person=`. | M | P2 |
| A6 | **URL state for filters and selection:** `useSearchParams` + `router.replace(…, {scroll:false})` (RH-5, RH-6). | S–M | P2 |
| A7 | **One client query layer:** LRU and TTL; every read goes through it; per-contest stores kept for N minutes; writes never aborted on unsubscribe; structural-sharing guard on every poller (RH-4, RH-16, RH-18). | M | P1 |
| A8 | **RSC seeding, selectively:** seed only cheap, mostly static first reads on the server (contest metadata, lists, profile) as `initialData`, wrapped in `<Suspense>` so the shell streams first. Keep polled feeds (summary, sessions, incidents, scoreboard) client-only: rendering them on the server means double fetching and data that is stale at hydration. Trade-off: the HTML becomes dynamic and time-to-first-byte gains one upstream round trip. | M | P2 |
| A9 | **Mutations:** `useOptimistic` for status changes (archive, end, publish, revoke, roster state); `useTransition` around write-then-revalidate; `useActionState` for create forms; login as a server action (fixes RH-7). | S (login) / M | P1 / P2 |
| A10 | **Hydration rules:** format dates only in client-only branches or behind `useHydrated()`; no `Date.now()`, `Intl` or `toLocale*` in server-rendered markup; media queries via `useSyncExternalStore`, preferring CSS when both trees are cheap; no browser APIs in `useState` initialisers. | S | P3 |
| A11 | **Downloads:** a shared `useDownload()`, with the `download` attribute as the stopgap (RH-2). | S | P1 |
| A12 | **Bundle:** dynamic-import ProblemSetting and the CodeMirror grammars (RP-6); one design system for the console, or Astryx in the shared layout; `optimizePackageImports` for lucide and Astryx. | M | P3 |

**Order:**
1. RH-2/A11, RH-7, RH-9/A3 and RH-1. These are small, and they stop state loss during a live contest.
2. A1, A2 and A4.
3. A7, then A5 and A6.
4. A8 and A12.

Not verified: production chunk sizes (no build was run), and bfcache behaviour for these `no-store` pages.
