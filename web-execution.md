# Access website execution plan

Prepared 10 October 2026  
Scope: marketing website, public documentation, download experience, and the notices/support information connecting them to the desktop app.  
Status: work packages A, factual privacy/monitoring in B, and download/release alignment in C are implemented and reviewed locally. Final legal publication, tested support commitments and older-version policy still need owner decisions. See the execution record for deployment status.

## 1. Recommended direction

Keep the current light design, typography, tagline, screenshots and restrained navigation. The next improvement should make the site easier to evaluate and use: give each audience the right destination, show complete workflows, answer practical questions, and support public claims with verified facts.

Claude’s review identifies several real gaps. Its strongest findings are the mislabeled access links, visible media placeholders, thin organizer/reviewer documentation, incomplete pricing explanation, and draft website legal pages. Its conclusions about the absence of live support, a contradiction between flags and automated outcomes, and the need for a public recruiter product are not established by the evidence.

The work should proceed on two tracks:

- **Website improvements we can implement from existing evidence:** routing, accurate link labels, removal of unfinished public media, documentation structure, and release metadata.
- **Statements that need accountable owners:** legal identity, data handling and retention, supported environments, exact installer signing status, pricing, support commitments, and permission to publish customer/program evidence.

Do not delay the first track while gathering facts for the second. Do not fill gaps in the second with plausible-sounding copy.

## 2. Baseline and evidence boundaries

The production baseline is commit **d276e93**, which includes the About AMS page and the approved public inboxes.

The following work was completed before package A and deployed in commit **2de50ba**:

- Frosted marketing navbar on scroll, with solid menus and accessibility fallbacks.
- Three-platform availability grid in the product setup section.
- Architecture-aware download recommendations, manual chip/distribution choices, and matching-file highlighting.
- Nineteen installer-selection tests and 112 production-preview browser assertions.

Preserve these changes in subsequent batches. Do not recreate them as new tasks. The compatibility grid does **not** replace a supported-environment specification.

Evidence checked for this plan:

- Claude’s supplied review.
- Current website source in the main-based working checkout.
- Live public changelog: the empty release-note notice is still present.
- Public latest-release metadata: **v2.3.1**, published **8 October 2026**, seven installer assets, SHA-256 digests and four checksum manifests.
- Desktop app source and the **v2.3.1 tag**, including its separate privacy page.
- Independent subagent audits of visitor journeys and trust/documentation.

Code establishes that a capability exists in that source. It does not, by itself, establish production configuration, successful delivery, legal commitments or the behavior of a particular downloaded binary. Those distinctions must remain visible in the implementation evidence.

### Findings to accept, qualify or reject

| Review finding | Assessment | Action |
|---|---|---|
| Organizer/partner links lead to candidate downloads | Confirmed in shared link usage | Separate destinations and label the action accurately. |
| Three unfinished media areas are public | Confirmed: homepage walkthrough and product organizer/review media | Suppress unavailable media immediately; replace with verified assets later. |
| “Available session activity” is too vague | Valid | Define verified information categories and their use. |
| Security says flags decide nothing, contradicting terms | Overstated | Current security FAQ already distinguishes automated judging/entry checks from activity flags. Consolidate that explanation. |
| Website privacy/terms are non-effective drafts | Confirmed | Resolve facts and approval; align website, desktop and round notices. |
| Candidates have never received an effective notice | Not established | The v2.3.1 app contains a policy dated May 27, 2026. Audit all surfaces and delivery points. |
| No installer integrity information exists | Incorrect at release level; valid for website visibility | Existing release metadata includes digests/manifests. Expose validated information through the site. |
| No public notes means the product is not shipping | Unsupported | Publish curated notes tied to real releases. |
| Contact is not live support, therefore no live support exists | Unsupported | Confirm the organizer’s live-round process and AMS escalation route. |
| Missing prices, SLAs, customers, APIs and certifications are all defects | Too broad | Provide decision-useful facts for actual offerings. Do not invent commitments or features. |
| About is a company page | Correct by design | Keep AMS’s company identity; add approved evidence when available. |
| The amshq.in inboxes should be replaced | Rejected | Preserve the user-approved addresses and explain the AMS relationship. |
| Windows/Linux ARM builds must be added | Product/platform decision | State current release availability; assess demand and engineering support separately. |
| AppImage size proves a dependency model | Speculative | Document dependencies from packaging and installation tests, not file size. |

