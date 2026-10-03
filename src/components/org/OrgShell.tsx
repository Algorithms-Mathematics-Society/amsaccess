"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Cpu, FileCode2, LayoutDashboard, Mail, Users } from "lucide-react";

const NAV = [
  { href: "/org/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/org/problems", label: "Problems", icon: FileCode2 },
  { href: "/org/contests", label: "Contests", icon: CalendarDays },
  { href: "/org/participants", label: "Participants", icon: Users },
  { href: "/org/mails", label: "Mails", icon: Mail },
  { href: "/org/fleet", label: "Judging", icon: Cpu },
] as const;

/** Purple keyboard focus ring, the same token as the Astryx content (#7c3aed). */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600";

export function OrgShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  // Center the active link by scrolling only the nav itself. scrollIntoView
  // would also move the browser's sequential focus starting point, so the
  // first Tab would skip the links before the active one.
  useEffect(() => {
    const nav = mobileNavRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
  }, [pathname]);

  // Fade the edge the nav can still scroll toward, so hidden sections show.
  useEffect(() => {
    const nav = mobileNavRef.current;
    if (!nav) return;
    const update = () => {
      const max = nav.scrollWidth - nav.clientWidth;
      setEdges({ start: nav.scrollLeft > 1, end: nav.scrollLeft < max - 1 });
    };
    update();
    nav.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(nav);
    return () => {
      nav.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  // Below lg the header is sticky: keep focused and scrolled-to elements, and
  // their focus ring (2px plus 2px offset), out from under it by padding the
  // scroll root with its measured height plus a ring allowance. Nothing when
  // the header is hidden at lg and up.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const update = () => {
      const h = header.offsetHeight;
      root.style.scrollPaddingTop = h > 0 ? `calc(${h}px + 0.5rem)` : "0px";
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    return () => {
      ro.disconnect();
      root.style.scrollPaddingTop = "";
    };
  }, []);

  const fade = "1.5rem";
  const navMask =
    edges.start || edges.end
      ? `linear-gradient(to right, ${edges.start ? `transparent, black ${fade}` : "black"}, ${
          edges.end ? `black calc(100% - ${fade}), transparent` : "black"
        })`
      : undefined;

  const isActive = (href: (typeof NAV)[number]["href"]) =>
    href === "/org/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="light flex min-h-screen min-w-0 flex-col bg-slate-50 text-slate-900 lg:flex-row">
      <a
        href="#org-main"
        className={`sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow ${FOCUS}`}
      >
        Skip to content
      </a>
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="px-5 py-6">
          <p className="text-sm font-semibold tracking-tight text-slate-950">AMS Access</p>
          <p className="text-xs text-slate-400">Organization</p>
        </div>

        <nav aria-label="Organization" className="flex-1 space-y-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            // startsWith so a detail page keeps its section highlighted —
            // except the dashboard, which every path would match.
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${FOCUS} ${
                  active
                    ? "bg-slate-900 font-medium text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-400">
          Judged by cxxprobe
        </div>
      </aside>

      <header ref={headerRef} className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex h-12 items-center px-4">
          <p className="text-sm font-semibold tracking-tight text-slate-950">
            AMS Access <span className="font-normal text-slate-500">· Organization</span>
          </p>
        </div>
        <nav
          ref={mobileNavRef}
          aria-label="Organization"
          // pt-1 leaves room for the focus ring, which the scroller would clip.
          className="flex gap-1 overflow-x-auto px-2 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={navMask ? { maskImage: navMask, WebkitMaskImage: navMask } : undefined}
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onFocus={(event) =>
                  event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })
                }
                className={`scroll-mx-2 flex min-h-10 flex-none items-center gap-2 rounded-lg px-3 text-sm transition ${FOCUS} ${
                  active
                    ? "bg-slate-900 font-medium text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="org-main" tabIndex={-1} className="min-w-0 w-full flex-1 outline-none">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 bg-white px-4 py-5 sm:px-6 md:px-8 md:py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
