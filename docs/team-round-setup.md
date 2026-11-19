# Organizer team-round setup

Open an organizer contest and select **Team round**. This adds setup controls to the website; the desktop participant lobby remains a separate interface.

## Setup sequence

1. Select an imported project from the organization catalog, or inspect and import a `.cxxpkg` project package (maximum 32 MiB). If the catalog cannot load, refresh it or enter an existing project UID.
2. Set the team size and discussion duration. The website limits teams to five members, matching the desktop client. Save the settings to bind the project to the contest. Binding another project replaces existing team parts; project and size edits are disabled after seeding.
3. Set the source contest UID, ranked participant count, and seeding method. Optional additional participant user UIDs must be unique. Preview the proposed membership, ranks, and rank sums without saving. Saving recalculates the draw from live standings, so review the saved roster before publishing.
4. Publish the reviewed draw. Unpublish hides the team lobby and keeps the saved draw and participant roster. The API allows it only before any part claim or allocation lock. A qualifying unpublished draw can then be replaced.
5. Create or distribute participant credentials through the existing Participants tab. Publish the contest separately using its existing Publish control. Team publication does not publish the contest.

Dates use the operator's local time and are sent as UTC timestamps. Blank fields retain existing or backend-default dates. Allocation must lock after discussion ends; the submission deadline cannot precede the lock. **Lock allocation now** closes selection and assigns remaining parts.

## Permissions and failure handling

The new server routes verify the signed-in user's role through `/auth/me`. Owner, admin, problemsetter, contest_manager and judge_manager roles can use these surfaces. Intern and unknown roles are rejected, including for practice contests. The API still enforces organization ownership and contest-phase rules. This feature grants no additional permissions.

Mutations require explicit confirmation and run one at a time. They are not automatically retried. After a timeout or connection failure, use **Refresh state** before retrying: the API may have completed the write. The panel does not poll in the background. Uploads have bounded reads and only the package field is forwarded.

## Scope and follow-up

- Tracking: amsaccess #8 (umbrella), #9 (project import), #10 (team setup), #11 (operations follow-up), ams-api #114 (catalog and readiness), and ams-api #122 (draw preview and unpublish).
- Rejudge, voice audits and documentation-assistant audits remain follow-up work.
- Voice requires separately configured TURN infrastructure. These controls do not provision or start AWS resources.
- A UI test package is not proof that its reference solutions or integration judging work. Validate the package with the supported judge toolchain before a judged event.

## Verification

Run `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm run build`. The build includes compiled authentication-route checks.

`tests/org/browser-team-setup.mjs` exercises the project picker, package import, settings, draw preview and save, publication, readiness, and guarded unpublishing against mocked API responses in the production website bundle. Start the local production server on port 3124 first. Set `PLAYWRIGHT_MODULE` to an installed Playwright module and optionally `CHROMIUM_PATH` to an installed Chromium executable, then run the script with Node. Confirm the same flow with an authorized organizer against a compatible API before relying on it at an event.

## Live monitor

Once teams are published, the top of the Team round tab shows a read-only live monitor. It refreshes every 15 seconds while the tab is visible (one read at a time, 10-second timeout) and keeps the last good roster on screen if a read fails.

It shows the scheduled phase, claims, member readiness, approvals, submissions, and the latest completed result per team. Teams needing attention sort first. The phase uses contest times when round times are blank, and readiness is unknown when the roster omits it.

`tests/org/browser-team-monitor.mjs` covers it against mocked API responses in the production bundle, using a fake clock for the polling cadence. `tests/org/browser-team-monitor-edges.mjs` covers failure wording, empty and unpublished rounds, each phase, hostile or extreme names, a phone-width viewport and a 500-team round. Run both like the setup test above.
