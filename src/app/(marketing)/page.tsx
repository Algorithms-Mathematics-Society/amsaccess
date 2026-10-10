import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { AccessProductPreview } from "@/components/AccessProductPreview";
import { AccessProductScreenshot } from "@/components/AccessProductScreenshot";
import { ACCESS_DOWNLOAD_URL, ORGANIZER_SIGN_IN_URL } from "@/lib/product-links";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Access by AMS — Coding assessments and submission review",
  description:
    "Run coding assessments in a dedicated candidate workspace. Review submission results and export standings. Read about setup, candidate preparation, and review.",
};

const workflow = [
  {
    number: "01",
    title: "Organize the round",
    copy: "Set the questions, instructions, and candidate invitations.",
  },
  {
    number: "02",
    title: "Candidates take the assessment",
    copy: "Candidates prepare their device and complete the assessment in the desktop app.",
  },
  {
    number: "03",
    title: "Review the submissions",
    copy: "Review attempt verdicts and test results, then export standings and submissions.",
  },
];

const useCases = [
  {
    tag: "HIRING TEAMS",
    title: "Technical hiring",
    copy: "Review candidates’ submission results and individual attempts as part of your evaluation.",
    link: "View submission review",
    href: "/product#review",
  },
  {
    tag: "COMPETITION ORGANIZERS",
    title: "Coding competitions",
    copy: "Run a coding round with questions, instructions, and a candidate workspace.",
    link: "View the workspace",
    href: "/product#workspace",
  },
  {
    tag: "EDUCATORS",
    title: "Academic coding rounds",
    copy: "Set up coding assessments for students and review their submissions.",
    link: "Read the organizer guide",
    href: "/docs/organize-assessment",
  },
];

const faqs = [
  {
    question: "How does a new team get started?",
    answer: (
      <>
        Start with an <Link href="/contact">enquiry to the Access team</Link>.
        Share the kind of round you have in mind, approximate candidate numbers,
        and any questions about setup. If your team already has access, use{" "}
        <a href={ORGANIZER_SIGN_IN_URL}>Organizer sign in</a>.
      </>
    ),
  },
  {
    question: "Which assessment formats can we use?",
    answer: (
      <>
        The workflow shown here is for coding assessments. Confirm the
        languages, question formats, and review capabilities you need with the
        team before planning a round.{" "}
        <Link href="/product">Product overview</Link> describes the workflow.
      </>
    ),
  },
  {
    question: "Do candidates need to install an app?",
    answer: (
      <>
        Yes. Candidates take the assessment in the Access desktop app. Downloads are at{" "}
        <a href={ACCESS_DOWNLOAD_URL}>app.amsaccess.com</a>. Allow time for
        installation and device checks before the round; the{" "}
        <Link href="/docs/candidate-setup">candidate setup guide</Link> explains
        where to begin.
      </>
    ),
  },
  {
    question: "Does an activity flag prove misconduct?",
    answer: (
      <>
        No. Recorded activity is context for a human review, not proof of
        misconduct on its own. Code evaluation and entry checks can produce
        automated outcomes; your team should explain its assessment and review
        process.
      </>
    ),
  },
  {
    question: "How do we confirm pricing and data requirements?",
    answer: (
      <>
        The <Link href="/pricing">pricing page</Link> lists the details needed
        for a quote. Confirm the quote, candidate setup, available review
        information, support arrangements, and data-handling terms with the team
        before scheduling the round. The{" "}
        <Link href="/security">security and privacy overview</Link> explains
        questions to ask.
      </>
    ),
  },
];