## 3. Priority and delivery order

| Work package | Priority | Dependency | Completion evidence |
|---|---|---|---|
| A. Correct routing and remove unfinished public content | P0 — immediate | Existing destinations and media state | Every label matches its destination; no visible placeholders. |
| B. Reconcile notices and publish a clear monitoring explanation | P0 — trust readiness | Engineering data inventory, operator decisions, legal review | Accurate, aligned notices and useful information before installation/permissions. |
| C. Make downloads, requirements and release information consistent | P1 | Release evidence and supported-version policy | Version-bound installer details, requirements and public updates agree. |
| D. Complete product proof and task documentation | P1 | Verified capabilities, sanitized screenshots | Organizers, candidates and reviewers can complete documented tasks. |
| E. Explain pricing and the enquiry process | P1 | Commercial/support owner inputs | Visitors understand the quoting model and what happens next. |
| F. Add selective company/program evidence | P2 | Public links and publication permission | Only verified, relevant company proof is added. |
| G. Integrated review and release | Required for each batch | Its dependent facts and approvals resolved | Functional, content, accessibility and production checks pass. |

A can ship independently. B’s evidence collection should start immediately in parallel with A and C. D depends on the relevant capability findings, and E can progress as its commercial facts arrive. Legal/publication dependencies must block only the statements or flows that depend on them.

## 4. Work package A — make the next action unambiguous

### Separate candidate, organizer and prospective-customer journeys

Introduce clearly named destinations in the shared product-links module. Audit every use across the header, mobile menu, homepage, product, footer, docs, changelog and download page.

| Visitor intent | Public wording | Destination |
|---|---|---|
| Candidate preparing for a round | **Download Access** / **Candidate downloads** | https://app.amsaccess.com |
| Existing organizer | **Organizer sign in** | https://www.amsaccess.com/org/login |
| Team evaluating Access | **See how Access works** | /product |
| Team discussing an assessment | **Contact the team** | /contact |
| Existing partner or sponsorship enquiry | **Partners & sponsorships** | partners@amshq.in |
| Existing recruiter account, if this remains a supported public entry | **Recruiter sign in** | https://www.amsaccess.com/firms/login |

Make organizer sign-in visible in desktop and mobile navigation. Replace ambiguous “Open Access” labels where the result is only a download page. Keep the candidate download action visually easy to find; keep prospective-customer enquiries separate from returning-user login.

The recruiter route already exists. Its existence is not enough to advertise talent discovery as a public product. AMS must decide whether that entry remains an existing-user utility, becomes a supported public destination, or is removed from public navigation.

Use the verified /org/login route first. Do not assume the org subdomain root is equivalent or change host routing without separate verification. Likewise, the presence of an /org/signup route does not establish that unrestricted self-service signup is an approved offering.

### Remove unfinished presentation

- Hide the entire homepage walkthrough when its recording is unavailable, including any introduction promising a walkthrough.
- Remove public “Screenshot to be added” frames. Give the organizer and review sections a complete text-first layout until their assets are ready.
- Preserve media slots in code so approved screenshots and the user’s animation can be added later.
- Keep the existing candidate screenshots and their example-data labels.
- Do not substitute candidate submission history for an organizer results screen.
- When a walkthrough is supplied, provide a poster, captions/transcript, a clear play control and responsive framing.

**Acceptance:** no visible placeholder language or empty media shells; links work while logged out; organizer and candidate paths each take one direct action from navigation; existing authentication behavior is preserved.

## 5. Work package B — establish one accurate trust story

### B1. Build the information-handling inventory

Engineering and the operational owner should trace each information category through:

**Collection → local storage → transmission → access → retention/deletion.**

Cover website enquiries separately from assessment accounts, answers, results, device checks, activity events, media and incident reports. Verify the deployed backend/configuration as well as the released client.

