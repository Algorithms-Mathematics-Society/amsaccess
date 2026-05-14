"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";

const docs = [
  { title: "Deployment", body: "Guidance for installing and rolling out the downloadable desktop app.", href: "#" },
  { title: "Session policy", body: "Reference material for fullscreen requirements, autosave, response types, and timeline settings.", href: "#" },
  { title: "Review timeline", body: "How written work and activity context are presented for high-trust review.", href: "#" }
];

export default function DocsPage() {
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <MarketingHeader />
      <section
        className="raycast-hero relative flex min-h-screen items-center overflow-hidden px-4 pb-20 pt-28 sm:px-5 sm:pt-32"
        style={{
          backgroundImage: "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      >
        <div className="raycast-hero-bg" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6] opacity-20 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 md:gap-12 md:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="mb-6 inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-200 backdrop-blur-md">
              Docs
            </div>
            <h1 className="max-w-3xl bg-gradient-to-b from-white to-[#D4D4D8] bg-clip-text text-4xl font-semibold leading-[1.05] tracking-tight text-transparent sm:text-5xl md:text-7xl">
              Docs for controlled rounds.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg md:text-xl">
              A concise operating reference for deployment, session policy, review timelines, and activity context.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="hidden h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-violet-500 hover:text-white lg:inline-flex" href="/download">
                Get Access by AMS
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] px-5 text-sm font-medium text-white/75 shadow-glass backdrop-blur-md transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white" href="/">
                Back to Home
              </Link>
            </div>
          </div>

          <div className="glass-card grid content-start gap-4 p-5">
            {docs.map((item) => (
              <a
                key={item.title}
                className="group rounded border border-white/10 bg-[#09090B] p-5 transition hover:border-purple-300/25 hover:bg-white/[0.035]"
                href={item.href}
                onClick={(event) => {
                  if (item.href === "#") {
                    event.preventDefault();
                    setComingSoon(item.title);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight text-white">{item.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-white/65 md:text-white/50">{item.body}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-purple-200/70 transition group-hover:translate-x-0.5 group-hover:text-purple-100" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {comingSoon ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="coming-soon-title">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="ams-label mb-3">Coming Soon</p>
                <h2 id="coming-soon-title" className="text-xl font-semibold tracking-tight text-white">{comingSoon}</h2>
              </div>
              <button className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-white/30 hover:text-white" type="button" onClick={() => setComingSoon(null)} aria-label="Close modal">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-5 text-sm leading-6 text-white/55">
              This guide is being prepared. Contact the team for the current operating reference.
            </p>
            <Link className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-violet-500 hover:text-white" href="/contact">
              Contact team
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
