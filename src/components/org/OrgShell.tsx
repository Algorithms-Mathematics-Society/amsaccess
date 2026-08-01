"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FileCode2, LayoutDashboard, BookOpen } from "lucide-react";

const NAV = [
  { href: "/org/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/org/problems", label: "Problems", icon: FileCode2 },
  { href: "/org/contests", label: "Contests", icon: CalendarDays },
  { href: "/org/docs", label: "Problemsetting Guide", icon: BookOpen },
] as const;

export function OrgShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="light flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-6">
          <p className="text-sm font-semibold tracking-tight text-slate-950">AMS Access</p>
          <p className="text-xs text-slate-400">Organization</p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            // startsWith so a detail page keeps its section highlighted —
            // except the dashboard, which every path would match.
            const active =
              href === "/org/dashboard" ? pathname === href : pathname.startsWith(href);
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

      <main className="min-w-0 flex-1">{children}</main>
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
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 bg-white px-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
