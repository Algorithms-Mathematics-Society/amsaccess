import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
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

export default async function DownloadPage() {
  const release = await fetchLatestRelease();
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
              Keep your organizer’s invitation and sign-in instructions nearby.
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
              <strong>We couldn’t load the downloads.</strong>
              <p>
                Try again shortly. If your assessment is about to start, contact
                your organizer.
              </p>
            </div>
            <a href="/download">Try again</a>
          </div>
        )}
        <DownloadChoices options={downloadOptions(release)} />

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
                Use the version your organizer requires. If an update is needed,
                complete it and check your device before your round begins.
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
            <a href={WEBSITE + "/org/login"}>
              Organizer sign in <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <a href={WEBSITE + "/firms/login"}>
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
