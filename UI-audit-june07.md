# UI Audit - June 07

Perspective: senior product designer and frontend engineer reviewing AMS Access through a Google/Apple-level polish lens.

Scope reviewed:
- Marketing homepage, pricing, header, mobile nav, footer CTA.
- Org dashboard, new contest flow, contest detail, questions, invites, students, live monitor, settings.
- CP problem studio and shared global UI styling.
- Product screenshots referenced from `public/Contestant Hub Demo Page.png` and `public/App Window - Editor.png`.

Constraint: this is a source-level UI audit. The local image viewer failed in the sandbox, so I did not perform a live browser pass. Findings are based on implementation, copy, structure, visual system, and asset usage.

## Executive Read

The product has real depth. The issue is not that it feels empty; it feels over-assembled. The strongest "AI-coded / vibe-coded" signal is inconsistency: polished Apple-ish marketing, glassmorphism admin surfaces, dense dark engineering consoles, raw JSON/template editors, and generic launch copy all living beside each other without a single product design system governing hierarchy, states, density, or interaction.

The biggest credibility gap is between the product promise and the operator UI. AMS Access sells controlled evaluation infrastructure, but many critical workflows still expose internal machinery: plugin configs, raw HTML email templates, unmasked generated passwords, judge compute controls, `confirm()` deletion, default demo problem content, placeholder-style empty states, and inconsistent button treatments.

If Apple or Google touched this immediately, they would not start by adding more glow. They would simplify the interaction model, make the org portal feel like a mature operations console, replace raw engineering controls with guided workflows, and unify the component language.

## What Screams AI-Coded

### 1. Generic aspirational hero copy

Previous homepage headline:

`Experience liftoff with the next-gen evaluation platform`

This reads like generated SaaS copy. It does not say what the product actually does in the first viewport. "Liftoff," "next-gen," "level up," "achieve new heights," and similar phrasing are classic AI-copy tells because they create energy without specificity.

What a top-tier team would do:
- Use the product/category as the headline.
- Put the concrete benefit in the supporting line.
- Show the actual controlled assessment product immediately.

Implemented direction:
- `Serious online rounds need a controlled shell`
- `AMS Access pairs a locked desktop workspace with live integrity signals, candidate timelines, and reviewer-ready evidence for every assessment session.`

### 2. Decorative gradients where product proof should be

The homepage hero is mostly white space and large copy. The product screenshots appear later in the page. For a product like this, the first viewport should prove the system is real: controlled desktop shell, proctoring signal, live monitor, or review timeline.

The gradient glow around screenshots also feels like a quick "premium" shortcut. Apple/Google would use restraint: clean product frames, precise shadows, real UI context, and one clear visual narrative.

### 3. One-note purple/slate design language

Purple appears as selection color, nav active state, CTA hover accents, glows, chips, pricing highlights, problem studio accents, and empty-state decoration. Slate/white/purple is doing too much work.

This makes screens feel templated. Mature systems use color semantically:
- Purple/brand: primary product identity.
- Green: ready/success.
- Amber: pending/risk.
- Red: destructive/critical.
- Blue/cyan: informational/system.
- Neutral: structure and hierarchy.

Right now purple is both brand and generic decoration.

### 4. Rounded-full buttons everywhere

Previous issue: the marketing header, homepage CTAs, dashboard "New contest," contest actions, invite actions, student import actions, settings save actions, and pricing CTAs all leaned on pill buttons.

Pill buttons can work for badges, chips, and status indicators, but action controls now use calmer rectangular buttons with 6-8px radius, square-ish icon buttons for small controls, and clearer primary/secondary/destructive treatments.

Implemented direction: keep pill geometry for non-action metadata only; product actions should feel steady, operational, and intentionally ranked.

### 5. Hover scale as default polish

Previous issue: several CTAs used `hover:scale-105` or similar. This is a common "looks interactive" trick, but on serious productivity software it can feel toy-like and physically unstable.

Implemented direction: ordinary controls now rely on subtle color/elevation changes. The global `button:active` scale and `ams-cta-*` hover lift were removed, so action controls no longer physically jump or shrink. Motion stays reserved for meaningful UI transitions and icon-level affordances.

