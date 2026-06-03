"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/client/apiClient";

type Org = { id: string; name: string; slug: string };
type Contest = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  status: string;
  _invite_count?: number;
  _question_count?: number;
};

type DashboardResponse = {
  org: Org;
  contests: Contest[];
};

let dashboardRequest: Promise<DashboardResponse> | null = null;

function fetchDashboard() {
  dashboardRequest ??= apiFetch<DashboardResponse>("/api/org/dashboard").finally(() => {
    dashboardRequest = null;
  });
  return dashboardRequest;
}

function statusDotColor(status: string) {
  if (status === "ACTIVE") return "bg-emerald-500";
  if (status === "SCHEDULED") return "bg-purple-500";
  if (status === "ENDED") return "bg-slate-300";
  return "bg-amber-500";
}

export default function OrgDashboardPage() {
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cancelled?: () => boolean) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchDashboard();
      if (cancelled?.()) return;
      setOrg(data.org);
      setContests(data.contests);
    } catch (loadError) {
      if (cancelled?.()) return;
      if (loadError instanceof Error && loadError.message.includes("Organization setup")) {
        router.push("/org/setup");
        return;
      }
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
    } finally {
      if (cancelled?.()) return;
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => { cancelled = true; };
  }, [load]);

  async function signOut() {
    document.cookie = "ams_session=; Max-Age=0; path=/";
    router.push("/org/login");
  }

  const stats = {
    total: contests.length,
    active: contests.filter((c) => c.status === "ACTIVE").length,
    scheduled: contests.filter((c) => c.status === "SCHEDULED").length,
    invites: contests.reduce((s, c) => s + (c._invite_count ?? 0), 0),
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 selection:bg-purple-200 selection:text-purple-900" style={{ fontFamily: "var(--font-geist), system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white/95 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold tracking-tight text-slate-950 shadow-sm">
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{org?.name ?? "..."}</p>
            <p className="text-xs text-slate-400">Organization</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Menu</p>
          <SideLink href="/org/dashboard" active label="Dashboard" />
          <SideLink href="/org/contests/new" label="New Contest" />
          <SideLink href="/org/docs" label="Problemsetting Guide" />
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-8 py-6 backdrop-blur-xl">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Manage contests and invitations</p>
          </div>
          <Link
            href="/org/contests/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:scale-[1.01] hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New contest
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Contests", value: stats.total },
              { label: "Active", value: stats.active },
              { label: "Scheduled", value: stats.scheduled },
              { label: "Total Invites", value: stats.invites },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <span className="h-1.5 w-6 rounded-full bg-slate-200" aria-hidden="true" />
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                  {loading ? "-" : value}
                </p>
              </div>
            ))}
          </div>

          {/* Contests list */}
          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Contests</h2>
              {!loading && contests.length > 0 && (
                <p className="text-sm text-slate-400">{contests.length} total</p>
              )}
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-full rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100" />
                  </div>
                ))}
              </div>
            ) : contests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
                <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm" aria-hidden="true">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                </span>
                <p className="text-lg font-semibold text-slate-950">No contests yet</p>
                <p className="mt-2 text-sm text-slate-500">Create your first contest to get started.</p>
                <Link
                  href="/org/contests/new"
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:scale-[1.01] hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  New contest
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {contests.map((c) => {
                  const dotColor = statusDotColor(c.status);
                  return (
                    <Link
                      key={c.id}
                      href={`/org/contests/${c.id}`}
                      className="group flex items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-200 hover:shadow-md"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="min-w-0 truncate font-semibold text-slate-950">{c.title}</p>
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
                            {c.status}
                          </span>
                        </div>
                        {c.description && (
                          <p className="mt-2 truncate text-sm text-slate-500">{c.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-400">
                          <span>{new Date(c.start_at).toLocaleDateString()} - {new Date(c.end_at).toLocaleDateString()}</span>
                          <span>{c._question_count} questions</span>
                          <span>{c._invite_count} invited</span>
                        </div>
                      </div>
                      <svg className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-purple-500" fill="none" viewBox="0 0 16 16">
                        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SideLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`relative flex items-center rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "border-purple-100 bg-purple-50 text-slate-950 shadow-sm"
          : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      {active && <span className="absolute left-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-purple-500" aria-hidden="true" />}
      {label}
    </Link>
  );
}
