import type { Metadata } from "next";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";
import {
  AmsButton,
  Container,
  Eyebrow,
  Plate,
  Reveal,
  SectionHeading,
} from "@/components/ams/primitives";
import { SessionWalkthrough } from "@/components/ams/SessionWalkthrough";

export const metadata: Metadata = {
  title: "AMS Access",
  description: "Proctored contests and assessments, run by AMS.",
};

/**
 * The public landing page, in the AMS house style.
 *
 * What came out, and why:
 *
 * * Two product screenshots. Both were versions out of date and nobody had
 *   noticed, which is what happens to a picture of software: it rots
 *   silently and a visitor cannot tell. The walkthrough is drawn from the
 *   same tokens as the page, so it cannot show last year's colours.
 * * The gradient blur behind the frames, the zoom-to-lightbox plumbing, and
 *   the sentences that described the page rather than the product.
 *
 * A server component on purpose. Only the walkthrough is interactive, so
 * only the walkthrough ships JavaScript.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream font-body text-ink antialiased">
      <MarketingHeader />

      <section className="pb-16 pt-28 sm:pb-24 sm:pt-36">
        <Container>
          <div className="max-w-3xl">
            <Reveal>
              <h1 className="font-display text-[clamp(2.5rem,4.8vw+0.75rem,4.75rem)] leading-[1.02] text-ink">
                Run a round nobody has to take on trust.
              </h1>
            </Reveal>
            <Reveal delay={80}>
              <p className="mt-6 max-w-xl text-lg leading-8 text-ink/70">
                A locked desktop workspace, the device checks that went with it, and a record of
                what happened. Built by AMS for our own contests.
              </p>
            </Reveal>
            <Reveal delay={140}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <AmsButton href="/download">Download</AmsButton>
                <AmsButton href="/product" variant="outline">
                  See how it works
                </AmsButton>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="mt-14">
            <SessionWalkthrough />
          </Reveal>
        </Container>
      </section>

      <section className="border-t border-ink/10 bg-cream-light py-[clamp(3.75rem,7vw,6.5rem)]">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="The shell"
              title="A workspace that closes behind them."
              lead="Fullscreen, keyboard locked, capture tools detected. It refuses to start if the machine is not in a state you would accept."
            />
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [
                "Device checks",
                "Camera, displays, virtual machines, screen recorders. Reported one by one, so a machine that cannot run a check says which rather than failing everything.",
              ],
              [
                "Session integrity",
                "Fullscreen posture, focus changes and restricted processes, timestamped against the session clock.",
              ],
              [
                "Real judging",
                "The same compiler and sandbox as the contest. Code that builds in a run cannot fail to build on submit.",
              ],
              [
                "Evidence after",
                "Every attempt, every verdict, every event. Enough to answer a question weeks later.",
              ],
              [
                "A dropped connection is not an ended session",
                "Work stays on the device and reconciles when the network comes back.",
              ],
              [
                "Three platforms",
                "Windows, macOS and Linux, signed and notarised, from one release.",
              ],
            ].map(([title, body], index) => (
              <Reveal key={title} delay={index * 60}>
                <Plate className="h-full p-5">
                  <h3 className="font-display text-lg leading-snug text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/65">{body}</p>
                </Plate>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-[clamp(3.75rem,7vw,6.5rem)]">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>For evaluators</Eyebrow>
              <h2 className="mt-3 font-display text-[clamp(1.6rem,2vw+0.75rem,2.25rem)] leading-tight text-ink">
                Set the problem, not the pipeline.
              </h2>
              <p className="mt-4 text-base leading-7 text-ink/70">
                Write a problem in the portal, run the real checks against it on the judge, and
                publish it when it passes. Statement, tests, validators and checkers in one place,
                with nothing to package by hand.
              </p>
              <div className="mt-6">
                <AmsButton href="/product" variant="outline">
                  Problemsetting
                </AmsButton>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <Eyebrow>For organizations</Eyebrow>
              <h2 className="mt-3 font-display text-[clamp(1.6rem,2vw+0.75rem,2.25rem)] leading-tight text-ink">
                One roster, every round.
              </h2>
              <p className="mt-4 text-base leading-7 text-ink/70">
                Import a roster once and select from it for each contest. Credentials, mail and
                the record of who sat what stay attached to the person rather than the event.
              </p>
              <div className="mt-6">
                <AmsButton href="/contact" variant="outline">
                  Talk to us
                </AmsButton>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="border-t border-ink/10 bg-burgundy py-[clamp(3.75rem,7vw,6.5rem)]">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 className="font-display text-[clamp(1.75rem,2.4vw+0.75rem,2.6rem)] leading-tight text-cream-light">
                Get the desktop app.
              </h2>
              <p className="mt-3 text-base leading-7 text-cream/70">
                Candidates need the app. Everything you run a round with is in the browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <AmsButton href="/download" variant="inverse">
                Download
              </AmsButton>
              <AmsButton
                href="/contact"
                variant="outline"
                className="border-cream/40 text-cream hover:border-cream hover:bg-cream/10"
              >
                Contact
              </AmsButton>
            </div>
          </div>
        </Container>
      </section>

      <MarketingFooter />
    </div>
  );
}
