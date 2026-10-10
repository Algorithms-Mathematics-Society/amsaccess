import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { AMS_TEAM_EMAIL, AMS_PARTNERS_EMAIL } from "@/lib/ams-contact";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About AMS — The company behind Access",
  description:
    "AMS identifies and measures exceptional technical ability through rigorous competitions, assessments and real-world challenges. Meet the company behind Access.",
  alternates: { canonical: "https://www.amsaccess.com/about" },
};

const approach = [
  {
    number: "01",
    title: "Set a meaningful challenge.",
    body: "We design challenges that call for mathematical reasoning, debugging or systems judgment, with clear constraints that give the work context.",
  },
  {
    number: "02",
    title: "Examine the work.",
    body: "We look at what participants produce and how they perform against the challenge. The task and its constraints give meaning to the result.",
  },
  {
    number: "03",
    title: "Put performance in context.",
    body: "Our aim is to help participants understand their strengths and help technical teams judge what that performance says about the skills they need.",
  },
];

export default function AboutPage() {
  return (
    <>
      <MarketingHeader />
      <main id="about-content" tabIndex={-1} className={styles.page} data-about-ams>
        <div className={styles.container}>
          <div className={styles.pageBar}>
            <span>About AMS</span>
            <nav aria-label="About page sections">
              <a href="#approach">Our approach</a>
              <a href="#programs">Programs & infrastructure</a>
              <a href="#connect">Contact</a>
            </nav>
          </div>

          <header className={styles.hero}>
            <p className={styles.eyebrow}>The company behind Access</p>
            <h1>Technical ability,<br /><span>made visible.</span></h1>
            <div className={styles.introduction}>
              <p className={styles.definition}>
                AMS is a company that identifies and measures exceptional technical ability.
              </p>
              <p>
                We build rigorous competitions, assessments and real-world
                challenges for students and engineers. Through AMS Derive,
                AMS Ascent and AMS Access, we give technical work a place
                to be seen and assessed.
              </p>
            </div>
          </header>

          <section className={styles.purpose} aria-labelledby="purpose-title">
            <div>
              <p className={styles.eyebrow}>Why we exist</p>
              <h2 id="purpose-title">What can someone do<br />with a difficult problem?</h2>
            </div>
            <div className={styles.prose}>
              <p>
                A résumé can tell you where someone has worked or studied.
                Understanding how they reason through an unfamiliar problem,
                find a bug or make a technical trade-off takes a closer
                look at their work.
              </p>
              <p>
                For participants, that means a chance to show strengths a
                résumé may leave out. For technical teams, it means more
                context for evaluating the skills that matter to their work.
                AMS builds the challenges and assessment tools that support
                this closer look.
              </p>
            </div>
          </section>

          <section id="approach" className={styles.section} aria-labelledby="approach-title">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Our approach</p>
              <h2 id="approach-title">Start with the work.<br />Understand what it shows.</h2>
            </div>
            <ol className={styles.approach}>
              {approach.map((item) => (
                <li key={item.number}>
                  <span className={styles.number} aria-hidden="true">{item.number}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="programs" className={styles.section} aria-labelledby="programs-title">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Programs & infrastructure</p>
              <h2 id="programs-title">Two programs.<br />The infrastructure behind them.</h2>
              <p>
                Derive focuses on quantitative reasoning. Ascent focuses on
                systems engineering. Access supports assessment delivery
                and review.
              </p>
            </div>
            <div className={styles.programs}>
              <article>
                <div className={styles.programName}>
                  <span className={styles.number}>01 / Quantitative reasoning</span>
                  <h3>AMS Derive</h3>
                </div>
                <div className={styles.programDescription}>
                  <p>
                    Our quantitative problem-solving program brings together
                    probability, algorithms and mathematical reasoning,
                    with applications in quantitative finance and research.
                  </p>
                  <span>Mathematics · Probability · Algorithms</span>
                </div>
              </article>
              <article>
                <div className={styles.programName}>
                  <span className={styles.number}>02 / Systems engineering</span>
                  <h3>AMS Ascent</h3>
                </div>
                <div className={styles.programDescription}>
                  <p>
                    Our C++, systems and performance-engineering program focuses
                    on the decisions behind working software: finding faults,
                    improving performance and preserving correctness.
                  </p>
                  <span>C++ · Systems · Performance</span>
                </div>
              </article>
              <article>
                <div className={styles.programName}>
                  <span className={styles.number}>03 / Assessment infrastructure</span>
                  <h3>AMS Access</h3>
                </div>
                <div className={styles.programDescription}>
                  <p>
                    Our assessment infrastructure connects the steps of a coding
                    assessment: organizers set up the round, candidates prepare
                    and work in the app, and reviewers examine submissions.
                  </p>
                  <Link href="/product" className={styles.textLink}>
                    See how Access works <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            </div>
          </section>

          <section className={styles.audience} aria-label="Who our work serves">
            <article>
              <p className={styles.eyebrow}>For participants</p>
              <h2>Give your skills<br />a harder problem.</h2>
              <p>
                Take on demanding problems in mathematics or systems
                engineering. Use the challenge to test your understanding,
                find areas to improve and show what you can do.
              </p>
            </article>
            <article>
              <p className={styles.eyebrow}>For technical teams</p>
              <h2>Look closer at<br />the skills you need.</h2>
              <p>
                A role may call for mathematical reasoning, careful debugging
                or sound systems judgment. Relevant technical work gives
                you something concrete to examine alongside a
                candidate’s experience.
              </p>
            </article>
          </section>

          <section className={styles.direction} aria-labelledby="direction-title">
            <p className={styles.eyebrow}>Our direction</p>
            <h2 id="direction-title">A clearer picture,<br />built over time.</h2>
            <p>
              Our long-term aim is for performance across challenges to
              build a useful record of someone’s technical strengths.
              We are working toward that through our programs and
              assessment infrastructure.
            </p>
          </section>

          <section id="connect" className={styles.connect} aria-labelledby="connect-title">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Talk with AMS</p>
              <h2 id="connect-title">Tell us what you have in mind.</h2>
            </div>
            <div className={styles.contacts}>
              <article>
                <h3>General enquiries</h3>
                <p>Ask about AMS, taking part in a program or using Access. Tell us what you want to do and where you need help.</p>
                <a href={"mailto:" + AMS_TEAM_EMAIL}>
                  {AMS_TEAM_EMAIL} <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              </article>
              <article>
                <h3>Partners & sponsorships</h3>
                <p>For existing partners and sponsorship enquiries. Include your organization, the program you have in mind and what you hope to achieve.</p>
                <a href={"mailto:" + AMS_PARTNERS_EMAIL}>
                  {AMS_PARTNERS_EMAIL} <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              </article>
            </div>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
