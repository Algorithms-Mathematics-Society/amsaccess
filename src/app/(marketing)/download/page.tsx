import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { checkRequestRateLimitAsync } from "@/lib/server/rateLimit";
import { ReleaseRequirements } from "@/components/ReleaseRequirements";
import { MONITORING_GUIDE_PATH } from "@/lib/assessment-information";
import { ArrowUpRight } from "lucide-react";
import { ORGANIZER_SIGN_IN_URL, RECRUITER_SIGN_IN_URL } from "@/lib/product-links";
import { fetchLatestRelease } from "@/lib/releases";
import { DownloadChoices } from "./DownloadChoices";
import { downloadOptions } from "./download-options";
import styles from "./download.module.css";

const WEBSITE = "https://www.amsaccess.com";
export const metadata: Metadata = {
  title: "Download Access",
  description:
    "Download the Access desktop app for Windows, macOS, or Linux. Choose the right installer and prepare your device for your assessment.",
  alternates: { canonical: "https://app.amsaccess.com" },
};
export const revalidate = 300;

export default async function DownloadPage({ searchParams }: {
  searchParams: Promise<{ refresh?: string }>;
}) {
  const query = await searchParams;
  const fresh = query.refresh === "1";
  const refreshLimit = fresh
    ? await checkRequestRateLimitAsync(
        new NextRequest("https://app.amsaccess.com/download", { headers: await headers() }),
        "publicRead", ["release-download"],
      )
    : null;
  // Share the download API's budget: refreshing must not bypass upstream protection.
  const release = refreshLimit?.limited ? null : await fetchLatestRelease({ fresh });
  const published = release?.publishedAt ? new Date(release.publishedAt) : null;
  const releaseDate =
    published && Number.isFinite(published.getTime())
      ? new Intl.DateTimeFormat("en", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(published)
      : null;
  return (
    <div className={styles.page} data-access-download>
      <a href="#download-content" className={styles.skipLink}>
        Skip to downloads
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a
            href={WEBSITE}
            className={styles.brand}
            aria-label="Access by AMS website"
          >
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path
                d="M3 28 16 4 29 28"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Access</span>
            <small>by AMS</small>
          </a>
          <a
            href={WEBSITE + "/docs/candidate-setup"}
            className={styles.headerLink}
          >
            Setup guide <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </header>
      <main id="download-content" tabIndex={-1} className={styles.container}>
        <section className={styles.hero} aria-labelledby="download-title">
          <div>
            <p className={styles.eyebrow}>Access desktop app</p>
            <h1 id="download-title">Download Access.</h1>
            <p className={styles.intro}>
              Install the app on the computer you’ll use for your assessment.
            </p>
            <p className={styles.heroNote}>
              If your organizer specified a version, confirm it matches before
              installing or updating.
            </p>
          </div>
          <aside className={styles.release} aria-label="Release information">
            <span className={styles.eyebrow}>
              {release ? "Current release" : "Release information"}
            </span>
            <strong>{release?.version ?? "Unavailable right now"}</strong>
            {releaseDate && (
              <time dateTime={release!.publishedAt}>{releaseDate}</time>
            )}
            <a href={WEBSITE + "/changelog"}>
              Public release notes <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </aside>
        </section>

        {!release && (
          <div className={styles.releaseNotice} role="status">
            <div>
              <strong>{refreshLimit?.limited ? "Please wait before refreshing again." : "We couldn’t load the downloads."}</strong>
              <p>
                {refreshLimit?.limited
                  ? `Try again in ${refreshLimit.retryAfter} seconds.`
                  : "Try again shortly. If your assessment is about to start, contact your organizer."}
              </p>
            </div>
            <a href="/download?refresh=1">Try again</a>
          </div>
        )}
        <aside className={styles.monitoringNote} aria-labelledby="monitoring-note-title">
          <div>
            <h2 id="monitoring-note-title">Before you install</h2>
            <p>The desktop app checks device readiness and records session activity.
              Some presence checks can include camera images sent to the assessment service.</p>
          </div>
          <a href={WEBSITE + MONITORING_GUIDE_PATH}>
            What Access checks and records <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </aside>
        <DownloadChoices options={downloadOptions(release)} />

        <ReleaseRequirements release={release} />

        <section className={styles.setup} aria-labelledby="setup-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>After downloading</p>
              <h2 id="setup-title">Get ready before your round.</h2>
            </div>
            <a href={WEBSITE + "/docs/candidate-setup"}>
              Read the setup guide <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <div>
                <h3>Install and open Access</h3>
                <p>
                  Use the installer for your operating system. On a managed
                  computer, ask your IT team if installation is restricted.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Follow your invitation</h3>
                <p>
                  Use the access details supplied by your organizer. Your
                  invitation contains the instructions for your round.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Check your device</h3>
                <p>
                  Complete the readiness checks and required permissions before
                  the start time, so there is time to resolve an issue.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.help} aria-labelledby="help-title">
          <div>
            <p className={styles.eyebrow}>A question about setup?</p>
            <h2 id="help-title">Help with your next step.</h2>
            <p>
              For an invitation, schedule, access code, or an issue during your
              round, contact the organizer who invited you.
            </p>
            <a href={WEBSITE + "/docs/troubleshooting"}>
              Troubleshooting guide{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
          <div className={styles.questions}>
            <details>
              <summary>Which Mac download should I choose?</summary>
              <p>
                Open the Apple menu and choose About This Mac. If it lists an
                Apple M-series chip, choose Apple silicon. If it lists an Intel
                processor, choose Intel.
              </p>
            </details>
            <details>
              <summary>Can I take an assessment on a phone or tablet?</summary>
              <p>
                The Access assessment workspace is a desktop app for Windows,
                macOS, and Linux. Prepare a supported computer and confirm any
                device requirements with your organizer.
              </p>
            </details>
            <details>
              <summary>What if installation or a device check fails?</summary>
              <p>
                Read the displayed message and follow the{" "}
                <a href={WEBSITE + "/docs/device-checks"}>device-check guide</a>
                . Contact your organizer if a required check remains unresolved.
                Do not disable your computer’s security protections to install
                the app.
              </p>
            </details>
            <details>
              <summary>Do I need to update before every assessment?</summary>
              <p>
                This page offers the current public release. If your organizer
                specifies another version, confirm the correct download with them
                before installing or updating. Complete any update and device
                checks before the round starts.
              </p>
            </details>
          </div>
        </section>

        <aside className={styles.workspaces} aria-labelledby="workspace-title">
          <div>
            <h2 id="workspace-title">Organizing or reviewing assessments?</h2>
            <p>Use your team’s web workspace.</p>
          </div>
          <div>
            <a href={ORGANIZER_SIGN_IN_URL}>
              Organizer sign in <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <a href={RECRUITER_SIGN_IN_URL}>
              Recruiter sign in <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </aside>
      </main>
      <footer className={styles.footer}>
        <div>
          <a href={WEBSITE}>Access by AMS</a>
          <p>Let the work speak.</p>
        </div>
        <nav aria-label="Download page footer">
          <a href={WEBSITE + "/security"}>Security &amp; privacy</a>
          <a href={WEBSITE + "/privacy"}>Privacy</a>
          <a href={WEBSITE + "/terms"}>Terms</a>
          <a href={WEBSITE + "/contact"}>Contact</a>
        </nav>
      </footer>
    </div>
  );
}