### 6. Raw implementation concepts are visible to normal users

Examples:
- `Plugin config (JSON)` in new contest and settings.
- `CP`, `CHESS`, `IOI`, `ICPC`, `CF` as unexplained primary choices.
- `Judge: Ready (0/0 up, target 0) - mode AUTO`.
- `LIVE STREAMED (SSE)` and `POLLING FALLBACK`.
- `RESOLVING...` and `NO CODE ASSIGNED`.
- HTML body template editing for invites.
- Generated passwords visible in a student table.

These are internal system states, not operator-facing product language. They make the UI feel unfinished even if the backend is sophisticated.

### 7. Mixed visual systems inside one workflow

The org dashboard is light, clean, and slate-based. The CP problem studio is a dark, dense console with white-on-black controls. Admin pages use glass cards. Marketing uses airy Apple-inspired sections. Contest detail bypasses the shared org shell and builds its own page chrome.

The result feels like multiple prototypes merged together.

### 8. Placeholder/demo content leaks into authoring UX

The default question content includes a maximum subarray problem, an Unsplash image, and an "Interactive Array Simulator" embedded as raw HTML. This is clever technically, but it reads as generated sample content rather than production UX.

A polished product would provide templates with explicit names:
- Blank problem
- Standard CP problem
- Interactive problem
- Import from Polygon/testlib
- Import from Markdown

It would not silently seed a real-looking example into the user's working problem.

## UI Parts That Do Not Look Finished

### Marketing homepage

Unfinished signals:
- Hero has no immediate product artifact.
- Headline is generic and not product-specific.
- "Explore use cases" jumps to cards that also use generic phrasing.
- "Available at no charge" and "Now Available!" feel like badges from a launch template, not a serious product hierarchy.
- Screenshot zoom buttons are useful, but they are visually bolted on rather than integrated into a product gallery.
- Target audience cards use large rounded containers and centered text without enough content density.

What should change:
- Put a real product frame in the hero.
- Replace generic claims with operational specificity.
- Add proof: platform support, controlled shell, live integrity timeline, evidence export, judge capacity.
- Turn use cases into concrete cards: campus contests, hiring rounds, remote exams, training cohorts.

### Marketing nav

Unfinished signals:
- Desktop CTA is only `Download`, which fits individual users but underserves organizations.
- Nav mixes website sections and procurement sections without prioritization.
- Mobile nav labels differ from desktop nav: `Download` becomes `Desktop details`.
- Mobile nav contains a card saying `Desktop app ready` with no action or state.

What should change:
- Primary CTA should adapt by audience: `Download app` and `Book demo` / `Create org`.
- Use consistent nav labels across desktop and mobile.
- Add a product dropdown or concise "Platform" grouping if the site grows.

### Footer CTA

Unfinished signals:
- `Download AMS / Access for your platform` split across two headings feels forced.
- The animated cursor bar is a familiar AI-landing-page trope.
- CTA is only `Download`, with no organization path.

What should change:
- Use one clear headline.
- Add platform-specific download affordances.
- Add secondary CTA for organizations.

### Pricing page

Unfinished signals:
- The page has strong information architecture, but it is visually repetitive: eyebrow, large heading, card, card, card.
- The comparison table is useful but likely hard to scan on smaller screens.
- Pricing philosophy is in a card that feels like a prose block, not an interactive buying aid.
- The purple blurred oval behind comparison is decorative, not functional.

What should change:
- Add a sticky plan selector.
- Add "recommended for" cards tied to actual usage scenarios.
- Let users compare only two plans.
- Add procurement-friendly CTAs: `Request quote`, `Talk to deployment`, `Download security brief`.

### Org portal shell

Unfinished signals:
- Sidebar is fixed at `w-60` with no responsive/collapsed state.
- The active nav treatment is a purple stripe plus purple icon plus purple background; it is over-signaled.
- `Problemsetting Guide` is awkwardly long and lacks spacing polish.
- Sign out is a bare text button with no icon and no account menu.
- The org avatar is just the first letter in a circle.

What should change:
- Add collapsed sidebar behavior and mobile drawer.
- Add top-level org switch/account menu.
- Rename `Problemsetting Guide` to `Docs` or `Problem guide`.
- Add a global search/command menu for contests, candidates, docs.
- Add consistent shell across dashboard, contest detail, docs, and settings.

