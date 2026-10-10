import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Laptop,
  ClipboardList,
  FileSearch,
  BookOpen,
  LifeBuoy,
  Search,
} from "lucide-react";
import { ACCESS_APP_URL } from "@/lib/product-links";
import { DocsDirectory } from "./DocsDirectory";
import { guides, guideSearchText } from "./guides";
import styles from "./docs.module.css";

export const metadata: Metadata = {
  title: "Documentation — Access by AMS",
  description:
    "Plain-language Access guides for candidates, organizers, and reviewers. Prepare your device, take an assessment, plan a round, and review results.",
};
const paths = [
  {
    role: "For candidates",
    title: "I’m taking a round.",
    body: "Get the app, prepare your device, and know what to expect.",
    href: "/docs/candidate-setup",
    label: "Prepare for your assessment",
    icon: Laptop,
  },
  {
    role: "For organizers",
    title: "I’m running a round.",
    body: "Plan the assessment and give candidates a clear start.",
    href: "/docs/organize-assessment",
    label: "Plan your round",
    icon: ClipboardList,
  },
  {
    role: "For reviewers",
    title: "I’m reviewing the work.",
    body: "Review results, submissions, and recorded session activity.",
    href: "/docs/review-results",
    label: "Start your review",
    icon: FileSearch,
  },
];
export default function DocsPage() {
  const directory = guides.map((guide) => ({
    slug: guide.slug,
    title: guide.title,
    description: guide.description,
    audience: guide.audience,
    searchText: guideSearchText(guide),
  }));
  return (
    <div className={styles.hub} data-docs-hub>
      <header className={styles.hubHeader}>
        <div className={styles.headerMeta}>
          <p className={styles.eyebrow}>Access documentation</p>
          <a href="#guides">
            <Search size={14} aria-hidden="true" />
            Search all guides
          </a>
        </div>
        <h1>
          Help with Access.
          <br />
          <span>Setup, assessments, and review.</span>
        </h1>
        <p>
          Choose the guide for your role, or search for a specific question.
        </p>
      </header>
      <Link className={styles.introLink} href="/docs/understand-access">
        <BookOpen size={18} aria-hidden="true" />
        <span>
          New to Access? <strong>Read the Access overview.</strong>
        </span>
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
      <section className={styles.paths} aria-label="Start with your role">
        {paths.map(({ role, title, body, href, label, icon: Icon }) => (
          <Link key={href} href={href} className={styles.pathCard}>
            <span className={styles.pathIcon}>
              <Icon size={21} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className={styles.smallLabel}>{role}</span>
            <h2>{title}</h2>
            <p>{body}</p>
            <span className={styles.pathAction}>
              {label}
              <ArrowRight size={15} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>
      <DocsDirectory guides={directory} />
      <section className={styles.helpPanel} aria-labelledby="docs-help-title">
        <LifeBuoy size={22} strokeWidth={1.5} aria-hidden="true" />
        <div>
          <h2 id="docs-help-title">Need help with an assessment?</h2>
          <p>
            For invitations, timing, or help during an assessment, contact your
            organizer using the channel in your invitation.
          </p>
          <div className={styles.helpLinks}>
            <Link href="/docs/troubleshooting">
              Find a troubleshooting step{" "}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link href="/contact">
              General enquiries <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <div className={styles.appStrip}>
        <span>Already know what to do?</span>
        <a href={ACCESS_APP_URL}>
          Open Access & downloads <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
