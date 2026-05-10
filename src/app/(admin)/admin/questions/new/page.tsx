"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { DEFAULT_RUBRIC, QUESTION_TYPES, slugify } from "@/domain/cms";
import { isSupabaseConfigured, supabase } from "@/lib/client/supabaseClient";

export default function NewQuestionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [type, setType] = useState("WRITTEN_REASONING");
  const [maxScore, setMaxScore] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured.");
      return;
    }

    setIsSaving(true);
    const { data, error: insertError } = await supabase
      .from("questions")
      .insert({
        assessment_id: null,
        order_index: 0,
        title: title.trim(),
        short_code: (shortCode.trim() || slugify(title)).toUpperCase(),
        type,
        difficulty: "MEDIUM",
        statement: "Write the problem statement in Markdown.",
        max_score: maxScore,
        expected_output: "Written explanation with assumptions, key ideas, and a concise final answer when appropriate.",
        rubric: DEFAULT_RUBRIC,
        status: "DRAFT"
      })
      .select("id")
      .single();

    setIsSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/admin/questions/${data.id}/edit`);
  }

  return (
    <main className="relative min-h-screen px-5 py-6">
      <div className="ams-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-3xl">
        <Link className="text-sm text-purple-400" href="/admin/questions">Question bank</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">New question</h1>
        <p className="mt-2 text-sm text-white/60">Create the draft first, then add Markdown, rubric, and assets.</p>

        {error ? <div className="mt-6 rounded border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}

        <form onSubmit={createQuestion} className="mt-6 glass-card p-6">
          <label className="mb-2 block text-sm font-medium text-white">Title</label>
          <input className="glass-input mb-4" required value={title} onChange={(event) => setTitle(event.target.value)} />

          <label className="mb-2 block text-sm font-medium text-white">Short code</label>
          <input className="glass-input mb-4" value={shortCode} onChange={(event) => setShortCode(event.target.value)} placeholder="Auto-generated from title" />

          <label className="mb-2 block text-sm font-medium text-white">Question type</label>
          <select className="glass-input mb-4" value={type} onChange={(event) => setType(event.target.value)}>
            {QUESTION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>

          <label className="mb-2 block text-sm font-medium text-white">Max score</label>
          <input className="glass-input mb-5" required min={0} type="number" value={maxScore} onChange={(event) => setMaxScore(Number(event.target.value))} />

          <button disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#8B5CF6] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
            <Save className="h-4 w-4" />
            {isSaving ? "Creating..." : "Create draft"}
          </button>
        </form>
      </div>
    </main>
  );
}
