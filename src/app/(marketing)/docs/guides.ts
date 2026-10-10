// Intentionally curated public help content. Do not import internal markdown,
// operational runbooks, customer fixtures, or repository metadata into this file.
import { assessmentInformation, monitoringCategories, MONITORING_GUIDE_PATH } from "@/lib/assessment-information";
import type { ProductMediaKey } from "../product/product-media";

export type Audience = "everyone" | "candidates" | "organizers" | "reviewers";
export type GuideSection = {
  id: string;
  title: string;
  screenshot?: ProductMediaKey;
  requirements?: boolean;
  links?: { href: string; label: string }[];
  dataRows?: { title: string; purpose: string; handling: string }[];
  paragraphs?: string[];
  steps?: { title: string; body: string }[];
  bullets?: string[];
  note?: { title: string; body: string };
};
export type Guide = {
  slug: string;
  title: string;
  description: string;
  audience: Audience;
  intro: string;
  before: string;
  sections: GuideSection[];
  next: string;
};
export const audienceLabels: Record<Audience, string> = {
  everyone: "Start here",
  candidates: "Candidates",
  organizers: "Organizers",
  reviewers: "Reviewers",
};
export const guides: Guide[] = [
  {
    slug: "understand-access",
    title: "Understand Access",
    description: "What Access does, who uses it, and where to begin.",
    audience: "everyone",
    intro:
      "Access brings assessment preparation, a dedicated candidate desktop workspace, and submission review into one workflow.",
    before:
      "You do not need an account to read these guides. If you already have an assessment invitation, start with the candidate setup guide.",
    sections: [
      {
        id: "your-role",
        title: "Find your part in the round",
        steps: [
          {
            title: "Candidates take the assessment",
            body: "Use the Access desktop app to prepare your device, find an assigned assessment, and work through the round.",
          },
          {
            title: "Organizers prepare the round",
            body: "Use the organizer workspace to manage the schedule, questions, and invitations, then check that the round is ready.",
          },
          {
            title: "Reviewers examine the work",
            body: "Review results, individual submissions, and available session activity to inform an assessment decision.",
          },
        ],
      },
      {
        id: "where-to-go",
        title: "Know which place to use",
        paragraphs: [
          "This website explains Access and provides public guidance. Candidates download the desktop app at app.amsaccess.com. Existing organizers use Organizer sign in on this website.",
          "Candidates complete assessments in the desktop app. Follow your invitation and organizer’s instructions for your account, assessment window, and required setup.",
        ],
      },
      {
        id: "round-instructions",
        title: "Your round’s instructions come first",
        paragraphs: [
          "Question formats, allowed tools, timing, permissions, and result availability can vary by assessment. Read the instructions for your round before starting.",
        ],
        note: {
          title: "Not sure about a requirement?",
          body: "Ask your assessment organizer before the round. They can clarify the rules, your invitation, and any arrangements you need.",
        },
      },
    ],
    next: "candidate-setup",
  },
  {
    slug: "what-access-checks-and-records",
    title: "What Access checks and records",
    description: "Camera, microphone, device checks and session activity, explained before you begin.",
    audience: "everyone",
    intro: "Know which checks use your device, which information can leave it, and what to ask before assessment day.",
    before: assessmentInformation.versionContext,
    sections: [
      {
        id: "at-a-glance",
        title: "Before you install or grant permissions",
        paragraphs: [
          "Browsing this website or using its download recommendation does not turn on your camera or microphone. The desktop app requests permissions separately during setup and participation.",
          "For a round that requires a permission, refusing or removing it can prevent entry or interrupt participation. Ask your organizer about alternatives before assessment day.",
        ],
        links: [{ href: "/privacy", label: "Read the website privacy draft" }],
      },
      {
        id: "information-categories",
        title: "What is checked, and where information goes",
        dataRows: monitoringCategories,
      },
      {
        id: "camera-and-microphone",
        title: "Camera images and microphone access are different",
        paragraphs: [assessmentInformation.camera, assessmentInformation.microphone, assessmentInformation.cleanup],
        note: {
          title: "A presence check is not identity verification",
          body: "Detecting a face does not establish who a person is. Your organizer should explain any separate identity-check process.",
        },
      },
      {
        id: "session-controls",
        title: "What can change during a secured session",
        paragraphs: [
          "Depending on the operating system and round, Access can keep the assessment window in focus, check running applications, limit keyboard actions and restrict network access. These are session controls, separate from the information recorded about the round.",
          "Use the app’s exit process so it can restore device settings. Some restrictions can remain after an interruption or crash until restoration completes. Contact your organizer or support if your device does not return to its normal state.",
        ],
      },
      {
        id: "decisions",
        title: "What checks and activity mean for your result",
        bullets: assessmentInformation.decisions,
        links: [{ href: "/docs/review-results", label: "How to review results and activity" }],
      },
      {
        id: "access-and-retention",
        title: "Who can see records, and how long are they kept?",
        paragraphs: [
          "Assessment services receive submitted work, readiness information and session activity. Authorized organizer, administration or support workflows can use these records. The exact people, permissions and media access for your round need confirmation from its organizer and AMS.",
          "AMS has not yet confirmed a universal retention period, a complete hosting/provider list or a finalized policy for these pages. Do not assume records are deleted when the app closes, when you sign out, or when you uninstall it.",
          "Some setup checks can contact a Google connectivity service as well as assessment services. The endpoint operator can receive ordinary request information, such as IP address, time and user agent.",
          "Local calibration cleanup is separate from queued event records and server-held assessment data. Pending events can remain on the device after a connection problem. Avoid clearing app data during a live round without support guidance.",
        ],
        links: [{ href: "/privacy#retention", label: "Retention and privacy questions" }],
      },
      {
        id: "notice-and-help",
        title: "Read the notice for your version and your round",
        paragraphs: [
          "Access 2.3.1 includes a desktop privacy policy dated 27 May 2026. Find it in Settings → About → Privacy, or through the privacy link before setup. Read it alongside your organizer’s notice; the website review draft does not replace either.",
          "Before the round, confirm which checks apply, whether session images are available to reviewers, who can access records, how long they are kept, and how to ask for a correction or review.",
          "For invitation, participation or result questions, start with your organizer. For privacy questions about Access or uncertainty about where to ask, email team@amshq.in. Keep passwords, invitation codes and assessment answers out of an initial message.",
        ],
        links: [
          { href: "mailto:team@amshq.in", label: "Email the AMS team about privacy" },
          { href: "/docs/candidate-setup", label: "Continue with candidate setup" },
        ],
      },
    ],
    next: "candidate-setup",
  },
  {
    slug: "system-requirements",
    title: "System requirements",
    description: "Check the release, processor, package and setup requirements before installing.",
    audience: "candidates",
    intro: "Choose a device for the whole assessment, not just an installer that opens.",
    before: "This guide distinguishes published package requirements from a tested support commitment. Confirm your organizer’s requirements before the round.",
    sections: [
      {
        id: "current-release",
        title: "Requirements for the current release",
        requirements: true,
        paragraphs: ["These facts are tied to a reviewed release. If the release changes before its requirements are confirmed, this page will say so rather than reuse old minimums."],
      },
      {
        id: "processor-package",
        title: "Match the processor and package",
        bullets: [
          "On Windows, check Settings → System → About → System type. A 64-bit Intel/AMD installer is not a native ARM64 or 32-bit build.",
          "On Mac, check Apple menu → About This Mac for Apple silicon or Intel, and check the macOS version.",
          "On Linux, confirm your distribution and processor. A DEB or RPM package format alone does not establish compatibility with its libraries or desktop session. AppImage is not a promise of universal Linux support.",
        ],
      },
      {
        id: "before-round",
        title: "Prepare the device and permissions",
        paragraphs: [
          "Use an internet connection and the camera, microphone and device permissions required for your round. Complete the app’s readiness checks before assessment day.",
          "If installation is restricted on a managed device, contact your administrator or organizer. Do not disable security protections to install Access.",
          "This page links to the current public release. If your organizer names a different version, confirm the correct download with them before installing or updating.",
        ],
        links: [
          { href: "/docs/what-access-checks-and-records", label: "Understand checks and recording" },
          { href: "/docs/verify-download", label: "Verify the installer" },
        ],
      },
    ],
    next: "candidate-setup",
  },
  {
    slug: "verify-download",
    title: "Verify your download",
    description: "Compare a file’s SHA-256 and understand installation warnings.",
    audience: "candidates",
    intro: "Check that the file you downloaded matches the published checksum for its exact filename and version.",
    before: "Start at app.amsaccess.com. Expand “File details & SHA-256” under the installer you choose. Keep its version, filename and hash together.",
    sections: [
      {
        id: "compare-checksum",
        title: "Compare the checksum for your file",
        steps: [
          { title: "Find the matching file details", body: "Use the details beside your installer, not the checksum for another platform, processor or release. If you saved the file under another name, use that saved name in the command." },
          { title: "Run the displayed command", body: "Open PowerShell on Windows or a terminal on macOS/Linux in the folder containing the downloaded file. Use the command displayed for that exact file. This reads the file to calculate its hash; it does not run the installer." },
          { title: "Compare all 64 characters", body: "The SHA-256 output must match the published value. Letter case does not matter. If the hash differs, do not install that file. Remove it, download again from the Access page, and contact team@amshq.in if it still differs." },
        ],
        note: { title: "What a matching checksum means", body: "A match shows that the file’s bytes match the published checksum. It is not a digital signature, independent proof of the publisher, or a guarantee that software is safe." },
      },
      {
        id: "changed-release",
        title: "If the release changes while the page is open",
        paragraphs: [
          "Download links identify the displayed release and file. If those details change before you click, Access asks you to refresh instead of silently downloading another version.",
          "Refresh the downloads page and compare the new filename, size and checksum. The page does not offer an unrestricted archive of older installers.",
          "If no checksum is available, the file details will say so. Ask the team if you need verification before installing; do not use another file’s hash.",
        ],
      },
      {
        id: "installation-warning",
        title: "If your computer blocks installation",
        paragraphs: [
          "A checksum and an operating-system publisher check answer different questions. Signing and notarization status have not been independently verified here for each installer.",
          "If Windows, macOS, your Linux system or your organization blocks the file or reports a security concern, stop and contact your organizer or device administrator. A matching checksum is not a reason to override a warning.",
          "Do not turn off antivirus protection, remove security restrictions or bypass device-management rules to install the app.",
        ],
        links: [{ href: "mailto:team@amshq.in", label: "Ask the AMS team about a download" }],
      },
    ],
    next: "candidate-setup",
  },
  {
    "slug": "candidate-setup",
    "title": "Prepare for your assessment",
    "description": "From your invitation to a ready desktop app.",
    "audience": "candidates",
    "intro": "Set up Access before assessment day, so you can spend the round on the work itself.",
    "before": "Have your assessment invitation, a computer you can use for the round, and an internet connection.",
    "sections": [
      {
        "id": "read-invitation",
        "title": "Start with your invitation",
        "bullets": [
          "Check the assessment name, date, start time, end time and timezone.",
          "Read the allowed-tool, device and permission requirements supplied by your organizer.",
          "Keep your organizer’s support channel available. Ask how to get help during the round.",
          "Tell your organizer ahead of time if the format, a permission or a device requirement may prevent you from participating."
        ],
        "links": [
          {
            "href": "/docs/what-access-checks-and-records",
            "label": "Read what Access checks and records"
          }
        ]
      },
      {
        "id": "get-access",
        "title": "Install and sign in",
        "steps": [
          {
            "title": "Choose the right installer",
            "body": "Go to app.amsaccess.com. Match the package to your operating system and processor. If your organizer names a version, confirm it before installing or updating."
          },
          {
            "title": "Open the installed desktop app",
            "body": "Complete installation before assessment day. Follow your organizer’s account instructions and use the login details issued for your round. The organizer sign-in on this website is for teams running assessments."
          },
          {
            "title": "Find the right contest",
            "body": "On Home, find your assessment under Contests. Check its title and schedule against your invitation. Use Search contests or clear the search and select Refresh if it is missing."
          }
        ],
        "links": [
          {
            "href": "/docs/system-requirements",
            "label": "Check system requirements"
          },
          {
            "href": "/docs/verify-download",
            "label": "Verify your download"
          }
        ]
      },
      {
        "id": "before-entry",
        "title": "Prepare, then check entry for this round",
        "screenshot": "prepare",
        "steps": [
          {
            "title": "Test your devices",
            "body": "Open Settings → Hardware before the round. Test the camera and microphone required by your organizer, then review the device readiness information on Home."
          },
          {
            "title": "Read the contest’s entry state",
            "body": "A contest can be unpublished, not yet open, ready for setup, running or ended. Installation and a visible contest card do not by themselves grant entry. Follow the action and timing shown on that card."
          },
          {
            "title": "Complete the entry checks",
            "body": "When entry is available, open the contest and read Required checks and Optional warnings. Resolve required failures and complete the setup screens shown for your round before entering the workspace."
          }
        ],
        "note": {
          "title": "Before the timer starts",
          "body": "Do not rely on assessment time to troubleshoot installation or permissions. Contact your organizer beforehand if a check cannot be completed."
        },
        "links": [
          {
            "href": "/docs/device-checks",
            "label": "Work through readiness and permission messages"
          }
        ]
      },
      {
        "id": "setup-complete",
        "title": "What ready looks like",
        "bullets": [
          "You have opened the correct version of the installed app and can find the expected contest.",
          "You have read the round’s rules and know when entry becomes available.",
          "The required device checks have passed for that contest; any remaining warnings have been understood.",
          "You know how to contact the organizer if entry or participation is interrupted."
        ]
      }
    ],
    "next": "device-checks"
  },
  {
    "slug": "device-checks",
    "title": "Check your device",
    "description": "Read readiness states and resolve camera, microphone and permission issues.",
    "audience": "candidates",
    "intro": "Use the readiness checks to find setup issues before they interrupt your assessment.",
    "before": "Open the Access desktop app on the computer you plan to use. Keep your organizer’s requirements nearby.",
    "sections": [
      {
        "id": "readiness",
        "title": "Read the result, not just the progress",
        "bullets": [
          "Required checks must pass before the device can enter the contest.",
          "Optional warnings are advisory. They do not block entry, but can help support diagnose a problem.",
          "Checking, Not verified and an unavailable report are not passing results.",
          "“Readiness report unavailable” means Access does not have the report it needs. Choose Run checks again. If it persists, ask your invigilator rather than assuming entry is safe.",
          "A completed readiness check does not override a contest that is unpublished, not open yet or ended. Check the contest window too."
        ]
      },
      {
        "id": "camera-microphone",
        "title": "Test the camera and microphone",
        "screenshot": "hardware",
        "steps": [
          {
            "title": "Open Settings → Hardware",
            "body": "Choose the intended camera, then select Start camera. Check that the preview shows you clearly. Use Refresh cameras if a newly connected camera is missing."
          },
          {
            "title": "Test the microphone",
            "body": "Select Start microphone and speak to check the Input level. Stop the test when finished. The operating system’s selected input and permissions affect this test."
          },
          {
            "title": "Recheck after changes",
            "body": "After reconnecting a device or changing permissions, return to Access and repeat the test. Before entry, use Run checks again for the contest’s readiness result."
          }
        ],
        "links": [
          {
            "href": "/docs/what-access-checks-and-records",
            "label": "Understand device access and recording"
          }
        ]
      },
      {
        "id": "camera-recovery",
        "title": "Match the camera message to the next step",
        "steps": [
          {
            "title": "Access denied",
            "body": "Allow camera access for Access in the operating system’s privacy settings. On a managed computer, ask the administrator. If Access asks you to quit and reopen after a permission change, do this during setup, before an active assessment."
          },
          {
            "title": "No camera found or disconnected",
            "body": "Check the connection and any physical privacy switch. Reconnect the intended device, use Refresh cameras and test it again."
          },
          {
            "title": "Blank preview, no frames or camera unavailable",
            "body": "Check that the lens is uncovered and the selected device is correct. Before the round, close other applications that may be using the camera, then restart its test. If a preview still cannot be obtained, share the exact message with your organizer."
          },
          {
            "title": "Framing or lighting needs attention",
            "body": "Follow the setup screen’s guidance for position and lighting. A camera-access success does not mean a later presence or calibration step has passed."
          }
        ]
      },
      {
        "id": "other-permissions",
        "title": "Resolve the permission actually requested",
        "paragraphs": [
          "If the microphone is missing, connect the intended device and check your computer’s input setting. If permission was denied, allow it in the operating system and repeat Start microphone.",
          "On macOS, a readiness failure may request Accessibility or Input Monitoring. Use the named settings action in Access, enable the requested permission for Access, and run the checks again. Camera permission does not grant these separate permissions.",
          "If a requirement cannot be met, ask your organizer before the round. Do not disable security software, device-management rules or session controls to force a check to pass."
        ],
        "links": [
          {
            "href": "/docs/troubleshooting",
            "label": "Get help with an unresolved check"
          }
        ]
      },
      {
        "id": "unresolved-check",
        "title": "Keep enough detail to get help",
        "bullets": [
          "Note the exact message and whether it appeared on Home, in Hardware or during entry.",
          "Find the Access version in Settings → About and include your operating system.",
          "Tell the organizer which device and permission checks you have already tried.",
          "If the session is already running, use the round’s support channel before restarting or changing devices."
        ]
      }
    ],
    "next": "taking-an-assessment"
  },
  {
    "slug": "taking-an-assessment",
    "title": "Take a coding assessment",
    "description": "Read the problem, run your code, confirm scored submissions and finish the session.",
    "audience": "candidates",
    "intro": "The coding workspace keeps the problem, editor and execution output together. Check each result before moving on.",
    "before": "Complete the entry steps and read your round’s instructions. Languages, question configuration and result availability depend on the assessment.",
    "sections": [
      {
        "id": "understand-problem",
        "title": "Read before you write",
        "screenshot": "workspace",
        "paragraphs": [
          "Choose the intended problem. Read Statement, Examples and Constraints, along with the displayed points, time and memory limits. Check the available language before writing.",
          "Keep the remaining session time and the organizer’s rules in mind. A successful example does not establish that the solution handles the problem’s full constraints."
        ]
      },
      {
        "id": "run-submit",
        "title": "Keep draft, Run and Submit separate",
        "steps": [
          {
            "title": "Write and check the active file",
            "body": "Confirm the problem, file and selected language. A Saved or All changes saved indicator concerns the draft on this device; it is not a scored submission or a promise that the code has reached the judge."
          },
          {
            "title": "Run for feedback",
            "body": "Use Run to test against the sample cases. If the Custom tab is available, use its controls to try your own input. Read compiler feedback and test output. Runs send the code for execution but do not count as scored submissions."
          },
          {
            "title": "Submit for scoring",
            "body": "Use Submit to send the current solution for evaluation. Check the Attempts panel for that problem. Queued or running means the result is not final; wait for the recorded verdict and test results."
          },
          {
            "title": "Check again after editing",
            "body": "A previous run or submission belongs to the code sent at that time. Editing afterwards does not update that attempt. Submit the revised solution if you want it evaluated."
          }
        ],
        "note": {
          "title": "Do not infer submission from a draft",
          "body": "A saved editor draft, a passing sample run and a final scored attempt are different states. Before finishing, check the attempts for every problem you intended to submit."
        }
      },
      {
        "id": "attempt-results",
        "title": "Read the recorded outcome",
        "screenshot": "submissions",
        "paragraphs": [
          "Use the attempt history to distinguish a pending evaluation from a final verdict. Review any available compiler diagnostics, passed tests, execution time and memory information for the selected attempt.",
          "If a run times out or a request cannot be confirmed, read the displayed message. Do not assume that no result exists, or that clicking again has replaced an earlier attempt. Check the history and use the organizer’s support channel when the status remains unclear."
        ]
      },
      {
        "id": "report-incident",
        "title": "Report a problem and confirm it was sent",
        "steps": [
          {
            "title": "Open Report an incident",
            "body": "Choose the issue and add what happened, the problem involved and the approximate time. Device diagnostics accompany the report; avoid unrelated personal information."
          },
          {
            "title": "Select Submit report",
            "body": "Wait for Report sent before treating it as delivered. You can then use Back to contest."
          },
          {
            "title": "If you see Report not confirmed",
            "body": "Read the error, retry when appropriate, and contact your organizer through the round’s support channel if delivery remains unconfirmed. Do not assume someone received the report or that a reply will arrive immediately."
          }
        ],
        "links": [
          {
            "href": "/docs/what-access-checks-and-records",
            "label": "What an incident report includes"
          }
        ]
      },
      {
        "id": "finish",
        "title": "Confirm the session finish separately",
        "steps": [
          {
            "title": "Check your scored attempts",
            "body": "Before choosing Finish contest, confirm the submissions you intended to have scored. Review the confirmation, then choose Finish and exit only when you are ready. Finishing the session does not turn every saved draft into a scored submission."
          },
          {
            "title": "Read the Finish receipt",
            "body": "While “Finishing your session…” is shown, keep the window open. “Session finish confirmed” means the server acknowledged the finish request; scored submission results remain a separate check."
          },
          {
            "title": "Handle an unconfirmed finish",
            "body": "If Access says “Could not confirm session finish”, ask the invigilator to check your session and submissions. A confirmed draft save does not confirm the session finished. The screen does not keep retrying after you leave."
          },
          {
            "title": "Return through the app",
            "body": "Use Check results status or Back to home after the receipt. If Access reports that device settings still need restoration, follow its recovery guidance and seek help if it cannot complete."
          }
        ],
        "links": [
          {
            "href": "/docs/troubleshooting",
            "label": "Help with interruptions and restoration"
          }
        ]
      }
    ],
    "next": "troubleshooting"
  },
  {
    "slug": "troubleshooting",
    "title": "Get help when something is stuck",
    "description": "Find a safe next step for missing contests, failed checks, interrupted sessions and unconfirmed submissions.",
    "audience": "candidates",
    "intro": "Start with the exact message you can see. It helps you and your organizer identify the next step.",
    "before": "During a live assessment, use the support channel provided for the round. The website contact form is not a live invigilation channel.",
    "sections": [
      {
        "id": "missing-assessment",
        "title": "My contest is missing or entry is disabled",
        "steps": [
          {
            "title": "Check the account and list",
            "body": "Use the account named in the invitation. On Home, clear Search contests and choose Refresh. A loading error is different from an empty search result."
          },
          {
            "title": "Check the round and its window",
            "body": "Compare the title, date and timezone with the invitation. An unpublished, upcoming or ended contest may be visible without allowing entry."
          },
          {
            "title": "Ask the organizer to verify access",
            "body": "If the list or timing still looks wrong, ask the organizer to confirm your roster entry, login details and the published schedule. Do not create a second account as a workaround."
          }
        ]
      },
      {
        "id": "device-issue",
        "title": "A required check is failing",
        "paragraphs": [
          "Read whether the item is required, optional, still checking or unavailable. Use Run checks again after resolving the named issue.",
          "For camera and microphone problems, test Settings → Hardware and check the corresponding operating-system permission. For a missing readiness report, retry the checks and escalate if it remains unavailable.",
          "Before the round, ask for help if your device cannot meet a requirement. During the round, consult the invigilator before restarting the app or changing devices."
        ],
        "links": [
          {
            "href": "/docs/device-checks",
            "label": "Camera, microphone and permission recovery"
          }
        ]
      },
      {
        "id": "connection-issue",
        "title": "The connection dropped or the workspace is paused",
        "paragraphs": [
          "Read the current connection or session message and use the approved support channel. Leave Access open where possible; do not clear app data, uninstall it or repeatedly restart to try to remove the warning.",
          "If you are returned to Home and Resume Active Session is available, follow it and complete the checks shown. Resuming may require the organizer’s approval; do not start another session to bypass that decision.",
          "If resuming fails, use Get help rejoining when shown or contact the invigilator with the message and approximate time. Do not assume lost connection pauses the assessment clock."
        ]
      },
      {
        "id": "submission-issue",
        "title": "A run, submission or finish is unconfirmed",
        "bullets": [
          "Queued or running: keep the app open and watch the attempt status. It is not a final verdict.",
          "Run failed or timed out: read the error and check the available attempt status before retrying.",
          "Submit failed or no final result: check the problem’s Attempts panel and tell the invigilator what is shown. A saved draft or passing sample run is not proof of submission.",
          "Could not confirm session finish: ask the invigilator to check both the session and its scored submissions. Do not treat a draft-save acknowledgement as a finish receipt.",
          "Report not confirmed: retry the report if appropriate, then use the organizer’s support channel if it still cannot be confirmed."
        ]
      },
      {
        "id": "restore-device",
        "title": "My device has not returned to normal after the round",
        "paragraphs": [
          "Use Access’s exit and restoration flow. If it reports “Some device settings are still changed”, follow Back to home to see the pending restoration guidance.",
          "Use Restore system settings or Try again when offered in Settings. If restoration remains incomplete, contact your organizer or team@amshq.in with the message and affected setting. Ask your administrator for help on a managed device.",
          "Do not delete Access’s data while recovery or a session is unresolved. Avoid commands from unrelated websites or changes that disable security protections."
        ]
      },
      {
        "id": "helpful-details",
        "title": "Send enough detail, without sending your answers",
        "bullets": [
          "Assessment name, your role and the step where you got stuck.",
          "Exact message, approximate time and timezone.",
          "Operating system and Access version from Settings → About, if available.",
          "Whether the session is still open, whether the attempt has a verdict and whether a report was confirmed.",
          "Steps already tried. Share screenshots only through the organizer’s approved channel, with unrelated personal information hidden."
        ],
        "note": {
          "title": "Choose the right contact",
          "body": "Use the organizer for invitation, timing, participation and result decisions. Email team@amshq.in for general Access help. Do not include passwords, invitation codes, credential files or assessment answers in an initial email."
        },
        "links": [
          {
            "href": "mailto:team@amshq.in",
            "label": "Email the AMS team"
          }
        ]
      }
    ],
    "next": "candidate-setup"
  },
  {
    "slug": "organize-assessment",
    "title": "Prepare an assessment round",
    "description": "Create a contest, attach questions, prepare the roster and check access before publishing.",
    "audience": "organizers",
    "intro": "Build the round in the same order candidates will experience it: clear instructions, working access, then the assessment itself.",
    "before": "Use Organizer sign in for your organization’s workspace. For a first round, contact the team to confirm setup, formats and responsibilities before inviting candidates.",
    "sections": [
      {
        "id": "define-round",
        "title": "Agree on the assessment and its review",
        "bullets": [
          "Define the skills to assess, the question format and the review criteria.",
          "Confirm permitted languages, tools and runtime requirements for the actual round. Do not infer them from an editor’s syntax highlighting.",
          "Agree on the start and end time, timezone, device requirements and any candidate arrangements.",
          "Name the people handling setup, live incidents, result review and candidate questions."
        ],
        "links": [
          {
            "href": "/contact",
            "label": "Discuss a first assessment"
          },
          {
            "href": "/docs/prepare-questions",
            "label": "Prepare and verify questions"
          }
        ]
      },
      {
        "id": "create-contest",
        "title": "Create the contest and check its schedule",
        "steps": [
          {
            "title": "Open Contests → New contest",
            "body": "Enter Title, Starts and Ends. The date and time inputs use your computer’s local timezone. Confirm that timezone before entering the schedule and communicate it explicitly in the invitation."
          },
          {
            "title": "Review the options",
            "body": "Check Freeze scoreboard and whether this should be a Practice contest. Confirm the intended behavior for your round rather than leaving an option selected by habit."
          },
          {
            "title": "Choose Create contest",
            "body": "Open the created contest and verify its title, schedule and status. A draft cannot be joined with the invite code until it is published."
          },
          {
            "title": "Correct the schedule before sharing it",
            "body": "Use the schedule controls if the window is wrong. Recheck the displayed times after saving, and tell candidates if an already shared schedule changes."
          }
        ]
      },
      {
        "id": "prepare-workspace",
        "title": "Attach the intended question versions",
        "screenshot": "organize",
        "steps": [
          {
            "title": "Open the contest’s Problems tab",
            "body": "Choose Add problem, check and select the intended Problem version, then set its label and score."
          },
          {
            "title": "Check what was attached",
            "body": "Review the problem title, label, displayed limits and score. Repeat for the remaining questions, using distinct labels."
          },
          {
            "title": "Resolve unavailable questions",
            "body": "Only problem versions with an uploaded package are offered. If a question is missing, prepare or publish it in Problems before returning to the contest."
          }
        ],
        "links": [
          {
            "href": "/docs/prepare-questions",
            "label": "Question authoring and verification"
          }
        ]
      },
      {
        "id": "candidate-roster",
        "title": "Build the roster before distributing credentials",
        "steps": [
          {
            "title": "Prepare the Participants directory",
            "body": "Confirm the people and email addresses in the organization’s Participants area. Adding a CSV to a contest does not create missing people in the directory."
          },
          {
            "title": "Add people to this contest",
            "body": "In the contest’s Participants tab, use Add from Access or Add participants. The CSV option accepts email addresses and shows matched, already-on-roster and unknown entries before adding them."
          },
          {
            "title": "Resolve unknown entries",
            "body": "Correct the directory or CSV first. Review the intended additions and confirm them; an unknown email is not an invited candidate."
          },
          {
            "title": "Check credentials and delivery",
            "body": "Use the credential controls to issue access and distribute it through your agreed process. A roster entry, an issued credential, an email queued for sending and a candidate successfully signing in are separate states. Check missing passphrases and failed email statuses."
          }
        ],
        "note": {
          "title": "Handle credential files carefully",
          "body": "If a one-time password screen is shown, save or print it only through your approved process before leaving. Export roster is not a password backup. Reissuing a credential changes the candidate’s login secret; tell the affected person and do not circulate the full roster or credential file."
        }
      },
      {
        "id": "candidate-instructions",
        "title": "Send one clear set of instructions",
        "bullets": [
          "Contest name, start and end time, timezone and when setup opens.",
          "Download location, required app version if specified, and instructions to install and test before the round.",
          "Individual login instructions, permitted tools and the assessment rules.",
          "Required permissions, what is recorded, who can access it and how to ask privacy questions.",
          "A live support channel and a way to request participation arrangements in advance."
        ],
        "links": [
          {
            "href": "/docs/candidate-setup",
            "label": "Candidate setup guide"
          },
          {
            "href": "/docs/what-access-checks-and-records",
            "label": "Explain checks and recording"
          }
        ]
      },
      {
        "id": "publish-round",
        "title": "Check readiness, then publish",
        "steps": [
          {
            "title": "Review the round as a team",
            "body": "Confirm questions, tested configuration, schedule, roster, credentials and candidate instructions. Arrange a rehearsal with authorized test accounts before a real round; use the same device and language requirements."
          },
          {
            "title": "Choose Publish when the draft is ready",
            "body": "The contest needs a problem before publishing. Read any error, resolve it and confirm the status changed. Copying an invite code does not publish a draft."
          },
          {
            "title": "Verify entry and support",
            "body": "Check that the published schedule is the one you communicated and that an authorized test candidate can reach the intended entry flow. Keep the organizer’s incident support available during the round."
          }
        ],
        "note": {
          "title": "Avoid accidental changes to a live round",
          "body": "End now, credential revocation and rejudging affect participation or results. Use them only through your agreed process, with the relevant people informed."
        }
      },
      {
        "id": "during-round",
        "title": "Keep invigilation and review separate",
        "paragraphs": [
          "Use the contest’s Invigilation tab to check Help requests, Live sessions and Entry-gate reports. A quiet session or a failed device report needs context and follow-up; it is not a misconduct finding.",
          "Resolve a help request only after handling it. Follow your organization’s authorization process for session recovery or any exception to a required check.",
          "After the round, move to Submissions and your agreed review process. Confirm data handling and result communication before exporting or sharing records."
        ],
        "links": [
          {
            "href": "/docs/review-results",
            "label": "Review results and session information"
          }
        ]
      }
    ],
    "next": "review-results"
  },
  {
    "slug": "prepare-questions",
    "title": "Prepare and verify questions",
    "description": "Move a coding problem from its statement and tests to a verified version for a contest.",
    "audience": "organizers",
    "intro": "Check that the question, its tests and the intended evaluation agree before a candidate sees it.",
    "before": "These steps describe the organizer’s coding-problem authoring flow. Confirm any other format or language requirement with the team; this guide is not a universal runtime support list.",
    "sections": [
      {
        "id": "choose-question",
        "title": "Choose an existing version or create a draft",
        "steps": [
          {
            "title": "Look in Problems → Catalogue",
            "body": "If the intended problem already exists, check its version and package before attaching it to a contest."
          },
          {
            "title": "Use Problemsetting → New problem for a new draft",
            "body": "Start with the name and statement, then work through the authoring steps. A draft is separate from a published problem."
          },
          {
            "title": "Set realistic limits",
            "body": "In Overview, review Memory (MB), CPU (ms) and Wall (ms). These are problem configuration fields, not published platform maximums. Test your chosen values with representative solutions before the round."
          }
        ]
      },
      {
        "id": "statement-and-solution",
        "title": "Make the statement and reference solution agree",
        "bullets": [
          "In Statement, describe inputs, outputs, constraints and examples precisely.",
          "In Solution, provide the intended reference solution for the authoring workflow.",
          "Check that the examples and expected outputs follow the same rules as the statement.",
          "Confirm the permitted languages and exact runtime needs for the contest with the team. Do not publish an unverified compiler-version promise."
        ]
      },
      {
        "id": "tests",
        "title": "Add tests that distinguish correct and incorrect work",
        "steps": [
          {
            "title": "Open Tests → Add case",
            "body": "Give each case a useful label, input and expected output. Include ordinary cases, boundaries and cases where a plausible incorrect solution fails."
          },
          {
            "title": "Check expected output deliberately",
            "body": "The authoring form allows blank expected output for running a case without judging it. Do not leave it blank when the case is intended to check correctness."
          },
          {
            "title": "Review optional checks only if used",
            "body": "Configure additional validation or checking only when it is part of your intended evaluation. An optional check that is not configured is not a passing test."
          }
        ]
      },
      {
        "id": "verify-publish",
        "title": "Verify the current draft, then publish",
        "steps": [
          {
            "title": "Open Verify and publish → Run the checks",
            "body": "Wait for the report. Inspect compiler diagnostics, individual case results and the overall state."
          },
          {
            "title": "Resolve Failing or Error results",
            "body": "Correct the statement, solution, inputs, expected outputs or limits as appropriate, then run the checks again. SKIPPED means not configured, not passed."
          },
          {
            "title": "Publish a verified draft",
            "body": "Use Publish after the draft reaches its verified state. Confirm Published before returning to the contest."
          },
          {
            "title": "Attach and rehearse",
            "body": "In Contests → your contest → Problems → Add problem, select the intended version, label and score. Rehearse the candidate workflow with authorized test data before a real assessment."
          }
        ],
        "note": {
          "title": "Verification has a scope",
          "body": "Passing the configured checks does not prove the statement is unambiguous, the test set is complete or every candidate device and language works. Review those separately with the assessment team."
        }
      }
    ],
    "next": "organize-assessment"
  },
  {
    "slug": "review-results",
    "title": "Review results and session activity",
    "description": "Use the contest’s submissions, participant history, exports and invigilation records together.",
    "audience": "reviewers",
    "intro": "Start with the recorded outcome, then examine the information behind it using the criteria agreed for the round.",
    "before": "Use your authorized organizer workspace and confirm the intended contest. Access to one view does not establish permission to redistribute its records.",
    "sections": [
      {
        "id": "round-results",
        "title": "Open the contest’s Submissions tab",
        "screenshot": "review",
        "steps": [
          {
            "title": "Check the contest and candidate",
            "body": "Go to Contests, open the intended round and choose Submissions. Match the candidate and problem before interpreting a row."
          },
          {
            "title": "Read the evaluation state",
            "body": "Queued and running are not final results. For completed attempts, inspect the verdict, passed tests, execution time and memory where present."
          },
          {
            "title": "Allow for pending or delayed results",
            "body": "The list refreshes automatically. If results remain pending or a connection problem makes the display uncertain, ask the organizer to confirm judging status before making a decision."
          }
        ],
        "note": {
          "title": "Keep the evidence in scope",
          "body": "This table summarizes recorded attempts. Do not assume it provides a full source-code review, a complete activity timeline or a hiring recommendation."
        }
      },
      {
        "id": "candidate-work",
        "title": "Use participant history for context",
        "paragraphs": [
          "Open Participants and the relevant participant profile to inspect the available Contests and Submissions history. Confirm you are comparing the same person, problem and round.",
          "Review the available attempt outcomes rather than treating one successful sample run or a saved draft as the final result. If you need source-level review or evidence that is not available in your workspace, agree how it will be provided before the round.",
          "Separate the question’s score and verdict from participation incidents. Apply the same agreed evaluation criteria to each candidate."
        ]
      },
      {
        "id": "session-activity",
        "title": "Read Invigilation alongside results",
        "steps": [
          {
            "title": "Check Help requests",
            "body": "Read the candidate’s reported issue, category, timestamp and resolution state. A sent report does not prove that the underlying issue was resolved."
          },
          {
            "title": "Check Live sessions",
            "body": "Use session state, Last contact and Flags to identify cases needing follow-up. A long gap in contact may be a device or connection interruption; a reopened session needs its recovery context."
          },
          {
            "title": "Check Entry-gate reports",
            "body": "These describe what a device reported before entry. Missing reports, passing checks, failures and authorized exceptions are different states; none by itself proves identity or misconduct."
          }
        ],
        "note": {
          "title": "An activity flag is not a verdict",
          "body": "Use recorded activity to identify what needs examination. Consider submitted work, the candidate’s report and the surrounding circumstances, and follow a human review process before communicating a decision."
        },
        "links": [
          {
            "href": "/docs/what-access-checks-and-records",
            "label": "Understand monitoring records and their limits"
          }
        ]
      },
      {
        "id": "export-results",
        "title": "Export the result you actually need",
        "steps": [
          {
            "title": "Choose the appropriate export",
            "body": "From Submissions, use Standings CSV for standings or Submissions CSV for attempt records. Export roster, in Participants, serves a different purpose."
          },
          {
            "title": "Check the file before relying on it",
            "body": "Confirm the contest, candidates and fields match your review task. If judging is still in progress or an authorized rejudge occurs, regenerate exports after results are confirmed."
          },
          {
            "title": "Keep access controlled",
            "body": "Store and share exports only through your organization’s approved workflow. A downloaded file is a separate copy; app access controls do not manage where it is forwarded."
          }
        ],
        "note": {
          "title": "Rejudge is a change to evaluation",
          "body": "Do not use rejudging as a routine page refresh. It can change outcomes. Agree on the reason, authorization and candidate communication through your assessment process first."
        }
      },
      {
        "id": "share-outcome",
        "title": "Close the review with a clear explanation",
        "paragraphs": [
          "Resolve outstanding incidents or result questions with the organizer before treating the review as complete.",
          "Record the decision and its basis through your organization’s agreed process. Tell candidates when and how results will be shared and where to raise a question.",
          "Do not include another candidate’s work, results, credentials or personal information when explaining an individual outcome."
        ]
      }
    ],
    "next": "organize-assessment"
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
export function guideSearchText(guide: Guide) {
  return [
    guide.title,
    guide.description,
    guide.intro,
    guide.before,
    ...guide.sections.flatMap((section) => [
      section.title,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []),
      ...(section.dataRows ?? []).flatMap((row) => [row.title, row.purpose, row.handling]),
      ...(section.steps ?? []).flatMap((step) => [step.title, step.body]),
      section.note?.title ?? "",
      section.note?.body ?? "",
    ]),
  ].join(" ");
}
