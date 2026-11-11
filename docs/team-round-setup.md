# Organizer team-round setup

Open an organizer contest and select **Team round**. This adds setup controls to the website; the desktop participant lobby remains a separate interface.

## Setup sequence

1. Inspect a `.cxxpkg` project package (maximum 32 MiB). Review its parts and warnings, then import it. Alternatively, paste an existing project UID.
2. Set the team size and discussion duration. The website limits teams to five members, matching the desktop client. Save the settings to bind the project to the contest. Binding another project replaces existing team parts; project and size edits are disabled after seeding.
3. Set the source contest UID, ranked participant count, and seeding method. Optional additional participant user UIDs must be unique. Drawing teams **persists** the draw; it is not a dry run.
4. Review membership, ranks and rank sums. An unpublished draw can be replaced before any member holds a part. Publish teams after review. There is no unpublish operation.
5. Create or distribute participant credentials through the existing Participants tab. Publish the contest separately using its existing Publish control. Team publication does not publish the contest.

Dates use the operator's local time and are sent as UTC timestamps. Blank fields retain existing or backend-default dates. Allocation must lock after discussion ends; the submission deadline cannot precede the lock. **Lock allocation now** closes selection and assigns remaining parts.

## Permissions and failure handling

The new server routes verify the signed-in user's role through `/auth/me`. Owner, admin, problemsetter, contest_manager and judge_manager roles can use these surfaces. Intern and unknown roles are rejected, including for practice contests. The API still enforces organization ownership and contest-phase rules. This feature grants no additional permissions.

Mutations require explicit confirmation and run one at a time. They are not automatically retried. After a timeout or connection failure, use **Refresh state** before retrying: the API may have completed the write. The panel does not poll in the background. Uploads have bounded reads and only the package field is forwarded.

## Scope and follow-up

- Tracking: amsaccess #8 (umbrella), #9 (project import), #10 (team setup), #11 (operations follow-up), ams-api #88 (practice permissions and error wording).
- Standings, rejudge, benchmark controls/history, voice audits and documentation-assistant audits remain follow-up work.
- A true seed dry run and unpublish require backend operations that do not currently exist.
- Voice requires separately configured TURN infrastructure. These controls do not provision or start AWS resources.
- A UI test package is not proof that its reference solutions or integration judging work. Validate the package with the supported judge toolchain before a judged event.

## Verification

Run `npm test`, `npx tsc --noEmit`, and `npm run build`. The build includes compiled authentication-route checks.

`tests/org/browser-team-setup.mjs` exercises inspection, import, settings, seeding and publication against mocked API responses in the production website bundle. Start the local production server on port 3124 first. Set `PLAYWRIGHT_MODULE` to an installed Playwright module and optionally `CHROMIUM_PATH` to an installed Chromium executable, then run the script with Node. It creates no production records. This browser test does not replace an authorized organizer test against the real API.
