"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, BookOpenText, Clock3, Download, Mail, Menu, Monitor, PackageSearch, Tag, X } from "lucide-react";
import Link from "next/link";
import { AMSLogo } from "@/components/AMSLogo";

const navItems = [
  ["Product", "/#showcase", PackageSearch],
  ["Desktop details", "/download", Download],
  ["Pricing", "/pricing", Tag],
  ["Docs", "/docs", BookOpenText],
  ["Changelog", "/changelog", Clock3],
  ["Contact", "/contact", Mail],
] as const;

interface MobileNavProps {
  /** Use <a> tags instead of Next Link (for pages without Next router wrapping) */
  usePlainAnchor?: boolean;
}

export function MobileNav({ usePlainAnchor = false }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on route change / ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const NavLink = usePlainAnchor
    ? ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
        <a href={href} className={className} onClick={() => setOpen(false)}>
          {children}
        </a>
      )
    : ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
        <Link href={href} className={className} onClick={() => setOpen(false)}>
          {children}
        </Link>
      );

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        id="mobile-menu-toggle"
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        onClick={() => setOpen((v) => !v)}
        className="mobile-hamburger relative z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10 lg:hidden"
      >
        <span
          className={`absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"
          }`}
        >
          <X className="h-4 w-4 text-white/80" />
        </span>
        <span
          className={`absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "opacity-0 -rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
          }`}
        >
          <Menu className="h-4 w-4 text-white/70" />
        </span>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-md backdrop-saturate-50 transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Anchored dropdown */}
      <div
        id="mobile-menu-panel"
        className={`fixed left-4 right-4 top-[5rem] z-50 mx-auto max-w-md overflow-hidden rounded-[1.35rem] border border-white/[0.14] bg-[#09090B]/[0.985] shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:left-auto sm:right-6 sm:top-[5.75rem] sm:w-[24rem] lg:hidden ${
          open ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-[0.98] opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-300/70 to-transparent" />
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/20 px-4 py-3">
          <NavLink href="/" className="">
            <AMSLogo size="nav" />
          </NavLink>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/55 transition hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="grid grid-cols-2 gap-2 p-3">
          {navItems.map(([label, href, Icon], i) => (
            <NavLink
              key={label}
              href={href}
              className="mobile-nav-item group flex min-h-[4.5rem] flex-col justify-between rounded-2xl border border-white/[0.09] bg-[#17151B]/95 p-3 text-sm font-semibold text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:border-purple-300/30 hover:bg-[#1F1B28] hover:text-white"
            >
              <span className="flex items-center justify-between">
                <Icon
                  className={`h-4 w-4 text-purple-200/75 transition-all duration-300 ${
                    open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                  }`}
                  style={{ transitionDelay: open ? `${i * 35}ms` : "0ms" }}
                />
                <ArrowUpRight className="h-3.5 w-3.5 text-white/25 transition group-hover:text-white/60" />
              </span>
              <span
                className={`transition-all duration-300 ${open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
                style={{ transitionDelay: open ? `${i * 35 + 35}ms` : "0ms" }}
              >
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/[0.08] bg-[#0D0D10] p-3">
          <NavLink
            href="/pricing"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-[#17171A] shadow-[0_12px_32px_rgba(255,255,255,0.12)] transition hover:bg-purple-200"
          >
            Compare Plans
            <ArrowUpRight className="h-4 w-4" />
          </NavLink>

          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#131118] px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-400/20 bg-purple-500/10 text-purple-200">
              <Monitor className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Desktop app ready</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
