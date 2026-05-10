import Link from "next/link";
import { Download, FileText, Monitor, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";

const platforms = [
  { name: "Windows", installer: "MSI installer", version: "Version pending", status: "Checksum pending" },
  { name: "macOS", installer: "Universal package", version: "Version pending", status: "Signature pending" },
  { name: "Linux", installer: "AppImage package", version: "Version pending", status: "Checksum pending" }
];

export default function DownloadPage() {
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
              Download AMS Access
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/60">
              The downloadable desktop app for controlled rounds, written response capture, session policy, and review timeline context.
            </p>
            <div className="mt-6 flex max-w-md items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 lg:hidden">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-400/20 bg-purple-500/10 text-purple-200">
                <Monitor className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Available on desktop</p>
                <p className="mt-1 text-xs leading-5 text-white/45">Windows, macOS, and Linux builds are prepared for desktop deployments.</p>
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
          </div>

          <div className="mt-20 grid gap-5 md:grid-cols-3">
            {platforms.map((platform, index) => (
              <article key={platform.name} className={`glass-card p-6 ${index === 0 ? "ams-card-featured" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">{platform.name}</h2>
                    <p className="mt-2 text-sm text-white/45">{platform.installer}</p>
                  </div>
                  <Monitor className="h-5 w-5 text-purple-200/70 lg:hidden" />
                  <Download className="hidden h-5 w-5 text-white/35 lg:block" />
                </div>
                <div className="mt-10 grid gap-3 border-t border-white/10 pt-5 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/35">Version</span>
                    <span className="text-white/65">{platform.version}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/35">Integrity</span>
                    <span className="text-white/65">{platform.status}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/35">Channel</span>
                    <span className="text-purple-200">Release queue</span>
                  </div>
                </div>
                <button
                  className="mt-8 hidden h-11 w-full cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white/35 lg:inline-flex"
                  disabled
                  type="button"
                >
                  Build pending
                </button>
                <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 lg:hidden">
                  <p className="text-sm font-semibold text-white">Available on desktop</p>
                  <p className="mt-1 text-xs leading-5 text-white/45">{platform.name} release details are shown here for desktop setup.</p>
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
              <div className="mt-6 grid gap-3 text-sm leading-6 text-white/50 md:grid-cols-3">
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
              <p className="mt-5 text-sm leading-6 text-white/50">
                Builds will publish with version notes, checksum or signing status, and deployment context.
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
