"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client/apiClient";

type Assessment = {
  id: string;
  title: string;
  slug?: string | null;
  status: string;
  duration_minutes: number;
  starts_at?: string | null;
  ends_at?: string | null;
  archived_at?: string | null;
};

type Assignment = { assessment_id: string };

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<Assessment[]>("/api/admin/assessments");
      setAssessments(data);
      const all = await Promise.all(data.map((a) => apiFetch<{ assignments: Assignment[] }>(`/api/admin/assessments/${a.id}`)));
      setAssignments(all.flatMap((x) => x.assignments));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assessments.filter((a) => !q || a.title.toLowerCase().includes(q) || (a.slug ?? "").toLowerCase().includes(q));
  }, [assessments, query]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl text-white">Assessments</h1>
        <Link href="/admin/assessments/new" className="rounded bg-white px-3 py-2 text-black">New</Link>
      </div>
      <input className="glass-input mb-4 w-full" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
      {error ? <p className="mb-3 text-red-400">{error}</p> : null}
      <div className="space-y-2">
        {filtered.map((a) => (
          <div key={a.id} className="glass-card flex items-center justify-between p-3">
            <div>
              <p className="text-white">{a.title}</p>
              <p className="text-xs text-white/60">{a.status} · {a.duration_minutes}m · {assignments.filter((x) => x.assessment_id === a.id).length} questions</p>
            </div>
            <Link href={`/admin/assessments/${a.id}/edit`} className="text-sm text-purple-300">Edit</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
