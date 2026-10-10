"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Firms", href: "/firms/login" },
  { label: "Download", href: "/download" },
  { label: "Contact", href: "/contact" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/firms/login" ? pathname.startsWith("/firms") : pathname === href;
}

export function MarketingNavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="ml-auto hidden h-full items-center gap-1 font-body xl:flex">
      {links.map(({ label, href }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex min-h-11 items-center rounded-control px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream ${
              active
                ? "bg-[#352748] text-[#fffcf5]"
                : "text-[#fffcf5]/85 hover:bg-[#352748] hover:text-[#fffcf5]"
            }`}
          >
            {label}
            {active && (
              <span className="sr-only">(current page)</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