For each category, record purpose, collection conditions, destination, reviewer access, actual retention/deletion behavior and an accountable owner. Mark unknowns explicitly in the internal register.

The desktop app’s v2.3.1 policy is dated May 27, 2026, whereas the website shows review drafts. The app distinguishes local calibration snapshots from other possible session media. The tagged source also contains presence-anomaly images. Reconcile these categories and conditional behaviors carefully: do not turn a statement about local calibration into “no images ever leave the device,” or infer that all video/audio is continuously recorded.

### B2. Resolve and publish the notices

Required owner inputs:

- Full legal operator identity and appropriate contact details.
- Responsibilities of AMS, the organizer and service providers.
- Applicable markets/jurisdictions and eligibility or age rules.
- Hosting/processing locations and relevant subprocessors.
- Retention periods or criteria, deletion operations and any review/dispute exceptions.
- Privacy-request process, escalation owner and acceptance/notice delivery process.

Counsel should assess applicable current requirements against this inventory. The website review does not establish a legal violation or the absence of other applicable agreements.

Publish consistent notices across marketing pages, downloads, the desktop app and round instructions. Apply effective dates and version history only when approved. Keep draft labels until the documents are actually finalized. Do not replace missing facts with generic legal prose.

### B3. Explain checks and recording before installation and permissions

Create one canonical public guide: **“What Access checks and records.”** Link it near downloads and from candidate setup, device checks, security and reviewer documentation.

Use a short matrix:

| Category | What the reader needs to learn |
|---|---|
| Camera and microphone | Permission purpose; readiness versus session use; whether media is transmitted or retained for this configuration. |
| Device and application environment | What categories are checked, why, when they apply, and what to do if a requirement cannot be met. |
| Session activity | Verified categories such as window/focus, connection or other supported events; their review purpose. |
| Answers and submissions | Saved work, submitted work, judging results and relevant timestamps. |
| Incident reports | What diagnostics are included, who receives them and how successful submission is confirmed. |

Distinguish camera presence checks from identity verification; do not imply identity verification unless it is a verified capability. Likewise, distinguish microphone permission and live use from audio recording and storage.

Include who can review the information and a retention reference. Keep round-specific information explicit; a general guide cannot replace the organizer’s notice for that assessment.

Public explanations must omit enforcement thresholds, sampling schedules, restricted-process lists, bypass-relevant details, internal endpoints and repositories.

### B4. Use one consistent explanation of decisions

Keep these four concepts distinct:

1. Code judging can produce automated evaluation results.
2. Required readiness or entry checks can prevent participation when unmet.
3. Session activity provides context for review; an activity flag alone is not proof of misconduct.
4. The organizer explains the decision, technical-help and review routes for the round.

Use a concise version where a reader needs it, with links to the detailed explanation. Reduce repeated caveats without removing material limits. Do not claim that all decisions are human or that a failed technical check proves misconduct.

**Acceptance:** released behavior and notices agree; users can find relevant information before installation and permission prompts; no missing fact is disguised as a confirmed policy; security reporting has a real triage owner.

## 6. Work package C — make downloading understandable and verifiable

### C1. Establish a shared supported-environment record

Maintain one verified source for operating systems, architectures, supported Linux environments, package prerequisites and relevant setup requirements. Reuse it in downloads, product setup and candidate docs.

Separate:

- An installer being present in the release.
- An environment being tested and supported.
- A browser recommending a matching installer.
- The installed app completing readiness checks for a particular round.

The current release contains Windows x64, separate Mac ARM64/Intel builds and Linux x86_64 packages. That supports an availability statement, not a claim that every Linux distribution works. Do not imply native Windows/Linux ARM support.

Validate Windows minimums, macOS minimums, Linux display/session requirements, dependencies and managed-device restrictions against the released build and actual installation tests. macOS 12 is configured in the inspected app; other support claims still need the appropriate evidence.

Preserve the local recommendation helper and its conservative fallbacks.

### C2. Surface existing release integrity information