### Org dashboard

Unfinished signals:
- Stat cards use a decorative gray mini bar that communicates nothing.
- Loading values render as `-` instead of proper skeleton values.
- Empty state uses a tiny gray dot icon, which feels placeholder-like.
- Contest cards are clickable but do not expose quick actions or next required step.
- Status chips show raw enum values: `ACTIVE`, `SCHEDULED`, `ENDED`.

What should change:
- Use meaningful metrics: active sessions, pending invites, runtime readiness, risk flags.
- Replace raw enums with sentence case labels and semantic icons.
- Add next actions: `Launch readiness`, `Invite candidates`, `Review live`, `Edit schedule`.
- Empty state should show a simple contest creation checklist, not a generic icon.

### New contest flow

This is one of the highest-priority unfinished areas.

Current problem:
- The form asks for title, description, contest type, scoring type, languages.
- It silently sets `start_at` to now and `end_at` to one hour later.
- The copy says timings/status are configured after creation.
- CHESS exposes `Plugin config (JSON)`.

Why this feels cheap:
- Creating a contest is a high-stakes setup workflow. Hiding schedule fields until after creation creates distrust.
- Raw JSON says "prototype/admin tool," not "finished product."
- CP/CHESS are product modes, but they are presented like enum toggles.

What should replace it:
- A multi-step contest setup wizard:
  1. Basics: title, description, audience.
  2. Format: coding, chess, mixed, scoring mode.
  3. Schedule: start, end, timezone, late entry policy.
  4. Environment: allowed languages, desktop restrictions, proctoring level.
  5. Candidates: invite now, import roster, or skip.
  6. Launch readiness: runtime, judge capacity, questions, invites, schedule.
- Save as draft at every step.
- Show an always-visible readiness checklist.

### Contest detail page

Unfinished signals:
- It does not use `OrgPortalShell`, so navigation disappears compared with dashboard/new contest/docs.
- Top-level width is `max-w-5xl`, but `QuestionForm` mutates DOM classes to expand the wrapper. That is a major implementation smell that can produce layout bugs.
- Judge compute controls are exposed as small buttons in the header with operational language.
- Tabs are simple, but there is no summary strip showing contest health.
- Back link is a plain `Dashboard` link rather than integrated shell navigation.

What should change:
- Put contest detail inside the org shell.
- Add a contest overview header with health summary:
  - Schedule
  - Questions
  - Candidates
  - Runtime
  - Readiness
  - Last activity
- Move judge capacity into a guarded `Runtime` panel with explanations and confirmation.
- Replace DOM class mutation with a real layout variant.

### Questions tab

Unfinished signals:
- Empty state says `Add competitive programming problems` but has no CTA in the empty card itself.
- Question cards show HTML/CSS/JS tags, which seem inherited from web-dev assessments even though CP is now central.
- Delete button is icon-only without visible confirmation or accessible destructive flow.
- Chess mode shows a green information panel rather than an integrated mode-specific workflow.

What should change:
- Add an empty-state CTA: `Add problem`, `Import problem`, `Create from template`.
- Show problem readiness: statement, validator, tests, checker, model solution, prejudge status.
- Add row actions through a menu: edit, duplicate, reorder, archive, delete.
- For Chess mode, replace the CP tab with a dedicated ruleset/testplay dashboard.

### CP Problem Studio

This is functionally rich but visually the least resolved.

Unfinished signals:
- It is a dark app-within-an-app inside a light admin flow.
- It uses extremely small type across dense panels.
- The left sidebar tabs, top labels, sub-tabs, code editors, previews, and validation jobs all compete for attention.
- It exposes implementation details: generator scripts, testlib boilerplate, checker code, cloud sync, job IDs.
- The workflow dots show progress, but the actual next step is not obvious enough.
- `dangerouslySetInnerHTML` enables embedded custom HTML in problem statements; even if controlled, the UX for it feels raw.
- The studio defaults to a full maximum-subarray problem with an Unsplash image and custom inline simulator.

