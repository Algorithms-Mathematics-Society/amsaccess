"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/apiClient";

type Assessment = {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  status: string;
  duration_minutes: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  allowed_browsers: string[];
  allowed_devices: string[];
};
type Assignment = { question_id: string; order_index: number };
type Question = { id: string; title: string; status: string };

export default function EditAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const detail = await apiFetch<{ assessment: Assessment; assignments: Assignment[] }>(`/api/admin/assessments/${id}`);
      setAssessment(detail.assessment);
      setAssignments(detail.assignments);
      setQuestions(await apiFetch<Question[]>("/api/admin/questions"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function saveAssessment(e: FormEvent) {
    e.preventDefault();
    if (!assessment) return;
    try {
      await apiFetch(`/api/admin/assessments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(assessment),
      });
      await apiFetch(`/api/admin/assessments/${id}/assignments`, {
        method: "PUT",
        body: JSON.stringify({ rows: assignments }),
      });
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Save failed.");
    }
  }

  if (!assessment) return <main className="px-6 py-8 text-white">Loading...</main>;
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/admin/assessments" className="text-sm text-purple-300">Back</Link>
      <h1 className="mt-2 text-2xl text-white">{assessment.title}</h1>
      {error ? <p className="mt-3 text-red-400">{error}</p> : null}
      <form onSubmit={saveAssessment} className="mt-4 space-y-3">
        <input className="glass-input w-full" value={assessment.title} onChange={(e) => setAssessment({ ...assessment, title: e.target.value })} />
        <input className="glass-input w-full" type="number" value={assessment.duration_minutes} onChange={(e) => setAssessment({ ...assessment, duration_minutes: Number(e.target.value) })} />
        <select className="glass-input w-full" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select question</option>
          {questions.filter((q) => !assignments.find((a) => a.question_id === q.id)).map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
        <button type="button" className="rounded border border-white/20 px-3 py-1 text-white" onClick={() => selected && setAssignments([...assignments, { question_id: selected, order_index: assignments.length + 1 }])}>Add Question</button>
        <div className="space-y-2">
          {assignments.map((a, i) => (
            <div key={`${a.question_id}-${i}`} className="flex items-center gap-2 text-white">
              <span className="text-sm">{questions.find((q) => q.id === a.question_id)?.title ?? a.question_id}</span>
              <input className="glass-input w-20" type="number" value={a.order_index} onChange={(e) => setAssignments(assignments.map((x, idx) => idx === i ? { ...x, order_index: Number(e.target.value) } : x))} />
            </div>
          ))}
        </div>
        <button className="rounded bg-white px-3 py-2 text-black">Save</button>
      </form>
    </main>
  );
}
