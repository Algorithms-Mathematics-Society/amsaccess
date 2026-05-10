import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Monitor } from "lucide-react";
import { AMSLogo } from "@/components/AMSLogo";

// Defer client island from the initial SSR bundle.
const MobileNav = dynamic(
  () => import("@/components/MobileNav").then(m => ({ default: m.MobileNav })),
  { ssr: false }
);

export function MarketingHeader() {
  return (
    <header className="fixed inset-x-0 top-4 z-40 px-4 sm:top-6">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-white/10 bg-[#09090B]/80 px-4 shadow-glass backdrop-blur-2xl sm:px-6">
        <Link href="/" aria-label="AMS Access home">
          <AMSLogo size="nav" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-white/56 lg:flex">
          <Link className="transition hover:text-white" href="/#showcase">Product</Link>
          <Link className="transition hover:text-white" href="/download">Download</Link>
          <Link className="transition hover:text-white" href="/pricing">Pricing</Link>
          <Link className="transition hover:text-white" href="/docs">Docs</Link>
          <Link className="transition hover:text-white" href="/changelog">Changelog</Link>
          <Link className="transition hover:text-white" href="/contact">Contact</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            className="hidden lg:inline-flex h-9 items-center rounded-full border border-white/25 bg-white px-4 text-sm font-semibold text-[#202020] shadow-[0_4px_14px_rgba(255,255,255,0.1)] transition hover:bg-[#8B5CF6] hover:text-white"
            href="/download"
          >
            Get AMS Access
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

type MarketingEndpointPageProps = {
  eyebrow: string;
  title: string;
  body: string;
  items: Array<{
    title: string;
    body: string;
  }>;
  primaryHref?: string;
  primaryLabel?: string;
};

export function MarketingEndpointPage({
  eyebrow,
  title,
  body,
  items,
  primaryHref = "/download",
  primaryLabel = "Get AMS Access"
}: MarketingEndpointPageProps) {
  const primaryIsDownload = primaryHref === "/download";

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
              {eyebrow}
            </div>
            <h1 className="max-w-3xl bg-gradient-to-b from-white to-[#D4D4D8] bg-clip-text text-4xl font-semibold leading-[1.05] tracking-tight text-transparent sm:text-5xl md:text-7xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg md:text-xl">
              {body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className={`${primaryIsDownload ? "hidden lg:inline-flex" : "inline-flex"} h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-[#8B5CF6] hover:text-white`} href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {primaryIsDownload && (
                <div className="inline-flex min-h-11 items-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-5 text-left lg:hidden">
                  <Monitor className="h-4 w-4 shrink-0 text-purple-200" />
                  <div>
                    <p className="text-sm font-semibold text-white">Available on desktop</p>
                    <p className="text-[11px] leading-4 text-white/45">Windows, macOS, and Linux</p>
                  </div>
                </div>
              )}
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white" href="/">
                Back to Home
              </Link>
            </div>
          </div>
          <div className="glass-card grid content-start gap-4 p-5">
            {items.map((item) => (
              <article key={item.title} className="rounded border border-white/10 bg-[#09090B] p-5">
                <h2 className="text-sm font-semibold tracking-tight text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/50">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