What Apple/Google would do:
- Keep the studio light or give the whole contest builder an intentional dark "developer mode." Do not mix casually.
- Split authoring into clear modes:
  - Statement
  - Constraints
  - Samples
  - Validator
  - Checker
  - Tests
  - Prejudge
  - Publish
- Add a persistent right rail: `Problem readiness`.
- Hide advanced code/editor panels behind progressive disclosure.
- Provide import/export flows for testlib/Polygon-style assets.
- Replace raw embedded HTML with controlled interactive blocks/components.

### Invites tab

Unfinished signals:
- Invite composer exposes raw template placeholders.
- Template preview is plain text in a bordered box.
- Button has class-based slate styling plus inline mouse handlers that set purple backgrounds. That is a visible engineering smell and can create inconsistent hover states.
- Session code generation is mixed into invite management but not visually elevated.

What should change:
- Separate `Invite candidates` and `Access code` into distinct panels.
- Provide a polished email preview with sender, subject, body, and variable chips.
- Add CSV upload, paste emails, validation, duplicate detection, and unresolved domain warnings.
- Replace inline hover handlers with standard button variants.

### Students tab

Unfinished and risky signals:
- Generated passwords are visible directly in the table.
- CSV paste/import is useful, but the UI language feels like an internal provisioning console.
- `Permanent Contest Access Code` uses `RESOLVING...` and `NO CODE ASSIGNED` language.
- Email dispatcher exposes raw HTML and template presets with dramatic text like `IMMEDIATE ACTION REQUIRED`.
- `Gmail-style Real-Time HTML Preview` sounds demo-ish rather than product-grade.
- Partial retry button has `bg-slate-950` and `text-slate-950`, making the text likely invisible.
- Some success/error colors use dark-mode tones on light cards, e.g. `text-emerald-300`, `text-red-300`.

What should change:
- Mask generated passwords by default; reveal/copy only per row or bulk export with confirmation.
- Add credential lifecycle: generated, sent, opened, registered, reset, revoked.
- Rename technical states to human states: `Loading access code`, `No active code`.
- Replace raw HTML composer with a template builder.
- Add batch actions: send, resend failed, reset credentials, export CSV.

### Live monitor tab

Unfinished signals:
- `LIVE STREAMED (SSE)` and `POLLING FALLBACK` are developer transport details.
- The three-column tables are cramped and likely hard to read during an active contest.
- Runtime status and proctor/submission/infra events are separate lists, but operators need a single incident timeline.
- Color classes mix light backgrounds with low-contrast dark-theme text.

What should change:
- Rename transport display to `Live` / `Reconnecting` / `Delayed`.
- Add live incident timeline with filters: submissions, proctor, infrastructure.
- Add severity grouping and acknowledgement states.
- Add participant drilldown.
- Add live counters: active candidates, submissions/minute, critical events, judge queue.

### Settings tab

Unfinished signals:
- Uses browser `confirm()` for deleting a contest.
- `Plugin Configuration` exposes JSON directly.
- Status and scoring use raw enum buttons.
- Delete contest is visually available at the same level as save changes.

What should change:
- Use a typed confirmation modal requiring the contest name.
- Move destructive actions into a danger zone.
- Replace JSON with mode-specific settings forms.
- Add validation summaries and unsaved-change state.

### Admin surfaces

The source scan shows many admin pages still using `glass-card`, `glass-input`, and dark glass styling. This likely makes admin feel like an older prototype beside the newer org portal.

What should change:
- Decide whether admin is an internal dark console or part of the same product suite.
- If internal, make it intentionally dense and functional.
- If customer-facing, migrate to the same light operations design system.

## Buttons And Controls That Feel Cheap

### Cheap pattern: pill CTA everywhere

Previous examples:
- Homepage `Download Access`
- Dashboard `New contest`
- Contest `Add question`
- Invite `Send invites`
- Settings `Save changes`
- Student `Process & Import Roster`

Why it felt cheap:
- Same shape was used for marketing, creation, save, send, import, and destructive-adjacent operations.
- There was no explicit system for primary/secondary/tertiary/destructive/icon-only controls.

