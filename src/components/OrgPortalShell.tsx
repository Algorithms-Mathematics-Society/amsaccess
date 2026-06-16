"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Plus, BookOpen } from "lucide-react";
import { fetchOrgDashboard, type Org } from "@/lib/client/orgData";

type NavItem = "dashboard" | "new-contest" | "docs";

export function OrgPortalShell({
  active,
  children,
}: {
  active: NavItem;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchOrgDashboard();
      setOrg(data.org);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Organization setup")) {
        router.push("/org/setup");
      }
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  function signOut() {
    document.cookie = "ams_session=; Max-Age=0; path=/";
    router.push("/org/login");
  }

  return (
    <div
      className="light flex min-h-screen bg-slate-50 text-slate-900 selection:bg-purple-200 selection:text-purple-900"
      style={{ fontFamily: "var(--font-geist), system-ui, sans-serif" }}
    >
      {/* Sidebar */}
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white/95 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold tracking-tight text-slate-950 shadow-sm">
            {org?.name?.[0]?.toUpperCase() ?? "O"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{org?.name ?? "…"}</p>
            <p className="text-xs text-slate-400">Organization</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Menu</p>
          <SideLink href="/org/dashboard"     active={active === "dashboard"}    label="Dashboard"           icon={<CalendarDays className="h-4 w-4" />} />
          <SideLink href="/org/contests/new"  active={active === "new-contest"}  label="New Contest"         icon={<Plus className="h-4 w-4" />} />
          <SideLink href="/org/docs"          active={active === "docs"}         label="Problemsetting Guide" icon={<BookOpen className="h-4 w-4" />} />
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={signOut}
            className="flex w-full items-center rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area — pages render their header + content here */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SideLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
        active
          ? "border-purple-100 bg-purple-50 text-slate-950 shadow-sm"
          : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      {active && (
        <span
          className="absolute left-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-purple-500"
          aria-hidden="true"
        />
      )}
      <span className={active ? "text-purple-500" : "text-slate-400"}>{icon}</span>
      {label}
    </Link>
  );
}
