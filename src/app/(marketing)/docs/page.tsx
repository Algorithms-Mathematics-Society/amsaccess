"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";

const docs = [
  { title: "Deployment", body: "Guidance for installing and rolling out the downloadable desktop app." },
  { title: "Session policy", body: "Reference material for fullscreen requirements, autosave, response types, and timeline settings." },
  { title: "Review timeline", body: "How written work and activity context are presented for high-trust review." },
  { title: "Chess plugin", body: "YAML rulesets, test-play flow, and dedicated CHESS contest operations." },
] as const;

export default function DocsPage() {
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-purple-200 selection:text-purple-900">
      <MarketingHeader />
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 pb-20 pt-28 sm:px-5 sm:pt-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-slate-50/30 pointer-events-none" />
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 md:gap-12 md:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Docs
            </div>
            <h1 className="max-w-3xl text-4xl font-medium leading-[1.05] tracking-tight text-slate-900 sm:text-5xl md:text-7xl">
              Docs for controlled rounds.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg md:text-xl">
              A concise operating reference for deployment, session policy, review timelines, and activity context.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="!hidden ams-btn ams-btn-primary ams-btn-md lg:!inline-flex"
                href="/download"
              >
                Get Access by AMS
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="ams-btn ams-btn-secondary ams-btn-md"
                href="/"
              >
                Back to Home
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm grid content-start gap-3 p-5">
            {docs.map((item) => (
              <button
                key={item.title}
                type="button"
                className="group rounded-xl border border-slate-100 bg-slate-50 p-5 text-left transition hover:border-purple-200 hover:bg-white"
                onClick={() => setComingSoon(item.title)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">{item.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{item.body}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-purple-500" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />

      {comingSoon ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coming-soon-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-3">Coming Soon</p>
                <h2 id="coming-soon-title" className="text-xl font-semibold tracking-tight text-slate-900">{comingSoon}</h2>
              </div>
              <button
                className="ams-btn ams-btn-secondary ams-icon-btn"
                type="button"
                onClick={() => setComingSoon(null)}
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-500">
              This guide is being prepared. Contact the team for the current operating reference.
            </p>
            <Link
              className="mt-6 ams-btn ams-btn-primary"
              href="/contact"
            >
              Contact team
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