Implemented system:
- `ams-btn`: shared base with 8px radius, stable color/elevation transitions, and accessible focus ring.
- `ams-btn-primary`: solid dark primary action, used once per action region where possible.
- `ams-btn-secondary`: neutral bordered action for lower-priority commands.
- `ams-btn-muted`: quiet neutral action for supportive CTAs.
- `ams-btn-danger`: red destructive action that is never styled like primary.
- `ams-btn-success`: operational success/start/readiness action.
- `ams-btn-inverse`: dark-section CTA.
- `ams-icon-btn`: fixed square icon-only control.
- `ams-btn-overlay-light` / `ams-btn-overlay-dark`: image/modal overlay controls.

### Cheap pattern: tiny uppercase labels everywhere

Uppercase tracking is used heavily across dashboard, pricing, settings, studio, tables, and cards. It can look premium in small doses, but overuse creates a "template" texture and reduces readability.

Recommendation:
- Use uppercase only for section metadata and table headers.
- Use sentence case labels for forms, tabs, cards, and status.

### Cheap pattern: generic empty-state icons

Examples:
- Empty dashboard uses a tiny gray dot.
- Empty questions uses a tiny gray dot.
- Empty invites uses a mail icon but no next action.

Recommendation:
- Empty states should answer:
  - What is empty?
  - Why does it matter?
  - What should I do now?
  - What happens after I do it?

### Cheap pattern: raw browser dialogs

`confirm("Delete this contest...")` immediately lowers perceived quality.

Recommendation:
- Use a product modal with context, consequences, typed confirmation, and alternate action.

### Cheap pattern: inline styles and event-driven styling

Inline styles appear in segmented controls, invite button hover logic, pricing cards, demo widgets, and admin pages. This is not always wrong, but repeated inline styling means the component system is not mature enough.

Recommendation:
- Move recurring styles into component variants.
- Use a small `Button`, `Badge`, `Card`, `Input`, `Tabs`, `SegmentedControl`, `StatusPill`, `Dialog`, and `Toast` system.

## What Looks Unfinished From A UX Perspective

### Contest creation does not feel launch-safe

Creating a contest should feel like preparing a controlled event. The current flow feels like creating a database row and configuring details later.

Missing:
- Schedule upfront.
- Timezone clarity.
- Draft vs scheduled explanation.
- Candidate entry policy.
- Runtime readiness.
- Question readiness.
- Proctoring settings.
- Confirmation before launch.

### Critical actions lack safety

Examples:
- Start/stop compute.
- Delete contest.
- Send bulk emails.
- Reveal/export credentials.
- Change contest mode.

Missing:
- Confirmation modals.
- Preview of impact.
- Permission/role cues.
- Audit trail.
- Undo/recovery where possible.

### Status language is too technical

Developer-facing:
- SSE
- Polling
- target size
- mode AUTO
- plugin config
- runtime status COLD/WARMING/READY

Operator-facing:
- Live
- Reconnecting
- Compute ready
- Warming up
- Needs attention
- Contest mode
- Advanced runtime settings

### Error and success states are inconsistent

There are inline red boxes, green boxes, alert(), confirm(), small text errors, status badges, and no unified toast/banner system.

Recommendation:
- Use page-level banners for blocking errors.
- Use inline field errors for form validation.
- Use toasts for successful background actions.
- Use persistent status panels for async jobs.

### Responsive behavior is incomplete

The marketing mobile nav is built, but the org portal shell has a fixed sidebar and product tables that likely overflow. Apple/Google would not ship an org console with desktop-only assumptions unless explicitly scoped.

Recommendation:
- Add mobile/tablet behavior for org portal:
  - Collapsed sidebar.
  - Sticky top bar.
  - Horizontally scrollable tabs with clear affordance.
  - Responsive tables that become cards or support column controls.

## What Apple Or Google Would Change Immediately

1. Replace generic homepage copy with product-specific positioning.
2. Put real product UI in the first viewport.
3. Create a unified design system before adding more screens.
4. Remove raw JSON/template/transport details from primary workflows.
5. Turn contest creation into a guided launch workflow.
6. Move contest detail into the same org shell.
7. Add launch readiness and health summary to every contest.
8. Replace browser confirm/alert with product dialogs and toasts.
9. Redesign CP Problem Studio information architecture.
10. Mask credentials and improve bulk invite safety.
11. Reduce purple/glow/hover-scale decoration.
12. Normalize button shapes, status chips, cards, inputs, tabs, and tables.
13. Fix dark-on-light contrast mismatches in live/students panels.
14. Add action menus and confirmations for destructive row actions.
15. Replace demo-ish copy like `Gmail-style Real-Time HTML Preview` with calm product language.

