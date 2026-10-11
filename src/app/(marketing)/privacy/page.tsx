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
  status: "reviewed",
  lastUpdated: "2026-10-11",
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
        "This notice covers the Access marketing website, downloads, the candidate desktop experience, and related support. Access is operated by Algorithms & Mathematics Society (AMS), based in Mumbai, India. Its founder is Tilak Jain. Contact team@amshq.in about privacy or this notice.",
        "An assessment organizer sets the purpose, questions, participation rules, and review process for its round. Access supplies the assessment software and connected service workflows. The organization responsible for a particular use of personal information depends on the service arrangement.",
        "Read your organizer’s notice for registration, eligibility, evaluation, result publication, and any additional use of your information. Contact the organizer for its identity, contact details, and responsibilities for your assessment.",
      ],
    },
    {
      id: "desktop-notice",
      title: "Website and desktop notices",
      paragraphs: [
        "Access 2.3.1 includes a desktop privacy policy dated 27 May 2026. You can read it in Settings → About → Privacy, or from the privacy link before setup. This website notice supplements information about the service; it does not replace the notice supplied with your installed app, the organizer’s notice, or an existing agreement.",
        "The monitoring explanation here is based on the reviewed 2.3.1 desktop flow. Local calibration captures are different from session images sent with activity records. This distinction matters when reading the desktop policy’s statement about local calibration.",
        "The full provider inventory, processing locations, record-access permissions, and retention periods are not established by this website notice. Contact Access and your organizer for the arrangements that apply to your assessment.",
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
        "The website contact form requires your name, email address, enquiry category, and message so the team can handle your enquiry. Organization and expected round size are optional. Without the required fields, the form cannot send your message; you can email team@amshq.in instead.",
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
      note: "The applicable legal grounds for these uses are not specified in this notice. Contact Access and your organizer for that information. A device permission prompt, by itself, does not explain or authorize every use of assessment information.",
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
      id: "automated-results",
      title: "Automated results and assessment review",
      paragraphs: [...assessmentInformation.decisions],
      link: { href: MONITORING_GUIDE_PATH, label: "Read about assessment checks and review" },
    },
    {
      id: "security",
      title: "Security and external services",
      paragraphs: [
        "The website uses signed session cookies with expiry checks for account sessions and request rate limits to help reduce abuse. These controls do not guarantee that all information is secure or establish the security arrangements of every connected assessment service.",
        "Links may take you to services operated by other organizations. Read their privacy notices before providing information there; this notice describes Access and does not describe every external service’s practices.",
        "To report a suspected privacy or security issue, contact team@amshq.in. Describe the issue without sending passwords, invitation codes, or assessment answers.",
      ],
    },
    {
      id: "sharing",
      title: "Who may receive information",
      paragraphs: [
        "Assessment information may be available to the organizer and people involved in its authorized review or support process. Results shared beyond that group depend on the organizer’s rules and notice.",
        "Service providers involved in account access, hosting, storage, submission evaluation, communications, and support may process information needed for those functions. Website hosting includes BigRock.",
        "When the website contact form sends an enquiry, it uses Resend to deliver your submitted details to the configured AMS recipient. Contact rate limiting uses your IP address and, where supplied, email address; these identifiers are also processed by Upstash when the shared rate-limit service is configured. These examples are not a complete inventory of assessment-service providers.",
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
        "This notice does not specify a universal retention or automatic-deletion period. The retention periods or criteria for each record category, including review or dispute requirements, need confirmation from Access and the relevant organizer. Ask for those details before participating.",
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
        "Depending on the applicable law and circumstances, you may have rights to access, delete, restrict, object to, or receive a copy of information.",
        "Where processing relies on consent, you can request withdrawal through team@amshq.in or the organizer’s privacy contact. Withdrawing an app permission in device settings is a separate action and does not itself request deletion of records already received.",
        "Where applicable law gives you a right to complain to a data protection authority, you may use that route as well. The relevant authority depends on the law and organization responsible for the processing.",
        "To make a privacy request, email team@amshq.in with the request type, the email address associated with your account or enquiry, and the organizer or assessment name if relevant. For records held by your organizer, also use the contact in its notice. An identity check may be needed before information about an account or assessment can be shared.",
      ],
      note: "You do not need to include passwords, invitation codes, or assessment answers in an initial privacy enquiry.",
    },
    {
      id: "participation",
      title: "Participation and younger candidates",
      paragraphs: [
        "Assessment eligibility is set for the particular round. If an assessment includes younger candidates, the organizer and Access need to confirm applicable age requirements, notices, and any parent, guardian, or school authorization before participation.",
        "This notice does not set an age threshold or assume that every assessment is suitable for every age group. If you are unsure whether you may participate, ask your organizer before supplying assessment information.",
      ],
    },
    {
      id: "changes",
      title: "Changes and contact",
      paragraphs: [
        "Updates to this website notice are published on this page with a last-updated date. That date identifies the website text revision; it does not change the effective date of the notice supplied with an installed app or an organizer’s agreement.",
        "Changes to the service or its information handling may require additional notice or consent under applicable law; updating this page alone does not replace those requirements. Confirm the applicable notice for your assessment before you begin.",
      ],
      link: { href: "mailto:team@amshq.in", label: "Contact team@amshq.in about privacy" },
    },
  ],
};
export default function PrivacyPage() {
  return <LegalDocument content={content} />;
}
