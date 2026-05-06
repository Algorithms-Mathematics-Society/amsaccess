"use client";

import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, DoorOpen, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AMSLogo } from "@/components/AMSLogo";
import { QuestionCard } from "@/components/QuestionCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Timer } from "@/components/Timer";
import { useFullscreenGuard } from "@/hooks/useFullscreenGuard";
import { useProctoring } from "@/hooks/useProctoring";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Answer, Assessment, Question, Session } from "@/lib/types";

type AnswerDraft = {
  answerText: string;
  finalAnswer: string;
};

type AssignedQuestionRow = {
  order_index: number;
  question?: Question | Question[] | null;
  questions?: Question | Question[] | null;
};

// localStorage key scoped per session so multiple sessions don't collide
function localKey(sessionId: string) {
  return `ams-drafts-${sessionId}`;
}

function persistLocal(sessionId: string, drafts: Record<string, AnswerDraft>) {
  try {
    localStorage.setItem(localKey(sessionId), JSON.stringify(drafts));
  } catch {
    // Storage quota exceeded or private browsing — safe to ignore
  }
}

function readLocal(sessionId: string): Record<string, AnswerDraft> | null {
  try {
    const raw = localStorage.getItem(localKey(sessionId));
    return raw ? (JSON.parse(raw) as Record<string, AnswerDraft>) : null;
  } catch {
    return null;
  }
}

function clearLocal(sessionId: string) {
  try { localStorage.removeItem(localKey(sessionId)); } catch { /* ignore */ }
}

