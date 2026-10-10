import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { ACCESS_APP_URL } from "@/lib/product-links";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Changelog — Access by AMS",
  description:
    "Public release notes for Access. Find current product guidance, setup documentation, and the Access app.",
};

export default function ChangelogPage() {
  return (
    <>
      <MarketingHeader />
      <main id="changelog-content" tabIndex={-1} className={styles.page}>
        <div className={styles.container}>
          <header className={styles.hero}>
            <p className={styles.eyebrow}>Changelog</p>
            <h1>Product updates.</h1>
            <p>Public release notes for Access.</p>
          </header>

          <section className={styles.notice} aria-labelledby="release-status">
            <h2 id="release-status">No release notes published here yet.</h2>
            <p>
              For an overview of the product and how to use it, explore the{" "}
              <Link href="/product">product page</Link> or the{" "}
              <Link href="/docs">documentation</Link>.
            </p>
            <a href={ACCESS_APP_URL} className={styles.primary}>
              Open Access
            </a>
          </section>

          <section className={styles.help} aria-labelledby="setup-guidance">
            <div>
              <h2 id="setup-guidance">Preparing for an assessment?</h2>
              <p>
                Use the candidate guide for setup and readiness checks, or the
                organizer guide to understand the assessment workflow.
              </p>
            </div>
            <div className={styles.links}>
              <Link href="/docs/candidate-setup">Candidate setup guide</Link>
              <Link href="/docs/organize-assessment">Organizer guide</Link>
            </div>
          </section>
          <p className={styles.contact}>
            Have a question about a specific version?{" "}
            <Link href="/contact">Contact the team</Link>.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
