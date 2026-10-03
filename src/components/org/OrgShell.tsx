"use client";

import { useEffect, useRef } from "react";
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

export function OrgShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mobileNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mobileNavRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  const isActive = (href: (typeof NAV)[number]["href"]) =>
    href === "/org/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="light flex min-h-screen min-w-0 flex-col bg-slate-50 text-slate-900 lg:flex-row">
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
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

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex h-12 items-center px-4">
          <p className="text-sm font-semibold tracking-tight text-slate-950">
            AMS Access <span className="font-normal text-slate-400">· Organization</span>
          </p>
        </div>
        <nav
          ref={mobileNavRef}
          aria-label="Organization"
          className="flex gap-1 overflow-x-auto px-2 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 flex-none items-center gap-2 rounded-lg px-3 text-sm transition ${
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

      <main className="min-w-0 w-full flex-1">{children}</main>
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
