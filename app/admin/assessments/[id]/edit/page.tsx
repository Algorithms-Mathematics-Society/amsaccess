"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ASSESSMENT_STATUSES, formatCsv, parseCsv, slugify } from "@/lib/cms";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Assessment, Question } from "@/lib/types";

type AssignedQuestion = {
  id: string;
  assessment_id: string;
  question_id: string;
  order_index: number;
  question: Question;
};

type AssignedQuestionRow = Omit<AssignedQuestion, "question"> & {
  question: Question | Question[];
};

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function EditAssessmentPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assigned, setAssigned] = useState<AssignedQuestion[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState("DRAFT");
  const [instructions, setInstructions] = useState("");
  const [rules, setRules] = useState("");
  const [allowedBrowsers, setAllowedBrowsers] = useState("");
  const [allowedDevices, setAllowedDevices] = useState("");
  const [isActive, setIsActive] = useState(false);

  const loadAssessment = useCallback(async () => {
    const [{ data: assessmentData, error: assessmentError }, { data: assignmentData }, { data: questionData }] = await Promise.all([
      supabase.from("assessments").select("*").eq("id", assessmentId).single(),
      supabase.from("assessment_questions").select("*, question:questions(*)").eq("assessment_id", assessmentId).order("order_index"),
      supabase.from("questions").select("*").order("title")
    ]);

    if (assessmentError) {
      setError(assessmentError.message);
      setIsLoading(false);
      return;
    }

    const loaded = assessmentData as Assessment;
    setAssessment(loaded);
    setAssigned(((assignmentData ?? []) as AssignedQuestionRow[]).map((row) => ({ ...row, question: Array.isArray(row.question) ? row.question[0] : row.question })));
    setQuestions((questionData ?? []) as Question[]);
    setTitle(loaded.title);
    setSlug(loaded.slug ?? slugify(loaded.title));
    setDescription(loaded.description ?? "");
    setStartsAt(toDatetimeLocal(loaded.starts_at));
    setEndsAt(toDatetimeLocal(loaded.ends_at));
    setDuration(loaded.duration_minutes);
    setStatus(loaded.status ?? "DRAFT");
    setInstructions(loaded.instructions ?? "");
    setRules(loaded.rules ?? "");
    setAllowedBrowsers(formatCsv(loaded.allowed_browsers));
    setAllowedDevices(formatCsv(loaded.allowed_devices));
    setIsActive(loaded.is_active);
    setIsLoading(false);
  }, [assessmentId]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured.");
      setIsLoading(false);
      return;
    }
    void loadAssessment();
  }, [assessmentId, loadAssessment]);

  const availableQuestions = useMemo(() => {
    const assignedIds = new Set(assigned.map((item) => item.question_id));
    return questions.filter((question) => !assignedIds.has(question.id));
  }, [assigned, questions]);

  const warnings = useMemo(() => {
    const next: string[] = [];
    if (!assigned.length) next.push("No questions assigned.");
    assigned.forEach((item) => {
      const question = item.question;
      if (question.status !== "PUBLISHED") next.push(`${question.title} is unpublished.`);
      if (!question.max_score && question.max_score !== 0) next.push(`${question.title} is missing max score.`);
      if (!question.expected_output?.trim()) next.push(`${question.title} is missing expected output.`);
      if (!Array.isArray(question.rubric) || !question.rubric.length) next.push(`${question.title} is missing rubric.`);
      (question.assets ?? []).forEach((assetLike) => {
        const asset = assetLike as Record<string, unknown>;
        if (!asset.storage_path || !asset.alt_text) next.push(`${question.title} has incomplete asset metadata.`);
      });
    });
    return next;
  }, [assigned]);

  async function saveAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase
      .from("assessments")
      .update({
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        description,
        starts_at: fromDatetimeLocal(startsAt),
        ends_at: fromDatetimeLocal(endsAt),
        duration_minutes: duration,
        status,
        is_active: isActive,
        instructions,
        rules,
        allowed_browsers: parseCsv(allowedBrowsers),
        allowed_devices: parseCsv(allowedDevices),
        updated_at: new Date().toISOString()
      })
      .eq("id", assessmentId);

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Assessment saved.");
    await loadAssessment();
  }

  function addQuestion() {
    const question = questions.find((item) => item.id === selectedQuestionId);
    if (!question) return;
    setAssigned((current) => [
      ...current,
      {
        id: `local-${question.id}`,
        assessment_id: assessmentId,
        question_id: question.id,
        order_index: current.length ? Math.max(...current.map((item) => item.order_index)) + 1 : 1,
        question
      }
    ]);
    setSelectedQuestionId("");
  }

  async function saveAssignments() {
    setError(null);
    const rows = assigned
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((item, index) => ({
        assessment_id: assessmentId,
        question_id: item.question_id,
        order_index: index + 1
      }));

    const { error: deleteError } = await supabase.from("assessment_questions").delete().eq("assessment_id", assessmentId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (rows.length) {
      const { error: insertError } = await supabase.from("assessment_questions").insert(rows);
      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    setMessage("Question assignments saved.");
    await loadAssessment();
  }

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center text-white/60">Loading assessment...</main>;
  }

  if (!assessment) {
    return <main className="flex min-h-screen items-center justify-center text-red-100">{error ?? "Assessment not found."}</main>;
  }

  return (
    <main className="relative min-h-screen px-5 py-6">
      <div className="ams-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-7xl">
        <Link className="text-sm text-purple-400" href="/admin/assessments">Assessments</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">{assessment.title}</h1>
        <p className="mt-1 text-sm text-white/60">Edit round metadata, assign reusable questions, and preview readiness.</p>

        {error ? <div className="mt-5 rounded border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}
        {message ? <div className="mt-5 rounded border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <form onSubmit={saveAssessment} className="space-y-5">
            <section className="glass-card p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Title</label>
                  <input className="glass-input" value={title} onChange={(event) => setTitle(event.target.value)} required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Slug</label>
                  <input className="glass-input" value={slug} onChange={(event) => setSlug(event.target.value)} required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Status</label>
                  <select className="glass-input" value={status} onChange={(event) => setStatus(event.target.value)}>
                    {ASSESSMENT_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Duration minutes</label>
                  <input className="glass-input" type="number" min={1} value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Start time</label>
                  <input className="glass-input" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">End time</label>
                  <input className="glass-input" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
                </div>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
                Active on candidate landing page
              </label>
              <label className="mb-2 mt-4 block text-sm font-medium text-white">Description</label>
              <textarea className="glass-input min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} />
            </section>

            <section className="glass-card p-5">
              <label className="mb-2 block text-sm font-medium text-white">Instructions</label>
              <textarea className="glass-input min-h-28" value={instructions} onChange={(event) => setInstructions(event.target.value)} />
              <label className="mb-2 mt-4 block text-sm font-medium text-white">Rules</label>
              <textarea className="glass-input min-h-28" value={rules} onChange={(event) => setRules(event.target.value)} />
              <label className="mb-2 mt-4 block text-sm font-medium text-white">Allowed browsers</label>
              <input className="glass-input" value={allowedBrowsers} onChange={(event) => setAllowedBrowsers(event.target.value)} placeholder="Chrome, Edge" />
              <label className="mb-2 mt-4 block text-sm font-medium text-white">Allowed devices</label>
              <input className="glass-input" value={allowedDevices} onChange={(event) => setAllowedDevices(event.target.value)} placeholder="Desktop, Laptop" />
              <button disabled={isSaving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-[#8B5CF6] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save assessment"}
              </button>
            </section>
          </form>

          <aside className="space-y-5">
            <section className="glass-card p-5">
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">Assign questions</h2>
              <div className="flex gap-2">
                <select className="glass-input" value={selectedQuestionId} onChange={(event) => setSelectedQuestionId(event.target.value)}>
                  <option value="">Select question</option>
                  {availableQuestions.map((question) => (
                    <option key={question.id} value={question.id}>{question.short_code ?? "No code"} · {question.title}</option>
                  ))}
                </select>
                <button type="button" className="rounded border border-white/10 px-3 text-white/80" onClick={addQuestion}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {assigned
                  .slice()
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((item) => (
                    <div key={item.question_id} className="rounded border border-white/10 bg-black/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{item.question.title}</p>
                          <p className="mt-1 text-xs text-white/45">{item.question.short_code ?? "No code"} · {item.question.status}</p>
                        </div>
                        <button type="button" className="text-red-300" onClick={() => setAssigned((current) => current.filter((row) => row.question_id !== item.question_id))}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <label className="mt-3 block text-xs text-white/50">Order</label>
                      <input className="glass-input mt-1" type="number" value={item.order_index} onChange={(event) => setAssigned((current) => current.map((row) => row.question_id === item.question_id ? { ...row, order_index: Number(event.target.value) } : row))} />
                    </div>
                  ))}
              </div>
              <button type="button" onClick={() => void saveAssignments()} className="mt-5 inline-flex w-full items-center justify-center rounded border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-purple-500/50">
                Save assignments
              </button>
            </section>

            <section className="glass-card p-5">
              <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Preview readiness</h2>
              {warnings.length ? (
                <div className="space-y-2">
                  {warnings.map((warning) => (
                    <div key={warning} className="rounded border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{warning}</div>
                  ))}
                </div>
              ) : (
                <div className="rounded border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">No publish blockers detected.</div>
              )}
              <div className="mt-5 space-y-4">
                {assigned
                  .slice()
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((item) => (
                    <article key={item.question_id} className="rounded border border-white/10 bg-black/20 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-purple-400">Question {item.order_index}</p>
                      <h3 className="mt-1 text-sm font-medium text-white">{item.question.title}</h3>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/50">{item.question.statement}</p>
                    </article>
                  ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
