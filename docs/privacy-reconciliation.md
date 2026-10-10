# Privacy and monitoring reconciliation

Reviewed 10 October 2026. Internal implementation evidence; do not import this file into public pages.

## Scope and publication state

This batch updates explanatory copy and notice links only. It does not change collection, recording, storage, permissions, authentication, enforcement, or backend configuration.

The user confirmed that approved legal-operator details, retention periods, hosting locations and assessment-record access details are **not available yet**. Website privacy and terms remain review drafts with noindex and no new effective date. The desktop policy retains its existing 27 May 2026 effective date and identifies the 10 October technical clarification separately. The pre-existing desktop no-sale commitment is preserved; this review does not independently verify that business commitment.

Released evidence: desktop v2.3.1, annotated tag object 0ba0c584, resolved commit 5b2b025ecec6c27079bcb10bd8363033e244eb1c. Current desktop checkout: 5136862. Existing privacy and terms matched the release before this edit. Website changes build upon deployed 2de50ba plus the locally reviewed routing batch.

## Technical inventory

Paths below are relative to the desktop repository unless explicitly marked website. Line numbers refer to v2.3.1; current source can differ.

| Category | Collection/purpose | Local storage and transmission | Access/retention evidence |
|---|---|---|---|
| Account/session | Signed-in participant and assessment context | Account/session state and recovery use local storage; connected assessment services receive session requests | Production roles and server retention unverified |
| Calibration | Camera frame used for local face framing/readiness | Image saved temporarily; no image upload path found. Associated event metadata can include local file path | Cleanup attempted on teardown/startup; errors tolerated, no guaranteed immediate deletion |
| Session presence | Face-presence outcomes during assessment | No-face/multiple-face events can include a small image; persistent queue and session uploader send payloads | Exact production acceptance, viewer permissions and media retention unverified |
| Microphone | Setup activity check and live-session media access | No continuous audio/video recorder or streaming path found in reviewed web/desktop source | Does not establish a universal promise about every service or assessment |
| Readiness | OS/app/device identifiers, display/security/media/network checks | Full readiness reports can be sent automatically before entry when authenticated/configured | Separate from optional support-report consent; production retention unverified |
| Session activity | Focus/fullscreen, device/security, camera/media and connection events | Stored durably with timestamp/detail/payload, then uploaded for the session | Cleanup only for eligible acknowledged closed runs; unacknowledged and other excluded records can remain |
| Work and results | Answers, source code, submissions, judging status | Local recovery plus connected assessment services | Organizer/service arrangements; no universal deletion time verified |
| Incident report | User-selected category/description plus session/device/media/security context | Sent through incident support flow; a failed/unconfirmed request is not delivery | Exact support access/retention unverified |
| Website enquiries | Submitted contact details, category, volume and message | Website contact route sends configured email; rate-limit/operation metadata separate | Recipient configuration, vendor agreement and retention require owner evidence |
| Download recommendations | Browser OS and processor hints | Browser-only helper; hints are not separately stored/transmitted by it. Download request specifies selected installer | Do not generalize to zero metadata for all website requests |

### Source references

- Calibration: apps/web/src/app/session/onboarding/components/Stage8_FaceCalibration.tsx:219; apps/desktop/src-tauri/src/lib.rs:2754.
- Best-effort calibration cleanup: native lib.rs:2357–2376; teardown at1862 and startup2988.
- Presence images: apps/web/src/lib/presence-monitor.ts:79–113.
- Event wiring/upload: contest/client.tsx:1860,1930; native lib.rs:666,732.
- Microphone: Stage10_AudioVerification.tsx:35–91; apps/web/src/lib/camera-session.ts:150–167.
- Readiness submission: native lib.rs:1082–1175; API types index.ts:161–182.
- Incident payload: contest/client.tsx:874–914.
- Durable event retention conditions: apps/desktop/src-tauri/src/event_store.rs:448–495.
- Local auth/session state: apps/web/src/lib/proctor-api.ts:105–131,484,572.
- Existing notice delivery: onboarding/page.tsx privacy link before setup; home/components/SettingsDetails.tsx About links.
- Website enquiries: src/app/api/contact/route.ts; no changes made.
- Website download hints: src/lib/download-platform.ts and download-recommendation.ts; no behavior changes made.

The code review verifies implemented flows, not a particular installation, organizer’s configuration, backend acceptance, authorized personnel or contractual commitments. Public text must keep that distinction.

## Resolved inconsistencies

- Replaced vague media language with local calibration versus transmitted session-image distinctions.
- Corrected app wording that understated persistent event storage and upload.
- Replaced guaranteed calibration deletion with best-effort cleanup and separated it from server retention.
- Explained that readiness reporting can be automatic before entry, separate from optional incident reports.
- Distinguished microphone permission from recording, presence from identity verification, code judging from activity review, and failed entry checks from proof of misconduct.
- Explained website draft versus released desktop policy dates without silently replacing terms.
- Added team@amshq.in as a direct privacy enquiry route; retained partner inbox purpose elsewhere.

## Decisions still required

| Item | Required owner/evidence | Publication consequence |
|---|---|---|
| Full legal operator identity/address and jurisdictions | AMS operator | Website legal draft cannot be finalized |
| Purposes, grounds and organizational responsibilities | Operator/legal review, actual service arrangements | Do not invent consent or controller/processor claims |
| Provider inventory, locations and transfers | Infrastructure/data owner | No location or subprocessor assurance |
| Staff/organizer/media access roles | Product/security owner plus deployed permission evidence | Do not promise a precise reviewer-access list |
| Retention periods, deletion jobs, exceptions and request handling | Data/operations owner | No blanket lifetime or deletion deadline |
| Rights/complaint route, eligibility and younger participants | Operator/legal review | Do not add universal age or rights commitments |
| Updated app notice release and notice delivery | App release owner | Installed v2.3.1 copies remain unchanged until a new app release |

General transparency reference used to check completeness: [ICO privacy-information guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/). This is a completeness reference, not a conclusion that UK law applies to AMS.

## Validation record

- Website production build passed after the review corrections.
- Website browser checks: 83 assertions passed at 320, 390, 768, 1024 and 1440px, covering responsive guide rows, public copy, version/draft state, contextual links, docs search and download notice.
- App privacy content checks: 18 assertions passed at 320, 390 and 1440px; no runtime errors. App TypeScript check passed.
- An initial combined browser harness had an invalid test regular expression after the website checks; the app checks were corrected and rerun successfully.
- Independent technical and journey reviews completed. Three payload-wording corrections were resolved, along with third-party connectivity disclosure and an explanation of device controls/restoration.
- Backend, permission/enforcement behavior, authentication and app terms have no changes. Existing app .gitignore edits were preserved.
- Website preview: http://127.0.0.1:3200/docs/what-access-checks-and-records
- App notice preview: http://127.0.0.1:3300/privacy
- Neither batch is pushed. Website deployment and a future app release are separate delivery steps.