Extend the release data model with validated filename, version, size, architecture, SHA-256 and verified signing status where available.

- Use the already published digests/manifests; validate their format and exact asset association.
- Present a small **“Verify this download”** disclosure with a copyable digest and platform-appropriate instructions.
- Keep repository links and raw internal release bodies out of public page copy.
- Verify signatures/notarization on the exact distributed artifacts or equivalent release evidence. CI configuration and release-note prose are not sufficient proof.
- If an installer is unsigned, state that accurately with a support route for managed computers. A checksum is an integrity check, not a substitute for publisher authentication or proof of safety.
- Do not tell candidates to disable security protections.

Bind displayed metadata and download resolution to the same release/asset. The existing latest-release endpoint can otherwise change between page render and click. This matters particularly once hashes are displayed.

**Acceptance:** when release N+1 appears after a visitor loads N, the download either remains bound to N or clearly refreshes to N+1. It must never pair one file with another version’s hash or size.

### C3. Resolve the supported-version policy

AMS must decide whether rounds require the current release or may pin an approved older version.

- **Current-release policy:** align invitation/setup copy and remove unsupported instructions to obtain an arbitrary organizer-required version.
- **Pinned-version policy:** offer only approved, available versions with compatibility guidance and a support lifecycle. Validate requested versions against an allowlist.

Do not expose every historical build by default or promise that old clients work with the current backend.

### C4. Publish useful public release notes

Create curated, public-safe entries tied to verified release versions and dates. Each entry should state relevant user-visible changes, affected platforms and any setup action.

Start with a verified entry for the current downloadable release. If change details are not yet approved, a factual release-availability entry can provide value without inventing improvements. Do not publish internal changelogs verbatim.

Align the footer, download-page link and changelog heading with the content that exists.

**Acceptance:** no empty release-note destination presented as published changes; current release facts agree across pages; no invented fixes, signing claims or internal operational details.

## 7. Work package D — show and document the actual workflow

### Product and homepage

Explain the concrete product choice: organizers prepare a round; candidates install and prepare a dedicated desktop workspace; reviewers examine submissions and supported session evidence. Make installation and permissions visible early.

Retain **“Let the work speak.”** Support it with specific behavior, not superiority claims such as “cheat-proof,” “better hiring” or “enterprise scale.”

Capture sanitized organizer and reviewer workflows using authorized test data. Confirm the screens show the stated role, real controls and usable results. Publish only approved information and label example data. Show meaningful details at laptop size and retain accessible enlargement on smaller screens.

### Documentation backlog

| Guide | Required addition | Acceptance |
|---|---|---|
| Understand Access | A short role-based map and actual entry destinations | Each role has a clear next action. |
| Candidate setup | Shared requirements, chip/package selection, install steps and permission expectations | A first-time candidate can prepare without guessing an OS/package. |
| Device checks | Real shipped states: denied camera access, missing device, no video frames, unavailable readiness report | Each state has a specific safe next step and escalation route. |
| Taking an assessment | Confirm the released incident-report entry point; explain sent versus unconfirmed reports | Preserve Run/Submit and saved/submitted distinctions; no false success claims. |
| Troubleshooting | Verified error text, likely causes, safe recovery and live-round escalation | No blanket instruction to delete active work or disable protections. |
| Organizer guide | Create/configure a round, supported question formats/languages, test cases, invitations/roster import and launch checks | Steps match the supported organizer UI; limits are tested rather than invented. |
| Review results | Available results, attempts/history, export behavior and defined activity categories | Readers know what each output means and what it cannot establish. |
| What Access checks and records | The canonical candidate-facing transparency matrix | Linked at relevant preparation and review decisions. |

Build the supported-language/version table from the active judge/runtime configuration and end-to-end submissions. Editor syntax highlighting is not evidence of judging support. Verify question formats, test-case controls, time/memory settings and roster-import constraints against supported workflows before publishing their limits.

Publish API/integration documentation only if there is an approved, supported public offering. Investigate network and accessibility requirements; publish tested facts, known limitations and a help route without claiming certification.

