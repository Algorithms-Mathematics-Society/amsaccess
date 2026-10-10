import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, BookOpen } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { ACCESS_APP_URL } from "@/lib/product-links";
import { ContactForm } from "./ContactForm";
import styles from "./Contact.module.css";

export const metadata: Metadata = {
  title: "Contact — Access by AMS",
  description:
    "Talk to Access about assessments, get product help, or ask a security and privacy question.",
};

export default function ContactPage() {
  return (
    <>
      <MarketingHeader />
      <main id="contact-content" tabIndex={-1} className={styles.page}>
        <div className={styles.container}>
          <header className={styles.hero}>
            <p className={styles.eyebrow}>Contact Access</p>
            <h1>
              Contact the
              <br />
              <span>Access team.</span>
            </h1>
            <p>
              Ask about running an assessment, get product help, or send a
              security question.
              <br className={styles.desktopBreak} /> Use the form below or email
              us directly.
            </p>
            <a href="#candidate-help" className={styles.candidateJump}>
              Invited to an assessment? Find candidate help
              <ArrowDown size={14} aria-hidden="true" />
            </a>
          </header>
          <ContactForm />
          <section
            className={styles.candidate}
            id="candidate-help"
            aria-labelledby="candidate-title"
          >
            <div className={styles.candidateIcon}>
              <BookOpen size={22} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div>
              <p className={styles.eyebrow}>Taking an assessment?</p>
              <h2 id="candidate-title">Help with your assessment.</h2>
              <p>
                For invitations, schedules, results, or help during a live
                round, contact the organizer who invited you. For device setup
                and getting ready, start with the candidate guides.
              </p>
              <div className={styles.candidateLinks}>
                <Link href="/docs/candidate-setup">
                  Candidate setup guide{" "}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
                <a href={ACCESS_APP_URL}>
                  Open Access <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
