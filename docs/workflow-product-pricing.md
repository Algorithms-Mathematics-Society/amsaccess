# Workflow, product proof and pricing alignment

Implemented locally on 10 October 2026 against website main baseline 2de50ba. Not pushed or deployed.

## Changes

- Completed candidate setup, device checks, assessment, troubleshooting, organizer and reviewer guides. Added question preparation and verification. Each guide describes actual controls, relevant failure states and the next action.
- Distinguished local drafts, sample runs, scored submissions, incident delivery and session-finish confirmation. Documented roster membership, credential issuance and email delivery as separate states.
- Added genuine rendered organizer and submission-review screenshots with synthetic example data. Full-width product layouts preserve detail; enlargement and zoom work across breakpoints. Web screenshots now carry their correct surface label.
- Linked each product stage to its practical guide. Removed unsupported source-code inspector, launch-checklist and unified activity-timeline claims; aligned homepage and docs landing copy with actual review tools.
- Replaced illustrative pricing tiers with a concise assessment brief, enquiry sequence and written quote checklist. No numerical prices, invented billing unit, included services or commercial guarantees. Existing contact form and delivery behavior are unchanged.

## Evidence and review

Detailed source mapping: workflow-documentation-evidence.md. Commercial boundaries: product/pricing.md.

Product proof uses actual ContestConsole components at the current website baseline. Both screenshots used locally intercepted synthetic API responses; no real account, candidate data or assessment mutation. Six read-only fixture requests and zero runtime errors were recorded. Screens demonstrate current interface controls, not a completed production assessment rehearsal. Source/capture manifest is in screenshots-amsaccess/organizer-manifest.json in the shared workspace.

Independent subagent reviews covered product/workflow accuracy, accessible image behavior and commercial guidance. Findings corrected: homepage source-inspection promise, stale media descriptions, wrong screenshot key, outdated finish labels, draft/server-save ambiguity and a problem-version field absent from the attached-problem table. No blocking findings remain.

## Validation

Production build and whitespace checks passed. Two browser runs passed 256 assertions with no runtime errors across 320, 390, 768, 1024 and 1440px. Checks covered product/pricing and all changed guides, homepage and docs discovery; overflow, page titles and section anchors; correct media labels and loaded images; enlargement/zoom/Escape dismissal; approved contact links and the absence of old pricing tiers or price amounts. The final question-version correction was confirmed in the built page. Desktop/mobile captures were visually inspected.

Browser evidence: /tmp/access-workflow-review/report.json and /tmp/access-workflow-followup/report.json. Build: /tmp/access-workflow-build.log. Capture evidence: /tmp/access-organizer-capture/report.json. An initial browser harness Escape assertion needed the actual native key code; the corrected final runs passed without changing product keyboard behavior.

## Remaining owner decisions

Exact supported runtime versions require the active judge configuration and tested submissions; no universal runtime matrix is published. No capacity, OS certification or support guarantee is inferred from UI fields or screenshots. Commercial owner must approve billing units, inclusions, prices and terms before they become offers. Previously unresolved privacy/legal commitments remain open.

No backend, authentication, desktop monitoring or assessment controls changed in this batch. Production end-to-end organizer/candidate rehearsal with authorized accounts remains a separate acceptance task. Current checks are source review and rendered UI with example data.
