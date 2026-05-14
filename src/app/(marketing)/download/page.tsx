"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { PlatformLogo } from "@/components/PlatformLogo";

const platforms = [
  { name: "Windows", installer: "MSI installer", status: "Beta access" },
  { name: "macOS", installer: "Universal package", status: "Beta access" },
  { name: "Linux", installer: "AppImage package", status: "Beta access" }
] as const;

export default function DownloadPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "joined">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      setStatus("idle");
      setError("Unable to join right now. Please try again.");
      return;
    }

    setEmail("");
    setStatus("joined");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <MarketingHeader />
      <section
        className="raycast-hero ams-hero-grid relative min-h-screen overflow-hidden px-5 pb-24 pt-36"
        style={{
          backgroundImage: "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      >
        <div className="raycast-hero-bg" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6] opacity-20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="ams-label mb-6">Download</p>
            <h1 className="bg-gradient-to-b from-white via-[#F4F4F5] to-[#A1A1AA] bg-clip-text text-5xl font-semibold leading-[0.96] tracking-tight text-transparent md:text-7xl">
              Download Access by AMS
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/60">
              The downloadable desktop app for controlled rounds, written response capture, session policy, and review timeline context.
            </p>
            <div className="mt-6 flex max-w-md items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 lg:hidden">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/25 text-white">
                <PlatformLogo platform="Windows" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Available on desktop</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs leading-5 text-white/45">
                  {platforms.map((platform) => (
                    <span key={platform.name} className="inline-flex items-center gap-1.5">
                      <PlatformLogo platform={platform.name} className="h-3.5 w-3.5 text-white/60" />
                      {platform.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white" href="/changelog">
                View Changelog
              </Link>
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white" href="/docs">
                Read Docs
              </Link>
            </div>
            <form id="beta-waitlist" onSubmit={handleWaitlist} className="mt-8 flex max-w-xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:flex-row">
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="work@email.com"
                className="min-h-11 flex-1 rounded-full border border-white/10 bg-[#09090B] px-5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-purple-300/40"
              />
              <button disabled={status === "sending"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-violet-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60" type="submit">
                {status === "sending" ? "Joining..." : "Join Beta Waitlist"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            {status === "joined" ? <p className="mt-3 text-sm text-emerald-300">You are on the beta waitlist. We will follow up by email.</p> : null}
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </div>

          <div className="mt-20 grid gap-5 md:grid-cols-3">
            {platforms.map((platform, index) => (
              <article key={platform.name} className={`glass-card p-6 ${index === 0 ? "ams-card-featured" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">{platform.name}</h2>
                    <p className="mt-2 text-sm text-white/45">{platform.installer}</p>
                  </div>
                  <PlatformLogo platform={platform.name} className="h-5 w-5 text-white/75" />
                </div>
                <div className="mt-10 grid gap-3 border-t border-white/10 pt-5 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/35">Access</span>
                    <span className="text-white/65">{platform.status}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/35">Installer</span>
                    <span className="text-white/65">{platform.installer}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/35">Channel</span>
                    <span className="text-purple-200">Waitlist</span>
                  </div>
                </div>
                <a className="mt-8 hidden h-11 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white/70 transition hover:border-purple-300/25 hover:bg-white/[0.07] hover:text-white lg:inline-flex" href="#beta-waitlist">
                  Join Beta Waitlist
                </a>
                <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 lg:hidden">
                  <p className="text-sm font-semibold text-white">Available on desktop</p>
                  <p className="mt-1 text-xs leading-5 text-white/45">{platform.name} access is coordinated through the beta waitlist.</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
            <section className="glass-card p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-purple-200" />
                <h2 className="text-lg font-semibold tracking-tight text-white">System requirements</h2>
              </div>
              <div className="mt-6 grid gap-3 text-sm leading-6 text-white/65 md:grid-cols-3 md:text-white/50">
                <p>Windows 10 or newer.</p>
                <p>macOS 12 or newer.</p>
                <p>Modern Linux desktop environment.</p>
              </div>
            </section>
            <section className="glass-card p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-200" />
                <h2 className="text-lg font-semibold tracking-tight text-white">Release notes</h2>
              </div>
              <p className="mt-5 text-sm leading-6 text-white/65 md:text-white/50">
                Builds publish with release notes, integrity details, and deployment context when beta access is opened.
              </p>
              <Link className="mt-6 inline-flex text-sm font-medium text-white transition hover:text-purple-200" href="/changelog">
                View release history
              </Link>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