## Additional UI They Would Add

### 1. Contest launch checklist

A persistent checklist on contest detail:
- Basics complete
- Schedule set
- Questions ready
- Test data validated
- Candidates invited/imported
- Runtime ready
- Proctoring configured
- Reviewers assigned
- Launch approved

This should produce a clear state: `Draft`, `Ready to launch`, `Live`, `Needs attention`, `Ended`.

Implemented:
- Added a contest detail launch checklist that reads existing contest, question, invite, judge, mode, and schedule state.
- Added the derived launch state badge: `Draft`, `Ready to launch`, `Live`, `Needs attention`, or `Ended`.
- Kept reviewer assignment as pending because that data is not currently exposed in the contest payload.

### 2. Contest overview dashboard

At the top of contest detail:
- Active candidates
- Submissions
- Critical integrity events
- Judge health
- Invite acceptance
- Time remaining
- Last readiness check

This replaces the current header's overloaded judge chip/buttons.

### 3. Setup wizard

Guided flow for new contests with autosave and a left stepper:
- Basics
- Format
- Schedule
- Environment
- Problems
- Candidates
- Review and launch

The current single form should become a fast path only for advanced users.

### 4. Problem readiness rail

Inside CP Problem Studio:
- Statement: complete/incomplete
- Constraints: complete/incomplete
- Samples: complete/incomplete
- Validator: compiled/error
- Checker: selected/compiled/error
- Tests: count/synced
- Prejudge: passed/failed/not run
- Publish: blocked/ready

This gives the dense studio a spine.

Implemented:
- Added a persistent CP Problem Studio readiness rail.
- Readiness is derived from the current editor state: statement, constraints, samples, validator, checker, saved tests, prejudge result, and publish readiness.
- The rail does not remove any existing studio controls; it adds a scanable spine beside the current workflow.

### 5. Runtime health center

A dedicated runtime panel:
- Compute state
- Queue depth
- Last cold start
- Region
- Current actions
- Start/stop controls with permission and confirmation
- Incident history

Do not put start/stop compute as tiny header buttons.

### 6. Candidate operations table

Replace scattered invites/students views with a stronger candidate model:
- Candidate
- Email
- Invite status
- Credential status
- Session status
- Risk status
- Last seen
- Actions

Filters:
- Not invited
- Invite failed
- Registered
- Active now
- Flagged
- Needs credential reset

### 7. Secure credential drawer

Credentials should not be visible by default. Add:
- Masked password field.
- Copy username/password actions.
- Reset password action.
- Export selected credentials with confirmation.
- Audit event when secrets are revealed/exported.

### 8. Email template builder

Replace raw HTML editing with:
- Subject field.
- Rich text blocks.
- Variable chips.
- Preview tabs: desktop, mobile, plain text.
- Send test email.
- Validation for missing required variables.

Keep raw HTML under `Advanced`.

### 9. Unified activity timeline

Every contest needs a timeline:
- Contest created
- Questions added/edited
- Runtime warmed
- Invites sent
- Candidate joined
- Submission received
- Proctor event raised
- Reviewer action taken
- Contest ended

This is essential for trust in high-stakes evaluations.

### 10. Command menu

The repo has a `CommandMenu` component. The org portal should expose it:
- Search contests
- Jump to candidate
- Create contest
- Open docs
- View live monitor
- Invite candidates

This would make the product feel fast and professional.

### 11. Design-system docs page

Internal, but valuable:
- Buttons
- Inputs
- Cards
- Tables
- Badges
- Status language
- Empty states
- Modals
- Toasts
- Color semantics

This prevents future screens from drifting.

## Screen-By-Screen Priority Fixes

### Homepage

Priority:
- Replace headline and hero layout.
- Move product screenshot/proof into first viewport.
- Add organization CTA.
- Remove generic audience copy.

