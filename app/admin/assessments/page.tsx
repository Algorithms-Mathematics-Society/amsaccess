"use client";

import { Archive, Copy, Edit, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { slugify } from "@/lib/cms";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Assessment, AssessmentQuestion } from "@/lib/types";

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assignments, setAssignments] = useState<AssessmentQuestion[]>([]);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAssessments() {
    setIsLoading(true);
    setError(null);

    const [{ data: assessmentData, error: assessmentError }, { data: assignmentData }] = await Promise.all([
      supabase.from("assessments").select("*").order("updated_at", { ascending: false }),
      supabase.from("assessment_questions").select("*")
    ]);

    if (assessmentError) {
      setError(assessmentError.message);
    } else {
      setAssessments((assessmentData ?? []) as Assessment[]);
      setAssignments((assignmentData ?? []) as AssessmentQuestion[]);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured.");
      setIsLoading(false);
      return;
    }
    void loadAssessments();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assessments.filter((assessment) => {
      const matchesQuery =
        !needle ||
        assessment.title.toLowerCase().includes(needle) ||
        (assessment.slug ?? "").toLowerCase().includes(needle);
      const matchesArchive = showArchived || !assessment.archived_at;
      return matchesQuery && matchesArchive;
    });
  }, [assessments, query, showArchived]);

  async function duplicateAssessment(assessment: Assessment) {
    const { data: copyData, error: copyError } = await supabase
      .from("assessments")
      .insert({
        title: `${assessment.title} copy`,
        slug: `${slugify(assessment.slug ?? assessment.title)}-copy-${Date.now()}`,
        description: assessment.description,
        starts_at: assessment.starts_at,
        ends_at: assessment.ends_at,
        duration_minutes: assessment.duration_minutes,
        is_active: false,
        status: "DRAFT",
        instructions: assessment.instructions,
        rules: assessment.rules,
        allowed_browsers: assessment.allowed_browsers ?? [],
        allowed_devices: assessment.allowed_devices ?? []
      })
      .select("id")
      .single();

    if (copyError) {
      setError(copyError.message);
      return;
    }

    const rows = assignments
      .filter((assignment) => assignment.assessment_id === assessment.id)
      .map((assignment) => ({
        assessment_id: copyData.id,
        question_id: assignment.question_id,
        order_index: assignment.order_index
      }));

    if (rows.length) {
      const { error: assignmentError } = await supabase.from("assessment_questions").insert(rows);
      if (assignmentError) {
        setError(assignmentError.message);
        return;
      }
    }

    await loadAssessments();
  }

  async function archiveAssessment(assessment: Assessment) {
    const { error: archiveError } = await supabase
      .from("assessments")
      .update({ archived_at: new Date().toISOString(), is_active: false, status: "CLOSED" })
      .eq("id", assessment.id);

    if (archiveError) {
      setError(archiveError.message);
      return;
    }

    await loadAssessments();
  }

  return (
    <main className="relative min-h-screen px-5 py-6">
      <div className="ams-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm text-purple-400" href="/admin">Admin</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Assessments</h1>
            <p className="text-sm text-white/60">Create rounds, assign reusable questions, and preview readiness.</p>
          </div>
          <Link className="inline-flex h-10 items-center gap-2 rounded bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:brightness-110" href="/admin/assessments/new">
            <Plus className="h-4 w-4" />
            New assessment
          </Link>
        </header>

        {error ? <div className="mb-5 rounded border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}

        <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input className="h-11 w-full rounded border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-purple-500/60" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or slug" />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/60">
            <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
            Show archived
          </label>
        </section>

        <section className="overflow-hidden glass-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-white/60">
                <tr>
                  <th className="px-4 py-3">Assessment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Window</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-4 py-6 text-white/60" colSpan={6}>Loading assessments...</td></tr>
                ) : filtered.length ? (
                  filtered.map((assessment) => {
                    const count = assignments.filter((assignment) => assignment.assessment_id === assessment.id).length;
                    return (
                      <tr key={assessment.id} className="border-b border-white/10 last:border-0">
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">{assessment.title}</div>
                          <div className="mt-1 text-xs text-white/50">{assessment.slug ?? "No slug"}{assessment.archived_at ? " · archived" : ""}</div>
                        </td>
                        <td className="px-4 py-4 text-white/70">{assessment.status}</td>
                        <td className="px-4 py-4 text-white/50">{assessment.starts_at ? new Date(assessment.starts_at).toLocaleString() : "Anytime"} → {assessment.ends_at ? new Date(assessment.ends_at).toLocaleString() : "Open"}</td>
                        <td className="px-4 py-4 text-white/70">{assessment.duration_minutes}m</td>
                        <td className="px-4 py-4 text-white">{count}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 text-xs text-white/80 transition hover:border-purple-500/50" href={`/admin/assessments/${assessment.id}/edit`}>
                              <Edit className="h-4 w-4" /> Edit
                            </Link>
                            <button className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 text-xs text-white/70 transition hover:border-purple-500/50" onClick={() => void duplicateAssessment(assessment)}>
                              <Copy className="h-4 w-4" /> Duplicate
                            </button>
                            <button className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 text-xs text-white/50 transition hover:border-red-500/40 hover:text-red-300" onClick={() => void archiveAssessment(assessment)} disabled={Boolean(assessment.archived_at)}>
                              <Archive className="h-4 w-4" /> Archive
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td className="px-4 py-6 text-white/60" colSpan={6}>No assessments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
