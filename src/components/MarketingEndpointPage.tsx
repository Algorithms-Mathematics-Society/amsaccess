import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingNavLinks } from "@/components/MarketingNavLinks";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MobileNavLazy as MobileNav } from "@/components/MobileNavLazy";
import { ThemeToggle } from "@/components/ams/ThemeToggle";

export function MarketingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-[#211a2b] text-[#fffcf5]">
      <div className="mx-auto flex h-20 w-full max-w-[96rem] items-center gap-4 px-5 sm:px-8 lg:px-8">
        <Link
          href="/"
          aria-label="Access by AMS home"
          className="inline-flex min-h-11 min-w-0 shrink-0 items-center gap-5"
        >
          <img
            src="/AMS_ACCESS.svg"
            alt="AMS Access"
            className="h-9 w-auto"
          />
          <span className="hidden max-w-40 border-l border-white/25 pl-5 text-[11px] leading-4 text-[#fffcf5]/85 sm:block xl:max-w-none">
            Algorithms &amp; Mathematics Society
          </span>
        </Link>

        <MarketingNavLinks />

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
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
  primaryLabel = "Download"
}: MarketingEndpointPageProps) {
  return (
    <main className="ac-theme min-h-screen bg-paper font-body text-ink antialiased">
      <MarketingHeader />

      <section className="px-5 pb-20 pt-28 sm:px-8 sm:pt-32 lg:pb-32 lg:pt-36">
        <div className="mx-auto grid w-full max-w-[96rem] gap-16 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            {/* A label, not a pill. The bordered capsule read as a status
                badge and there was no status to report. */}
            <span className="block font-body text-xs font-semibold uppercase tracking-[0.18em] text-violet">
              {eyebrow}
            </span>
            <h1 className="mt-3 font-display text-[clamp(2.25rem,3.6vw+0.75rem,3.75rem)] leading-[1.04] text-ink lg:text-[clamp(3.5rem,4.2vw,5rem)]">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted">{body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-5 py-2.5 font-body text-sm font-semibold text-white no-underline transition-colors hover:bg-violet-deep"
                href={primaryHref}
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid content-start gap-3">
            {items.map((item) => (
              <article
                key={item.title}
                className="rounded-panel border border-line bg-surface p-5"
              >
                <h2 className="font-display text-base text-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