**Acceptance:** a participant, organizer and reviewer can each complete a representative task using the docs and a test account; screenshots and error instructions match the supported version.

## 8. Work package E — explain commercial fit without invented plans

Keep /pricing and make its purpose explicit. If pricing is quote-based, say so prominently.

Replace the illustrative Pilot/Event/Institution/Enterprise presentation with an approved explanation of:

- What is being purchased and the billing unit.
- What the quoted scope includes.
- Which inputs affect the quote.
- What information a team should send.
- What happens after the enquiry.

Publish a starting price or worked example only when the commercial owner approves its scope, currency, taxes/fees where relevant, minimums and validity. Do not manufacture a number to satisfy the review.

Keep the contact form’s three required fields and optional planning details. A pricing enquiry may preselect its topic, but it must not introduce a long qualification form or imply a booked meeting.

Keep **team@amshq.in** for general, product, privacy and security enquiries and **partners@amshq.in** for existing partners and sponsorships. Explain that Access is an AMS product. Verify form delivery separately from displayed email links.

Confirm live-round support ownership, channel and escalation coverage. Publish hours or response targets only when staffed and agreed. A general enquiry form should not be represented as emergency support.

**Acceptance:** a visitor understands how pricing is determined and how to obtain a relevant quote; example categories cannot be mistaken for purchasable plans; contact submission success and failure behavior remain accurate.

## 9. Work package F — add company evidence selectively

Keep About AMS focused on the company behind Access, Derive and Ascent.

Add public program links once their destinations and current status are verified. Consider a dated program example, public milestone, named team information or partner case study only with publication permission and supporting evidence.

Prioritize proof of real work over a decorative logo wall. Do not invent customer counts, placements, sponsor relationships, founder biographies or a mature talent-intelligence offering. Keep future direction clearly future-facing.

**Acceptance:** every new company claim has a source, date where relevant and permission to publish; no empty team/testimonial section is introduced.

## 10. Decisions register

These inputs should be gathered once and recorded with an owner. They block only dependent publication.

| Decision or fact | Accountable owner | Blocks |
|---|---|---|
| Operator identity, markets, eligibility, terms and notice approval | AMS operator + counsel | Final legal publication and associated onboarding statements |
| Actual collection, transmission, access, retention and deletion | Engineering + data owner | Monitoring guide and final privacy facts |
| Tested environments and current/pinned-version policy | Product + release owner | Requirements and version selection |
| Artifact signing/notarization evidence | Release/security owner | Signing labels and installation guidance |
| Quote model, inclusions and publishable prices | Commercial owner | Pricing rewrite |
| Live-round and security escalation process | Operations/security owner | Support promises and disclosure workflow |
| Recruiter portal’s public role and signup availability | Product/business owner | Recruiter navigation and self-service claims |
| Approved organizer/reviewer media and company/program proof | Product + AMS communications owner | New screenshots, program links and social proof |

## 11. Review, release and acceptance gates

Deliver small, reviewable batches. Require a subagent review after each batch, resolve findings, and record material decisions.

### Gate 1 — factual and editorial review

- Every new claim maps to release evidence, a tested workflow or an approved policy.
- The same capability is described consistently across home, product, security, docs and legal pages.
- Configurable behavior is identified precisely; no blanket “may” language replaces available facts.
- No public source repositories, confidential strategy, internal release notes or enforcement mechanics appear in content.
- Draft legal documents remain clearly drafts until approved.

### Gate 2 — functional and accessibility review

- Check candidate, organizer and enquiry paths on desktop/mobile and while logged out.
- Check keyboard navigation, focus, labels, screen-reader status updates and reduced-motion/transparency fallbacks.
- Verify 320px, 390px, tablet, laptop and wide layouts; screenshot zoom remains usable.
- Exercise unknown/denied browser hints, Mac chip fallback, Linux package changes, missing builds, unsupported processors and release-fetch failures.
- Verify version/hash/download consistency and unavailable-version behavior.
- Test contact validation and delivery through an approved test process; do not send unsolicited real enquiries.

### Gate 3 — production verification

