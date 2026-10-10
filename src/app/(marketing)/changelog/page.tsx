import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";

const entries = [
  {
    version: "v0.2.0",
    date: "May 2026",
    category: "Session policy",
    title: "Added session policy enforcement",
    body: "Fullscreen posture, response autosave, and timeline signals were tightened for controlled written rounds."
  },
  {
    version: "v0.1.5",
    date: "March 2026",
    category: "Review",
    title: "Improved reviewer timeline context",
    body: "Written responses and activity evidence now stay paired more clearly inside the review surface."
  },
  {
    version: "v0.1.3",
    date: "February 2026",
    category: "Desktop",
    title: "Fixed macOS build signing",
    body: "Updated the desktop package signing path for managed macOS deployment reviews."
  },
  {
    version: "v0.1.0",
    date: "December 2025",
    category: "Release",
    title: "Opened controlled beta access",
    body: "Prepared initial Windows, macOS, and Linux release channels for assessment teams."
  }
];

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-cream font-body text-ink antialiased">
      <MarketingHeader />
      <section className="px-6 pb-20 pt-28 sm:pt-36 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="max-w-2xl">
            <span className="block font-body text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
              Changelog
            </span>
            {/* Was "Release notes for operational teams." The page is a list
                of releases; naming its audience back to it added nothing. */}
            <h1 className="mt-3 font-display text-[clamp(2.25rem,3.6vw+0.75rem,3.75rem)] leading-[1.04] text-ink">
              What changed.
            </h1>
            <Link
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-control border border-burgundy/50 px-5 py-2.5 font-body text-sm font-semibold text-burgundy no-underline transition-colors hover:border-burgundy hover:bg-burgundy/5"
              href="/download"
            >
              Download
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-14 border-l border-ink/15">
            {entries.map((entry) => (
              <article key={entry.version} className="relative pb-10 pl-7 last:pb-0">
                <div className="absolute -left-[4px] top-2 h-[7px] w-[7px] rounded-full bg-gold" />
                <div className="rounded-panel border border-ink/10 bg-cream-light p-5">
                  <div className="flex flex-wrap items-center gap-2.5 text-sm font-medium">
                    <span className="font-mono text-burgundy">{entry.version}</span>
                    <span className="text-ink/25">&middot;</span>
                    <span className="text-ink/60">{entry.category}</span>
                    <span className="text-ink/25">&middot;</span>
                    <span className="font-normal text-ink/50">{entry.date}</span>
                  </div>
                  <h2 className="mt-4 font-display text-lg text-ink">{entry.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65">{entry.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
