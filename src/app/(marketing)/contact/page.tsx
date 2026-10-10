"use client";

import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Container, Eyebrow } from "@/components/ams/primitives";

/**
 * Contact, written the way ams-website writes it: say who we are, give the
 * address, prefill the subject.
 *
 * What came out:
 *
 * * A "REQUEST PAYLOAD / JSON" panel showing the form's own body as it was
 *   typed, with a fake `curl` beneath it. It was a developer's debug view
 *   shipped to the public page, and the audience here is a university
 *   administrator or a hiring lead.
 * * "Expected Round Volume", asked before anyone had said hello. A
 *   procurement question on first contact reads as qualification, and the
 *   people who answer it honestly are the ones already sold.
 * * "Discuss deployment." as a heading, and a body listing "access,
 *   pricing, deployment planning, support paths, and institution
 *   evaluation needs" — five nouns where one sentence would do.
 *
 * The form stays, because it is wired to real delivery and some people
 * prefer it, but it is no longer the page. Three addresses are, each with
 * the subject already written, because a mail client that opens with the
 * subject filled is a lower barrier than any form.
 */

const ROUTES = [
  {
    title: "Sales",
    email: "sales@amsaccess.com",
    subject: "AMS Access enquiry",
    body: "Plans, pricing, and what running a round with us involves.",
  },
  {
    title: "Support",
    email: "support@amsaccess.com",
    subject: "AMS Access support",
    body: "Help with a contest you are running, or one that has already started.",
  },
  {
    title: "Security",
    email: "security@amsaccess.com",
    subject: "AMS Access security",
    body: "How the desktop app behaves, what it records, and where that is kept.",
  },
] as const;

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          organization: form.get("organization") ?? "",
          // The API requires a category. Taken from the radio rather than a
          // dropdown, so it is one click and visible without opening it.
          category: form.get("category") ?? "Sales",
          message: form.get("message"),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "That did not send. Try email instead.");
      }
      setStatus("sent");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "That did not send.");
    }
  }

  return (
    <main className="min-h-screen bg-cream font-body text-ink antialiased">
      <MarketingHeader />

      <section className="pb-16 pt-28 sm:pt-36">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow>Contact</Eyebrow>
            <h1 className="mt-3 font-display text-[clamp(2.25rem,3.6vw+0.75rem,3.75rem)] leading-[1.04] text-ink">
              Talk to the people who run it.
            </h1>
            <p className="mt-5 text-base leading-7 text-ink/70">
              AMS Access is built and operated by the Algorithms &amp; Mathematics Society. We use
              it for our own contests, which is both why it exists and why the person answering
              your mail has run a round with it.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {ROUTES.map((route) => (
              <a
                key={route.title}
                href={`mailto:${route.email}?subject=${encodeURIComponent(route.subject)}`}
                className="group rounded-panel border border-ink/10 bg-cream-light p-5 no-underline transition-colors hover:border-burgundy/40"
              >
                <h2 className="font-display text-lg text-ink">{route.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">{route.body}</p>
                <span className="mt-4 flex items-center gap-2 font-mono text-xs text-burgundy">
                  <Mail className="h-3.5 w-3.5" />
                  {route.email}
                </span>
              </a>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-ink/10 bg-cream-light py-[clamp(3.75rem,7vw,6.5rem)]">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Eyebrow>About AMS</Eyebrow>
              <h2 className="mt-3 font-display text-[clamp(1.6rem,2vw+0.75rem,2.25rem)] leading-tight text-ink">
                A student society that kept building its own tools.
              </h2>
              <p className="mt-4 text-base leading-7 text-ink/70">
                We run Derive and Ascent, our own competitive rounds, and Access is the shell we
                built to run them honestly. It is used by institutions and hiring teams who need
                the same thing we did: a round whose result holds up when somebody asks how it was
                invigilated.
              </p>
              <a
                href="https://amshq.in"
                className="mt-5 inline-block text-sm font-semibold text-burgundy underline-offset-4 hover:underline"
              >
                More about AMS
              </a>
            </div>

            <div className="rounded-panel border border-ink/10 bg-cream p-6">
              {status === "sent" ? (
                <div>
                  <h3 className="font-display text-lg text-ink">Sent.</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/65">
                    We read everything that arrives here. If it is urgent, mail the address above
                    directly.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <h3 className="font-display text-lg text-ink">Or send a note</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm text-ink/70">Name</span>
                      <input name="name" required className={field} />
                    </label>
                    <label className="block">
                      <span className="text-sm text-ink/70">Email</span>
                      <input name="email" type="email" required className={field} />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm text-ink/70">Organization</span>
                    <input name="organization" className={field} />
                  </label>

                  <fieldset>
                    <legend className="text-sm text-ink/70">About</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ROUTES.map((route, index) => (
                        <label
                          key={route.title}
                          className="cursor-pointer rounded-control border border-ink/15 px-3 py-1.5 text-sm text-ink/70 transition-colors has-[:checked]:border-burgundy has-[:checked]:bg-burgundy has-[:checked]:text-cream-light"
                        >
                          <input
                            type="radio"
                            name="category"
                            value={route.title}
                            defaultChecked={index === 0}
                            className="sr-only"
                          />
                          {route.title}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="block">
                    <span className="text-sm text-ink/70">Message</span>
                    <textarea name="message" required rows={5} className={field} />
                  </label>

                  {status === "error" && (
                    <p className="text-sm text-red-700">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="inline-flex min-h-11 items-center rounded-control bg-burgundy px-5 py-2.5 text-sm font-semibold text-cream-light transition-colors hover:bg-burgundy-deep disabled:opacity-60"
                  >
                    {status === "sending" ? "Sending" : "Send"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </Container>
      </section>

      <MarketingFooter />
    </main>
  );
}

const field =
  "mt-1.5 w-full rounded-control border border-ink/15 bg-cream-light px-3 py-2 text-sm text-ink " +
  "focus:border-burgundy focus:outline-none focus:ring-1 focus:ring-burgundy";
