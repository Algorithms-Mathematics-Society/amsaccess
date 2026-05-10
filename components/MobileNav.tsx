"use client";

import { useState, useEffect } from "react";
import { Monitor, X, Menu } from "lucide-react";
import Link from "next/link";
import { AMSLogo } from "@/components/AMSLogo";

const navItems = [
  ["Product", "/#showcase"],
  ["Desktop details", "/download"],
  ["Pricing", "/pricing"],
  ["Docs", "/docs"],
  ["Changelog", "/changelog"],
  ["Contact", "/contact"],
];

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
        onClick={() => setOpen((v) => !v)}
        className="mobile-hamburger lg:hidden relative z-50 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10"
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
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-in drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-40 flex w-[min(85vw,340px)] flex-col bg-[#0a0a0c]/95 backdrop-blur-2xl border-l border-white/[0.07] shadow-[−24px_0_80px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        {/* Drawer header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-white/[0.06]">
          <NavLink href="/" className="">
            <AMSLogo size="nav" />
          </NavLink>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
          {navItems.map(([label, href], i) => (
            <NavLink
              key={label}
              href={href}
              className="mobile-nav-item group flex items-center justify-between rounded-xl px-4 py-3.5 text-[0.95rem] font-medium text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
            >
              <span
                style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
                className={`transition-all duration-300 ${open ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}`}
              >
                {label}
              </span>
              <span className="h-px w-4 bg-white/10 transition-all group-hover:w-6 group-hover:bg-purple-400/50" />
            </NavLink>
          ))}
        </nav>

        {/* Desktop availability at bottom */}
        <div className="border-t border-white/[0.06] p-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-400/20 bg-purple-500/10 text-purple-200">
                <Monitor className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Available on desktop</p>
                <p className="mt-1 text-xs leading-5 text-white/40">Windows, macOS, and Linux</p>
              </div>
            </div>
            <NavLink
              href="/download"
              className="mt-4 flex h-10 w-full items-center justify-center rounded-full border border-white/10 text-xs font-medium text-white/65 transition hover:border-white/30 hover:text-white"
            >
              View desktop details
            </NavLink>
          </div>
        </div>
      </div>
    </>
  );
}
