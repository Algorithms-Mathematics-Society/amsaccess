# Workflow documentation evidence

Reviewed 10 October 2026. Internal review record; do not render this file as public documentation.

## Scope

Updated candidate setup, device checks, taking an assessment, troubleshooting, organizer setup and result review. Added /docs/prepare-questions. Preserved the preceding privacy, requirements and checksum guides. Organizer and reviewer guides use the actual website interface with clearly labeled synthetic example data; candidate images retain their existing example-data labels.

## Source evidence

Organizer reference: the website checkout at base commit 2de50ba, current src/components/org/ components. No organizer behavior was changed for this content work.

- ContestsView.tsx: New contest, local datetime inputs, Create contest, scoreboard freeze and practice settings.
- ContestConsole.tsx: draft gate, Publish, packaged problem-version selection, label/score configuration, Problems table, Submissions columns, Standings CSV and Submissions CSV. The Problems table does not show the attached version; the guide checks it in the selector first.
- ParticipantsPanel.tsx: contest CSV resolves existing directory addresses, unknown addresses are not provisioned, credential/passphrase and delivery states are separate, one-time credential handling differs from roster export.
- ProblemsTabs.tsx, authoring/ProblemSetting.tsx, authoring/steps.tsx, authoring/VerifyPane.tsx: Catalogue/Problemsetting, New problem, statement/solution/tests, configuration limits, blank expected outputs, Run the checks, verified-only Publish, SKIPPED versus passed.
- ParticipantProfile.tsx: available participant contest and submission summaries.
- InvigilationPanel.tsx: Help requests, Live sessions, Entry-gate reports. These are separate summaries, not a continuous event timeline or a submitted-code inspector.

Desktop reference: current app source at 5136862; critical labels and states additionally checked in released v2.3.1 source.

- apps/web/src/app/home/components/ContestsPanel.tsx, ContestCards.tsx, SessionActionsPanel.tsx: search/refresh, entry-window states, verified resume flow and Get help rejoining.
- SessionReadinessModal.tsx: Required checks, Optional warnings, unavailable report and Run checks again; macOS permission recovery.
- SettingsPanel.tsx, SettingsDetails.tsx: Hardware camera selector/start/refresh, microphone level/start, About version, pending restoration actions.
- Onboarding camera/microphone stages: denied permission, missing/disconnected devices, setup retry, permission-restart guidance.
- apps/web/src/app/session/contest/client.tsx, components/TopBar.tsx, components/TerminalPanel.tsx: local editor buffer versus scored submission, ordinary sample Run versus Custom, separate finish receipt, Report sent versus Report not confirmed. The current integration is authoritative over a stale save-indicator module comment describing server saves.
- Released v2.3.1 TopBar verified labels Finish contest and Finish and exit. Released client verified Session finish confirmed and Report not confirmed.

## Boundaries

No universal language/compiler table, numerical platform limits, participant capacity, format matrix, support response time, source-code inspection capability, full activity timeline, automatic misconduct decision or legal commitment was invented. Runtime and format requirements are explicitly confirmed for the actual round. Instructions preserve active work and do not advise disabling protections or bypassing required checks.

No live assessment, invitation, email, credential issue, publish action, rejudge or export against real candidate data was executed. This is source-grounded guidance and a rendered-interface review, not a completed production assessment rehearsal.

## Independent review

The pricing-guidance agent independently reviewed all seven guides against the relevant source. Fixed findings: screenshot key attempts changed to the actual submissions media key; finish actions changed from a stale comment to actual button labels; local draft wording made explicit; attached-version check moved to the selector because the resulting Problems table has no version column. Parent handles integrated TypeScript, production build, browser checks and final review record.
