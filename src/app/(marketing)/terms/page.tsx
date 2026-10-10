import type { Metadata } from "next";
import { LegalDocument, type LegalContent } from "@/components/LegalDocument";
export const metadata: Metadata = {
  title: "Terms of use — Access by AMS",
  description:
    "Draft terms describing responsible use of Access, participant and organizer responsibilities, assessment review, and support.",
  robots: { index: false, follow: true },
};
const content: LegalContent = {
  kind: "terms",
  title: "Terms of use.",
  description:
    "A readable account of the responsibilities involved in using Access and taking part in an assessment.",
  summary: [
    {
      title: "Use your authorized access",
      body: "Use your own account and take part only in rounds you are permitted to enter.",
    },
    {
      title: "Follow the round’s instructions",
      body: "Understand the setup, permitted tools, timing, and support process before starting.",
    },
    {
      title: "Keep decisions in context",
      body: "Assessment criteria and the organizer’s review process govern the outcome.",
    },
  ],
  sections: [
    {
      id: "scope",
      title: "About these draft terms",
      paragraphs: [
        "Access by AMS provides assessment software, a candidate desktop workspace, and tools used to organize and review rounds. This draft describes proposed terms for using those services and the related website.",
        "These terms are not yet an effective agreement. The legal operator, applicable jurisdiction, acceptance process, and any additional contractual provisions need confirmation before final publication.",
        "Access 2.3.1 includes separate desktop terms dated 27 May 2026, available in Settings → About → Terms. This website draft does not replace the terms supplied with the desktop app.",
        "An organization’s signed service agreement and a round’s specific instructions may address additional matters. If instructions conflict or are unclear, ask for clarification rather than assuming which rule applies.",
      ],
    },
    {
      id: "account",
      title: "Accounts and authorized participation",
      bullets: [
        "Use the account and invitation intended for you. Do not impersonate another participant or share credentials and invitation codes.",
        "Take part only in assessments for which you are invited, registered, or otherwise authorized.",
        "Keep your account information accurate and report suspected unauthorized access.",
        "Confirm eligibility and any required parent, guardian, or institutional authorization with the organizer before participating.",
      ],
    },
    {
      id: "candidate",
      title: "Candidate responsibilities",
      bullets: [
        "Read the schedule, timezone, assessment instructions, and allowed-tool rules.",
        "Install the required app version and allow time for device readiness and entry checks.",
        "Provide permissions required for your round, or ask the organizer about an alternative before starting.",
        "Submit your own work in accordance with the assessment rules. Do not obtain unauthorized assistance or disclose restricted assessment material.",
        "Check submission status. A saved draft or successful sample run is not, by itself, confirmation of a scored submission.",
        "Report technical problems through the support channel provided for the round.",
      ],
      link: {
        href: "/docs/taking-an-assessment",
        label: "Read the candidate guide",
      },
    },
    {
      id: "organizer",
      title: "Organizer responsibilities",
      paragraphs: [
        "Organizers determine the purpose and configuration of their assessment, participant eligibility, evaluation criteria, and how results are used or shared.",
      ],
      bullets: [
        "Provide clear invitations, schedules, permitted-tool rules, device requirements, and support instructions.",
        "Confirm the notices, permissions, and other requirements for the information processed during the round.",
        "Prepare the questions and review the setup before candidates begin.",
        "Consider reported technical issues and activity context through a consistent review process.",
        "Explain how candidates can raise questions about participation, results, or their information.",
      ],
      link: {
        href: "/docs/organize-assessment",
        label: "Read the organizer guide",
      },
    },
    {
      id: "acceptable-use",
      title: "Responsible use of the service",
      paragraphs: [
        "Do not interfere with another person’s assessment, attempt unauthorized access, bypass assessment controls, tamper with records, or disrupt the service.",
        "Do not use Access to distribute malicious content or access information you are not authorized to see. Use assessment materials only as permitted by their owner and the organizer.",
        "Security testing requires appropriate authorization. If you discover a concern, use the security-reporting channel and avoid including other people’s data in an initial report.",
      ],
      link: {
        href: "/security#report",
        label: "How to report a security concern",
      },
    },
    {
      id: "work-review",
      title: "Submitted work and assessment review",
      paragraphs: [
        "Participants and organizers retain any rights they already hold in their content. The proposed permission for submitted work is limited to receiving, storing, processing, and making it available for the assessment, its review, and related support.",
        "Access may provide automated code evaluation, readiness outcomes, and session activity. These can affect the displayed result or whether a participant can enter a configured round.",
        "An activity flag alone is not proof of misconduct. The organizer’s criteria and review process should consider the work, relevant context, and reported issues.",
        "Access does not promise a particular score, selection decision, ranking, or employment outcome.",
      ],
      link: { href: "/docs/what-access-checks-and-records#decisions", label: "Understand checks, activity and assessment decisions" },
    },
    {
      id: "availability",
      title: "Availability and changes",
      paragraphs: [
        "Device capabilities, permissions, network conditions, assessment configuration, and service interruptions can affect access and submissions. Assessment controls do not guarantee that every prohibited action will be prevented.",
        "A round may require a current version of the app. Follow the organizer’s update and setup instructions before the assessment.",
        "Any paid service commitments, service levels, fees, cancellation arrangements, or remedies should be stated in the applicable organization agreement. This draft does not introduce a pricing or refund policy.",
      ],
    },
    {
      id: "access-review",
      title: "Restricted access and concerns",
      paragraphs: [
        "Entry or continued participation may be restricted when an invitation is invalid, required checks cannot be completed, or the organizer applies its participation rules.",
        "If you believe a restriction, technical issue, or recorded event is mistaken, contact the organizer through the round’s support or review process. A restriction is not, by itself, a conclusion about misconduct.",
        "For a service or account concern outside a live assessment, contact the Access team.",
      ],
      link: { href: "/contact", label: "Contact the Access team" },
    },
    {
      id: "final-terms",
      title: "Applicable agreements and updates",
      paragraphs: [
        "The prepared date identifies this draft, not the start of a binding agreement. This draft does not replace existing signed agreements or determine a governing court, arbitration procedure, or liability limit.",
        "Final terms need to identify the operator, applicable law, and how changes and acceptance are handled. Nothing in this draft is intended to remove rights that applicable law does not allow to be waived.",
      ],
    },
  ],
};
export default function TermsPage() {
  return <LegalDocument content={content} />;
}
