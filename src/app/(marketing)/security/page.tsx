import type { Metadata } from "next";
import { assessmentInformation, MONITORING_GUIDE_PATH } from "@/lib/assessment-information";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Fingerprint,
  Laptop,
  Mail,
  ScanLine,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AMS_TEAM_EMAIL } from "@/lib/ams-contact";
import { TrustLayout } from "@/components/TrustLayout";
import styles from "@/components/TrustPages.module.css";
export const metadata: Metadata = {
  title: "Security & privacy — Access by AMS",
  description:
    "Understand Access assessment controls, device permissions, information used during a round, human review, and how to raise a security or privacy question.",
};
const controls = [
  {
    icon: Fingerprint,
    title: "Signed-in workspace access",
    body: "Assessment workspaces use account sign-in. Participants should use their own account and keep invitations and access details private.",
    label: "Account access",
  },
  {
    icon: Laptop,
    title: "Readiness before entry",
    body: "Candidates can check their device and required permissions before a round. Entry checks depend on the assessment configuration.",
    label: "Device preparation",
  },
  {
    icon: ScanLine,
    title: "A controlled assessment session",
    body: "The desktop app records device, focus, connection and presence events for assessment review. Session events are queued on the device and sent to the assessment service.",
    label: "During the round",
  },
  {
    icon: Users,
    title: "Context for a human decision",
    body: "Reviewers can consider submissions alongside available session activity and reported issues. An activity flag alone is not proof of misconduct.",
    label: "Review process",
  },
];
const questions = [
  {
    title: "Does browsing this website use my camera?",
    body: "No. The marketing website does not request camera or microphone access. The desktop app has separate permission and readiness steps for assessments.",
  },
  {
    title: "Can camera images leave my device?",
    body: assessmentInformation.camera,
  },
  {
    title: "Does microphone access mean audio is recorded?",
    body: assessmentInformation.microphone,
  },
  {
    title: "Does an activity flag decide my result?",
    body: "An activity flag is a signal for review, not proof of misconduct on its own. Code evaluation and entry checks can produce automated outcomes; your organizer should explain the assessment and review process.",
  },
  {
    title: "Can I take part if a permission is unavailable?",
    body: "A required permission may prevent entry or affect participation. Speak to your organizer before the round about your device or any alternative arrangement you need.",
  },
  {
    title: "Who should I contact about my assessment data?",
    body: "Start with the organizer that invited you for assessment records, results, and round-specific privacy questions. Contact Access if your question concerns the website, an enquiry, or you are unsure where to direct it.",
  },
];
export default function SecurityPage() {
  return (
    <TrustLayout active="security">
      <header className={styles.securityHero}>
        <div>
          <p className={styles.eyebrow}>Security & privacy</p>
          <h1>
            Device permissions.
            <br />
            <span>Assessment data.</span>
          </h1>
          <p>
            Read about device checks, assessment controls, and the information
            used during a round.
          </p>
          <div className={styles.actions}>
            <a href="#safeguards" className={styles.primaryButton}>
              See assessment controls <ArrowDown size={15} aria-hidden="true" />
            </a>
            <Link href="/privacy" className={styles.textLink}>
              Read the privacy draft <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <aside className={styles.heroNote}>
          <ShieldCheck size={28} strokeWidth={1.3} aria-hidden="true" />
          <h2>Before, during, and after a round</h2>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Before</strong>
                <p>Understand the setup and required permissions.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>During</strong>
                <p>Follow the round’s instructions and support process.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>After</strong>
                <p>Know how the work and its context are reviewed.</p>
              </div>
            </li>
          </ol>
        </aside>
      </header>
      <section
        id="safeguards"
        className={styles.securitySection}
        aria-labelledby="safeguards-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>The assessment workflow</p>
            <h2 id="safeguards-title">
              Assessment controls <br />
              and their purpose.
            </h2>
          </div>
          <p>
            Access supports a structured round. Its controls and review signals
            should be understood alongside your organizer’s instructions.
          </p>
        </div>
        <div className={styles.controlGrid}>
          {controls.map(({ icon: Icon, title, body, label }) => (
            <article key={title}>
              <div className={styles.controlTop}>
                <Icon size={21} strokeWidth={1.5} aria-hidden="true" />
                <span>{label}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <p className={styles.scopeNote}>
          The exact setup depends on the round and device. These controls do not
          guarantee uninterrupted access or prevent every prohibited action.
        </p>
      </section>
      <section
        id="information"
        className={[styles.securitySection, styles.informationSection].join(
          " ",
        )}
        aria-labelledby="information-title"
      >
        <div>
          <p className={styles.eyebrow}>Information used by Access</p>
          <h2 id="information-title">
            What you share
            <br />
            depends on what you do.
          </h2>
          <p>
            Visiting the website, contacting the team, and taking an assessment
            involve different information.
          </p>
          <Link href={MONITORING_GUIDE_PATH} className={styles.textLink}>
            What Access checks and records{" "}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <dl className={styles.infoRows}>
          <div>
            <dt>When you contact Access</dt>
            <dd>
              The details and message you provide help the team understand and
              respond to your enquiry.
            </dd>
          </div>
          <div>
            <dt>When you take a round</dt>
            <dd>
              Readiness reports are sent before entry. Submitted work and
              timestamped activity, including focus, connection and presence
              events, support participation and review.
            </dd>
          </div>
          <div>
            <dt>When media is required</dt>
            <dd>
              Calibration images stay local in the reviewed flow. Separate
              presence-check stills can be sent with session events. Microphone
              permission is distinct from audio recording.
            </dd>
          </div>
          <div>
            <dt>When you need help</dt>
            <dd>
              Incident descriptions and diagnostic information help investigate
              the problem you report.
            </dd>
          </div>
        </dl>
      </section>
      <section
        id="before-your-round"
        className={styles.planningPanel}
        aria-labelledby="planning-title"
      >
        <div>
          <p className={styles.eyebrow}>For candidates and organizers</p>
          <h2 id="planning-title">
            Agree on the details.
            <br />
            Before assessment day.
          </h2>
          <p>
            Your round’s notice and instructions should make these questions
            easy to answer.
          </p>
        </div>
        <ul>
          {[
            "Which device checks and permissions are required?",
            "What information or media is collected, and for what purpose?",
            "Who can review the work, results, and session activity?",
            "How long are records kept, and how can a request be made?",
            "Who handles technical issues and questions about a result?",
          ].map((item) => (
            <li key={item}>
              <Check size={16} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <section
        className={styles.securitySection}
        aria-labelledby="security-questions-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Common questions</p>
            <h2 id="security-questions-title">
              Permissions and privacy questions
            </h2>
          </div>
          <p>
            Start here for common questions about participation, permissions,
            and privacy.
          </p>
        </div>
        <div className={styles.faqs}>
          {questions.map((question) => (
            <details key={question.title}>
              <summary>
                {question.title}
                <ChevronDown size={17} aria-hidden="true" />
              </summary>
              <p>{question.body}</p>
            </details>
          ))}
        </div>
      </section>
      <section
        id="report"
        className={styles.reportPanel}
        aria-labelledby="report-title"
      >
        <div>
          <p className={styles.eyebrow}>Raise a concern</p>
          <h2 id="report-title">Found a security issue?</h2>
          <p>
            Email the AMS team about the security concern. Describe the affected feature, what
            you observed, and when it happened.
          </p>
          <a
            href={"mailto:" + AMS_TEAM_EMAIL + "?subject=Access%20security%20report"}
            className={styles.emailLink}
          >
            <Mail size={17} aria-hidden="true" />
            {AMS_TEAM_EMAIL} <ArrowUpRight size={15} aria-hidden="true" />
          </a>
          <p className={styles.reportDetail}>
            Keep passwords, invitation codes, and other people’s information out
            of an initial message. Only test systems you are authorized to test.
          </p>
        </div>
        <aside>
          <h3>Need help with a live assessment?</h3>
          <p>Contact your organizer through the channel in your invitation.</p>
          <Link className={styles.textLink} href="/docs/troubleshooting">
            Find a troubleshooting step{" "}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <h3>A privacy or service question?</h3>
          <p>Email team@amshq.in for privacy questions, or use the contact page.</p>
          <Link className={styles.textLink} href="/contact">
            Contact Access <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </aside>
      </section>
      <div className={styles.policyLinks}>
        <Link href="/privacy">
          <span>
            How information is handled
            <small>Privacy notice · review draft</small>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link href="/terms">
          <span>
            Responsibilities when using Access
            <small>Terms of use · review draft</small>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </TrustLayout>
  );
}
