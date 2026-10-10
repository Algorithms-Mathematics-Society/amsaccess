import Link from "next/link";
import { AMS_TEAM_EMAIL } from "@/lib/ams-contact";
import { ArrowRight, ChevronDown, FileText, Mail } from "lucide-react";
import { TrustLayout } from "./TrustLayout";
import styles from "./TrustPages.module.css";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
  link?: { href: string; label: string };
};
export type LegalContent = {
  kind: "privacy" | "terms";
  title: string;
  description: string;
  summary: { title: string; body: string }[];
  sections: LegalSection[];
};
export function LegalDocument({ content }: { content: LegalContent }) {
  const contents = (
    <ol>
      {content.sections.map((section, i) => (
        <li key={section.id}>
          <a href={"#" + section.id}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {section.title}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <TrustLayout active={content.kind}>
      <header className={styles.legalHeader}>
        <p className={styles.eyebrow}>Access information</p>
        <h1>{content.title}</h1>
        <p>{content.description}</p>
        <div className={styles.documentMeta}>
          <span>Draft for review</span>
          <span>
            Prepared <time dateTime="2026-10-10">10 October 2026</time>
          </span>
        </div>
      </header>
      <aside className={styles.draftNotice} data-legal-draft>
        <FileText size={19} aria-hidden="true" />
        <div>
          <h2>Review draft · not yet effective</h2>
          <p>
            The page is prepared for review. Legal operator details,
            policy-specific commitments, and applicable legal terms need
            confirmation before it becomes an effective{" "}
            {content.kind === "privacy" ? "privacy notice" : "agreement"}.
          </p>
        </div>
      </aside>
      <section
        className={styles.policySummary}
        aria-label={
          content.kind === "privacy"
            ? "Privacy at a glance"
            : "Terms at a glance"
        }
      >
        {content.summary.map((item) => (
          <div key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </div>
        ))}
      </section>
      <div className={styles.policyLayout}>
        <aside className={styles.policyContents}>
          <nav aria-label="On this page">
            <p>On this page</p>
            {contents}
          </nav>
        </aside>
        <article className={styles.policyArticle} aria-label={content.title}>
          <details className={styles.mobileContents}>
            <summary>
              On this page <ChevronDown size={15} aria-hidden="true" />
            </summary>
            <nav aria-label="On this page for mobile">{contents}</nav>
          </details>
          {content.sections.map((section, i) => (
            <section
              id={section.id}
              key={section.id}
              className={styles.policySection}
              aria-labelledby={section.id + "-title"}
            >
              <div className={styles.policySectionTitle}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <h2 id={section.id + "-title"}>{section.title}</h2>
              </div>
              {section.paragraphs?.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.note && (
                <aside className={styles.inlineNote}>
                  <p>{section.note}</p>
                </aside>
              )}
              {section.link && (
                <Link className={styles.textLink} href={section.link.href}>
                  {section.link.label}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </section>
          ))}
          <section
            className={styles.policyContact}
            aria-labelledby="policy-contact-title"
          >
            <Mail size={20} aria-hidden="true" />
            <div>
              <h2 id="policy-contact-title">A question about this page?</h2>
              <p>
                Contact Access with the topic and, if relevant, your assessment
                organizer’s name. Keep passwords, invitation codes, and
                assessment answers out of your message.
              </p>
              <a className={styles.textLink} href={"mailto:" + AMS_TEAM_EMAIL}>
                {AMS_TEAM_EMAIL}{" "}
                <ArrowRight size={14} aria-hidden="true" />
              </a>
            </div>
          </section>
          <div className={styles.relatedPolicies}>
            <Link href="/security">
              Security & privacy overview{" "}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link href={content.kind === "privacy" ? "/terms" : "/privacy"}>
              {content.kind === "privacy"
                ? "Read the terms"
                : "Read the privacy notice"}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </div>
    </TrustLayout>
  );
}
