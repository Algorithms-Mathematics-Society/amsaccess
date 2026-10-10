"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, Building2, Clock3, Download, Mail, Menu, Monitor, X } from "lucide-react";
import Link from "next/link";
import { DesktopDownloadNotice } from "@/components/DesktopDownloadNotice";

const navItems = [
  ["Firms portal", "/firms/login", Building2],
  ["Use cases", "/#use-cases", Monitor],
  ["Desktop details", "/download", Download],
  ["Changelog", "/changelog", Clock3],
  ["Contact", "/contact", Mail],
] as const;

interface MobileNavProps {
  usePlainAnchor?: boolean;
}

export function MobileNav({ usePlainAnchor = false }: MobileNavProps) {
  const [open, setOpen] = useState(false);

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
      {/* Hamburger button */}
      <button
        id="mobile-menu-toggle"
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        onClick={() => setOpen((v) => !v)}
        className="mobile-hamburger relative z-[60] flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-white/20 bg-white/10 text-[#fffcf5] transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white xl:!hidden"
      >
        <span
          className={`absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"
          }`}
        >
          <X className="h-4 w-4 text-[#fffcf5]" />
        </span>
        <span
          className={`absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "opacity-0 -rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
          }`}
        >
          <Menu className="h-4 w-4 text-[#fffcf5]" />
        </span>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 xl:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Anchored dropdown */}
      <div
        id="mobile-menu-panel"
        className={`fixed left-4 right-4 top-[5.25rem] z-50 mx-auto max-w-md overflow-hidden rounded-panel border border-line bg-paper shadow-xl shadow-slate-900/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:left-auto sm:right-6 sm:top-[5.25rem] sm:w-[24rem] xl:hidden ${
          open ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-[0.98] opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-300/60 to-transparent" />
        <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <p className="text-sm font-semibold text-ink">Navigation</p>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="ams-btn ams-btn-secondary ams-icon-btn-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="grid grid-cols-2 gap-2 p-3">
          {navItems.map(([label, href, Icon], i) => (
            <NavLink
              key={label}
              href={href}
              className="group flex min-h-[4.5rem] flex-col justify-between rounded-panel border border-line bg-surface p-3 text-sm font-semibold text-ink transition-all hover:border-violet/50 hover:bg-violet-soft"
            >
              <span className="flex items-center justify-between">
                <Icon
                  className={`h-4 w-4 text-purple-500 transition-all duration-300 ${
                    open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                  }`}
                  style={{ transitionDelay: open ? `${i * 35}ms` : "0ms" }}
                />
                <ArrowUpRight className="h-3.5 w-3.5 text-muted transition group-hover:text-violet" />
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

        <div className="space-y-3 border-t border-line bg-surface p-3">
          <DesktopDownloadNotice />

          <div className="flex items-center gap-3 rounded-panel border border-line bg-paper px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet/30 bg-violet-soft text-violet">
              <Monitor className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Desktop app ready</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
