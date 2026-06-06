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
    <main className="min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-purple-200 selection:text-purple-900">
      <MarketingHeader />
      <section className="relative min-h-screen overflow-hidden px-4 pb-20 pt-28 sm:px-5 sm:pt-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-slate-50/30 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="max-w-3xl">
            <div className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Changelog
            </div>
            <h1 className="max-w-3xl text-4xl font-medium leading-[1.05] tracking-tight text-slate-900 sm:text-5xl md:text-7xl">
              Release notes for operational teams.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg md:text-xl">
              Track desktop app releases, session policy changes, review timeline updates, and deployment-facing improvements.
            </p>
            <Link
              className="mt-8 ams-btn ams-btn-primary ams-btn-md"
              href="/download"
            >
              Get Access by AMS
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-16 border-l border-slate-200">
            {entries.map((entry) => (
              <article key={entry.version} className="relative pb-10 pl-7 last:pb-0">
                <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border border-purple-300 bg-purple-500" />
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2.5 text-sm font-medium">
                    <span className="text-purple-600 font-semibold">{entry.version}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{entry.category}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-400 font-normal">{entry.date}</span>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">{entry.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{entry.body}</p>
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
