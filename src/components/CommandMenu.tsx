"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";

const commandItems = [
  { label: "Download Access", href: "/download", detail: "Desktop builds for Windows, macOS, and Linux" },
  { label: "Pricing", href: "/pricing", detail: "Pilot, event, institution, and enterprise paths" },
  { label: "Docs", href: "/docs", detail: "Deployment notes and operational references" },
  { label: "Contact", href: "/contact", detail: "Sales, support, and security routing" },
  { label: "Changelog", href: "/changelog", detail: "Release notes and maintenance history" }
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return commandItems;

    return commandItems.filter((item) => {
      return `${item.label} ${item.detail}`.toLowerCase().includes(normalizedQuery);
    });
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 text-xs font-medium text-white/45 transition hover:border-white/20 hover:bg-white/[0.055] hover:text-white/75 xl:inline-flex"
        aria-label="Open command menu"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Press</span>
        <kbd className="rounded border border-white/10 bg-black/35 px-1.5 py-0.5 font-mono text-[10px] text-white/60">⌘K</kbd>
        <span>to search</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-4 pt-28 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Command menu">
          <button className="absolute inset-0 cursor-default" type="button" aria-label="Close command menu" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-xl overflow-hidden rounded-[8px] border border-white/10 bg-[#070708]/95 shadow-[0_28px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <Search className="h-4 w-4 text-white/35" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search docs, pricing, downloads..."
                className="h-9 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
              <button type="button" onClick={() => setOpen(false)} className="rounded border border-white/10 p-1.5 text-white/45 transition hover:text-white" aria-label="Close command menu">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-1 p-2">
              {filteredItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between gap-4 rounded-[6px] px-3 py-3 text-left transition hover:bg-white/[0.055]"
                >
                  <span>
                    <span className="block text-sm font-medium text-white/85">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-white/38">{item.detail}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-white/25 transition group-hover:text-purple-200/80" />
                </Link>
              ))}
              {filteredItems.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-white/35">No matching route.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
