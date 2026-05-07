"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowLeft, LogOut, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AMSLogo } from "@/components/AMSLogo";
import { EventTimeline } from "@/components/EventTimeline";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { safeRubric } from "@/lib/cms";
import { calculateRiskScore, riskColor, riskTone } from "@/lib/risk";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Answer, ProctorEvent, Question, Review, Session } from "@/lib/types";
import { PageSkeleton } from "@/components/Skeleton";

type AnswerWithQuestion = Answer & {
  question?: Question;
};

export default function AdminSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [events, setEvents] = useState<ProctorEvent[]>([]);
  const [review, setReview] = useState<Partial<Review>>({});
  const [rubricScores, setRubricScores] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      if (!isSupabaseConfigured) {
        setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError) {
        setError(sessionError.message);
        setIsLoading(false);
        return;
      }

      const [{ data: answerData, error: answerError }, { data: eventData, error: eventError }, { data: reviewData }] =
        await Promise.all([
          supabase.from("answers").select("*").eq("session_id", sessionId),
          supabase.from("proctor_events").select("*").eq("session_id", sessionId).order("created_at", { ascending: true }),
          supabase.from("reviews").select("*").eq("session_id", sessionId).maybeSingle()
        ]);

      if (answerError || eventError) {
        setError(answerError?.message ?? eventError?.message ?? "Unable to load session.");
        setIsLoading(false);
        return;
      }

      const answers = (answerData ?? []) as Answer[];
      const questionIds = Array.from(new Set(answers.map((answer) => answer.question_id)));
      const [{ data: questionData }, { data: assetData }] = questionIds.length
        ? await Promise.all([
            supabase.from("questions").select("*").in("id", questionIds),
            supabase.from("question_assets").select("*").in("question_id", questionIds)
          ])
        : [{ data: [] }, { data: [] }];
      const assets = (assetData ?? []) as Array<{ question_id: string } & Record<string, unknown>>;
      const questions = ((questionData ?? []) as Question[]).map((question) => ({
        ...question,
        assets: assets.filter((asset) => asset.question_id === question.id)
      }));
      setSession(sessionData);
      setAnswers(
        answers.map((answer) => ({
          ...answer,
          question: questions.find((question) => question.id === answer.question_id)
        }))
      );
      setEvents((eventData ?? []) as ProctorEvent[]);
      setReview((reviewData as Review | null) ?? {});
      setRubricScores(((reviewData as Review | null)?.rubric_scores ?? {}) as Record<string, number | null>);
      setIsLoading(false);
    }

    void loadSession();
  }, [sessionId]);

  const riskScore        = useMemo(() => session?.risk_score || calculateRiskScore(events), [events, session?.risk_score]);
  const fullscreenExits  = events.filter((e) => e.event_type === "FULLSCREEN_EXIT").length;
  const tabSwitches      = events.filter((e) => e.event_type === "TAB_HIDDEN").length;
  const windowBlurs      = events.filter((e) => e.event_type === "WINDOW_BLUR").length;
  const devtoolsSignals  = events.filter((e) => e.event_type === "DEVTOOLS_SUSPECTED" || e.event_type === "KEYBOARD_SHORTCUT_BLOCKED").length;
  const clipboardEvents  = events.filter((e) => ["COPY", "CUT", "PASTE"].includes(e.event_type)).length;
  const mouseLeaves      = events.filter((e) => e.event_type === "MOUSE_LEFT_WINDOW").length;
  const idleEvents       = events.filter((e) => ["IDLE_60S", "IDLE_120S"].includes(e.event_type)).length;
  const networkEvents    = events.filter((e) => e.event_type === "NETWORK_OFFLINE").length;
  const printAttempts    = events.filter((e) => e.event_type === "PRINT_ATTEMPT").length;

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const { error: saveError } = await supabase.from("reviews").upsert(
      {
        session_id: sessionId,
        score: review.score ?? null,
        comments: review.comments ?? null,
        decision: review.decision ?? null,
        rubric_scores: rubricScores
      },
      { onConflict: "session_id" }
    );

    setIsSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMessage("Review saved.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/access-admin-only");
  }

  function rubricKey(answer: AnswerWithQuestion, label: string) {
    return `${answer.question_id}:${label}`;
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-6 text-red-100">{error ?? "Session not found."}</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-5 py-6">
      <div className="ams-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <AMSLogo compact />
            <div>
              <Link className="mb-2 inline-flex items-center gap-2 text-sm text-purple-400" href="/admin">
                <ArrowLeft className="h-4 w-4" />
                Admin
              </Link>
              <h1 className="text-2xl font-semibold tracking-tight text-white">{session.candidate_name}</h1>
              <p className="text-sm text-white/60">{session.candidate_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/80">
              {session.status}
            </span>
            <button
              onClick={() => void signOut()}
              className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 text-sm text-white/60 transition hover:border-red-500/40 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </header>

        {error ? <div className="mb-5 rounded border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}
        {message ? <div className="mb-5 rounded border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5">
          <div className={`glass-card p-5 border ${riskColor(riskScore)}`}>
            <p className="text-sm opacity-70">Risk score</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{riskScore} · {riskTone(riskScore)}</p>
          </div>
          {[
            ["Fullscreen exits",  fullscreenExits],
            ["Tab switches",      tabSwitches],
            ["Window blurs",      windowBlurs],
            ["DevTools signals",  devtoolsSignals],
            ["Clipboard events",  clipboardEvents],
            ["Mouse leaves",      mouseLeaves],
            ["Idle events",       idleEvents],
            ["Network drops",     networkEvents],
            ["Print attempts",    printAttempts],
          ].map(([label, value]) => (
            <div key={label as string} className="glass-card p-5">
              <p className="text-sm text-white/60">{label as string}</p>
              <p className={`mt-2 text-2xl font-semibold tracking-tight ${(value as number) > 0 ? "text-white" : "text-white/30"}`}>
                {value as number}
              </p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Answers</h2>
              <div className="space-y-4">
                {answers.length ? (
                  answers.map((answer) => (
                    <article key={answer.id} className="glass-card p-5">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-purple-400">
                            Question {answer.question?.order_index ?? "—"}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">{answer.question?.title ?? "Question"}</h3>
                        </div>
                        <span className="text-xs text-white/60">Updated {new Date(answer.updated_at).toLocaleString()}</span>
                      </div>
                      <div className="mb-4">
                        <MarkdownPreview value={answer.question?.statement ?? ""} />
                      </div>
                      {answer.question?.expected_output ? (
                        <div className="mb-4 rounded border border-purple-400/20 bg-purple-500/10 p-4">
                          <p className="mb-2 text-sm font-medium text-purple-200">Expected output</p>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{answer.question.expected_output}</p>
                        </div>
                      ) : null}
                      {answer.question?.assets?.length ? (
                        <div className="mb-4 grid gap-3 sm:grid-cols-2">
                          {answer.question.assets.map((assetLike, index) => {
                            const asset = assetLike as { storage_path?: string; filename?: string; alt_text?: string; caption?: string };
                            const publicUrl = asset.storage_path ? supabase.storage.from("question-assets").getPublicUrl(asset.storage_path).data.publicUrl : "";
                            return (
                              <figure key={`${asset.storage_path ?? index}`} className="rounded border border-white/10 bg-black/20 p-3">
                                {publicUrl ? <img src={publicUrl} alt={asset.alt_text ?? asset.filename ?? ""} className="max-h-64 rounded" /> : null}
                                <figcaption className="mt-2 text-xs text-white/50">{asset.caption || asset.alt_text || asset.filename}</figcaption>
                              </figure>
                            );
                          })}
                        </div>
                      ) : null}
                      <p className="mb-2 text-sm font-medium text-white">Written reasoning</p>
                      <div className="min-h-24 whitespace-pre-wrap rounded border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-white/80">
                        {answer.answer_text || "No answer provided."}
                      </div>
                      <p className="mb-2 mt-4 text-sm font-medium text-white">Final answer</p>
                      <div className="rounded border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                        {answer.final_answer || "—"}
                      </div>
                      {answer.question?.rubric ? (
                        <div className="mt-4 rounded border border-white/10 bg-black/20 p-4">
                          <p className="mb-3 text-sm font-medium text-white">Rubric scoring</p>
                          <div className="space-y-3">
                            {safeRubric(answer.question.rubric).map((criterion) => {
                              const key = rubricKey(answer, criterion.label);
                              return (
                                <div key={key} className="grid gap-2 md:grid-cols-[1fr_90px]">
                                  <div>
                                    <p className="text-sm text-white">{criterion.label} <span className="text-white/40">/ {criterion.marks}</span></p>
                                    {criterion.description ? <p className="mt-1 text-xs text-white/45">{criterion.description}</p> : null}
                                  </div>
                                  <input
                                    className="glass-input"
                                    type="number"
                                    min={0}
                                    max={criterion.marks}
                                    step="0.5"
                                    value={rubricScores[key] ?? ""}
                                    onChange={(event) =>
                                      setRubricScores((current) => ({
                                        ...current,
                                        [key]: event.target.value ? Number(event.target.value) : null
                                      }))
                                    }
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <div className="glass-card p-5 text-sm text-white/60 backdrop-blur-xl">
                    No answers saved.
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Event timeline</h2>
              <EventTimeline events={events} />
            </section>
          </div>

          <form onSubmit={saveReview} className="h-fit glass-card p-5">
            <h2 className="text-lg font-semibold tracking-tight text-white">Manual review</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Add scoring notes after evaluating the written reasoning and integrity timeline.
            </p>

            <label className="mb-2 mt-5 block text-sm font-medium text-white">Score</label>
            <input
              className="glass-input"
              type="number"
              step="0.5"
              value={review.score ?? ""}
              onChange={(event) => setReview((current) => ({ ...current, score: event.target.value ? Number(event.target.value) : null }))}
            />

            <label className="mb-2 mt-4 block text-sm font-medium text-white">Decision</label>
            <select
              className="glass-input"
              value={review.decision ?? ""}
              onChange={(event) => setReview((current) => ({ ...current, decision: event.target.value }))}
            >
              <option value="">Unspecified</option>
              <option value="ADVANCE">Advance</option>
              <option value="HOLD">Hold</option>
              <option value="REJECT">Reject</option>
            </select>

            <label className="mb-2 mt-4 block text-sm font-medium text-white">Comments</label>
            <textarea
              className="min-h-36 w-full resize-y rounded border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-white/80 outline-none transition focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/10"
              value={review.comments ?? ""}
              onChange={(event) => setReview((current) => ({ ...current, comments: event.target.value }))}
            />

            <button
              type="submit"
              disabled={isSaving}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-[#8B5CF6] px-5 py-3 text-sm font-semibold tracking-tight text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save review"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