export default function AssessmentPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const { isFullscreen, fullscreenError, enterFullscreen } = useFullscreenGuard();
  const { logEvent, reportDrafts } = useProctoring({ sessionId, enabled: true });

  const [session, setSession] = useState<Session | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AnswerDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSubmittedRef = useRef(false);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [isWindowFocused, setIsWindowFocused]         = useState(true);
  const [windowBlurCount, setWindowBlurCount]         = useState(0);
  const [blurDurationSec, setBlurDurationSec]         = useState(0);
  const blurStartRef = useRef<number | null>(null);
  const blurTickRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track each fullscreen exit so we can show the re-entry overlay with exit count
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenExitCount((n) => n + 1);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Detect Alt+Tab / switching to another app via window focus/blur.
  // We cannot block it at OS level, but we can cover the question content
  // and log exactly how long they were away.
  useEffect(() => {
    const onBlur = () => {
      setIsWindowFocused(false);
      setWindowBlurCount((n) => n + 1);
      setBlurDurationSec(0);
      blurStartRef.current = Date.now();
      blurTickRef.current = setInterval(() => {
        setBlurDurationSec(Math.floor((Date.now() - (blurStartRef.current ?? Date.now())) / 1000));
      }, 1000);
    };
    const onFocus = () => {
      setIsWindowFocused(true);
      if (blurTickRef.current) clearInterval(blurTickRef.current);
    };
    window.addEventListener("blur",  onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur",  onBlur);
      window.removeEventListener("focus", onFocus);
      if (blurTickRef.current) clearInterval(blurTickRef.current);
    };
  }, []);

  useEffect(() => {
    async function loadAssessment() {
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

      const [{ data: assessmentData, error: assessmentError }, { data: assignedQuestionData, error: assignedQuestionError }, { data: answerData, error: answerError }] =
        await Promise.all([
          supabase.from("assessments").select("*").eq("id", sessionData.assessment_id).single(),
          supabase
            .from("assessment_questions")
            .select("order_index, question:questions(*)")
            .eq("assessment_id", sessionData.assessment_id)
            .order("order_index", { ascending: true }),
          supabase.from("answers").select("*").eq("session_id", sessionId)
        ]);

      if (assessmentError || answerError) {
        setError(assessmentError?.message ?? answerError?.message ?? "Unable to load assessment.");
        setIsLoading(false);
        return;
      }

      let questionData: Question[] = [];

      if (!assignedQuestionError && assignedQuestionData?.length) {
        questionData = (assignedQuestionData as AssignedQuestionRow[])
          .map((row) => {
            const nested = row.question ?? row.questions;
            const question = Array.isArray(nested) ? nested[0] : nested;
            if (!question || question.status === "DRAFT") return null;
            return { ...question, order_index: row.order_index };
          })
          .filter((question): question is Question => Boolean(question));
      }

      if (!questionData.length) {
        const { data: legacyQuestionData, error: legacyQuestionError } = await supabase
          .from("questions")
          .select("*")
          .eq("assessment_id", sessionData.assessment_id)
          .order("order_index", { ascending: true });

        if (legacyQuestionError) {
          setError(assignedQuestionError?.message ?? legacyQuestionError.message ?? "Unable to load assessment questions.");
          setIsLoading(false);
          return;
        }

        questionData = ((legacyQuestionData ?? []) as Question[]).filter((question) => question.status !== "DRAFT");
      }

      const nextDrafts: Record<string, AnswerDraft> = {};
      // Seed from Supabase first
      questionData.forEach((question: Question) => {
        const saved = (answerData as Answer[]).find((answer) => answer.question_id === question.id);
        nextDrafts[question.id] = {
          answerText: saved?.answer_text ?? "",
          finalAnswer: saved?.final_answer ?? ""
        };
      });

      // Merge localStorage on top — local copy may be more recent than last Supabase save
      // (e.g. network dropped between auto-saves). Only fill in blanks where Supabase had nothing.
      const local = readLocal(sessionId);
      if (local) {
        questionData.forEach((question: Question) => {
          const fromLocal = local[question.id];
          if (!fromLocal) return;
          const fromDb = nextDrafts[question.id];
          // Prefer the longer / more complete version
          if ((fromLocal.answerText?.length ?? 0) > (fromDb?.answerText?.length ?? 0)) {
            nextDrafts[question.id].answerText = fromLocal.answerText;
          }
          if ((fromLocal.finalAnswer?.length ?? 0) > (fromDb?.finalAnswer?.length ?? 0)) {
            nextDrafts[question.id].finalAnswer = fromLocal.finalAnswer;
          }
        });
      }

      setSession(sessionData);
      setAssessment(assessmentData);
      setQuestions(questionData);
      setDrafts(nextDrafts);
      setIsLoading(false);
    }

    void loadAssessment();
  }, [sessionId]);

  useEffect(() => {
    setCurrentQuestionIndex((current) => Math.min(current, Math.max(questions.length - 1, 0)));
  }, [questions.length]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (session?.status === "SUBMITTED") return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [session?.status]);

  const saveAnswers = useCallback(async () => {
    if (!session || session.status === "SUBMITTED" || !questions.length) return;
    setIsSaving(true);
    setError(null);

    // Always persist to localStorage first — this is instant and survives network failure
    persistLocal(sessionId, drafts);

    const rows = questions.map((question) => ({
      session_id: session.id,
      question_id: question.id,
      answer_text: drafts[question.id]?.answerText ?? "",
      final_answer: drafts[question.id]?.finalAnswer ?? "",
      updated_at: new Date().toISOString()
    }));

    const { error: saveError } = await supabase
      .from("answers")
      .upsert(rows, { onConflict: "session_id,question_id" });

    setIsSaving(false);

    if (saveError) {
      // Network save failed — localStorage copy is safe. Show a soft warning, not a hard error.
      setError("Auto-save failed (network issue). Your answers are preserved locally and will sync when reconnected.");
      return;
    }

    setLastSavedAt(new Date());
  }, [drafts, questions, session, sessionId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void saveAnswers();
    }, 10000);

    return () => window.clearInterval(id);
  }, [saveAnswers]);

  const submitAssessment = useCallback(async () => {
    if (!session || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setIsSubmitting(true);
    setError(null);

    await logEvent("SUBMISSION_STARTED");
    await saveAnswers();

    const { error: submitError } = await supabase
      .from("sessions")
      .update({
        submitted_at: new Date().toISOString(),
        status: "SUBMITTED"
      })
      .eq("id", session.id);

    if (submitError) {
      hasSubmittedRef.current = false;
      setIsSubmitting(false);
      setError(submitError.message);
      return;
    }

    await logEvent("SUBMISSION_COMPLETED");
    // Clear local backup — answers are safely persisted in Supabase
    clearLocal(sessionId);
    setSession({ ...session, status: "SUBMITTED", submitted_at: new Date().toISOString() });
    setIsSubmitting(false);
  }, [logEvent, saveAnswers, session, sessionId]);

  const canWork = useMemo(
    () => Boolean(isFullscreen && session?.status !== "SUBMITTED"),
    [isFullscreen, session?.status]
  );

  // Persist drafts to localStorage on every keystroke — zero latency backup
  // Also report to proctoring hook for answer spike detection
  useEffect(() => {
    if (sessionId && Object.keys(drafts).length > 0) {
      persistLocal(sessionId, drafts);
      reportDrafts(drafts);
    }
  }, [drafts, sessionId, reportDrafts]);

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = useMemo(
    () =>
      questions.filter((question) => {
        const draft = drafts[question.id];
        return Boolean(draft?.answerText.trim() || draft?.finalAnswer.trim());
      }).length,
    [drafts, questions]
  );
  const unansweredCount = Math.max(questions.length - answeredCount, 0);

  function goToQuestion(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), Math.max(questions.length - 1, 0));
    setCurrentQuestionIndex(nextIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function requestSubmitConfirmation() {
    void saveAnswers();
    setIsConfirmingSubmit(true);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 text-ams-muted">
        Loading assessment...
      </main>
    );
  }

  if (error && !session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-6 text-red-100">{error}</div>
      </main>
    );
  }

  if (!session || !assessment) return null;

  return (
    <main className="relative min-h-screen bg-[#000000] px-5 py-6">
      <div className="ams-noise pointer-events-none absolute inset-0 opacity-[0.25] mix-blend-overlay" />
      <div className="ams-grid pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay" />

      {!isFullscreen && session.status !== "SUBMITTED" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.92)" }}>
          <div className="w-full max-w-lg rounded-2xl border p-8 text-center shadow-2xl backdrop-blur-xl"
            style={{
              borderColor: fullscreenExitCount > 0 ? "rgba(251,146,60,0.3)" : "rgba(139,92,246,0.3)",
              background: fullscreenExitCount > 0 ? "rgba(12,8,4,0.95)" : "rgba(9,9,11,0.95)",
            }}
          >
            {/* Icon */}
            <div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                border: fullscreenExitCount > 0 ? "1px solid rgba(251,146,60,0.4)" : "1px solid rgba(139,92,246,0.4)",
                background: fullscreenExitCount > 0 ? "rgba(251,146,60,0.1)" : "rgba(139,92,246,0.1)",
                boxShadow: fullscreenExitCount > 0 ? "0 0 18px rgba(251,146,60,0.3)" : "0 0 18px rgba(139,92,246,0.3)",
              }}
            >
              {fullscreenExitCount > 0
                ? <AlertTriangle className="h-7 w-7" style={{ color: "rgb(251,146,60)" }} />
                : <DoorOpen className="h-7 w-7" style={{ color: "rgb(139,92,246)" }} />}
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {fullscreenExitCount > 0 ? "Fullscreen exited" : "Enter fullscreen to begin"}
            </h1>

            {/* Body copy */}
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
              {fullscreenExitCount > 0 ? (
                <>
                  This exit has been logged.{" "}
                  <span style={{ color: "rgb(251,146,60)" }} className="font-semibold">
                    {fullscreenExitCount} fullscreen exit{fullscreenExitCount > 1 ? "s" : ""} recorded
                  </span>{" "}
                  so far. Return to fullscreen to continue working — your answers are safe.
                </>
              ) : (
                "The assessment runs in fullscreen. Exits are logged as review signals. Your answers autosave."
              )}
            </p>

            {fullscreenError ? (
              <p className="mt-3 text-sm text-red-400">{fullscreenError}</p>
            ) : null}

            {/* CTA button */}
            <button
              onClick={enterFullscreen}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded px-5 py-3.5 text-sm font-semibold tracking-tight text-white transition"
              style={{
                background: fullscreenExitCount > 0 ? "rgb(234,88,12)" : "rgb(139,92,246)",
                boxShadow: fullscreenExitCount > 0 ? "0 0 18px rgba(234,88,12,0.4)" : "0 0 18px rgba(139,92,246,0.4)",
              }}
            >
              {fullscreenExitCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <DoorOpen className="h-4 w-4" />}
              {fullscreenExitCount > 0 ? "Return to fullscreen" : "Enter fullscreen"}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Alt+Tab / window-blur overlay ──────────────────────────────────
          Shows the instant the window loses focus (Alt+Tab, clicking another
          app, etc.). Hides the question content and logs how long they were away.
          Auto-dismisses the moment the window regains focus.
      ───────────────────────────────────────────────────────────────────── */}
      {!isWindowFocused && isFullscreen && session.status !== "SUBMITTED" ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center px-5"
          style={{ background: "rgba(0,0,0,0.96)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-8 text-center shadow-2xl"
            style={{
              borderColor: "rgba(251,146,60,0.35)",
              background: "rgba(12,6,2,0.97)",
            }}
          >
            {/* Pulsing amber ring */}
            <div
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                border: "1px solid rgba(251,146,60,0.5)",
                background: "rgba(251,146,60,0.08)",
                boxShadow: "0 0 24px rgba(251,146,60,0.35), 0 0 60px rgba(251,146,60,0.1)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            >
              <AlertTriangle className="h-8 w-8" style={{ color: "rgb(251,146,60)" }} />
            </div>

            <h2 className="text-xl font-semibold tracking-tight text-white">
              You left the assessment
            </h2>

            <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: "rgb(251,146,60)" }}>
              {blurDurationSec}s
            </p>

            <p className="mt-3 text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
              This absence is being timed and logged.{" "}
              {windowBlurCount > 1 && (
                <span style={{ color: "rgb(251,146,60)" }} className="font-semibold">
                  {windowBlurCount} focus loss{windowBlurCount > 1 ? "es" : ""} recorded.
                </span>
              )}
            </p>

            <p className="mt-4 text-xs uppercase tracking-widest" style={{ color: "rgba(251,146,60,0.5)" }}>
              Return to this window to continue
            </p>
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto max-w-6xl">
        <header className="sticky top-0 z-20 -mx-5 mb-6 border-b border-white/10 bg-[#000000]/80 px-5 py-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <AMSLogo compact />
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">{assessment.title}</p>
              <p className="text-xs text-[#A1A1AA]">{session.candidate_name} · {session.candidate_email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Timer
                startedAt={session.started_at}
                durationMinutes={assessment.duration_minutes}
                onExpire={() => void submitAssessment()}
              />
              <ThemeToggle />
              <button
                onClick={() => void saveAnswers()}
                disabled={!canWork || isSaving}
                className="inline-flex items-center gap-1.5 text-sm text-white/30 transition hover:text-white/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                <span className="text-xs tracking-wide">{isSaving ? "Saving…" : "Save"}</span>
              </button>
            </div>
          </div>
        </header>

        {session.status === "SUBMITTED" ? (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-6 text-emerald-50">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" />
              <h1 className="text-xl font-semibold tracking-tight">Submission completed</h1>
            </div>
            <p className="mt-2 text-sm text-emerald-100/80">
              Your answers have been submitted. You may close this tab.
            </p>
            <Link className="mt-5 inline-block text-sm text-purple-400" href="/">
              Return to start
            </Link>
          </div>
        ) : (
          <>
            {error ? (
              <div className="mb-5 flex items-center gap-3 rounded border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            ) : null}

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[#A1A1AA]">
              <span className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs">{lastSavedAt ? `Last saved ${lastSavedAt.toLocaleTimeString()}` : "Autosaves every 10 seconds"}</span>
              <span className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs italic tracking-wide">Risk score is manually reviewed by administration; no automatic disqualification occurs.</span>
            </div>

            <div className="sticky top-[73px] z-10 mb-5 rounded-xl border border-white/10 bg-[#09090B]/80 p-4 shadow-lg backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToQuestion(currentQuestionIndex - 1)}
                    disabled={!canWork || currentQuestionIndex === 0}
                    className="inline-flex h-10 items-center gap-2 rounded border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => goToQuestion(currentQuestionIndex + 1)}
                    disabled={!canWork || currentQuestionIndex === questions.length - 1}
                    className="inline-flex h-10 items-center gap-2 rounded border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-1 flex-wrap justify-center gap-2">
                  {questions.map((question, index) => {
                    const draft = drafts[question.id];
                    const isAnswered = Boolean(draft?.answerText.trim() || draft?.finalAnswer.trim());
                    const isCurrent = index === currentQuestionIndex;

                    return (
                      <button
                        key={question.id}
                        onClick={() => goToQuestion(index)}
                        disabled={!canWork}
                        className={`h-9 min-w-9 rounded border px-3 text-sm font-medium transition duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                          isCurrent
                            ? "border-[#8B5CF6] bg-[#8B5CF6]/30 text-white shadow-[0_0_12px_rgba(139,92,246,0.5)] ring-1 ring-[#8B5CF6]"
                            : isAnswered
                              ? "border-[#8B5CF6]/40 bg-[#09090B]/50 text-white hover:border-[#8B5CF6]/80"
                              : "border-white/10 bg-white/5 text-[#A1A1AA] hover:border-[#8B5CF6]/50 hover:text-white"
                        }`}
                        aria-label={`Go to question ${question.order_index}`}
                      >
                        {question.order_index}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={requestSubmitConfirmation}
                  disabled={!canWork || isSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded bg-[#8B5CF6] px-6 text-sm font-semibold tracking-tight text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] transition hover:bg-[#7C3AED] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confirm submit
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#A1A1AA]">
                  Question {Math.min(currentQuestionIndex + 1, questions.length)} of {questions.length}
                </span>
                <span className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#A1A1AA]">
                  {answeredCount} answered · {unansweredCount} remaining
                </span>
              </div>
            </div>

            {currentQuestion ? (
              <div>
                <QuestionCard
                  key={currentQuestion.id}
                  question={currentQuestion}
                  answerText={drafts[currentQuestion.id]?.answerText ?? ""}
                  finalAnswer={drafts[currentQuestion.id]?.finalAnswer ?? ""}
                  disabled={!canWork || isSubmitting}
                  onChange={(value) =>
                    setDrafts((current) => ({
                      ...current,
                      [currentQuestion.id]: value
                    }))
                  }
                />
              </div>
            ) : (
              <div className="glass-card p-5 text-sm text-ams-muted">
                No questions are configured for this assessment.
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <button
                onClick={() => goToQuestion(currentQuestionIndex - 1)}
                disabled={!canWork || currentQuestionIndex === 0}
                className="inline-flex items-center justify-center gap-2 rounded border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium tracking-tight text-white transition hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous question
              </button>
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={() => goToQuestion(currentQuestionIndex + 1)}
                  disabled={!canWork}
                  className="inline-flex items-center justify-center gap-2 rounded bg-[#8B5CF6] px-6 py-3.5 text-sm font-semibold tracking-tight text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] transition hover:bg-[#7C3AED] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next question
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={requestSubmitConfirmation}
                  disabled={!canWork || isSubmitting}
                  className="inline-flex items-center justify-center rounded bg-[#8B5CF6] px-8 py-3.5 text-sm font-semibold tracking-tight text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] transition hover:bg-[#7C3AED] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confirm submit
                </button>
              )}
            </div>

            {isConfirmingSubmit ? (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-ams-bg/95 px-5">
                <div className="w-full max-w-lg glass-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10">
                      <AlertTriangle className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-ams-heading">Confirm submission</h2>
                      <p className="text-sm text-ams-muted">This will lock your assessment.</p>
                    </div>
                  </div>

                  <div className="rounded border border-ams-border bg-ams-surface p-4 text-sm leading-relaxed text-ams-ink">
                    You have answered {answeredCount} of {questions.length} questions.
                    {unansweredCount > 0 ? ` ${unansweredCount} question${unansweredCount === 1 ? " is" : "s are"} still unanswered.` : " All questions have an answer or final answer."}
                  </div>

                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                      onClick={() => setIsConfirmingSubmit(false)}
                      disabled={isSubmitting}
                      className="inline-flex h-10 items-center justify-center rounded border border-ams-border bg-ams-surface px-4 text-sm font-semibold tracking-tight text-ams-ink transition hover:border-purple-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Keep editing
                    </button>
                    <button
                      onClick={() => void submitAssessment()}
                      disabled={isSubmitting}
                      className="inline-flex h-10 items-center justify-center rounded bg-[#8B5CF6] px-4 text-sm font-semibold tracking-tight text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Submitting..." : "Submit now"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
