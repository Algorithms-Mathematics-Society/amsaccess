// Intentionally curated public help content. Do not import internal markdown,
// operational runbooks, customer fixtures, or repository metadata into this file.
export type Audience = "everyone" | "candidates" | "organizers" | "reviewers";
export type GuideSection = {
  id: string;
  title: string;
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
          "This website explains Access and provides public guidance. App access and downloads are at app.amsaccess.com.",
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
    slug: "candidate-setup",
    title: "Prepare for your assessment",
    description: "From your invitation to a ready desktop app.",
    audience: "candidates",
    intro:
      "Set up Access before assessment day, so you can spend the round on the work itself.",
    before:
      "Have your assessment invitation, a computer you can use for the round, and an internet connection.",
    sections: [
      {
        id: "read-invitation",
        title: "Start with your invitation",
        bullets: [
          "Check the assessment date, start time, end time, and timezone.",
          "Read the allowed-tool and device requirements supplied by your organizer.",
          "Keep the organizer’s contact details available in case you need help.",
        ],
        note: {
          title: "Need a different arrangement?",
          body: "Tell your organizer ahead of time if a device requirement, permission, or assessment format may prevent you from participating.",
        },
      },
      {
        id: "get-access",
        title: "Get the desktop app",
        steps: [
          {
            title: "Go to app access",
            body: "Visit app.amsaccess.com for access and downloads. Use the version for your Windows, macOS, or Linux computer.",
          },
          {
            title: "Install and open Access",
            body: "Follow the installation prompts and the account instructions provided for your assessment. Allow time to resolve setup issues before the round.",
          },
          {
            title: "Find your assigned assessment",
            body: "Check the assessment list in the desktop app. Confirm the title and schedule match your invitation.",
          },
        ],
      },
      {
        id: "before-entry",
        title: "Check your setup before entering",
        paragraphs: [
          "Review the device readiness information on the app’s home screen. Open Settings to test any camera and microphone required for the round.",
          "When the assessment opens, follow the entry checks shown in Access. If the round is missing or you cannot enter, use the troubleshooting guide or contact your organizer.",
        ],
        note: {
          title: "Installation is only the first step",
          body: "Allow time for device checks and any required entry steps. A downloaded app does not mean the assessment is ready to begin.",
        },
      },
    ],
    next: "device-checks",
  },
  {
    slug: "device-checks",
    title: "Check your device",
    description:
      "Understand readiness messages and test your camera and microphone.",
    audience: "candidates",
    intro:
      "Use the readiness checks to find setup issues before they interrupt your assessment.",
    before:
      "Open the Access desktop app on the computer you plan to use. Keep your organizer’s device requirements nearby.",
    sections: [
      {
        id: "readiness",
        title: "Read what the app is asking for",
        paragraphs: [
          "The home screen summarizes device readiness. Read the explanation for any item that needs attention and follow the action shown.",
          "A check that is still running or unavailable does not confirm that a device is ready. Wait for a result or ask for help if the message does not resolve.",
        ],
      },
      {
        id: "camera-microphone",
        title: "Test the required camera and microphone",
        steps: [
          {
            title: "Open Settings, then Hardware",
            body: "Use the camera and microphone controls to test the devices you intend to use for the round.",
          },
          {
            title: "Check access and the selected device",
            body: "If Access cannot use a required device, check its permission in your computer’s settings. Make sure the intended camera or microphone is connected and selected.",
          },
          {
            title: "Repeat the test",
            body: "Return to Access after making a change. Follow any prompt to reopen the app, and repeat the test before entering the assessment.",
          },
        ],
      },
      {
        id: "unresolved-check",
        title: "If a check still needs attention",
        paragraphs: [
          "Note the exact message and when it appears. Contact your organizer with your operating system and app version, if available.",
          "If a requirement cannot be met on your computer, ask your organizer what to do before the round starts.",
        ],
        note: {
          title: "Keep the round’s requirements in mind",
          body: "Readiness checks help you prepare. Access may ask for further checks when you enter a particular assessment.",
        },
      },
    ],
    next: "taking-an-assessment",
  },
  {
    slug: "taking-an-assessment",
    title: "Take a coding assessment",
    description:
      "Read the problem, run your code, and confirm your submissions.",
    audience: "candidates",
    intro:
      "The coding workspace keeps the problem, editor, and execution output together. Here is the basic flow.",
    before:
      "Complete the entry steps and read your round’s instructions. Available languages and tools depend on the assessment.",
    sections: [
      {
        id: "understand-problem",
        title: "Read before you write",
        paragraphs: [
          "Choose the problem you want to work on. Read its statement, constraints, and examples, then check which languages are available.",
          "Keep the round’s time limit and instructions in mind as you move between questions.",
        ],
      },
      {
        id: "run-submit",
        title: "Know the difference between Run and Submit",
        steps: [
          {
            title: "Write your solution",
            body: "Work in the editor using an allowed language. Check that you are editing the intended problem before running or submitting.",
          },
          {
            title: "Run to check your work",
            body: "Use Run to try your code against sample tests and inspect the output or compiler feedback. Running code does not submit it for scoring.",
          },
          {
            title: "Submit for scoring",
            body: "Use Submit when you want to send a solution for evaluation. Review its status and the attempts panel instead of assuming the click completed the submission.",
          },
        ],
        note: {
          title: "Saved work and submitted work are different",
          body: "An editor save indicator is not a submission confirmation. Check the submission status for the work you intend to have evaluated.",
        },
      },
      {
        id: "when-stuck",
        title: "If something interrupts the round",
        paragraphs: [
          "Read the message shown in Access. If a submission is still being evaluated, wait for its status to update. If it fails, follow the displayed guidance.",
          "Use the app’s incident-report option if available, or contact your organizer through the channel provided for the round. Explain what happened and roughly when.",
        ],
      },
      {
        id: "finish",
        title: "Before you finish",
        bullets: [
          "Check the submission status for each problem you intended to submit.",
          "Follow the instructions shown when the assessment ends.",
          "Ask your organizer when and how results will be shared.",
        ],
      },
    ],
    next: "troubleshooting",
  },
  {
    slug: "troubleshooting",
    title: "Get help when something is stuck",
    description:
      "Find the next step for missing assessments, device checks, or submissions.",
    audience: "candidates",
    intro:
      "Start with the message you can see. It helps you and your organizer identify the right next step.",
    before:
      "If your assessment is already running, use the support channel provided for the round. The general contact form is not a live assessment support channel.",
    sections: [
      {
        id: "missing-assessment",
        title: "My assessment is not listed",
        paragraphs: [
          "Confirm you are using the account specified in your invitation. Clear any search in the assessment list and use Refresh to check for updates.",
          "Check the invitation’s date and timezone. If the round is still missing, ask your organizer to confirm your invitation and account details.",
        ],
      },
      {
        id: "device-issue",
        title: "A device check is not passing",
        paragraphs: [
          "Read the item’s explanation and follow the requested action. For camera or microphone issues, check your selected device and its permissions, then repeat the test in Settings.",
          "If the message persists, share its wording with your organizer before entering. Ask for help if your device cannot meet the requirement.",
        ],
      },
      {
        id: "submission-issue",
        title: "My submission is pending or failed",
        paragraphs: [
          "A pending or judging status means you do not yet have a final result. Check the attempts panel for an update.",
          "If Access reports a failure or connection issue, follow the displayed instructions. Do not treat a saved draft or a successful sample run as confirmation of submission.",
        ],
        note: {
          title: "During the round",
          body: "Report the issue through the available incident-report option or your organizer’s support channel. Include the problem you were working on and the approximate time.",
        },
      },
      {
        id: "helpful-details",
        title: "What to include when asking for help",
        bullets: [
          "The assessment name and the step where you got stuck.",
          "The message shown in Access and the approximate time it appeared.",
          "Your operating system and Access version, if available.",
          "The steps you have already tried.",
        ],
        note: {
          title: "Share only what is needed",
          body: "Do not send passwords, invitation codes, or assessment answers in a general enquiry. Send screenshots only through the support channel your organizer provides, with unrelated personal details hidden.",
        },
      },
    ],
    next: "candidate-setup",
  },
  {
    slug: "organize-assessment",
    title: "Prepare an assessment round",
    description:
      "Plan the questions, invitations, candidate setup, and review.",
    audience: "organizers",
    intro:
      "Give candidates a predictable experience by resolving the practical details before you invite them to begin.",
    before:
      "Use your organization’s Access workspace. If you are planning a first round, contact the Access team to confirm the assessment format and setup.",
    sections: [
      {
        id: "define-round",
        title: "Define what the round needs to assess",
        bullets: [
          "Agree on the question format, allowed languages and tools, and evaluation criteria.",
          "Set a clear start and end time, including the timezone.",
          "Decide what reviewers should examine and how results will be communicated.",
        ],
      },
      {
        id: "prepare-workspace",
        title: "Prepare the round in your workspace",
        steps: [
          {
            title: "Set the details and questions",
            body: "Add the assessment information, schedule, questions, and the test configuration your round needs.",
          },
          {
            title: "Prepare the candidate list",
            body: "Invite candidates or import a roster. Check the intended recipients and the account instructions they will receive.",
          },
          {
            title: "Review the launch checklist",
            body: "Work through outstanding setup items before launch. Resolve anything that needs attention rather than assuming the round is ready.",
          },
        ],
      },
      {
        id: "candidate-instructions",
        title: "Give candidates one clear set of instructions",
        bullets: [
          "Where to get Access and which computer they should use.",
          "When to install the app, test devices, and complete entry steps.",
          "The assessment window, timezone, and permitted tools.",
          "Required permissions and who to contact with setup questions.",
          "How to request any arrangements they need before assessment day.",
        ],
        note: {
          title: "Set up support before the round",
          body: "Tell candidates how to reach your team during the assessment. Make clear who handles invitation, timing, device, and participation questions.",
        },
      },
      {
        id: "plan-review",
        title: "Agree on review before results arrive",
        paragraphs: [
          "Decide who will review submissions and how session activity will be interpreted. Use consistent assessment criteria and a clear process for questions or reported issues.",
          "Confirm any organization-specific data handling or assessment requirements with the Access team before the round.",
        ],
      },
    ],
    next: "review-results",
  },
  {
    slug: "review-results",
    title: "Review results and session activity",
    description:
      "Move from overall results to individual work and session activity.",
    audience: "reviewers",
    intro:
      "Start with the outcome, then examine the evidence behind it using the criteria agreed for the round.",
    before:
      "Make sure you have access to the assessment workspace and understand the organizer’s review criteria.",
    sections: [
      {
        id: "round-results",
        title: "Start with the round’s results",
        paragraphs: [
          "Use the leaderboard and per-question results to understand the overall round. Confirm that you are reviewing the intended assessment and candidate.",
          "If your process uses exported results, keep them within your organization’s approved review workflow.",
        ],
      },
      {
        id: "candidate-work",
        title: "Inspect the work behind the result",
        steps: [
          {
            title: "Open the candidate’s submission history",
            body: "Look at individual attempts and their recorded outcomes. Use the problem’s evaluation criteria as your reference.",
          },
          {
            title: "Consider relevant session activity",
            body: "Read available activity records alongside the submissions and any reported issues. Use them to identify what needs further examination.",
          },
          {
            title: "Follow your review process",
            body: "Apply the same criteria consistently. Route unresolved questions through the organizer’s process before communicating a decision.",
          },
        ],
        note: {
          title: "An activity flag is not a verdict",
          body: "A recorded event does not, on its own, prove misconduct. Consider the work and the surrounding context, and use human judgment.",
        },
      },
      {
        id: "share-outcome",
        title: "Keep the outcome clear",
        paragraphs: [
          "Record and communicate decisions through your organization’s agreed process. The organizer should explain when and how candidates will receive results.",
          "Avoid sharing another candidate’s work or results when discussing an individual assessment.",
        ],
      },
    ],
    next: "organize-assessment",
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
      ...(section.steps ?? []).flatMap((step) => [step.title, step.body]),
      section.note?.title ?? "",
      section.note?.body ?? "",
    ]),
  ].join(" ");
}