export default function HomePage() {
  return (
    <div className={styles.home} data-access-theme data-access-home>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>
              <span className={styles.brandTick} aria-hidden="true" />
              THE CODING ASSESSMENT WORKSPACE
            </span>
            <h1 id="hero-title">
              <span className={styles.heroLead}>Let the work</span>{" "}
              <span className={styles.heroAccent}>speak.</span>
            </h1>
            <p className={styles.heroCopy}>
              Coding assessments for candidates to demonstrate their skills and
              teams to review their approach.
            </p>
            <div className={styles.heroActions}>
              <a href="#product" className={styles.primaryButton}>
                See how Access works <ArrowDown size={16} aria-hidden="true" />
              </a>
              <Link href="/contact" className={styles.secondaryButton}>
                Contact the team <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <nav
              className={styles.returningVisitors}
              aria-label="Organizer sign-in and candidate downloads"
            >
              <span>Already using Access?</span>
              <div>
                <a href={ORGANIZER_SIGN_IN_URL}>
                  Organizer sign in <ArrowUpRight size={12} aria-hidden="true" />
                </a>
                <span className={styles.accessDivider} aria-hidden="true" />
                <a href={ACCESS_DOWNLOAD_URL}>
                  Candidate downloads <ArrowUpRight size={12} aria-hidden="true" />
                </a>
              </div>
            </nav>
          </div>
          <div className={styles.heroProduct}>
            <AccessProductScreenshot name="workspace" hero />
          </div>
        </section>

        <section
          id="how-it-works"
          className={styles.workflow}
          aria-labelledby="workflow-title"
        >
          <div className={styles.workflowHeading}>
            <span className={styles.eyebrow}>HOW ACCESS WORKS</span>
            <h2 id="workflow-title">Set up, take, and review an assessment.</h2>
          </div>
          <ol className={styles.workflowSteps}>
            {workflow.map(({ number, title, copy }) => (
              <li key={number}>
                <span className={styles.stepNumber}>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="product"
          className={styles.productSection}
          aria-labelledby="product-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>THE ASSESSMENT WORKFLOW</span>
              <h2 id="product-title">
                Inside the candidate
                <br />
                workspace.
              </h2>
            </div>
            <p>
              See how candidates prepare their device, work through a problem,
              and check their recorded submissions.
            </p>
          </div>
          <AccessProductPreview />
          <div className={styles.productNext}>
            <span>Read about features and setup requirements.</span>
            <Link href="/product" className={styles.textLink}>
              Product overview <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/pricing" className={styles.subtleLink}>
              Pricing <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section
          id="use-cases"
          className={styles.section}
          aria-labelledby="use-cases-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>ASSESSMENT TYPES</span>
              <h2 id="use-cases-title">
                Hiring, competitions,
                <br />
                and education.
              </h2>
            </div>
            <p>
              The same coding workflow can be used for hiring rounds,
              competitions, and student assessments.
            </p>
          </div>
          <div className={styles.useCases}>
            {useCases.map(({ tag, title, copy, link, href }) => (
              <article key={title}>
                <span className={styles.useCaseTag}>{tag}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <Link href={href} className={styles.textLink}>
                  {link}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section
          id="before-your-round"
          className={styles.confidenceSection}
          aria-labelledby="confidence-title"
        >
          <div className={styles.confidenceInner}>
            <div className={styles.confidenceCopy}>
              <span className={styles.eyebrow}>BEFORE THE ASSESSMENT</span>
              <h2 id="confidence-title">
                Device setup.
                <br />
                <span>Review responsibilities.</span>
              </h2>
              <p>
                Confirm how your team will access and interpret assessment
                records before the round. An activity flag alone is not proof
                of misconduct.
              </p>
              <Link href="/security" className={styles.textLink}>
                Security & privacy <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.expectations}>
              <div>
                <h3>A desktop app for candidates</h3>
                <p>
                  Plan for installation, device readiness, and required
                  permissions before assessment day.
                </p>
                <Link href="/docs/candidate-setup" className={styles.textLink}>
                  Read the setup guide{" "}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <div>
                <h3>Assessment requirements</h3>
                <p>
                  Confirm assessment formats, review access, support, and data
                  handling for your setup.
                </p>
                <Link href="/pricing" className={styles.textLink}>
                  View pricing information{" "}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.faq}`}
          aria-labelledby="faq-title"
        >
          <div>
            <span className={styles.eyebrow}>COMMON QUESTIONS</span>
            <h2 id="faq-title">
              Setup, access,
              <br />
              and review.
            </h2>
            <p>Answers for teams organizing their first assessment.</p>
            <Link href="/docs" className={styles.textLink}>
              Browse the guides <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.faqList}>
            {faqs.map(({ question, answer }) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={17} aria-hidden="true" />
                </summary>
                <div className={styles.faqAnswer}>{answer}</div>
              </details>
            ))}
          </div>
        </section>

        <section
          id="plan-your-round"
          className={styles.closing}
          aria-labelledby="closing-title"
        >
          <div className={styles.closingInner}>
            <div className={styles.closingCopy}>
              <span className={styles.eyebrow}>CONTACT</span>
              <h2 id="closing-title">
                Questions about
                <br />
                your assessment?
              </h2>
              <p>
                Send the team your questions about access, assessment formats,
                device setup, or pricing.
              </p>
              <Link href="/contact" className={styles.primaryButton}>
                Contact the team <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <span className={styles.contactNote}>
                Send an enquiry. Any follow-up will use the email you share.
              </span>
            </div>
            <div className={styles.conversation}>
              <h3>Useful details, if available</h3>
              <dl>
                <div>
                  <dt>Your assessment</dt>
                  <dd>The skills and question formats you want to evaluate.</dd>
                </div>
                <div>
                  <dt>Your participants</dt>
                  <dd>
                    Approximate candidate numbers and the devices they’ll use.
                  </dd>
                </div>
                <div>
                  <dt>Your requirements</dt>
                  <dd>
                    Your timeline, review process, or questions about the setup.
                  </dd>
                </div>
              </dl>
              <p className={styles.discoveryNote}>
                You can send a question without a complete assessment plan.
              </p>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
