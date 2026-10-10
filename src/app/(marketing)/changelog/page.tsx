import type { Metadata } from "next";
import { fetchLatestRelease } from "@/lib/releases";
import { downloadOptions } from "../download/download-options";
import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { ACCESS_DOWNLOAD_URL } from "@/lib/product-links";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Changelog — Access by AMS",
  description:
    "Public release notes for Access. Find current product guidance, setup documentation, and the Access app.",
};

export const revalidate = 300;
export default async function ChangelogPage() {
  const release = await fetchLatestRelease();
  const options = downloadOptions(release).filter(option => option.files.length + option.alternatives.length);
  const count = options.reduce((total, option) => total + option.files.length + option.alternatives.length, 0);
  const date = release ? new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(release.publishedAt)) : "";
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

          {release ? (
            <article className={styles.notice} data-public-release={release.version} aria-labelledby="release-status">
              <p className={styles.eyebrow}>Release availability</p>
              <h2 id="release-status">Access {release.version}</h2>
              <time dateTime={release.publishedAt}>{date}</time>
              <p>{count ? `${count} desktop installers are available for this release.` : "Installer availability is being updated for this release."}
                {" "}The packages below come from the current published release.</p>
              <dl className={styles.releasePlatforms}>
                {options.map(option => (
                  <div key={option.id}>
                    <dt>{option.name}</dt>
                    <dd>{[...option.files, ...option.alternatives].map(file => file.detail).join("; ")}</dd>
                  </div>
                ))}
              </dl>
              <p>Check the filename, processor and requirements before installing.
                The downloads page includes file sizes and published SHA-256 checksums where available.</p>
              <div className={styles.releaseLinks}>
                <a href={ACCESS_DOWNLOAD_URL} className={styles.primary}>View current downloads</a>
                <Link href="/docs/verify-download">Verify a download</Link>
                <Link href="/docs/system-requirements">System requirements</Link>
              </div>
              <p className={styles.releaseScope}>This entry documents release availability.
                No additional feature or fix claims are included.</p>
            </article>
          ) : (
            <section className={styles.notice} aria-labelledby="release-status">
              <h2 id="release-status">Release information is temporarily unavailable.</h2>
              <p>We could not confirm the current release. Try again shortly or contact the team if you need a specific version.</p>
              <a href={ACCESS_DOWNLOAD_URL} className={styles.primary}>Check downloads</a>
            </section>
          )}

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
