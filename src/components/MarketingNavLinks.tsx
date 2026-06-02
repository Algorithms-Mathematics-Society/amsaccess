"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Use Cases", href: "/#use-cases" },
  { label: "Download", href: "/download" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Changelog", href: "/changelog" },
  { label: "Contact", href: "/contact" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/#use-cases") return pathname === "/";
  if (href === "/docs") return pathname === "/docs" || pathname.startsWith("/docs/");
  return pathname === href;
}

export function MarketingNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-7 text-sm font-medium lg:flex">
      {links.map(({ label, href }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`transition-colors ${
              active
                ? "text-slate-900 font-semibold"
                : "text-slate-500 hover:text-slate-900"
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
