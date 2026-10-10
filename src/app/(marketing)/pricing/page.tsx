import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { PricingOptions } from "@/components/PricingVolumeModeler";
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
              Contact the team with your assessment format, approximate
              candidate count, and schedule to ask about pricing.
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
              Prices are confirmed with the team. A rough candidate count is
              fine.
            </p>
          </header>

          <PricingOptions />

          <section className={styles.confirm} aria-labelledby="confirm-title">
            <div>
              <p className={styles.eyebrow}>Before you decide</p>
              <h2 id="confirm-title">What to confirm before your round.</h2>
              <p>
                Ask for written confirmation of the price, included usage, and
                any support or data requirements your team has.
              </p>
              <Link href="/security" className={styles.textLink}>
                Read about security &amp; privacy
              </Link>
            </div>
            <ol className={styles.requirements}>
              <li>
                <h3>Scope and price</h3>
                <p>
                  Confirm the total cost, included usage, any limits, and what
                  additional usage would mean.
                </p>
              </li>
              <li>
                <h3>Readiness and support</h3>
                <p>
                  Discuss supported devices, your schedule, and the support or
                  availability commitments required for your round.
                </p>
              </li>
              <li>
                <h3>Data and review</h3>
                <p>
                  Clarify reviewer access, the data collected for your setup,
                  and applicable retention and deletion terms.
                </p>
              </li>
            </ol>
          </section>

          <section className={styles.faq} aria-labelledby="pricing-questions">
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>Common questions</p>
              <h2 id="pricing-questions">About pricing and plans.</h2>
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
                  These enquiries are for teams organizing assessments. Follow
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
