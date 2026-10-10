import Link from "next/link";

/**
 * The public footer, in the AMS house style.
 *
 * Three things came out of the old one:
 *
 * * A twenty-rem "AMS ACCESS" watermark behind the content. It said nothing
 *   the logo above it did not.
 * * An "All systems operational" dot with a pulse animation, wired to
 *   nothing. A status indicator that cannot report a failure is worse than
 *   no indicator, because the first time it matters it will be lying.
 * * A fourth column whose three links all went to /contact, same as the
 *   column beside it. It existed to look like a footer.
 */

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Overview", href: "/product" },
      { label: "Controlled round", href: "/controlled-round" },
      { label: "Download", href: "/download" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Chess plugin", href: "/docs/chess-plugin" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    heading: "Contact",
    links: [
      { label: "Sales", href: "/contact" },
      { label: "Support", href: "/contact" },
      { label: "Security", href: "/contact" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-ink/10 bg-espresso font-body text-cream/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/AMS_ACCESS_DARK.png" alt="AMS Access" className="h-7 w-auto" />
            <p className="mt-5 max-w-xs text-sm leading-6 text-cream/50">
              Proctored contests and assessments. A product of the Algorithms &amp; Mathematics
              Society.
            </p>
            <a
              href="https://amshq.in"
              className="mt-5 inline-block text-sm text-gold-bright underline-offset-4 hover:underline"
            >
              amshq.in
            </a>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-cream/40">
                {column.heading}
              </h4>
              <ul className="mt-4 space-y-3 text-sm">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition-colors hover:text-cream">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-cream/40 sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} Algorithms &amp; Mathematics Society.</p>
          <div className="flex gap-6">
            <Link href="/contact" className="transition-colors hover:text-cream">
              Privacy
            </Link>
            <Link href="/contact" className="transition-colors hover:text-cream">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
