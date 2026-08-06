"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, FileCode2, Plus, Users } from "lucide-react";
import type { Contest, Problem } from "@/lib/orgTypes";
import { formatWhen, relativeWhen, statusClass } from "@/lib/orgTypes";

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

export function DashboardView() {
  const [contests, setContests] = useState<Contest[] | null>(null);
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        json<Contest[]>(await fetch("/api/org/contests", { cache: "no-store" })),
        json<Problem[]>(await fetch("/api/org/problems", { cache: "no-store" })),
      ]);
      setContests(c);
      setProblems(p);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the dashboard.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="px-8 py-6">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  const running = contests?.filter((c) => c.status === "running") ?? [];
  const upcoming = contests?.filter((c) => c.status === "scheduled") ?? [];
  // A problem with no uploaded package cannot be put in a contest, so it is
  // worth surfacing rather than leaving to be discovered at scheduling time.
  const unpackaged = problems?.filter((p) => !p.versions.some((v) => v.has_package)) ?? [];

  return (
    <div className="px-8 py-6">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Running now" value={running.length} tone={running.length > 0 ? "live" : undefined} />
        <Stat label="Scheduled" value={upcoming.length} />
        <Stat label="Problems" value={problems?.length ?? 0} />
      </div>

      {contests !== null && contests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Nothing scheduled yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Upload a problem package, then schedule a contest around it.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/org/problems"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-slate-900"
            >
              <FileCode2 className="h-4 w-4" />
              Problems
            </Link>
            <Link
              href="/org/contests"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New contest
            </Link>
          </div>
        </div>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Contests</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {contests?.slice(0, 6).map((c) => (
              <Link
                key={c.uid}
                href={`/org/contests/${c.uid}`}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 truncate text-sm font-semibold text-slate-950">
                    {c.title}
                  </h3>
                  <span
                    className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusClass(c.status)}`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {formatWhen(c.starts_at)}{" "}
                  <span className="text-slate-400">({relativeWhen(c.starts_at)})</span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {c.problems.length} problem{c.problems.length === 1 ? "" : "s"}
                  </span>
                  {c.invite_code && (
                    <span className="font-mono tracking-widest text-slate-700">
                      {c.invite_code}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {unpackaged.length > 0 && (
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            {unpackaged.length} problem{unpackaged.length === 1 ? " has" : "s have"} no package
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {unpackaged.map((p) => p.title).join(", ")} — these cannot be added to a contest
            until a <code className="rounded bg-amber-100 px-1">.cxxpkg</code> is uploaded.
          </p>
          <Link
            href="/org/problems"
            className="mt-2 inline-block text-sm font-medium text-amber-900 underline"
          >
            Upload one
          </Link>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "live" }) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        tone === "live" ? "border-emerald-300" : "border-slate-200"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "live" ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
