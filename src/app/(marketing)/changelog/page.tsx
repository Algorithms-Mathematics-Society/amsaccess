import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";

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
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <MarketingHeader />
      <section
        className="raycast-hero relative min-h-screen overflow-hidden px-4 pb-20 pt-28 sm:px-5 sm:pt-32"
        style={{
          backgroundImage: "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      >
        <div className="raycast-hero-bg" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6] opacity-20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-200 backdrop-blur-md">
              Changelog
            </div>
            <h1 className="max-w-3xl bg-gradient-to-b from-white to-[#D4D4D8] bg-clip-text text-4xl font-semibold leading-[1.05] tracking-tight text-transparent sm:text-5xl md:text-7xl">
              Release notes for operational teams.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg md:text-xl">
              Track desktop app releases, session policy changes, review timeline updates, and deployment-facing improvements.
            </p>
            <Link className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-violet-500 hover:text-white" href="/download">
              Get AMS Access
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-16 border-l border-white/10">
            {entries.map((entry) => (
              <article key={entry.version} className="relative pb-10 pl-7 last:pb-0">
                <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border border-purple-300/40 bg-[#8B5CF6]" />
                <div className="glass-card p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-100">{entry.version}</span>
                    <span className="text-sm text-white/45">{entry.date}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-medium text-white/55">{entry.category}</span>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold tracking-tight text-white">{entry.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/65 md:text-white/50">{entry.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
