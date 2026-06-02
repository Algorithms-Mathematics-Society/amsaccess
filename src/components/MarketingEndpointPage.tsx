import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Download } from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";
import { MarketingNavLinks } from "@/components/MarketingNavLinks";
import { MarketingFooter } from "@/components/MarketingFooter";

const MobileNav = dynamic(
  () => import("@/components/MobileNav").then(m => ({ default: m.MobileNav })),
  { ssr: false }
);

export function MarketingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Access by AMS home">
          <img
            src="/AMS_ACCESS_LIGHT(1).svg"
            alt="AMS Access"
            className="h-7 w-auto"
          />
        </Link>

        <MarketingNavLinks />

        <div className="flex items-center gap-3">
          <Link
            className="hidden lg:inline-flex h-9 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-medium text-white shadow transition-transform hover:scale-105"
            href="/download"
          >
            Download <Download className="h-4 w-4" />
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
  primaryLabel = "Get Access by AMS"
}: MarketingEndpointPageProps) {
  const primaryIsDownload = primaryHref === "/download";

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-purple-200 selection:text-purple-900">
      <MarketingHeader />

      <section className="relative flex min-h-screen items-center overflow-hidden px-4 pb-20 pt-28 sm:px-5 sm:pt-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/60 via-transparent to-slate-50/40 pointer-events-none" />
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 md:gap-12 md:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="mb-6 inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-600">
              {eyebrow}
            </div>
            <h1 className="max-w-3xl text-4xl font-medium leading-[1.05] tracking-tight text-slate-900 sm:text-5xl md:text-7xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg md:text-xl">
              {body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className={`${primaryIsDownload ? "hidden lg:inline-flex" : "inline-flex"} h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:scale-105 hover:bg-slate-800`}
                href={primaryHref}
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {primaryIsDownload && (
                <div className="inline-flex min-h-11 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-5 text-left lg:hidden">
                  <div className="flex shrink-0 items-center gap-1.5 text-slate-400">
                    <PlatformLogo platform="Windows" className="h-4 w-4" />
                    <PlatformLogo platform="macOS" className="h-4 w-4" />
                    <PlatformLogo platform="Linux" className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Available on desktop</p>
                    <p className="text-[11px] leading-4 text-slate-400">Windows, macOS, and Linux</p>
                  </div>
                </div>
              )}
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
                href="/"
              >
                Back to Home
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm grid content-start gap-3 p-5">
            {items.map((item) => (
              <article key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
