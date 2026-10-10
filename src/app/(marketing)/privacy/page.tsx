import type { Metadata } from "next";
import { assessmentInformation, MONITORING_GUIDE_PATH } from "@/lib/assessment-information";
import { LegalDocument, type LegalContent } from "@/components/LegalDocument";
export const metadata: Metadata = {
  title: "Privacy notice — Access by AMS",
  description:
    "Information about Access website enquiries, assessment data, device permissions, local storage, and privacy questions.",
  robots: { index: false, follow: true },
};
const content: LegalContent = {
  kind: "privacy",
  title: "Privacy notice.",
  description:
    "Understand the information involved when you visit Access, contact the team, or take part in an assessment.",
  summary: [
    {
      title: "Different activities, different information",
      body: "Browsing the website, making an enquiry, and taking an assessment involve different data.",
    },
    {
      title: "Your organizer matters",
      body: "Read the notice for your round alongside the information about Access.",
    },
    {
      title: "Ask before you begin",
      body: "Clarify permissions, review access, and retention before assessment day.",
    },
  ],
  sections: [
    {
      id: "scope",
      title: "Scope and responsibilities",
      paragraphs: [
        "This draft covers the Access marketing website, downloads, the candidate desktop experience, and related support. Access is a product of AMS. The operator’s full legal identity and policy commitments are still awaiting confirmation.",
        "An assessment organizer sets the purpose, questions, participation rules, and review process for its round. Access supplies the assessment software and connected service workflows. The organization responsible for a particular use of personal information depends on the service arrangement.",
        "Read your organizer’s notice for registration, eligibility, evaluation, result publication, and any additional use of your information. The legal operator, relevant contact details, and responsibilities must be identified in the final notice.",
      ],
    },
    {
      id: "desktop-notice",
      title: "Website draft and desktop notice",
      paragraphs: [
        "Access 2.3.1 includes a desktop privacy policy dated 27 May 2026. You can read it in Settings → About → Privacy, or from the privacy link before setup. This website draft does not replace that published notice, the organizer’s notice, or an existing agreement.",
        "The monitoring explanation here is based on the reviewed 2.3.1 desktop flow. Local calibration captures are different from session images sent with activity records. This distinction matters when reading the desktop policy’s statement about local calibration.",
        "Legal operator details, production hosting and providers, record-access permissions, and retention periods remain unconfirmed for this draft. The prepared date is not a new policy effective date.",
      ],
      link: { href: MONITORING_GUIDE_PATH, label: "What Access checks and records" },
    },
    {
      id: "information",
      title: "Information involved",
      bullets: [
        "Website enquiries: your name, email address, organization if supplied, enquiry category, expected round size, and message.",
        "Account and invitation information: account identifiers, email address, organization or assessment association, and invitation or participation status.",
        "Assessment work: answers or source code, custom test input sent with Run or Submit, submissions, evaluation results, attempt history, and associated times.",
        "Device and session information: device identifiers, operating system and app details, readiness and permission results, connection information, session activity, and running-application or environment checks used for assessment readiness and controls.",
        "Camera and microphone information: permission and availability results, local calibration captures, and separate presence-check images that can accompany session events sent to the assessment service. Microphone access does not by itself mean audio is recorded.",
        "Support information: the issue description, messages, and diagnostic information included with a support or incident report.",
        "Website and service operation: request information such as IP address, request time, and technical information used to operate services, troubleshoot, and limit abuse.",
      ],
      paragraphs: [
        "Information can come from you, your device, your assessment organizer, or your use of the service. The categories used depend on the activity and assessment configuration.",
      ],
    },
    {
      id: "purposes",
      title: "Why information is used",
      bullets: [
        "Respond to enquiries and provide requested support.",
        "Identify the appropriate account and show assigned assessments.",
        "Check device readiness and operate the configured assessment session.",
        "Receive and evaluate submissions, show results, and provide context for review.",
        "Investigate reported problems and support service operation and security.",
      ],
      note: "The final notice must identify the applicable legal grounds for each use. A device permission prompt, by itself, does not explain every use of assessment information.",
    },
    {
      id: "permissions",
      title: "Camera, microphone, and device permissions",
      paragraphs: [
        "The marketing website does not request camera or microphone access. The desktop app may request media and device permissions needed for the assessment you enter.",
        assessmentInformation.camera,
        assessmentInformation.microphone,
        assessmentInformation.cleanup,
        "Before participating, ask the organizer which checks apply, whether media is transmitted or retained, who can review it, and what alternatives are available if you cannot meet a requirement.",
        "You can manage permissions in your device settings. Removing a permission required for a round may prevent entry or interrupt participation. Speak to your organizer before making a change during a live assessment.",
      ],
      link: {
        href: MONITORING_GUIDE_PATH,
        label: "Understand checks, media and session records",
      },
    },
    {
      id: "sharing",
      title: "Who may receive information",
      paragraphs: [
        "Assessment information may be available to the organizer and people involved in its authorized review or support process. Results shared beyond that group depend on the organizer’s rules and notice.",
        "Service providers involved in account access, hosting, storage, submission evaluation, communications, and support may process information needed for those functions.",
        "Some desktop setup checks can also contact a Google connectivity service. Its operator can receive normal request information, such as IP address, time and user agent.",
        "The provider inventory, processing locations, and any international-transfer arrangements must be confirmed for the applicable service. Ask Access about those details before arranging a round with specific data-location requirements.",
      ],
    },
    {
      id: "storage",
      title: "Cookies and information on your device",
      paragraphs: [
        "Signed-in web services use session cookies to maintain account access. The website and desktop interface also use local storage for preferences and, in the desktop app, account/session state and draft recovery.",
        "The desktop app also stores session events on the device for delivery to the assessment service. These records can contain presence-check images. A connection problem can leave events pending locally; they are not all held only in memory.",
        "The download recommendation reads browser-provided operating-system and processor information where available. The recommendation helper runs in your browser and does not store or send those detected hints to AMS. Download requests themselves still reach the service and identify the installer selected.",
        "You can manage cookies and local storage through your browser or device settings. Clearing them may sign you out or remove preferences and locally stored work.",
        "Signing out or uninstalling an app does not, by itself, delete assessment records held by the organizer or connected services.",
      ],
      note: "Avoid clearing app data during an active round without first asking your organizer how it may affect your work.",
    },
    {
      id: "retention",
      title: "Retention and deletion",
      paragraphs: [
        "Different records have different purposes. Assessment records, session activity, support correspondence, and information stored on your device should not be assumed to have the same retention period.",
        "No universal retention or automatic-deletion period is specified in this draft. The final notice and relevant assessment arrangement need to state the periods or criteria that apply, including any review or dispute requirements.",
        "For a request about an assessment record, contact the organizer that invited you. For an Access enquiry or uncertainty about who to contact, email team@amshq.in.",
        "Local calibration cleanup and retention of queued session events are different processes. Neither establishes how long records already received by the assessment service are kept.",
      ],
      link: { href: "mailto:team@amshq.in", label: "Email the AMS team about privacy" },
    },
    {
      id: "choices",
      title: "Your questions and choices",
      paragraphs: [
        "You can ask what information is involved, request correction of inaccurate information, and raise a concern about how your information is handled.",
        "Depending on the applicable law and circumstances, you may have rights to access, delete, restrict, object to, or receive a copy of information, and to withdraw consent where consent is the basis for a particular use.",
        "The final notice must identify the relevant request contact, applicable rights, and complaint route. An identity check may be needed before information about an account or assessment can be shared.",
      ],
      note: "You do not need to include passwords, invitation codes, or assessment answers in an initial privacy enquiry.",
    },
    {
      id: "participation",
      title: "Participation and younger candidates",
      paragraphs: [
        "Assessment eligibility is set for the particular round. If an assessment includes younger candidates, the organizer and Access need to confirm applicable age requirements, notices, and any parent, guardian, or school authorization before participation.",
        "This draft does not set an age threshold or assume that every assessment is suitable for every age group.",
      ],
    },
    {
      id: "changes",
      title: "Changes and contact",
      paragraphs: [
        "The prepared date identifies this review draft. It is not an effective date and does not replace an applicable organizer notice or an existing agreement.",
        "Changes to the service or its information handling may require updated notices. Confirm the applicable notice for your assessment before you begin.",
      ],
      link: { href: "mailto:team@amshq.in", label: "Contact team@amshq.in about privacy" },
    },
  ],
};
export default function PrivacyPage() {
  return <LegalDocument content={content} />;
}
