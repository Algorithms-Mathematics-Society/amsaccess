import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { PricingBrief } from "@/components/PricingVolumeModeler";
import { AMS_TEAM_EMAIL, AMS_PARTNERS_EMAIL } from "@/lib/ams-contact";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Pricing — Access by AMS",
  description:
    "Ask about Access pricing for your assessment. Share your format, approximate candidate count, and schedule to confirm pricing and requirements.",
};

export default function PricingPage() {
  return (
    <>
      <MarketingHeader />
      <main id="pricing-content" tabIndex={-1} className={styles.page}>
        <div className={styles.container}>
          <header className={styles.hero}>
            <p className={styles.eyebrow}>Pricing</p>
            <h1>
              Pricing for
              <br />
              <span>your assessment.</span>
            </h1>
            <p className={styles.lead}>
              Planning an assessment with Access? Share your format, approximate
              candidate count, and schedule to discuss pricing and availability
              with the team.
            </p>
            <div className={styles.actions}>
              <Link href="/contact" className={styles.primary}>
                Ask about pricing
              </Link>
              <Link href="/product" className={styles.secondary}>
                Explore the product
              </Link>
            </div>
            <p className={styles.heroNote}>
              Pricing is discussed directly with the team. There are no published
              rates or self-service plans on this page.
            </p>
          </header>

          <PricingBrief />

          <section className={styles.process} aria-labelledby="pricing-process">
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>How to proceed</p>
              <h2 id="pricing-process">How to ask about pricing.</h2>
            </div>
            <ol className={styles.processSteps}>
              <li>
                <h3>Send a short brief</h3>
                <p>
                  Use the contact form or email{" "}
                  <a href={"mailto:" + AMS_TEAM_EMAIL}>{AMS_TEAM_EMAIL}</a>.
                  Include your questions and anything still undecided.
                </p>
              </li>
              <li>
                <h3>Clarify what you need</h3>
                <p>
                  Any follow-up will go to the email you provide. Use that
                  conversation to confirm product fit, timing, and requirements.
                  An enquiry does not reserve an assessment or book a meeting.
                </p>
              </li>
              <li>
                <h3>Review the written scope</h3>
                <p>
                  Before agreeing to proceed, request a written quote covering
                  the price, what is included, and the terms for your round.
                </p>
              </li>
            </ol>
          </section>

          <section className={styles.confirm} aria-labelledby="confirm-title">
            <div>
              <p className={styles.eyebrow}>Before you decide</p>
              <h2 id="confirm-title">What your quote should make clear.</h2>
              <p>
                Use this checklist when reviewing an offer. Product capabilities
                described on this website are not a statement of what a particular
                quote includes.
              </p>
              <Link href="/security" className={styles.textLink}>
                Read about security &amp; privacy
              </Link>
            </div>
            <ol className={styles.requirements}>
              <li>
                <h3>Scope and price</h3>
                <p>
                  Confirm what you are buying, how usage is counted, the total
                  cost and applicable taxes, payment terms, and any limits. Ask
                  how extra candidates, further rounds, or a change of date
                  would affect the quote.
                </p>
              </li>
              <li>
                <h3>Readiness and support</h3>
                <p>
                  Confirm device requirements and setup responsibilities. Agree
                  who candidates should contact during the round, through which
                  channel, and any support commitments your team needs.
                </p>
              </li>
              <li>
                <h3>Data and review</h3>
                <p>
                  Confirm who can review assessment records, what is collected
                  for your setup, and the applicable retention and deletion
                  terms before you invite candidates.
                </p>
              </li>
            </ol>
          </section>

          <section className={styles.faq} aria-labelledby="pricing-questions">
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>Common questions</p>
              <h2 id="pricing-questions">Before you get in touch.</h2>
            </div>
            <div>
              <details>
                <summary>Can I see a price or buy a plan here?</summary>
                <p>
                  This page does not publish fixed rates or offer checkout.
                  Contact Access to ask about current pricing and availability
                  for your assessment.
                </p>
              </details>
              <details>
                <summary>Do I need a final candidate count?</summary>
                <p>
                  No. Share a rough range and mention anything you are still
                  deciding. The contact form includes a “Not sure yet” option.
                </p>
              </details>
              <details>
                <summary>We already work with AMS. Who should we contact?</summary>
                <p>
                  Existing partners and sponsorship enquiries can email{" "}
                  <a href={"mailto:" + AMS_PARTNERS_EMAIL}>
                    {AMS_PARTNERS_EMAIL}
                  </a>. For a new assessment or general product questions, use{" "}
                  <a href={"mailto:" + AMS_TEAM_EMAIL}>{AMS_TEAM_EMAIL}</a>.
                </p>
              </details>
              <details>
                <summary>
                  Are support levels or retention periods guaranteed here?
                </summary>
                <p>
                  This page does not set service guarantees or data retention
                  periods. Ask for confirmation of any commitments your
                  organization needs before proceeding.
                </p>
              </details>
              <details>
                <summary>
                  I am taking an assessment. Do I need to choose a plan?
                </summary>
                <p>
                  This pricing conversation is for teams organizing assessments. Follow
                  your organizer’s invitation and the{" "}
                  <Link href="/docs/candidate-setup">
                    candidate setup guide
                  </Link>{" "}
                  to prepare for your round.
                </p>
              </details>
            </div>
          </section>

          <section className={styles.closing} aria-labelledby="pricing-next">
            <div>
              <p className={styles.eyebrow}>Your next step</p>
              <h2 id="pricing-next">Ask about your assessment.</h2>
              <p>
                Send your assessment details and pricing questions to the team.
                You can leave candidate numbers or dates open if they are not
                decided yet.
              </p>
            </div>
            <Link href="/contact" className={styles.primary}>
              Ask about pricing
            </Link>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
