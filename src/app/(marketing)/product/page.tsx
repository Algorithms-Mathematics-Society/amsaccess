import type { Metadata } from "next";
import { ProductImage } from "@/components/ProductImage";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  FileText,
  ImageIcon,
  Laptop,
  ListChecks,
  Monitor,
  PanelTop,
} from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { ACCESS_APP_URL } from "@/lib/product-links";
import { productMedia, type ProductMediaKey } from "./product-media";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Product — Access by AMS",
  description:
    "Explore Access from assessment setup to candidate preparation, the desktop coding workspace, and submission review. See how each part of the round connects.",
};

const stages = [
  {
    id: "organize",
    number: "01",
    label: "Set up the round",
    role: "For organizers",
    icon: PanelTop,
  },
  {
    id: "prepare",
    number: "02",
    label: "Check the device",
    role: "For candidates",
    icon: ListChecks,
  },
  {
    id: "workspace",
    number: "03",
    label: "Take the assessment",
    role: "For candidates",
    icon: Code2,
  },
  {
    id: "review",
    number: "04",
    label: "Review submissions",
    role: "For reviewers",
    icon: FileText,
  },
];

function ProductScreenshot({
  name,
  wide = false,
}: {
  name: ProductMediaKey;
  wide?: boolean;
}) {
  const media = productMedia[name];
  if (media.src) {
    return (
      <figure className={styles.figure} data-product-media={name}>
        <div className={styles.actualImageFrame}>
          <ProductImage
            {...media}
            src={media.src}
            sizes={wide
              ? "(max-width: 800px) calc(100vw - 40px), (max-width: 1240px) calc(100vw - 80px), 1160px"
              : "(max-width: 800px) calc(100vw - 40px), (max-width: 1240px) 52vw, 680px"}
          />
        </div>
        <figcaption>{media.caption}</figcaption>
      </figure>
    );
  }

  return (
    <figure className={styles.figure} data-product-media={name}>
      <div
        className={[styles.imageFrame, wide ? styles.wideFrame : ""].join(" ")}
      >
          <div className={styles.imagePlaceholder}>
            <span className={styles.placeholderIcon}>
              <ImageIcon size={23} strokeWidth={1.3} aria-hidden="true" />
            </span>
            <span className={styles.placeholderTitle}>{media.title}</span>
            <span className={styles.placeholderNote}>
              Screenshot to be added
            </span>
          </div>
      </div>
      <figcaption>
        <span>{media.caption}</span>
        <span className={styles.figureLabel}>{media.surface}</span>
      </figcaption>
    </figure>
  );
}

function SectionLabel({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <p className={styles.sectionLabel}>
      <span>{number}</span>
      {children}
    </p>
  );
}

