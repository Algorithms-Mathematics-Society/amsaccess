"use client";

import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Circle,
  Code2,
  Play,
  ShieldCheck,
  TimerReset
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useRef } from "react";
import { AMSLogo } from "@/components/AMSLogo";
import { ScrollObserver } from "@/components/ScrollObserver";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Assessment } from "@/lib/types";

const navItems = ["Product", "Workflow", "Review", "Changelog"];

const partnerMarks = ["AMS", "Derive", "Access", "Reason", "Review", "Signals", "Rounds"];

const metrics: Array<{ value: string; label: string; Icon: LucideIcon }> = [
  { value: "60m", label: "timed written rounds", Icon: TimerReset },
  { value: "10s", label: "autosave cadence", Icon: CheckCircle2 },
  { value: "12", label: "integrity event types", Icon: BarChart3 },
  { value: "100", label: "review score ceiling", Icon: ShieldCheck }
];

const foundation = [
  {
    title: "Candidate workspace",
    body: "A quiet writing surface that keeps prompts, derivation, and final answers in one focused flow."
  },
  {
    title: "Integrity timeline",
    body: "Fullscreen exits, tab changes, copy/paste, focus changes, and submissions are recorded as context."
  },
  {
    title: "Human review",
    body: "Signals support judgment. They do not replace it with automatic misconduct claims."
  }
];

const workflowSections = [
  {
    eyebrow: "Candidate operations",
    title: "Make online rounds feel composed.",
    body: "Start candidates in fullscreen, autosave responses, and keep the test environment calm while the assessment runs.",
    visual: "operations"
  },
  {
    eyebrow: "Prompt direction",
    title: "Define the reasoning you want to see.",
    body: "Written prompts can prioritize assumptions, derivation, edge cases, and a concise final answer, so reviewers see the work behind the result.",
    visual: "direction"
  },
  {
    eyebrow: "Review flow",
    title: "Move work forward across admins and reviewers.",
    body: "Every session carries answers, status, timestamps, and event history so review can happen without losing the operational trail.",
    visual: "handoff"
  },
  {
    eyebrow: "Integrity output",
    title: "Review event streams and candidate output.",
    body: "Fullscreen exits, tab visibility, copy, paste, and focus changes become a readable timeline beside the written submission.",
    visual: "code"
  },
  {
    eyebrow: "Progress at scale",
    title: "Understand completion without opening every session.",
    body: "Admin views summarize submission status, event counts, risk tone, and review paths for a fast read across the round.",
    visual: "progress"
  }
];

const changelog = [
  ["Round setup", "Active assessment discovery now picks the latest eligible round."],
  ["Autosave", "Candidate answers are persisted every ten seconds during the session."],
  ["Review", "Risk tone and event counts are visible from the admin dashboard."],
  ["Fullscreen", "Candidates can re-enter fullscreen while exits remain available for review."]
];

function MiniDots() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-white/20" />
      <span className="h-2 w-2 rounded-full bg-white/20" />
      <span className="h-2 w-2 rounded-full bg-white/20" />
    </div>
  );
}

