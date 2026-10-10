import Link from "next/link";
import "@/styles/access-theme.css";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { ACCESS_APP_URL } from "@/lib/product-links";
import styles from "./MarketingFooter.module.css";

const productLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Product overview", href: "/product" },
  { label: "Use cases", href: "/#use-cases" },
  { label: "Pricing", href: "/pricing" },
];
const resourceLinks = [
  { label: "About AMS", href: "/about" },
  { label: "Security & privacy", href: "/security" },
  { label: "Documentation", href: "/docs" },
  { label: "Release notes", href: "/changelog" },
  { label: "Contact the team", href: "/contact" },
];

export function MarketingFooter() {
  return (
    <footer
      id="site-footer"
      className={styles.footer}
      data-access-theme
      data-access-footer
    >
      <div className={styles.inner}>
        <div className={styles.directory}>
          <div className={styles.intro}>
            <Link
              href="/"
              className={styles.brand}
              aria-label="Access by AMS home"
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
              <span>
                Access <small>by AMS</small>
              </span>
            </Link>
            <p>
              Coding assessments.
              <br />
              Setup, participation, and review.
            </p>
          </div>

          <nav
            className={styles.linkGroup}
            aria-labelledby="footer-product-title"
          >
            <h2 id="footer-product-title">Product</h2>
            <ul>
              {productLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav
            className={styles.linkGroup}
            aria-labelledby="footer-resources-title"
          >
            <h2 id="footer-resources-title">Resources</h2>
            <ul>
              {resourceLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.appGroup} aria-labelledby="footer-app-title">
            <h2 id="footer-app-title">App access</h2>
            <ul>
              <li>
                <a href={ACCESS_APP_URL} className={styles.appLink}>
                  <span>
                    <strong>Partner workspace</strong>
                    <span>For partners and organizers.</span>
                  </span>
                  <ArrowUpRight
                    size={15}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </a>
              </li>
              <li>
                <a href={ACCESS_APP_URL} className={styles.appLink}>
                  <span>
                    <strong>Candidate access</strong>
                    <span>Desktop app & assessment access.</span>
                  </span>
                  <ArrowUpRight
                    size={15}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </a>
              </li>
            </ul>
            <span className={styles.appDomain}>app.amsaccess.com</span>
          </nav>
        </div>

        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} AMS Access</p>
          <nav className={styles.legalLinks} aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
          <a href="#top" className={styles.backToTop}>
            Back to top{" "}
            <ArrowUp size={14} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
