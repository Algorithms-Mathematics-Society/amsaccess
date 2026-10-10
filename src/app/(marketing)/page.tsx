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
import { OSDownloadButton } from "@/components/OSDownloadButton";
import { DesktopDownloadNotice } from "@/components/DesktopDownloadNotice";

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
    <div className="ac-theme min-h-screen bg-paper font-body text-ink antialiased">
      <MarketingHeader />

      <section className="pb-20 pt-28 sm:pb-28 sm:pt-36 lg:flex lg:min-h-[calc(100dvh-5rem)] lg:items-center lg:py-24">
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div className="max-w-3xl">
              <Reveal>
                <h1 className="font-display text-[clamp(2.75rem,5vw+0.75rem,5rem)] leading-[1.02] tracking-[-0.03em] text-ink lg:text-5xl xl:text-[clamp(4rem,5.2vw,6rem)]">
                  Run a round nobody has to take on trust.
                </h1>
              </Reveal>
              <Reveal delay={80}>
                <p className="mt-6 max-w-xl text-lg leading-8 text-muted lg:max-w-2xl lg:text-xl lg:leading-9">
                  A locked desktop workspace, the device checks that went with it, and a record of
                  what happened. Built by AMS for our own contests.
                </p>
              </Reveal>
              <Reveal delay={140}>
                <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:mt-12">
                  <div className="hidden xl:block">
                    <OSDownloadButton large />
                  </div>
                  <DesktopDownloadNotice className="w-full xl:hidden" />
                  <AmsButton href="#shell" variant="outline" className="min-h-14 w-full px-6 text-base sm:min-h-16 sm:w-auto sm:px-8 sm:text-lg">
                    See how it works
                  </AmsButton>
                </div>
              </Reveal>
            </div>

            <Reveal delay={200} className="lg:mt-0">
              <SessionWalkthrough />
            </Reveal>
          </div>
        </Container>
      </section>

      <section id="shell" className="border-t border-line bg-surface py-[clamp(3.75rem,7vw,6.5rem)] lg:py-32">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="The shell"
              title="A workspace that closes behind them."
              lead="Fullscreen, keyboard locked, capture tools detected. It refuses to start if the machine is not in a state you would accept."
            />
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-6">
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
                <Plate className="h-full p-6 lg:p-8">
                  <h3 className="font-display text-xl leading-snug text-ink lg:text-2xl">{title}</h3>
                  <p className="mt-3 text-base leading-7 text-muted lg:text-lg lg:leading-8">{body}</p>
                </Plate>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-[clamp(3.75rem,7vw,6.5rem)] lg:py-32">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>For evaluators</Eyebrow>
              <h2 className="mt-3 font-display text-[clamp(1.6rem,2vw+0.75rem,2.25rem)] leading-tight text-ink">
                Set the problem, not the pipeline.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">
                Write a problem in the portal, run the real checks against it on the judge, and
                publish it when it passes. Statement, tests, validators and checkers in one place,
                with nothing to package by hand.
              </p>
              <div className="mt-6">
                <AmsButton href="#shell" variant="outline">
                  Problemsetting
                </AmsButton>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <Eyebrow>For organizations</Eyebrow>
              <h2 className="mt-3 font-display text-[clamp(1.6rem,2vw+0.75rem,2.25rem)] leading-tight text-ink">
                One roster, every round.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">
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

      <section className="border-t border-line bg-violet py-[clamp(3.75rem,7vw,6.5rem)] lg:py-32">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 className="font-display text-[clamp(1.75rem,2.4vw+0.75rem,2.6rem)] leading-tight text-white">
                Get the desktop app.
              </h2>
              <p className="mt-3 text-base leading-7 text-white/70">
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
                className="border-white/40 text-white hover:border-white hover:bg-white/10"
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