- Run the production build and relevant regression tests.
- Confirm the reviewed commit and deployment status.
- Verify amsaccess.com/www marketing routes, app downloads and direct sign-in destinations.
- Check the release note, legal and help links from the actual download page.
- Recheck placeholders, hashes and assets on production; retain a rollback reference.
- Observe support questions and failed download choices after release, using only approved measurement practices. Do not add device fingerprinting to measure this change.

The first implementation batch should contain **routing corrections and removal of unfinished public media**, together with the already reviewed local polish when its integrated checks pass. Start the trust and release evidence work at the same time. Publish subsequent facts as they are verified.

## 12. Implementation reference map

These are internal implementation references, not links to expose on public pages.

| Area | Primary source |
|---|---|
| Shared destinations | src/lib/product-links.ts |
| Desktop/mobile navigation and footer | src/components/MarketingHeader.tsx; src/components/MarketingFooter.tsx |
| Homepage and missing walkthrough | src/app/(marketing)/page.tsx; home-media.ts; src/components/AccessProductPreview.tsx |
| Product proof and media availability | src/app/(marketing)/product/page.tsx; product-media.ts |
| Download recommendation and metadata | src/app/(marketing)/download/; src/lib/download-platform.ts; src/lib/download-recommendation.ts; src/lib/releases.ts |
| Download resolution | src/app/api/releases/download/route.ts |
| Public notes | src/app/(marketing)/changelog/page.tsx |
| Docs and task content | src/app/(marketing)/docs/guides.ts |
| Website trust and legal content | src/app/(marketing)/security/; privacy/; terms/ |
| Pricing and contact | src/app/(marketing)/pricing/; src/components/PricingVolumeModeler.tsx; src/app/(marketing)/contact/ |
| App notice and information flow | AccessSoftware: apps/web/src/app/privacy/page.tsx; session/contest/client.tsx; lib/presence-monitor.ts; apps/desktop/src-tauri/src/event_recorder.rs |
| Release packaging and checksums | AccessSoftware: .github/workflows/release.yml; apps/desktop/src-tauri/tauri.conf.json |

Use the released version and live configuration as the final reference when a source checkout, old document or review differs.

## 13. Execution record — 10 October 2026

### Published UI baseline

Commit **2de50ba** was pushed to main. Vercel production deployment **dpl_4iR55EzGbAnBgfkGEZF9yuZBpipF** is Ready. It includes the reviewed navbar/download polish and the organizer sign-in redesign. Both website sign-in URLs resolve to the updated page while logged out; the app download root responds successfully. Authentication and backend behavior were preserved.

### Package A — implemented and reviewed; not yet pushed

- Introduced separate shared candidate-download and organizer-sign-in destinations, using the canonical website host for organization authentication.
- Replaced ambiguous access labels throughout navigation, homepage, footer, product, docs, contact and changelog. Organizer/reviewer guides now offer organizer sign-in; candidate guides offer downloads.
- Placed organizer sign-in at the start of the mobile menu and kept downloads directly visible. Preserved the existing recruiter sign-in utility on the download page without adding a new public offering.
- Hid the unavailable homepage recording, including its introduction. Removed missing organizer/reviewer image frames and gave both product sections complete responsive text layouts. Existing candidate screenshots, labels and enlargement controls remain.
- Retained media configuration for future assets. When publishing organizer/reviewer web screenshots, pass their surface label into ProductImage rather than using its current desktop-app label.
- Kept the homepage “See how Access works” action pointing to its existing product-preview section; this preserves the guided homepage journey.

Validation: production build and whitespace checks passed; 159 production-preview browser assertions passed across 320, 390, 768, 960, 1024 and 1440px and the affected public routes, with no runtime errors. Independent routing and presentation subagent reviews found no blocking issues; the presentation reviewer also passed 24 browser assertions. No authentication handlers, API routes or middleware changed.

Preview: http://127.0.0.1:3200

The current-main implementation is in /tmp/access-marketing-main. Website UI changes are mirrored into the shared workspace with its older Next.js page signatures preserved. Its older organization login is not overwritten. The UI-only package A patch is saved at docs/access-routing-ui.patch.

