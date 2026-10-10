import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { MarketingNavLinks } from "@/components/MarketingNavLinks";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MobileNavLazy as MobileNav } from "@/components/MobileNavLazy";

export function MarketingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink/10 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
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
            className="!hidden min-h-9 items-center gap-2 rounded-control bg-burgundy px-4 py-2 font-body text-sm font-semibold text-cream-light no-underline transition-colors hover:bg-burgundy-deep lg:!inline-flex"
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
  primaryLabel = "Download"
}: MarketingEndpointPageProps) {
  return (
    <main className="min-h-screen bg-cream font-body text-ink antialiased">
      <MarketingHeader />

      <section className="px-6 pb-20 pt-28 sm:pt-36 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            {/* A label, not a pill. The bordered capsule read as a status
                badge and there was no status to report. */}
            <span className="block font-body text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
              {eyebrow}
            </span>
            <h1 className="mt-3 font-display text-[clamp(2.25rem,3.6vw+0.75rem,3.75rem)] leading-[1.04] text-ink">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink/65">{body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-control bg-burgundy px-5 py-2.5 font-body text-sm font-semibold text-cream-light no-underline transition-colors hover:bg-burgundy-deep"
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
                className="rounded-panel border border-ink/10 bg-cream-light p-5"
              >
                <h2 className="font-display text-base text-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