export default function ProductPage() {
  return (
    <>
      <MarketingHeader />
      <main className={styles.product} id="product-main">
        <section
          className={[styles.container, styles.hero].join(" ")}
          aria-labelledby="product-title"
        >
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            Product overview
          </p>
          <div className={styles.heroGrid}>
            <h1 id="product-title">
              The assessment
              <br />
              <span>workflow.</span>
            </h1>
            <div className={styles.heroIntro}>
              <p>
                Set up questions and invitations, prepare candidate devices, and
                review submissions and available session activity.
              </p>
              <div className={styles.actions}>
                <Link className={styles.primaryButton} href="/contact">
                  Contact the team <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <a className={styles.textLink} href="#workspace">
                  View the coding workspace{" "}
                  <ArrowDown size={15} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
          <nav className={styles.journey} aria-label="Product sections">
            {stages.map(({ id, number, label, role, icon: Icon }) => (
              <a key={id} href={"#" + id}>
                <span className={styles.journeyTop}>
                  <span>
                    {number} / {role}
                  </span>
                  <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className={styles.journeyTitle}>
                  {label}
                  <ArrowDown size={15} aria-hidden="true" />
                </span>
              </a>
            ))}
          </nav>
        </section>

        <section
          id="organize"
          className={[styles.container, styles.section, styles.organize].join(
            " ",
          )}
          aria-labelledby="organize-title"
        >
          <div className={styles.sectionCopy}>
            <SectionLabel number="01">The organizer workspace</SectionLabel>
            <h2 id="organize-title">
              Set up questions
              <br />
              and invitations.
            </h2>
            <p>
              Prepare the questions, schedule, and candidate invitations before
              the assessment.
            </p>
            <ul className={styles.featureList}>
              <li>
                <Check size={16} aria-hidden="true" />
                <span>Set the assessment window and instructions.</span>
              </li>
              <li>
                <Check size={16} aria-hidden="true" />
                <span>Prepare problems and their test configuration.</span>
              </li>
              <li>
                <Check size={16} aria-hidden="true" />
                <span>Invite candidates or import your roster.</span>
              </li>
            </ul>
            <div className={styles.editorialNote}>
              <ListChecks size={19} strokeWidth={1.5} aria-hidden="true" />
              <p>
                <strong>Check the details before launch.</strong>The launch
                checklist shows setup items that still need attention.
              </p>
            </div>
          </div>
          <ProductScreenshot name="organize" />
        </section>

        <div className={styles.prepareBand}>
          <section
            id="prepare"
            className={[styles.container, styles.section, styles.prepare].join(
              " ",
            )}
            aria-labelledby="prepare-title"
          >
            <div className={styles.sectionCopy}>
              <SectionLabel number="02">Candidate preparation</SectionLabel>
              <h2 id="prepare-title">
                Check the device
                <br />
                before the round.
              </h2>
              <p>
                Candidates find their assigned assessments and check their
                device in Access before entering the round.
              </p>
              <ol className={styles.preparationSteps}>
                <li>
                  <span>1</span>
                  <div>
                    <h3>Find the assessment</h3>
                    <p>See the schedule and status of assigned rounds.</p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <h3>Check the setup</h3>
                    <p>
                      Review device readiness and test any camera or microphone
                      required for the round.
                    </p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <h3>Follow the entry steps</h3>
                    <p>
                      Complete the required checks when the assessment opens.
                    </p>
                  </div>
                </li>
              </ol>
              <a className={styles.textLink} href="#requirements">
                What candidates need <ArrowDown size={15} aria-hidden="true" />
              </a>
            </div>
            <div className={styles.prepareVisual}>
              <ProductScreenshot name="prepare" />
            </div>
          </section>
        </div>

        <section
          id="workspace"
          className={[styles.container, styles.section, styles.workspace].join(
            " ",
          )}
          aria-labelledby="workspace-title"
        >
          <SectionLabel number="03">The candidate workspace</SectionLabel>
          <div className={styles.sectionHeading}>
            <h2 id="workspace-title">
              Read, code,
              <br />
              and submit.
            </h2>
            <p>
              Candidates read the problem, write code, and view execution output
              in the desktop app.
            </p>
          </div>
          <ProductScreenshot name="workspace" wide />
          <div className={styles.workspaceDetails}>
            <article>
              <span className={styles.detailNumber}>01 / Understand</span>
              <h3>Read the problem</h3>
              <p>
                Read the statement, constraints, and examples alongside the
                editor.
              </p>
            </article>
            <article>
              <span className={styles.detailNumber}>02 / Work through it</span>
              <h3>Run and check code</h3>
              <p>
                Work in an allowed language, run code, and inspect output and
                compiler feedback.
              </p>
            </article>
            <article>
              <span className={styles.detailNumber}>03 / Submit</span>
              <h3>Check submission status</h3>
              <p>
                Submit a solution and follow its status in the attempts panel.
              </p>
            </article>
          </div>
          <p className={styles.workspaceFootnote}>
            <Monitor size={15} aria-hidden="true" />
            Available tools and languages depend on the assessment
            configuration.
          </p>
        </section>

        <section
          id="review"
          className={[styles.container, styles.section, styles.review].join(
            " ",
          )}
          aria-labelledby="review-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <SectionLabel number="04">The reviewer perspective</SectionLabel>
              <h2 id="review-title">
                Review results
                <br />
                and individual attempts.
              </h2>
            </div>
            <p>
              View per-question results, inspect submitted code, and review
              available session activity.
            </p>
          </div>
          <div className={styles.reviewGrid}>
            <ProductScreenshot name="review" />
            <div className={styles.reviewDetails}>
              <article>
                <h3>Assessment results</h3>
                <p>
                  View the leaderboard and per-question results. Export results
                  for your team’s review process.
                </p>
              </article>
              <article>
                <h3>Submission history</h3>
                <p>
                  Open a candidate’s submission history and inspect individual
                  attempts.
                </p>
              </article>
              <article>
                <h3>Recorded session activity</h3>
                <p>
                  Use recorded session activity to guide further investigation.
                </p>
              </article>
              <aside className={styles.humanReview}>
                <span className={styles.smallLabel}>Interpreting activity</span>
                <p>
                  An activity flag is a reason to look closer. It is not, on its
                  own, proof of misconduct.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section
          id="requirements"
          className={[
            styles.container,
            styles.section,
            styles.requirements,
          ].join(" ")}
          aria-labelledby="requirements-title"
        >
          <div className={styles.sectionCopy}>
            <p className={styles.eyebrow}>Setup requirements</p>
            <h2 id="requirements-title">
              What candidates
              <br />
              need to prepare.
            </h2>
            <p>
              Share the setup requirements with candidates ahead of time, so
              installation and permissions are handled before the assessment.
            </p>
            <a className={styles.textLink} href={ACCESS_APP_URL}>
              App access & downloads{" "}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
          <dl className={styles.requirementsList}>
            <div>
              <dt>
                <Laptop size={18} aria-hidden="true" />
                Desktop app
              </dt>
              <dd>
                Candidates take the round in Access on a Windows, macOS, or
                Linux computer.
              </dd>
            </div>
            <div>
              <dt>Connection & permissions</dt>
              <dd>
                Plan for an internet connection and the camera, microphone, and
                device permissions required by the assessment.
              </dd>
            </div>
            <div>
              <dt>Assessment configuration</dt>
              <dd>
                Confirm question formats, allowed languages, and review
                expectations with the Access team before your round.
              </dd>
            </div>
            <div>
              <dt>App access</dt>
              <dd>
                Partner workspace access and candidate downloads are at{" "}
                <a href={ACCESS_APP_URL}>
                  app.amsaccess.com{" "}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
                .
              </dd>
            </div>
          </dl>
        </section>

        <section
          className={styles.closing}
          aria-labelledby="product-contact-title"
        >
          <div className={[styles.container, styles.closingInner].join(" ")}>
            <div>
              <p className={styles.eyebrow}>Contact</p>
              <h2 id="product-contact-title">
                Questions about
                <br />
                assessment setup?
              </h2>
              <p>
                Contact the team about question formats, candidate devices, or
                review requirements. Include an approximate candidate count if
                you have one.
              </p>
            </div>
            <div className={styles.closingActions}>
              <Link className={styles.primaryButton} href="/contact">
                Contact the team <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a className={styles.textLink} href={ACCESS_APP_URL}>
                Open Access <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