### Package B — factual reconciliation implemented and reviewed; policy approval remains open

Added the canonical “What Access checks and records” guide, a readable information-handling matrix, and links before download and from setup, device checks, organizer/reviewer guidance, privacy, security and terms. Public copy separates local calibration from uploaded presence images; microphone permission from recording; automatic readiness reports from optional incident reports; local drafts from code sent by Run/Submit; and activity flags from judging and entry checks.

The desktop privacy source now describes persistent event queues, best-effort cleanup and session-image transmission accurately, without publishing internal paths or enforcement mechanics. It preserves the existing 27 May 2026 policy date and records the technical clarification separately. A website deployment alone will not change installed app notices.

The user confirmed that legal operator details, retention periods, hosting locations and record-access approvals are not available yet. Website legal notices remain explicitly non-effective review drafts. No new retention, hosting, rights, age or access commitment was invented.

Validation: website production build, 83 website browser assertions, 18 app-notice browser assertions, app TypeScript and whitespace checks passed. Independent factual and journey reviews completed; findings were corrected. No backend, collection, permission, authentication or enforcement changes.

Full evidence, unresolved decisions and delivery status: docs/privacy-reconciliation.md.

### Package C — download/release alignment implemented and reviewed locally

Downloads now carry the exact displayed release and file identity. Fresh metadata validation fails clearly for changed releases/assets; it does not silently substitute another binary or expose arbitrary historical versions. Refresh recovery is rate-limited with the public download endpoint.

Added per-installer filename, exact size, SHA-256, copy feedback and verification commands. An independent audit downloaded all seven v2.3.1 installers and confirmed their bytes/hashes against both the API digests and four published manifests without executing installers.

One version-scoped requirements source now drives downloads, product and documentation. Removed the unverified Windows10/11 minimum and broad Linux family implications. Unknown releases do not inherit old minimums. The changelog now provides real version/date/package availability, and candidate setup links to requirements and verification.

Both subagent reviews completed and findings were resolved. Production build, 36 unit tests, 81 responsive browser assertions and 23 isolated production-server HTTP assertions passed. A final live metadata smoke check confirmed all seven bound links and exact asset resolution.

No assessment backend, authentication or app monitoring changes. Public website release metadata and download resolution changed as necessary for integrity. Per-artifact signing verification, a tested OS/distro support matrix and organizer-pinned older-version policy remain owner/release work; no claims were invented.

Evidence and implementation details: docs/download-release-alignment.md and docs/release-integrity-v2.3.1.json. This batch is not yet pushed.

### Packages D and E — workflow documentation, product proof and pricing guidance

Completed the role guides and added question preparation/verification. Instructions use actual organizer and desktop labels, distinguish local drafts and scored submissions, explain report/finish receipts, and cover safe recovery, roster/credential states, publishing, invigilation summaries and CSV exports.

Published two local organizer-interface captures with synthetic example data into product and guides. Wide layouts and correct Web workspace labels keep them distinct from candidate desktop screenshots. Removed unsupported source-inspector, launch-checklist and combined timeline claims, including related homepage copy.

Pricing now explains the brief, enquiry and written-quote process without numerical prices, illustrative plan tiers, invented billing units or service commitments. Contact backend and required fields are unchanged.

Independent workflow/product and pricing reviews completed; findings corrected. Production build and 256 responsive browser assertions passed, with no runtime errors. Detailed validation and scope: docs/workflow-product-pricing.md. Source evidence: docs/workflow-documentation-evidence.md. Changes remain local and unpushed; production rehearsal and owner commercial/policy decisions remain open.

### Final code review and main delivery

Independent code, navigation/accessibility and content reviews completed across packages A–E. Fixed outdated download tests, bound reviewed requirements to exact installer fingerprints and removed duplicate title branding. The standard test command now runs the complete suite. Final production build, 78 tests, 138 independent presentation checks and 81 final download checks passed. No blocking findings remain. This main delivery supersedes the earlier local-only package status; the separate desktop notice still needs an app release. Full record: docs/final-code-review.md.