Suggested hero:
- Headline: `Controlled coding assessments, from invite to evidence`
- Body: `AMS Access gives organizations a locked desktop workspace, live integrity monitoring, judge runtime controls, and reviewer-ready session history.`
- CTAs: `Download app`, `Book demo`
- Visual: product frame showing candidate workspace + live monitor summary.

### Pricing

Priority:
- Add plan selector and scenario cards.
- Add procurement/security CTAs.
- Reduce repeated card prose.
- Make comparison easier to scan.

### Dashboard

Priority:
- Add operational metrics.
- Improve empty state.
- Add quick actions per contest.
- Normalize status labels.

### New Contest

Priority:
- Add schedule fields.
- Hide JSON.
- Add setup steps.
- Add draft/readiness model.

### Contest Detail

Priority:
- Use org shell.
- Add health summary.
- Move runtime controls into a panel.
- Add activity timeline.

### CP Studio

Priority:
- Unify visual language.
- Add readiness rail.
- Reduce default demo content.
- Hide advanced code until needed.
- Replace raw embedded HTML with structured interactive blocks.

### Invites / Students

Priority:
- Merge around candidates.
- Mask credentials.
- Add safer bulk operations.
- Replace raw HTML/template editors with guided composer.

### Live Monitor

Priority:
- Rename developer transport states.
- Add event timeline.
- Add severity filters.
- Fix contrast.

### Settings

Priority:
- Add typed delete modal.
- Move danger zone.
- Replace JSON with typed settings.
- Show unsaved changes.

## Design System Recommendations

### Color

Use semantic color rules:
- Brand: purple, used sparingly.
- Success/ready: green.
- Warning/pending: amber.
- Danger/critical: red.
- Info/system: blue.
- Neutral: slate/gray.

Reduce purple glows and blurred decorative backgrounds in product surfaces.

### Shape

Recommended radius:
- Buttons: 8px.
- Inputs: 8-10px.
- Cards: 8px for dense product surfaces, 12px max for marketing.
- Modals: 12px.
- Pills only for tags/status, not every primary action.

### Motion

Remove most hover scale. Use:
- 120-180ms color/elevation transitions.
- Meaningful loading states.
- Skeletons for data loads.
- Reduced motion support.

### Typography

Reduce uppercase tracked labels. Use:
- Clear sentence-case form labels.
- Larger table row text in operational views.
- Monospace only for code, IDs, credentials, and logs.

### Components to standardize

Build or formalize:
- `Button`
- `IconButton`
- `Input`
- `Textarea`
- `Select`
- `SegmentedControl`
- `Tabs`
- `StatusBadge`
- `Card`
- `DataTable`
- `EmptyState`
- `Dialog`
- `Toast`
- `Banner`
- `ActionMenu`
- `Stepper`
- `ReadinessChecklist`

## Copy Guidelines

Avoid:
- next-gen
- liftoff
- level up
- achieve new heights
- now available
- fully-featured
- exactly what students will see
- live streamed (SSE)
- polling fallback
- plugin config

Prefer:
- controlled coding round
- locked desktop workspace
- live integrity signals
- reviewer-ready evidence
- judge/runtime readiness
- candidate access
- contest launch checklist
- session timeline

## Highest-Impact Fix Order

If only two weeks are available:

1. Rewrite homepage hero and add product visual in first viewport.
2. Unify buttons, badges, cards, tabs, inputs, dialogs, and toasts.
3. Rework new contest into a setup wizard with schedule fields.
4. Put contest detail into org shell and add health/readiness summary.
5. Hide raw JSON/template/transport details from default UI.
6. Mask generated passwords and add secure credential actions.
7. Replace confirm/alert with product dialogs/toasts.
8. Fix contrast issues in live/students/job states.
9. Add real empty-state CTAs.
10. Add launch checklist.

## Final Assessment

AMS Access has enough functionality to feel serious, but the UI currently reveals too much of how it was assembled. The most visible AI-coded tells are generic copy, purple/glow overuse, pill-button sameness, raw implementation controls, and inconsistent shells.

The path to a premium feel is not more decoration. It is stronger product specificity, fewer raw controls, calmer information hierarchy, safer critical actions, and a unified operations design system.

The product should feel less like "a powerful prototype with nice sections" and more like "mission control for controlled assessments."
