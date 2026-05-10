"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { slugify } from "@/domain/cms";
import { isSupabaseConfigured, supabase } from "@/lib/client/supabaseClient";

export default function NewAssessmentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function createAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured.");
      return;
    }

    setIsSaving(true);
    const { data, error: insertError } = await supabase
      .from("assessments")
      .insert({
        title: title.trim(),
        slug: `${slugify(title)}-${Date.now()}`,
        duration_minutes: duration,
        status: "DRAFT",
        is_active: false
      })
      .select("id")
      .single();
    setIsSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/admin/assessments/${data.id}/edit`);
  }

  return (
    <main className="relative min-h-screen px-5 py-6">
      <div className="ams-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-3xl">
        <Link className="text-sm text-purple-400" href="/admin/assessments">Assessments</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">New assessment</h1>
        {error ? <div className="mt-6 rounded border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}
        <form onSubmit={createAssessment} className="mt-6 glass-card p-6">
          <label className="mb-2 block text-sm font-medium text-white">Title</label>
          <input className="glass-input mb-4" required value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="mb-2 block text-sm font-medium text-white">Duration minutes</label>
          <input className="glass-input mb-5" type="number" min={1} value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
          <button disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#8B5CF6] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
            <Save className="h-4 w-4" />
            {isSaving ? "Creating..." : "Create draft"}
          </button>
        </form>
      </div>
    </main>
  );
}
