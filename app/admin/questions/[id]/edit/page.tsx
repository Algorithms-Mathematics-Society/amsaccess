"use client";

import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { DIFFICULTIES, formatCsv, parseCsv, QUESTION_TYPES, safeRubric, sanitizeStorageName } from "@/lib/cms";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Question, QuestionAsset, RubricCriterion } from "@/lib/types";

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const questionId = params.id;

  const [question, setQuestion] = useState<Question | null>(null);
  const [assets, setAssets] = useState<QuestionAsset[]>([]);
  const [isLiveLocked, setIsLiveLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [statement, setStatement] = useState("");
  const [type, setType] = useState("WRITTEN_REASONING");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [tags, setTags] = useState("");
  const [maxScore, setMaxScore] = useState(10);
  const [status, setStatus] = useState("DRAFT");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [rubric, setRubric] = useState<RubricCriterion[]>([]);
  const [changeNotes, setChangeNotes] = useState("");
  const [requiresFinalAnswer, setRequiresFinalAnswer] = useState(true);
  const [requiresExplanation, setRequiresExplanation] = useState(true);
  const [allowsDiagrams, setAllowsDiagrams] = useState(false);
  const [allowsCode, setAllowsCode] = useState(false);
  const [allowsAssumptions, setAllowsAssumptions] = useState(true);
  const [allowsMultipleMethods, setAllowsMultipleMethods] = useState(true);

  useEffect(() => {
    async function loadQuestion() {
      if (!isSupabaseConfigured) {
        setError("Supabase is not configured.");
        setIsLoading(false);
        return;
      }

      const [{ data: questionData, error: questionError }, { data: assetData }, { data: joins }] = await Promise.all([
        supabase.from("questions").select("*").eq("id", questionId).single(),
        supabase.from("question_assets").select("*").eq("question_id", questionId).order("created_at", { ascending: false }),
        supabase.from("assessment_questions").select("assessment_id").eq("question_id", questionId)
      ]);

      if (questionError) {
        setError(questionError.message);
        setIsLoading(false);
        return;
      }

      const assessmentIds = ((joins ?? []) as { assessment_id: string }[]).map((join) => join.assessment_id);
      if (assessmentIds.length) {
        const { data: liveAssessments } = await supabase
          .from("assessments")
          .select("id")
          .in("id", assessmentIds)
          .eq("status", "LIVE")
          .is("archived_at", null);
        setIsLiveLocked(Boolean(liveAssessments?.length));
      }

      const loaded = questionData as Question;
      setQuestion(loaded);
      setAssets((assetData ?? []) as QuestionAsset[]);
      setTitle(loaded.title);
      setShortCode(loaded.short_code ?? "");
      setStatement(loaded.statement);
      setType(loaded.type);
      setDifficulty(loaded.difficulty);
      setTags(formatCsv(loaded.tags));
      setMaxScore(loaded.max_score);
      setStatus(loaded.status);
      setExpectedOutput(loaded.expected_output ?? "");
      setRubric(safeRubric(loaded.rubric));
      setChangeNotes(loaded.change_notes ?? "");
      setRequiresFinalAnswer(loaded.requires_final_answer ?? true);
      setRequiresExplanation(loaded.requires_explanation ?? true);
      setAllowsDiagrams(loaded.allows_diagrams ?? false);
      setAllowsCode(loaded.allows_code ?? false);
      setAllowsAssumptions(loaded.allows_assumptions ?? true);
      setAllowsMultipleMethods(loaded.allows_multiple_methods ?? true);
      setIsLoading(false);
    }

    void loadQuestion();
  }, [questionId]);

  const totalRubricMarks = useMemo(() => rubric.reduce((total, item) => total + (Number(item.marks) || 0), 0), [rubric]);

  function updateRubric(index: number, patch: Partial<RubricCriterion>) {
    setRubric((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      title: title.trim(),
      short_code: shortCode.trim(),
      statement,
      type,
      difficulty,
      tags: parseCsv(tags),
      max_score: maxScore,
      status,
      expected_output: expectedOutput,
      rubric,
      change_notes: changeNotes,
      requires_final_answer: requiresFinalAnswer,
      requires_explanation: requiresExplanation,
      allows_diagrams: allowsDiagrams,
      allows_code: allowsCode,
      allows_assumptions: allowsAssumptions,
      allows_multiple_methods: allowsMultipleMethods,
      updated_at: new Date().toISOString()
    };

    if (isLiveLocked) {
      const nextVersion = (question.version ?? 1) + 1;
      const { data: newQuestion, error: insertError } = await supabase
        .from("questions")
        .insert({
          ...payload,
          assessment_id: null,
          order_index: 0,
          short_code: `${shortCode.trim()}-V${nextVersion}`,
          status: "DRAFT",
          version: nextVersion
        })
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        setIsSaving(false);
        return;
      }

      if (assets.length) {
        await supabase.from("question_assets").insert(
          assets.map((asset) => ({
            question_id: newQuestion.id,
            storage_path: asset.storage_path,
            filename: asset.filename,
            content_type: asset.content_type,
            size_bytes: asset.size_bytes,
            caption: asset.caption,
            alt_text: asset.alt_text
          }))
        );
      }

      router.push(`/admin/questions/${newQuestion.id}/edit`);
      return;
    }

    const { error: updateError } = await supabase
      .from("questions")
      .update(payload)
      .eq("id", questionId);

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Question saved.");
  }

  async function uploadAsset(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);

    const filename = sanitizeStorageName(file.name);
    const storagePath = `${questionId}/${Date.now()}-${filename}`;
    const { error: uploadError } = await supabase.storage.from("question-assets").upload(storagePath, file, {
      upsert: false,
      contentType: file.type
    });

    if (uploadError) {
      setError(uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("question_assets")
      .insert({
        question_id: questionId,
        storage_path: storagePath,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        alt_text: file.name,
        caption: ""
      })
      .select("*")
      .single();

    setIsUploading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const asset = data as QuestionAsset;
    const publicUrl = supabase.storage.from("question-assets").getPublicUrl(asset.storage_path).data.publicUrl;
    setAssets((current) => [asset, ...current]);
    setStatement((current) => `${current.trim()}\n\n![${asset.alt_text ?? asset.filename}](${publicUrl})\n`);
  }

  async function updateAsset(asset: QuestionAsset, patch: Partial<QuestionAsset>) {
    const next = { ...asset, ...patch };
    setAssets((current) => current.map((item) => item.id === asset.id ? next : item));
    await supabase.from("question_assets").update({
      caption: next.caption,
      alt_text: next.alt_text
    }).eq("id", asset.id);
  }

  async function deleteAsset(asset: QuestionAsset) {
    await supabase.storage.from("question-assets").remove([asset.storage_path]);
    await supabase.from("question_assets").delete().eq("id", asset.id);
    setAssets((current) => current.filter((item) => item.id !== asset.id));
  }

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center text-white/60">Loading question...</main>;
  }

  if (!question) {
    return <main className="flex min-h-screen items-center justify-center text-red-100">{error ?? "Question not found."}</main>;
  }

  return (
    <main className="relative min-h-screen px-5 py-6">
      <div className="ams-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-7xl">
        <Link className="text-sm text-purple-400" href="/admin/questions">Question bank</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{title || "Untitled question"}</h1>
            <p className="mt-1 text-sm text-white/60">
              Version {question.version ?? 1}
              {isLiveLocked ? " · Live-linked questions are locked; saving creates a new draft version." : null}
            </p>
          </div>
          <span className="rounded border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/70">
            Rubric total: {totalRubricMarks} / {maxScore}
          </span>
        </div>

        {error ? <div className="mt-5 rounded border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}
        {message ? <div className="mt-5 rounded border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

        <form onSubmit={saveQuestion} className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="space-y-5">
            <div className="glass-card p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Title</label>
                  <input className="glass-input" required value={title} onChange={(event) => setTitle(event.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Short code</label>
                  <input className="glass-input" required value={shortCode} onChange={(event) => setShortCode(event.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Type</label>
                  <select className="glass-input" value={type} onChange={(event) => setType(event.target.value)}>
                    {QUESTION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Difficulty</label>
                  <select className="glass-input" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                    {DIFFICULTIES.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Max score</label>
                  <input className="glass-input" type="number" min={0} value={maxScore} onChange={(event) => setMaxScore(Number(event.target.value))} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Status</label>
                  <select className="glass-input" value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
              </div>
              <label className="mb-2 mt-4 block text-sm font-medium text-white">Tags</label>
              <input className="glass-input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="probability, reasoning, systems" />
            </div>

            <div className="glass-card p-5">
              <label className="mb-2 block text-sm font-medium text-white">Problem statement Markdown</label>
              <textarea className="min-h-[360px] w-full resize-y rounded border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-white/80 outline-none focus:border-purple-500/60" value={statement} onChange={(event) => setStatement(event.target.value)} />
            </div>

            <div className="glass-card p-5">
              <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Preview</h2>
              <MarkdownPreview value={statement} />
            </div>
          </section>

          <aside className="space-y-5">
            <div className="glass-card p-5">
              <label className="mb-2 block text-sm font-medium text-white">Expected output</label>
              <textarea className="min-h-36 w-full resize-y rounded border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-white/80 outline-none focus:border-purple-500/60" value={expectedOutput} onChange={(event) => setExpectedOutput(event.target.value)} />
            </div>

            <div className="glass-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-white">Rubric</h2>
                <button type="button" className="inline-flex items-center gap-1 text-sm text-purple-400" onClick={() => setRubric((current) => [...current, { label: "New criterion", marks: 1, description: "" }])}>
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
              <div className="space-y-3">
                {rubric.map((criterion, index) => (
                  <div key={index} className="rounded border border-white/10 bg-black/20 p-3">
                    <input className="glass-input mb-2" value={criterion.label} onChange={(event) => updateRubric(index, { label: event.target.value })} />
                    <div className="grid grid-cols-[90px_1fr_auto] gap-2">
                      <input className="glass-input" type="number" value={criterion.marks} onChange={(event) => updateRubric(index, { marks: Number(event.target.value) })} />
                      <input className="glass-input" value={criterion.description ?? ""} onChange={(event) => updateRubric(index, { description: event.target.value })} placeholder="Description" />
                      <button type="button" className="rounded border border-red-400/20 px-3 text-red-300" onClick={() => setRubric((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">Requirement toggles</h2>
              {[
                ["Requires final answer", requiresFinalAnswer, setRequiresFinalAnswer],
                ["Requires explanation", requiresExplanation, setRequiresExplanation],
                ["Allows diagrams", allowsDiagrams, setAllowsDiagrams],
                ["Allows code", allowsCode, setAllowsCode],
                ["Allows assumptions section", allowsAssumptions, setAllowsAssumptions],
                ["Allows multiple methods", allowsMultipleMethods, setAllowsMultipleMethods]
              ].map(([label, value, setter]) => (
                <label key={label as string} className="mb-3 flex items-center justify-between gap-3 text-sm text-white/70">
                  {label as string}
                  <input type="checkbox" checked={value as boolean} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} />
                </label>
              ))}
            </div>

            <div className="glass-card p-5">
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">Assets</h2>
              <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-white/20 bg-white/[0.03] px-4 py-4 text-sm text-white/70 transition hover:border-purple-500/60">
                <ImagePlus className="h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload image"}
                <input type="file" accept="image/*" className="hidden" onChange={uploadAsset} disabled={isUploading || isLiveLocked} />
              </label>
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset.id} className="rounded border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{asset.filename}</p>
                        <p className="mt-1 break-all text-xs text-white/40">{asset.storage_path}</p>
                      </div>
                      <button type="button" className="text-red-300" onClick={() => void deleteAsset(asset)} disabled={isLiveLocked}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input className="glass-input mt-3" value={asset.alt_text ?? ""} onChange={(event) => void updateAsset(asset, { alt_text: event.target.value })} placeholder="Alt text" disabled={isLiveLocked} />
                    <input className="glass-input mt-2" value={asset.caption ?? ""} onChange={(event) => void updateAsset(asset, { caption: event.target.value })} placeholder="Caption" disabled={isLiveLocked} />
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <label className="mb-2 block text-sm font-medium text-white">Change notes</label>
              <textarea className="glass-input min-h-24" value={changeNotes} onChange={(event) => setChangeNotes(event.target.value)} />
              <button disabled={isSaving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-[#8B5CF6] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : isLiveLocked ? "Save as new version" : "Save question"}
              </button>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
