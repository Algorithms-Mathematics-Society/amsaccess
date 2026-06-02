"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, BookOpenText, Clock3, Download, Mail, Menu, Monitor, Tag, X } from "lucide-react";
import Link from "next/link";

const navItems = [
  ["Use cases", "/#use-cases", Monitor],
  ["Desktop details", "/download", Download],
  ["Pricing", "/pricing", Tag],
  ["Docs", "/docs", BookOpenText],
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
        className="mobile-hamburger relative z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 transition-all hover:border-slate-300 hover:bg-slate-200 lg:hidden"
      >
        <span
          className={`absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"
          }`}
        >
          <X className="h-4 w-4 text-slate-700" />
        </span>
        <span
          className={`absolute transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "opacity-0 -rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
          }`}
        >
          <Menu className="h-4 w-4 text-slate-600" />
        </span>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Anchored dropdown */}
      <div
        id="mobile-menu-panel"
        className={`fixed left-4 right-4 top-[4.5rem] z-50 mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:left-auto sm:right-6 sm:top-[4.75rem] sm:w-[24rem] lg:hidden ${
          open ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-[0.98] opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-300/60 to-transparent" />
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <NavLink href="/" className="">
            <img src="/AMS_ACCESS_LIGHT(1).svg" alt="AMS Access" className="h-6 w-auto" />
          </NavLink>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="grid grid-cols-2 gap-2 p-3">
          {navItems.map(([label, href, Icon], i) => (
            <NavLink
              key={label}
              href={href}
              className="group flex min-h-[4.5rem] flex-col justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-semibold text-slate-700 transition-all hover:border-purple-200 hover:bg-white hover:text-slate-900"
            >
              <span className="flex items-center justify-between">
                <Icon
                  className={`h-4 w-4 text-purple-500 transition-all duration-300 ${
                    open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                  }`}
                  style={{ transitionDelay: open ? `${i * 35}ms` : "0ms" }}
                />
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-slate-500" />
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

        <div className="space-y-3 border-t border-slate-100 bg-slate-50 p-3">
          <NavLink
            href="/pricing"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-900 text-sm font-bold text-white shadow transition hover:bg-slate-700"
          >
            Compare Plans
            <ArrowUpRight className="h-4 w-4" />
          </NavLink>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-200 bg-purple-50 text-purple-600">
              <Monitor className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Desktop app ready</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
