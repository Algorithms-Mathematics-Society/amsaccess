"use client";

import { BookOpen, ClipboardList, Eye, LogOut, RefreshCcw, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AMSLogo } from "@/components/AMSLogo";
import { calculateRiskScore, riskTone } from "@/lib/risk";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { ProctorEvent, Session } from "@/lib/types";
import { TableSkeleton } from "@/components/Skeleton";

type Row = Session & {
  events: ProctorEvent[];
};

export default function AdminPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Row[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/access-admin-only");
  }

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      setIsLoading(false);
      return;
    }

    const [{ data: sessionData, error: sessionError }, { data: eventData, error: eventError }] = await Promise.all([
      supabase.from("sessions").select("*").order("started_at", { ascending: false }),
      supabase.from("proctor_events").select("*").order("created_at", { ascending: true })
    ]);

    if (sessionError || eventError) {
      setError(sessionError?.message ?? eventError?.message ?? "Unable to load admin dashboard.");
      setIsLoading(false);
      return;
    }

    setSessions(
      (sessionData as Session[]).map((session) => ({
        ...session,
        events: (eventData as ProctorEvent[]).filter((event) => event.session_id === session.id)
      }))
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const totals = useMemo(
    () => ({
      sessions: sessions.length,
      submitted: sessions.filter((session) => session.status === "SUBMITTED").length,
      events: sessions.reduce((total, session) => total + session.events.length, 0)
    }),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sessions;

    return sessions.filter((session) => {
      const name = session.candidate_name.toLowerCase();
      const email = session.candidate_email.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [searchQuery, sessions]);

  return (
    <main className="relative min-h-screen px-5 py-6">
      <div className="ams-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <AMSLogo compact />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Admin Dashboard</h1>
              <p className="text-sm text-white/60">AMS Derive online round sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadSessions()}
              className="inline-flex h-10 items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 transition hover:border-purple-500/50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => void signOut()}
              className="inline-flex h-10 items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 text-sm text-white/60 transition hover:border-red-500/40 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          {[
            ["Sessions", totals.sessions],
            ["Submitted", totals.submitted],
            ["Events", totals.events]
          ].map(([label, value]) => (
            <div key={label} className="glass-card p-5">
              <p className="text-sm text-white/60">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <Link className="glass-card flex items-center justify-between p-5 transition hover:border-purple-500/50" href="/admin/questions">
            <div>
              <p className="text-lg font-semibold tracking-tight text-white">Question Bank</p>
              <p className="mt-1 text-sm text-white/60">Create reusable reasoning questions, rubrics, and assets.</p>
            </div>
            <BookOpen className="h-5 w-5 text-purple-400" />
          </Link>
          <Link className="glass-card flex items-center justify-between p-5 transition hover:border-purple-500/50" href="/admin/assessments">
            <div>
              <p className="text-lg font-semibold tracking-tight text-white">Assessment Manager</p>
              <p className="mt-1 text-sm text-white/60">Build rounds, assign questions, and preview readiness.</p>
            </div>
            <ClipboardList className="h-5 w-5 text-purple-400" />
          </Link>
        </section>

        {error ? (
          <div className="mb-5 rounded border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
        ) : null}

        <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by candidate name or email"
              className="h-11 w-full rounded border border-white/10 bg-white/[0.04] pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/10"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <p className="text-sm text-white/50">
            Showing {filteredSessions.length} of {sessions.length} sessions
          </p>
        </section>

        <section className="overflow-hidden glass-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-white/60">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Events</th>
                  <th className="px-4 py-3">Fullscreen exits</th>
                  <th className="px-4 py-3">Tab switches</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Review</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton cols={9} rows={5} />
                ) : filteredSessions.length ? (
                  filteredSessions.map((session) => {
                    const fullscreenExits = session.events.filter((event) => event.event_type === "FULLSCREEN_EXIT").length;
                    const tabSwitches = session.events.filter((event) => event.event_type === "TAB_HIDDEN").length;
                    const riskScore = session.risk_score || calculateRiskScore(session.events);

                    return (
                      <tr key={session.id} className="border-b border-white/10 last:border-0">
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">{session.candidate_name}</div>
                          <div className="text-xs text-white/60">{session.candidate_email}</div>
                        </td>
                        <td className="px-4 py-4 text-white/60">{new Date(session.started_at).toLocaleString()}</td>
                        <td className="px-4 py-4 text-white/60">
                          {session.submitted_at ? new Date(session.submitted_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-4 text-white">{session.events.length}</td>
                        <td className="px-4 py-4 text-white">{fullscreenExits}</td>
                        <td className="px-4 py-4 text-white">{tabSwitches}</td>
                        <td className="px-4 py-4">
                          <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/80">
                            {riskScore} · {riskTone(riskScore)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-white/60">{session.status}</td>
                        <td className="px-4 py-4">
                          <Link
                            className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 text-xs text-white/80 transition hover:border-purple-500/50"
                            href={`/admin/session/${session.id}`}
                          >
                            <Eye className="h-4 w-4" />
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-white/60" colSpan={9}>
                      {sessions.length ? "No candidates match your search." : "No sessions yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
