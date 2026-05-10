"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, CalendarDays, Plus, LogOut, Trophy, Users } from "lucide-react";
import { apiFetch } from "@/lib/client/apiClient";
import { supabase } from "@/lib/client/supabaseClient";

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

function statusColor(status: string) {
  if (status === "ACTIVE") return { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)", text: "#22c55e" };
  if (status === "SCHEDULED") return { bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)", text: "#a855f7" };
  if (status === "ENDED") return { bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)", text: "#94a3b8" };
  return { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", text: "#f59e0b" };
}

export default function OrgDashboardPage() {
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<DashboardResponse>("/api/org/dashboard");
      setOrg(data.org);
      setContests(data.contests);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message.includes("Organization setup")) {
        router.push("/org/setup");
        return;
      }
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/org/login");
  }

  const stats = {
    total: contests.length,
    active: contests.filter((c) => c.status === "ACTIVE").length,
    scheduled: contests.filter((c) => c.status === "SCHEDULED").length,
    invites: contests.reduce((s, c) => s + (c._invite_count ?? 0), 0),
  };

  return (
    <div className="flex min-h-screen" style={{ background: "#000000", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside
        className="flex w-56 flex-shrink-0 flex-col"
        style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: "rgba(9,9,11,0.8)" }}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
          >
            <Building2 className="h-4 w-4" style={{ color: "#a855f7" }} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{org?.name ?? "…"}</p>
            <p className="text-xs" style={{ color: "#52525B" }}>Organization</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-widest" style={{ color: "#3F3F46" }}>Menu</p>
          <SideLink href="/org/dashboard" active icon={<CalendarDays className="h-4 w-4" />} label="Dashboard" />
          <SideLink href="/org/contests/new" icon={<Plus className="h-4 w-4" />} label="New Contest" />
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition"
            style={{ color: "#71717A" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#71717A"; e.currentTarget.style.background = "transparent"; }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Dashboard</h1>
            <p className="mt-0.5 text-sm" style={{ color: "#64748b" }}>Manage contests and invitations</p>
          </div>
          <Link
            href="/org/contests/new"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
            style={{ background: "rgb(139,92,246)", boxShadow: "0 0 16px rgba(139,92,246,0.3)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgb(124,58,237)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgb(139,92,246)"; }}
          >
            <Plus className="h-4 w-4" />
            New contest
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {error && (
            <div className="mb-6 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="mb-8 grid grid-cols-4 gap-4">
            {[
              { label: "Total Contests", value: stats.total, icon: <Trophy className="h-5 w-5" /> },
              { label: "Active", value: stats.active, icon: <CalendarDays className="h-5 w-5" /> },
              { label: "Scheduled", value: stats.scheduled, icon: <CalendarDays className="h-5 w-5" /> },
              { label: "Total Invites", value: stats.invites, icon: <Users className="h-5 w-5" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: "#71717A" }}>{label}</p>
                  <span style={{ color: "#a855f7", opacity: 0.6 }}>{icon}</span>
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  {loading ? "—" : value}
                </p>
              </div>
            ))}
          </div>

          {/* Contests list */}
          <div>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-widest" style={{ color: "#52525B" }}>Contests</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-card h-24 ams-skeleton" />
                ))}
              </div>
            ) : contests.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
                style={{ border: "1px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)" }}
              >
                <Trophy className="mb-4 h-10 w-10" style={{ color: "#3F3F46" }} />
                <p className="text-base font-medium text-white">No contests yet</p>
                <p className="mt-1 text-sm" style={{ color: "#52525B" }}>Create your first contest to get started</p>
                <Link
                  href="/org/contests/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition"
                  style={{ background: "rgb(139,92,246)" }}
                >
                  <Plus className="h-4 w-4" />
                  New contest
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {contests.map((c) => {
                  const col = statusColor(c.status);
                  return (
                    <Link
                      key={c.id}
                      href={`/org/contests/${c.id}`}
                      className="glass-card flex items-center justify-between p-5 transition hover:border-purple-500/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <p className="truncate font-medium text-white">{c.title}</p>
                          <span
                            className="shrink-0 rounded px-2 py-0.5 text-xs font-medium"
                            style={{ background: col.bg, border: `1px solid ${col.border}`, color: col.text }}
                          >
                            {c.status}
                          </span>
                        </div>
                        {c.description && (
                          <p className="mt-1 truncate text-sm" style={{ color: "#64748b" }}>{c.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-xs" style={{ color: "#52525B" }}>
                          <span>{new Date(c.start_at).toLocaleDateString()} → {new Date(c.end_at).toLocaleDateString()}</span>
                          <span>{c._question_count} questions</span>
                          <span>{c._invite_count} invited</span>
                        </div>
                      </div>
                      <svg className="ml-4 h-4 w-4 shrink-0" style={{ color: "#52525B" }} fill="none" viewBox="0 0 16 16">
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

function SideLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition"
      style={{
        color: active ? "#ffffff" : "#71717A",
        background: active ? "rgba(139,92,246,0.12)" : "transparent",
        border: active ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
      }}
    >
      <span style={{ color: active ? "#a855f7" : "#52525B" }}>{icon}</span>
      {label}
    </Link>
  );
}