function HeroConsole() {
  return (
    <div className="glass-card mx-auto mt-12 max-w-5xl overflow-hidden rounded-[0.65rem]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#09090B] px-4 py-3">
        <MiniDots />
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">Assessment Console</div>
        <div className="h-2 w-14 rounded-full bg-white/10" />
      </div>

      <div className="grid min-h-[430px] bg-transparent md:grid-cols-[190px_1fr_260px]">
        <aside className="border-r border-white/10 bg-[#09090B]/50 p-4">
          <div className="mb-6 h-4 w-24 rounded bg-white/10" />
          {["Overview", "Questions", "Candidates", "Events", "Review"].map((item, index) => (
            <div
              key={item}
              className={`mb-2 flex items-center gap-2 rounded px-2 py-2 text-xs ${
                index === 1 ? "bg-white text-black" : "text-white/60"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${index === 1 ? "bg-[#09090B]" : "bg-white/25"}`} />
              {item}
            </div>
          ))}
        </aside>

        <section className="p-5 animate-fade-in-up">
          <div className="mb-5 flex items-start justify-between gap-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Question 03</p>
              <h2 className="mt-2 max-w-md text-2xl font-semibold tracking-tight leading-tight text-white">
                Derive the invariant and justify edge cases
              </h2>
            </div>
            <span className="rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1 text-xs text-purple-200">
              Live
            </span>
          </div>

          <div className="space-y-3 rounded border border-white/10 bg-white/[0.025] p-4">
            <div className="h-2 w-full rounded bg-white/20" />
            <div className="h-2 w-11/12 rounded bg-white/10" />
            <div className="h-2 w-4/5 rounded bg-white/10" />
            <div className="mt-6 h-28 rounded border border-white/10 bg-[#09090B] p-4">
              <div className="h-2 w-28 rounded bg-[#8B5CF6]" />
              <div className="mt-4 space-y-2">
                <div className="h-2 rounded bg-white/10" />
                <div className="h-2 w-10/12 rounded bg-white/10" />
                <div className="h-2 w-8/12 rounded bg-white/10" />
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {metrics.slice(0, 3).map(({ value, label }) => (
              <div key={label} className="rounded border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xl font-medium text-white">{value}</p>
                <p className="mt-1 text-[11px] leading-4 text-white/40">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="border-l border-white/10 bg-[#09090B]/50 p-4">
          <p className="mb-4 text-xs font-medium text-white">Integrity state</p>
          {[
            ["Fullscreen", "Locked"],
            ["Autosave", "Synced"],
            ["Visibility", "Focused"],
            ["Timeline", "Recording"]
          ].map(([label, value]) => (
            <div key={label} className="mb-3 rounded border border-white/10 bg-[#09090B] px-3 py-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-white/40">{label}</span>
                <span className="text-[#8B5CF6]">{value}</span>
              </div>
            </div>
          ))}
          <div className="mt-6 rounded border border-white/10 bg-[#09090B] p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-white/50">
              <span>Review score</span>
              <span>82</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10">
              <div className="h-full w-[82%] rounded-full bg-[#8B5CF6]" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function WorkflowVisual({ kind }: { kind: string }) {
  if (kind === "direction") {
    return (
      <div className="glass-card grid min-h-[260px] grid-cols-[180px_1fr] overflow-hidden rounded">
        <div className="border-r border-white/10 bg-[#09090B]/50 p-4">
          {["Problem", "Assumptions", "Derivation", "Edge cases", "Final"].map((item, index) => (
            <div key={item} className="mb-3 flex items-center gap-2 text-xs text-white/60">
              <Circle className={`h-2.5 w-2.5 ${index < 3 ? "fill-[#8B5CF6] text-[#8B5CF6]" : "text-white/20"}`} />
              {item}
            </div>
          ))}
        </div>
        <div className="bg-transparent p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="h-3 w-32 rounded bg-white/10" />
            <div className="h-2 w-20 rounded bg-white/10" />
          </div>
          <div className="space-y-3">
            <div className="h-2 rounded bg-[#8B5CF6]/80" />
            <div className="h-2 w-11/12 rounded bg-white/10" />
            <div className="h-2 w-9/12 rounded bg-white/10" />
            <div className="mt-8 h-20 rounded border border-white/10 bg-[#09090B]" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "handoff") {
    return (
      <div className="glass-card grid min-h-[260px] grid-cols-2 overflow-hidden rounded">
        <div className="border-r border-white/10 bg-transparent p-5">
          <p className="mb-4 text-xs text-white/50">Session packet</p>
          {["Candidate profile", "Answer draft", "Event stream", "Review status", "Submit time"].map((item) => (
            <div key={item} className="mb-2 flex items-center justify-between rounded border border-white/10 bg-white/[0.025] px-3 py-2 text-xs">
              <span className="text-white/60">{item}</span>
              <Check className="h-3.5 w-3.5 text-[#8B5CF6]" />
            </div>
          ))}
        </div>
        <div className="bg-[#09090B]/50 p-5">
          <p className="mb-4 text-xs text-white/50">Reviewer queue</p>
          {["In progress", "Needs review", "Submitted", "Cleared"].map((item, index) => (
            <div key={item} className="mb-3 rounded border border-white/10 bg-[#09090B] p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">{item}</span>
                <span className="text-white/40">{index + 4}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "code") {
    return (
      <div className="glass-card overflow-hidden rounded bg-transparent p-5">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Code2 className="h-4 w-4" />
            event-timeline.diff
          </div>
          <div className="text-xs text-white/30">Review</div>
        </div>
        <div className="grid gap-2 font-mono text-[11px] leading-5 md:grid-cols-2">
          <div className="rounded bg-red-500/10 p-3 text-red-100/70">
            <p>- fullscreen_exit at 10:24:18</p>
            <p>- tab_hidden at 10:24:20</p>
            <p>- paste at 10:31:04</p>
            <p>- focus_blur at 10:36:51</p>
          </div>
          <div className="rounded bg-emerald-400/10 p-3 text-emerald-100/70">
            <p>+ answer_autosaved at 10:24:28</p>
            <p>+ fullscreen_enter at 10:24:33</p>
            <p>+ final_answer_saved at 10:47:10</p>
            <p>+ submitted at 10:58:44</p>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "progress") {
    return (
      <div className="glass-card grid min-h-[280px] gap-5 rounded bg-transparent p-5 md:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded border border-white/10 bg-[#09090B] p-4">
          <p className="mb-5 text-xs text-white/50">Round summary</p>
          {metrics.map(({ value, label }) => (
            <div key={label} className="mb-4 flex items-end justify-between border-b border-white/10 pb-3">
              <span className="text-xs text-white/40">{label}</span>
              <span className="text-xl text-white">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-3 rounded border border-white/10 bg-[#09090B] p-5">
          {[42, 72, 34, 86, 58, 68, 47, 92, 63, 76, 39, 83].map((height, index) => (
            <div key={index} className="flex flex-1 flex-col justify-end">
              <div
                className={`rounded-t ${index % 3 === 0 ? "bg-[#8B5CF6]" : index % 3 === 1 ? "bg-cyan-300" : "bg-violet-300"}`}
                style={{ height: `${height}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card flex min-h-[260px] flex-col overflow-hidden bg-[#09090B]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full border border-[#E0443E] bg-[#FF5F56]" />
        <div className="h-2.5 w-2.5 rounded-full border border-[#DEA123] bg-[#FFBD2E]" />
        <div className="h-2.5 w-2.5 rounded-full border border-[#1AAB29] bg-[#27C93F]" />
        <span className="ml-2 font-mono text-xs tracking-tight text-[#A1A1AA]">ams.config.json</span>
      </div>
      <div className="flex-1 bg-[#09090B]/50 p-6 font-mono text-[11px] leading-relaxed text-[#A1A1AA]">
        <p>{"{"}</p>
        <p className="ml-4"><span className="text-[#38BDF8]">&quot;strictMode&quot;</span>: <span className="text-[#FDE047]">true</span>,</p>
        <p className="ml-4"><span className="text-[#38BDF8]">&quot;enforceFullscreen&quot;</span>: <span className="text-[#FDE047]">true</span>,</p>
        <p className="ml-4"><span className="text-[#38BDF8]">&quot;telemetry&quot;</span>: {"{"}</p>
        <p className="ml-8"><span className="text-[#38BDF8]">&quot;interval&quot;</span>: <span className="text-[#FDE047]">&quot;10s&quot;</span>,</p>
        <p className="ml-8"><span className="text-[#38BDF8]">&quot;logFocus&quot;</span>: <span className="text-[#FDE047]">true</span></p>
        <p className="ml-4">{"},"}</p>
        <p className="ml-4"><span className="text-[#38BDF8]">&quot;allowedExits&quot;</span>: <span className="text-purple-400">0</span></p>
        <p>{"}"}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const ctaRef = useRef<HTMLDivElement>(null);

  function handleCTAMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ctaRef.current) return;
    const rect = ctaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctaRef.current.style.setProperty("--mouse-x", `${x}px`);
    ctaRef.current.style.setProperty("--mouse-y", `${y}px`);
  }

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssessment() {
      if (!isSupabaseConfigured) {
        setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
        return;
      }

      const now = new Date().toISOString();
      const { data, error: loadError } = await supabase
        .from("assessments")
        .select("*")
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("starts_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (loadError) {
        setError(loadError.message);
        return;
      }

      setAssessment(data);
    }

    void loadAssessment();
  }, []);

  async function startAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!assessment) {
      setError(
        isSupabaseConfigured
          ? "No active assessment is configured."
          : "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
      );
      return;
    }

    setIsStarting(true);

    // Collect passive fingerprint metadata — no tracking, purely for admin review context.
    const timezone    = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const screenRes   = `${window.screen.width}x${window.screen.height}`;
    const colorDepth  = window.screen.colorDepth;
    const language    = navigator.language;
    const platform    = navigator.platform;

    const { data, error: insertError } = await supabase
      .from("sessions")
      .insert({
        assessment_id: assessment.id,
        candidate_name: candidateName.trim(),
        candidate_email: candidateEmail.trim(),
        user_agent: navigator.userAgent,
        status: "IN_PROGRESS",
        // metadata stored in user_agent field for now (no separate column needed)
        // TODO: add a metadata jsonb column to sessions for richer fingerprinting
      })
      .select("id")
      .single();

    setIsStarting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    // Log environment metadata as the first proctor event — gives admin context
    await supabase.from("proctor_events").insert({
      session_id: data.id,
      event_type: "SUBMISSION_STARTED", // reuse as session-start marker
      user_agent: navigator.userAgent,
      metadata: {
        timezone,
        screenRes,
        colorDepth,
        language,
        platform,
        ts: Date.now(),
      },
    });

    router.push(`/assessment/${data.id}`);
  }

  return (
    <main className="min-h-screen bg-[#000000] text-white">
      <ScrollObserver />
      <header className="fixed inset-x-0 top-6 z-40 px-4">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between rounded-full border border-white/10 bg-[#09090B]/80 px-6 shadow-glass backdrop-blur-2xl">
          <AMSLogo compact />
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/56 lg:flex">
            {navItems.map((item) => (
              <a key={item} className="transition hover:text-white" href={`#${item.toLowerCase()}`}>
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <a
              className="inline-flex h-9 items-center rounded-full border border-white/25 bg-white px-4 text-sm font-semibold text-[#202020] shadow-[0_4px_14px_rgba(255,255,255,0.1)] transition hover:bg-[#8B5CF6] hover:text-white"
              href="#assessment"
            >
              Start
            </a>
          </div>
        </div>
      </header>

      <section id="product" className="raycast-hero relative flex min-h-screen items-center justify-center overflow-hidden px-5 pb-20 pt-32 animate-fade-in-up" style={{ backgroundImage: "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)", backgroundSize: "40px 40px" }}>
        <div className="raycast-hero-bg" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6] opacity-20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-200 backdrop-blur-md">
            Introducing AMS Access
          </div>
          <h1 className="mx-auto max-w-4xl bg-gradient-to-b from-white to-[#D4D4D8] bg-clip-text text-5xl font-semibold leading-[1.05] tracking-tight text-transparent md:text-7xl">
            Your shortcut to serious online rounds.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70 md:text-xl">
            A focused assessment system for written reasoning, fullscreen sessions, autosaved answers, and human-led integrity review.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-y border-white/10 px-5 py-8 animate-fade-in-up">
        <div className="flex flex-wrap items-center justify-between gap-6 text-[11px] uppercase tracking-[0.18em] text-white/40">
          {partnerMarks.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-6xl px-5 py-16 md:py-20 animate-fade-in-up">
        <div className="grid gap-10 md:grid-cols-[0.95fr_1.05fr]">
          <h2 className="max-w-xl text-3xl font-semibold leading-[1.02] tracking-tight text-white md:text-5xl">
            A new standard for running written assessments with clarity.
          </h2>
          <p className="max-w-xl text-lg leading-relaxed text-white/60">
            Purpose-built for derivation-heavy exams, AMS Access connects candidate writing, proctoring events, autosave state, and admin review into one product surface.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {foundation.map((item, index) => (
            <article key={item.title} className="glass-card flex flex-col p-8">
              <div className="relative mb-6 flex h-32 items-center justify-center overflow-hidden rounded border border-white/10 bg-[#09090B]">
                {index === 0 && (
                  <div className="flex h-full w-full flex-col justify-end p-4 font-mono text-[10px] leading-relaxed text-[#A1A1AA]">
                    <p className="text-[#D4D4D8]">{`> initializing secure runtime...`}</p>
                    <p className="mt-1 text-[#D4D4D8]">{`> locking memory buffers... `}<span className="text-emerald-400">[OK]</span></p>
                    <p className="mt-1 text-purple-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">{`> ams-core ready `}<span className="animate-pulse text-white">_</span></p>
                  </div>
                )}
                {index === 1 && (
                  <div className="flex w-full items-center gap-3 px-4">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-500/50 bg-purple-500/20 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">
                      <div className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-purple-400" />
                      <ShieldCheck className="h-5 w-5 text-purple-200" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="h-2 w-16 rounded bg-white/40" />
                      <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]">
                        Identity Verified: 99.9%
                      </div>
                    </div>
                  </div>
                )}
                {index === 2 && (
                  <div className="flex h-full w-full flex-col justify-between p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#A1A1AA]">Telemetry</span>
                      <div className="flex gap-1 drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                      </div>
                    </div>
                    <div className="flex h-10 w-full items-end gap-1 opacity-80">
                      {[4, 7, 3, 8, 5, 6, 4, 9, 6, 7].map((h, i) => (
                        <div key={i} className="flex-1 animate-scale-y rounded-t-sm bg-purple-400/80 drop-shadow-[0_0_6px_rgba(139,92,246,0.4)]" style={{ height: `${h * 10}%`, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-white">{item.title}</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#A1A1AA]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {workflowSections.map((section, idx) => (
        <section key={section.title} className={`mx-auto max-w-6xl px-5 py-14 md:py-20 animate-fade-in-up ${idx === 0 ? "border-t border-white/5" : ""}`}>
          <div className="mb-8 grid gap-6 md:grid-cols-[0.92fr_1.08fr]">
            <div>
              <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-white/30">{section.eyebrow}</p>
              <h2 className="max-w-sm text-2xl font-semibold leading-[1.02] tracking-tight text-white md:text-4xl">{section.title}</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-white/50 md:pt-8">{section.body}</p>
          </div>
          <WorkflowVisual kind={section.visual} />
        </section>
      ))}

      <section id="review" className="mx-auto max-w-6xl px-5 py-16 md:py-20 animate-fade-in-up">
        <div className="grid gap-4 md:grid-cols-4">
          {metrics.map(({ value, label, Icon }) => (
            <div key={label} className="border-t border-white/10 pt-5">
              <Icon className="h-4 w-4 text-white/40" />
              <p className="mt-8 text-4xl font-semibold tracking-tight text-white">{value}</p>
              <p className="mt-2 text-xs text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="changelog" className="border-y border-white/10 animate-fade-in-up">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Changelog</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {changelog.map(([title, body]) => (
              <article key={title} className="border-t border-white/10 pt-5">
                <div className="mb-8 h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
                <h3 className="text-sm font-semibold tracking-tight text-white">{title}</h3>
                <p className="mt-3 text-xs leading-5 text-white/50">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="assessment" className="mx-auto max-w-6xl border-t border-white/5 px-5 py-16 md:py-24 animate-fade-in-up">
        <div className="glass-card grid overflow-hidden md:grid-cols-[1.1fr_0.9fr]">
          <div 
            ref={ctaRef}
            onMouseMove={handleCTAMouseMove}
            className="group relative overflow-hidden bg-[#050505] p-8 text-white md:p-12"
          >
            <div 
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              style={{
                background: `radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(139,92,246,0.15), transparent 40%)`
              }}
            />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_100%_100%,_rgba(139,92,246,0.08),_transparent_50%)]" />
            <div className="ams-noise pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay" />
            <div className="relative z-10">
              <p className="mb-16 max-w-md text-2xl font-semibold tracking-tight leading-tight md:text-4xl">
                Run the next written round with a product surface that feels finished.
              </p>
              <div className="flex items-center gap-2 text-xs">
                <Play className="h-4 w-4 fill-white" />
                Candidate access
              </div>
            </div>
          </div>

          <form onSubmit={startAssessment} className="bg-transparent p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Start assessment</p>
            <h2 className="mt-3 text-2xl font-medium text-white">Enter candidate details.</h2>
            <p className="mt-3 text-sm leading-6 text-white/50">
              The next screen enters fullscreen before questions are shown. Your reasoning and final answer are autosaved during the round.
            </p>

            <label className="mt-8 block text-xs text-white/60">Candidate name</label>
            <input
              className="mt-2 h-12 w-full rounded border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              required
              value={candidateName}
              onChange={(event) => setCandidateName(event.target.value)}
              placeholder="Your full name"
            />

            <label className="mt-5 block text-xs text-white/60">Candidate email</label>
            <input
              className="mt-2 h-12 w-full rounded border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              required
              type="email"
              value={candidateEmail}
              onChange={(event) => setCandidateEmail(event.target.value)}
              placeholder="you@example.com"
            />

            {error ? (
              <div className="mt-5 border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isStarting}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black transition hover:bg-[#8B5CF6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStarting ? "Starting..." : "Start assessment"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-6 text-center md:pb-24 animate-fade-in-up">
        <h2 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight leading-[0.98] text-white md:text-6xl">
          Built for the future. Available today.
        </h2>
        <div className="mt-8 flex justify-center gap-3">
          <a className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black hover:bg-[#8B5CF6]" href="#assessment">
            Start now
          </a>
          <a className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-white/70 hover:border-white/40 hover:text-white" href="#product">
            Back to top
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 text-xs text-white/40 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <AMSLogo compact />
            <p className="mt-5 max-w-xs leading-5">AMS Derive Online Round. Integrity signals support review; they do not replace judgment.</p>
          </div>
          {["Product", "Review", "Assessment", "Legal"].map((group) => (
            <div key={group}>
              <p className="mb-4 text-white/70">{group}</p>
              <div className="grid gap-2">
                <span>Workspace</span>
                <span>Signals</span>
                <span>Sessions</span>
                <span>Security</span>
              </div>
            </div>
          ))}
        </div>
      </footer>
    </main>
  );
}
