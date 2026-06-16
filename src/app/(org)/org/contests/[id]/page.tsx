"use client";

import { memo, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, Save, Code2, Mail, UserPlus,
  X, Sparkles, Monitor, Play, Square, RefreshCw,
  Upload, Search, FileSpreadsheet, Eye, Send, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, Clock,
  Activity, Users, Settings, Sliders, Info, Calendar, Key, Check, Copy, Zap, BarChart2, Cpu, Puzzle, GripVertical, Lock,
  MessageSquare, ListChecks, Share2, ChevronDown
} from "lucide-react";
import { apiFetch } from "@/lib/client/apiClient";
import type { CPProblemStudioHandle } from "@/components/CPProblemStudio";
import { type MarkovChain, normalizeChain } from "@/lib/markov";
import { Modal } from "@/components/Modal";
import { Skeleton } from "@/components/Skeleton";

// Heavy editors are code-split so they don't ship in the contest page's initial
// JS — and so the KaTeX they pull stays out of the initial bundle too. React.lazy
// (not next/dynamic) is required for CPProblemStudio because it's driven by an
// imperative ref, which lazy forwards to its forwardRef default export.
const CPProblemStudio = lazy(() => import("@/components/CPProblemStudio"));
const MarkovQuestionEditor = lazy(() => import("@/components/MarkovQuestionEditor"));

// ─── Types ───────────────────────────────────────────────────
type Contest = {
  id: string; title: string; description: string | null;
  start_at: string; end_at: string; timezone?: string; status: string; org_id: string;
  scoring_type: string; allowed_languages: string[];
  plugin_type?: string; plugin_config?: string;
  results_visible_at?: string | null;
};

type Question = {
  id: string; contest_id: string; title: string; description: string;
  html_starter: string; css_starter: string; js_starter: string;
  points: number; order_index: number;
  question_type: string; time_limit_ms: number; memory_limit_mb: number;
  // cp-config (returned by backend, may be null for brand-new questions)
  checker_type?: string | null;
  checker_code?: string | null;
  validator_code?: string | null;
  model_solution?: string | null;
  model_lang?: string | null;
  generator_script?: string | null;
  markov_answer_json?: string | null;
};

type Invite = {
  id: string; email: string; status: string; created_at: string;
};

type Tab = "questions" | "participants" | "leaderboard" | "monitor" | "settings";

type ContestDetailResponse = {
  contest: Contest;
  questions: Question[];
  invites: Invite[];
};

type JudgeCapacity = {
  mig_name: string;
  region: string;
  mode?: "AUTO" | "MANUAL_ON" | "MANUAL_OFF" | string;
  target_size: number;
  is_stable: boolean;
  ready?: boolean;
  phase?: "starting" | "ready" | "stopping" | "stopped" | "unknown";
  total_instances?: number;
  running_instances?: number;
  current_actions?: Record<string, number>;
  // ISO time at which a MANUAL_ON/MANUAL_OFF override auto-reverts to AUTO.
  // Present only while an override is in effect; drives the "auto-stops in …" UI.
  manual_until?: string | null;
};

type RuntimeStatus = {
  contest_id: string;
  runtime_status: "COLD" | "WARMING" | "READY" | "DEGRADED";
  runtime_ready: boolean;
  ready_checked_at?: string;
  failure_reason_code?: string;
  failure_reason?: string;
  capacity: JudgeCapacity;
};

type LiveSubmission = {
  attempt_id: string;
  session_id: string;
  candidate: string;
  problem_id: string;
  language: string;
  status: string;
  final_verdict?: string | null;
  runtime_ms?: number | null;
  memory_kb?: number | null;
  created_at: string;
};

type LiveProctorEvent = {
  id: string;
  event_id?: string | null;
  session_id: string;
  candidate: string;
  event_type: string;
  severity?: "INFO" | "WARN" | "CRITICAL" | string;
  source?: string;
  created_at: string;
};

type LiveInfraEvent = {
  source: string;
  entity_id: string;
  status: string;
  reason_code?: string;
  message?: string;
  created_at: string;
};

type LeaderboardQuestion = {
  id: string;
  order_index: number;
  title: string;
  points: number;
};

type LeaderboardProblemState = {
  question_id: string;
  attempts: number;
  best_score: number;
  verdict: string;
  last_submission_at?: string | null;
};

type LeaderboardEntry = {
  rank: number;
  session_id: string;
  candidate_name: string;
  candidate_email: string;
  total_score: number;
  solved_count: number;
  penalty_seconds: number;
  last_scored_at?: string | null;
  latest_activity_at?: string | null;
  problems: LeaderboardProblemState[];
};

type LeaderboardResponse = {
  contest_id: string;
  status: string;
  scoring_type: string;
  questions: LeaderboardQuestion[];
  entries: LeaderboardEntry[];
  updated_at: string;
};

type HistoricalSubmission = {
  id: string;
  problem_id: string;
  question_title: string;
  attempt_no: number;
  language: string;
  status: string;
  final_verdict?: string | null;
  score: number;
  runtime_ms?: number | null;
  memory_kb?: number | null;
  error_message?: string | null;
  source_code: string;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
};

type ReadinessState = "complete" | "pending" | "blocked";

type LaunchChecklistItem = {
  id: string;
  label: string;
  state: ReadinessState;
  detail: string;
};

// ─── Compute (judge capacity) safety constants ───────────────
// How long the contest page tolerates inactivity before nudging the user that
// compute is still running, and how long a "Dismiss" snoozes that nudge. The
// backend TTL (JUDGE_MANUAL_MODE_TTL_MINUTES) is the hard auto-stop; these only
// drive the in-dashboard reminder while a tab is open.
const IDLE_NUDGE_MS = 30 * 60 * 1000;
const IDLE_SNOOZE_MS = 10 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────
// Compact "Xh Ym" / "Ym" for a positive duration in milliseconds.
function formatRemaining(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatPenaltySeconds(seconds: number): string {
  if (seconds <= 0) return "0m";
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  return remSeconds > 0 ? `${minutes}m ${remSeconds}s` : `${minutes}m`;
}

function verdictTone(verdict: string): string {
  switch (verdict) {
    case "AC":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "RUNNING":
      return "border-purple-200 bg-purple-50 text-purple-700";
    case "WA":
    case "RE":
    case "CE":
    case "IE":
      return "border-red-200 bg-red-50 text-red-700";
    case "TLE":
    case "MLE":
    case "OLE":
    case "ATTEMPTED":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
}

// Memoized so a 2s leaderboard poll only re-renders cells whose verdict string
// actually changed, not every badge on the board.
const VerdictBadge = memo(function VerdictBadge({ verdict }: { verdict: string }) {
  if (verdict === "UNATTEMPTED") {
    return (
      <span className="inline-flex min-w-14 items-center justify-center px-2 py-1 text-[11px] text-slate-300" aria-label="Unattempted">
        –
      </span>
    );
  }
  return (
    <span className={`inline-flex min-w-14 items-center justify-center rounded-md border px-2 py-1 text-[11px] font-semibold ${verdictTone(verdict)}`}>
      {verdict}
    </span>
  );
});

// Tab panels are memoized so the parent's periodic re-renders (judge poll, the
// 30s compute clock) don't re-render the active tab when its props are unchanged.
// (The *Impl declarations are hoisted, so referencing them here is safe.)
const QuestionsTab = memo(QuestionsTabImpl);
const ParticipantsTab = memo(ParticipantsTabImpl);
const LeaderboardTab = memo(LeaderboardTabImpl);
const MonitorTab = memo(MonitorTabImpl);
const SettingsTab = memo(SettingsTabImpl);

function statusClass(s: string) {
  if (s === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "SCHEDULED") return "border-purple-200 bg-purple-50 text-purple-700";
  if (s === "ENDED") return "border-slate-200 bg-slate-50 text-slate-500";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function toDateTimeLocalValue(isoLike: string): string {
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function getReviewerCount(pluginConfig?: string): number | null {
  if (!pluginConfig) return null;
  try {
    const parsed = JSON.parse(pluginConfig) as Record<string, unknown>;
    const possibleLists = [
      parsed.reviewers,
      parsed.reviewerEmails,
      parsed.reviewer_emails,
      parsed.reviewerIds,
      parsed.reviewer_ids,
    ];
    const list = possibleLists.find((value) => Array.isArray(value));
    return Array.isArray(list) ? list.length : null;
  } catch {
    return null;
  }
}

function deriveLaunchState(
  contest: Contest,
  items: LaunchChecklistItem[]
): { label: string; tone: "draft" | "ready" | "live" | "attention" | "ended" } {
  if (contest.status === "ENDED") return { label: "Ended", tone: "ended" };
  if (contest.status === "ACTIVE") return { label: "Live", tone: "live" };
  if (items.some((item) => item.state === "blocked")) return { label: "Needs attention", tone: "attention" };
  if (contest.status === "SCHEDULED" && items.every((item) => item.state !== "blocked")) return { label: "Ready to launch", tone: "ready" };
  if (items.every((item) => item.state === "complete")) return { label: "Ready to launch", tone: "ready" };
  return { label: "Draft", tone: "draft" };
}

function buildLaunchChecklist({
  contest,
  questions,
  invites,
  judgePhase,
  pluginType,
}: {
  contest: Contest;
  questions: Question[];
  invites: Invite[];
  judgePhase: string;
  pluginType: string;
}): LaunchChecklistItem[] {
  const titleReady = contest.title.trim().length > 0;
  const scheduleStart = new Date(contest.start_at);
  const scheduleEnd = new Date(contest.end_at);
  const scheduleReady =
    !Number.isNaN(scheduleStart.getTime()) &&
    !Number.isNaN(scheduleEnd.getTime()) &&
    scheduleEnd > scheduleStart;
  const hasQuestions = pluginType === "CHESS" || questions.length > 0;
  const cpQuestions = pluginType === "CP" ? questions : [];
  const questionsConfigured =
    pluginType === "CHESS" ||
    cpQuestions.every((q) => q.title.trim() && q.description.trim() && q.time_limit_ms >= 100 && q.memory_limit_mb >= 16);
  const validationReady =
    pluginType === "CHESS" ||
    (cpQuestions.length > 0 &&
      cpQuestions.every((q) => Boolean(q.validator_code?.trim()) && (q.checker_type === "token" || Boolean(q.checker_code?.trim()))));
  const runtimeReady = pluginType === "CHESS" || judgePhase === "ready";
  const proctoringConfigured = Boolean(contest.timezone) && Boolean(contest.plugin_type ?? pluginType);
  const approved = contest.status === "SCHEDULED" || contest.status === "ACTIVE" || contest.status === "ENDED";
  const reviewerCount = getReviewerCount(contest.plugin_config);

  return [
    {
      id: "basics",
      label: "Basics complete",
      state: titleReady ? "complete" : "blocked",
      detail: titleReady ? "Contest title is set." : "Add a contest title before launch.",
    },
    {
      id: "schedule",
      label: "Schedule set",
      state: scheduleReady ? "complete" : "blocked",
      detail: scheduleReady ? scheduleStart.toLocaleString() + " to " + scheduleEnd.toLocaleString() : "Set a valid start and end time.",
    },
    {
      id: "questions",
      label: "Questions ready",
      state: hasQuestions && questionsConfigured ? "complete" : "blocked",
      detail: pluginType === "CHESS" ? "Chess contest uses ruleset/testplay workflow." : hasQuestions ? "Problem metadata and limits are present." : "Add at least one problem.",
    },
    {
      id: "tests",
      label: "Test data validated",
      state: validationReady ? "complete" : "pending",
      detail: pluginType === "CHESS" ? "Validation happens in the chess workflow." : validationReady ? "Validator/checker configuration is present for every problem." : "Run/save validator and checker configuration for every problem.",
    },
    {
      id: "candidates",
      label: "Candidates invited/imported",
      state: invites.length > 0 ? "complete" : "pending",
      detail: invites.length > 0 ? String(invites.length) + " invite" + (invites.length === 1 ? "" : "s") + " created." : "Invite candidates or import a roster.",
    },
    {
      id: "runtime",
      label: "Runtime ready",
      state: runtimeReady ? "complete" : "pending",
      detail: pluginType === "CHESS" ? "Chess mode does not require CP judge capacity." : runtimeReady ? "Judge capacity reports ready." : "Start compute or wait for judge capacity to become ready.",
    },
    {
      id: "proctoring",
      label: "Proctoring configured",
      state: proctoringConfigured ? "complete" : "pending",
      detail: proctoringConfigured ? pluginType + " mode with " + (contest.timezone ?? "workspace timezone") + "." : "Set contest mode and timezone.",
    },
    {
      id: "reviewers",
      label: "Reviewers assigned",
      state: reviewerCount !== null && reviewerCount > 0 ? "complete" : "pending",
      detail: reviewerCount === null ? "Reviewer assignment is not exposed in the current contest data yet." : reviewerCount > 0 ? String(reviewerCount) + " reviewer" + (reviewerCount === 1 ? "" : "s") + " assigned." : "Assign at least one reviewer before launch.",
    },
    {
      id: "approval",
      label: "Launch approved",
      state: approved ? "complete" : "pending",
      detail: approved ? "Contest status is " + contest.status + "." : "Move from draft to scheduled when ready.",
    },
  ];
}

// ─── Main page ───────────────────────────────────────────────
export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const forcedMode = String(searchParams.get("mode") ?? "").toUpperCase() === "CHESS" ? "CHESS" : null;
  const [tab, setTab] = useState<Tab>("questions");
  const [contest, setContest] = useState<Contest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [judge, setJudge] = useState<JudgeCapacity | null>(null);
  const [judgeBusy, setJudgeBusy] = useState(false);
  const [judgeError, setJudgeError] = useState<string | null>(null);
  const [modeReconciled, setModeReconciled] = useState(false);
  // Open-incident count surfaced as a tab badge so unresolved help requests are
  // visible without opening the Incidents tab. Re-read on tab switches so it
  // reflects resolutions made inside the tab.
  const [incidentsOpenCount, setIncidentsOpenCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ContestDetailResponse>(`/api/org/contests/${id}?_t=${Date.now()}`, {
        cache: 'no-store'
      });
      setContest(data.contest);
      setQuestions(data.questions);
      setInvites(data.invites);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load contest.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // Stable handlers so the memoized tab components don't re-render on every
  // parent tick (judge poll / nowMs clock) just from a fresh inline closure.
  const goToSettings = useCallback(() => setTab("settings"), []);
  const goToDashboard = useCallback(() => router.push("/org/dashboard"), [router]);

  // Refresh the open-incident badge on mount and whenever the Monitor tab is
  // opened/closed (resolutions happen there) — NOT on every unrelated tab switch.
  const onMonitorTab = tab === "monitor";
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ items: SupportIncident[] }>(`/api/org/contests/${id}/incidents`)
      .then((data) => {
        if (!cancelled) setIncidentsOpenCount((data.items ?? []).filter((i) => i.status === "OPEN").length);
      })
      .catch(() => { /* badge is best-effort; ignore fetch errors */ });
    return () => { cancelled = true; };
  }, [id, onMonitorTab]);

  useEffect(() => {
    if (!contest || modeReconciled) return;
    if (forcedMode !== "CHESS") return;
    if (String(contest.plugin_type ?? "").toUpperCase() === "CHESS") {
      setModeReconciled(true);
      return;
    }
    // Never auto-convert a contest that already has questions. The ?mode=CHESS
    // hint exists only so a freshly-created (empty) chess contest renders in
    // chess mode before its plugin_type read settles. A populated CP contest
    // reaching here means a stale or hand-edited URL — flipping plugin_type
    // would persist (UpdateContest COALESCEs it) and hide every existing
    // question behind the "CHESS mode" banner. Refuse and leave it as CP.
    if (questions.length > 0) {
      setModeReconciled(true);
      return;
    }
    let cancelled = false;
    const reconcile = async () => {
      try {
        await apiFetch<{ saved: boolean }>(`/api/org/contests/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            plugin_type: "CHESS",
            pluginType: "CHESS",
            plugin_config: String(contest.plugin_config ?? "{}"),
            pluginConfig: String(contest.plugin_config ?? "{}"),
          }),
        });
        if (!cancelled) {
          setModeReconciled(true);
          await load();
        }
      } catch {
        if (!cancelled) setModeReconciled(true);
      }
    };
    void reconcile();
    return () => {
      cancelled = true;
    };
  }, [contest, forcedMode, id, load, modeReconciled, questions.length]);

  const loadJudge = useCallback(async () => {
    try {
      const data = await apiFetch<JudgeCapacity>("/api/org/judge-capacity");
      setJudge(data);
      setJudgeError(null);
    } catch (e) {
      setJudgeError(e instanceof Error ? e.message : "Unable to fetch judge status.");
    }
  }, []);

  useEffect(() => { void loadJudge(); }, [loadJudge]);
  useEffect(() => {
    if (!judge) return;
    if (judge.phase === "starting" || judge.phase === "stopping") {
      const t = setTimeout(() => { void loadJudge(); }, 2500);
      return () => clearTimeout(t);
    }
  }, [judge, loadJudge]);

  // Compute auto-stop visibility + idle reminder.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showIdleNudge, setShowIdleNudge] = useState(false);
  const [showComputeHelp, setShowComputeHelp] = useState(false);
  // Compute panel is collapsed to a quiet status row by default; expand for controls.
  const [computeExpanded, setComputeExpanded] = useState(false);
  // Two-state guard so Stop Compute can't tear down the fleet mid-contest by accident.
  const [confirmStop, setConfirmStop] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const idleSnoozeUntilRef = useRef(0);
  const expiryRefreshedRef = useRef<string | null>(null);

  async function controlJudge(action: "start" | "stop", opts?: { force?: boolean }) {
    setJudgeBusy(true);
    setJudgeError(null);
    try {
      // Start: tell the judge which contest this is for, so the auto-stop timer
      // covers the contest. Stop: pass force after the operator confirms.
      const payload =
        action === "start" ? { contest_id: id } : { force: opts?.force ?? false };
      const data = await apiFetch<JudgeCapacity>(`/api/org/judge-capacity/${action}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setJudge(data);
      setConfirmStop(false);
      if (action === "start") {
        // Reset the idle clock so the 30-min reminder counts from when compute
        // actually came up, not from page load.
        lastActivityRef.current = Date.now();
        idleSnoozeUntilRef.current = 0;
      }
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (action === "stop" && code === "CONTEST_ACTIVE" && !opts?.force) {
        // Live contest — surface a confirm affordance instead of a hard failure.
        setConfirmStop(true);
        setJudgeError("A contest is live — stopping compute will fail in-progress submissions.");
      } else {
        setJudgeError(e instanceof Error ? e.message : `Unable to ${action} judge capacity.`);
      }
    } finally {
      setJudgeBusy(false);
    }
  }

  // Stop click: when a contest is live, require an explicit second confirm before forcing.
  function handleStopCompute() {
    if (contest?.status === "ACTIVE" && !confirmStop) {
      setConfirmStop(true);
      setJudgeError("A contest is live — stopping compute will fail in-progress submissions.");
      return;
    }
    void controlJudge("stop", { force: confirmStop });
  }

  // Tick once a minute while a manual override is in effect so the "auto-stops
  // in …" countdown stays current without extra API polling.
  useEffect(() => {
    if (judge?.mode !== "MANUAL_ON" || !judge.manual_until) return;
    const t = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(t);
  }, [judge?.mode, judge?.manual_until]);

  // When the backend auto-stop time passes, refresh once so the dashboard
  // reflects the fleet actually winding down (rather than showing stale state).
  useEffect(() => {
    if (judge?.mode !== "MANUAL_ON" || !judge.manual_until) return;
    const remaining = new Date(judge.manual_until).getTime() - nowMs;
    if (remaining <= 0 && expiryRefreshedRef.current !== judge.manual_until) {
      expiryRefreshedRef.current = judge.manual_until;
      void loadJudge();
    }
  }, [judge?.mode, judge?.manual_until, nowMs, loadJudge]);

  // Track interaction so we can tell when the author has walked away.
  useEffect(() => {
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, []);

  // While compute is explicitly running (MANUAL_ON), surface a reminder after a
  // stretch of inactivity. Disarmed whenever compute isn't manually on.
  useEffect(() => {
    if (judge?.mode !== "MANUAL_ON") {
      setShowIdleNudge(false);
      return;
    }
    const check = setInterval(() => {
      const now = Date.now();
      if (now < idleSnoozeUntilRef.current) return;
      if (now - lastActivityRef.current >= IDLE_NUDGE_MS) setShowIdleNudge(true);
    }, 30000);
    return () => clearInterval(check);
  }, [judge?.mode]);

  if (loading) {
    return <ContestDetailSkeleton />;
  }

  if (error || !contest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-7 text-center shadow-sm">
          <p className="text-sm text-red-600">{error ?? "Contest not found."}</p>
          <Link href="/org/dashboard" className="mt-4 inline-block text-sm font-medium text-purple-600 hover:text-purple-700">← Back</Link>
        </div>
      </div>
    );
  }

  const effectivePluginType =
    forcedMode === "CHESS"
      ? "CHESS"
      : String(contest.plugin_type ?? "CP").toUpperCase() === "CHESS"
      ? "CHESS"
      : "CP";
  const statusBadgeClass = statusClass(contest.status);
  const judgePhase = judge?.phase ?? "unknown";
  const judgeLabel = judgePhase === "ready"
    ? "Ready"
    : judgePhase === "starting"
    ? "Starting"
    : judgePhase === "stopping"
    ? "Stopping"
    : judgePhase === "stopped"
    ? "Stopped"
    : "Unknown";
  const judgeDotClass = judgePhase === "ready" ? "bg-emerald-500" : judgePhase === "starting" ? "bg-amber-400" : judgePhase === "stopping" ? "bg-orange-400" : "bg-slate-400";
  const launchChecklist = buildLaunchChecklist({
    contest,
    questions,
    invites,
    judgePhase,
    pluginType: effectivePluginType,
  });
  const launchState = deriveLaunchState(contest, launchChecklist);

  return (
    <div className="light min-h-screen bg-slate-50 text-slate-900 selection:bg-purple-200 selection:text-purple-900" style={{ fontFamily: "var(--font-geist), system-ui, sans-serif" }}>
      <div id="contest-page-container" className="relative mx-auto max-w-5xl px-6 py-8">
        {/* Back — slim breadcrumb leading the header band */}
        <Link
          href="/org/dashboard"
          className="mb-3 inline-flex items-center gap-1.5 rounded text-xs font-medium text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        {/* Contest header — a page header on the background, not a boxed card */}
        <div className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{contest.title}</h1>
              <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${statusBadgeClass}`}>
                {contest.status}
              </span>
            </div>
            {contest.description && (
              <p className="mt-1 text-sm text-slate-500">{contest.description}</p>
            )}
            <p className="mt-2 text-xs font-medium text-slate-400">
              {new Date(contest.start_at).toLocaleString()} - {new Date(contest.end_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            {/* Judge status card */}
            <div className="w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:w-auto lg:min-w-[240px]">
              {/* Status row — click to expand controls */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setComputeExpanded((v) => !v)}
                  aria-expanded={computeExpanded}
                  className="flex min-w-0 items-center gap-2 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${judgeDotClass} ${judgePhase === "starting" || judgePhase === "ready" ? "animate-pulse" : ""}`} />
                  <span className="text-sm font-semibold text-slate-900">
                    {judge ? judgeLabel : "Unknown"}
                  </span>
                  {judge && (
                    <span className="truncate text-[11px] text-slate-400">
                      · {judge.running_instances ?? 0}/{judge.total_instances ?? 0} · {judge.mode ?? "AUTO"}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setShowComputeHelp(true)}
                    title="When to start & stop compute"
                    aria-label="When to start and stop compute"
                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => void loadJudge()}
                    disabled={judgeBusy}
                    title="Refresh judge status"
                    aria-label="Refresh judge status"
                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${judgeBusy ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={() => setComputeExpanded((v) => !v)}
                    aria-expanded={computeExpanded}
                    aria-label={computeExpanded ? "Collapse compute controls" : "Expand compute controls"}
                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${computeExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Cost signals — always visible so a billing risk is never hidden by collapse */}
              {judge?.mode === "AUTO" && (judge.running_instances ?? 0) > 0 && (
                <div className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
                  <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                  <span className="text-[10px] font-medium text-amber-700">AUTO mode — instances may be billing</span>
                </div>
              )}
              {judge?.mode === "MANUAL_ON" && judge.manual_until && (
                <div className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
                  <Clock className="h-3 w-3 shrink-0 text-amber-500" />
                  <span className="text-[10px] font-medium text-amber-700">
                    {new Date(judge.manual_until).getTime() - nowMs > 0
                      ? `Auto-stops in ${formatRemaining(new Date(judge.manual_until).getTime() - nowMs)}`
                      : "Auto-stopping…"}
                  </span>
                </div>
              )}

              {/* Details + controls — on demand; auto-shown while a start/stop is in flight */}
              {(computeExpanded || judgePhase === "starting" || judgePhase === "stopping") && (
                <>
                  {judge && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      <Cpu className="mb-0.5 mr-1 inline h-3 w-3" />
                      {judge.running_instances ?? 0} / {judge.total_instances ?? 0} instances · target {judge.target_size} · <span className="font-medium text-slate-700">{judge.mode ?? "AUTO"}</span>
                    </p>
                  )}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {(judgePhase === "stopped" || judgePhase === "unknown") && (
                      <button
                        onClick={() => void controlJudge("start")}
                        disabled={judgeBusy}
                        className="ams-btn ams-btn-success ams-btn-sm flex-1 justify-center"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start Compute
                      </button>
                    )}
                    {judgePhase === "ready" && (
                      <button
                        onClick={handleStopCompute}
                        disabled={judgeBusy}
                        title={confirmStop ? "Stopping will fail any in-progress submissions" : undefined}
                        className="ams-btn ams-btn-danger ams-btn-sm flex-1 justify-center"
                      >
                        <Square className="h-3.5 w-3.5" />
                        {confirmStop ? "Stop anyway?" : "Stop Compute"}
                      </button>
                    )}
                    {(judgePhase === "starting" || judgePhase === "stopping") && (
                      <div className="flex w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-500">
                        <RefreshCw className="h-3 w-3 animate-spin text-purple-500" />
                        {judgePhase === "starting" ? "Starting…" : "Stopping…"}
                      </div>
                    )}
                    {judgePhase === "ready" && (
                      <button
                        onClick={() => void controlJudge("start")}
                        disabled={judgeBusy}
                        title="Restart compute"
                        className="ams-btn ams-btn-secondary ams-btn-sm"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            {judgeError ? <p className="text-[11px] text-red-600">{judgeError}</p> : null}
          </div>
        </div>

        {showIdleNudge && judge?.mode === "MANUAL_ON" ? (
          <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-amber-300 bg-white p-4 shadow-lg">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Compute is still running</p>
                <p className="mt-1 text-xs text-slate-500">
                  No activity for a while. Stop compute to avoid unnecessary cost
                  {judge.manual_until && new Date(judge.manual_until).getTime() - nowMs > 0
                    ? ` — it will auto-stop in ${formatRemaining(new Date(judge.manual_until).getTime() - nowMs)} otherwise`
                    : ""}
                  .
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => { setShowIdleNudge(false); void controlJudge("stop"); }}
                    disabled={judgeBusy}
                    className="ams-btn ams-btn-danger ams-btn-sm"
                  >
                    <Square className="h-3.5 w-3.5" />
                    Stop Compute
                  </button>
                  <button
                    onClick={() => {
                      idleSnoozeUntilRef.current = Date.now() + IDLE_SNOOZE_MS;
                      lastActivityRef.current = Date.now();
                      setShowIdleNudge(false);
                    }}
                    className="ams-btn ams-btn-secondary ams-btn-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <Modal
          open={showComputeHelp}
          onClose={() => setShowComputeHelp(false)}
          labelledBy="compute-help-title"
          describedBy="compute-help-desc"
          cardClassName="max-w-lg"
        >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-purple-600" />
                  <div>
                    <p id="compute-help-title" className="text-sm font-semibold text-slate-900">Using compute efficiently</p>
                    <p id="compute-help-desc" className="mt-0.5 text-xs text-slate-500">Compute runs the judge that grades submissions — it bills only while running.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowComputeHelp(false)}
                  aria-label="Close"
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4 overflow-y-auto p-5 text-sm text-slate-600">
                <div>
                  <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Testing questions (jury validation)
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed">
                    <span className="font-medium text-slate-700">Start Compute</span> before you run
                    validation on your questions, validate, then <span className="font-medium text-slate-700">Stop Compute</span> as
                    soon as you&apos;re done. Idle compute keeps billing, so stopping promptly is the
                    biggest cost saver. If you forget, an ad-hoc session auto-stops on its own after a
                    short safety window.
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <Activity className="h-3.5 w-3.5 text-purple-500" />
                    Running a contest
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed">
                    <span className="font-medium text-slate-700">Start Compute about 1 hour before</span> the
                    contest begins so the judge is warm and ready. Leave it running for the whole
                    contest (e.g. ~3 hours). When you start it for a scheduled contest, the auto-stop
                    timer is set to a little after the contest&apos;s end — but it&apos;s best to
                    <span className="font-medium text-slate-700"> Stop Compute</span> yourself once it
                    finishes.
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                  <span className="font-semibold">Heads up:</span> Stop Compute is blocked while a
                  contest is live (it would fail in-progress submissions). You can still force it if
                  you&apos;re sure. The card shows running instances, mode, and the auto-stop countdown.
                </div>
              </div>
        </Modal>

        <LaunchChecklistPanel items={launchChecklist} state={launchState} />

        {/* Tabs — horizontally scrollable on narrow screens, 5-up grid from sm */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:grid sm:grid-cols-5 sm:overflow-visible">
          {([
            ["questions", "Questions", questions.length, Code2],
            ["participants", "Participants", invites.length, Users],
            ["leaderboard", "Leaderboard", null, BarChart2],
            ["monitor", "Monitor", null, Activity],
            ["settings", "Settings", null, Settings],
          ] as const).map(([key, label, count, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-current={tab === key ? "page" : undefined}
              className={`flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                tab === key
                  ? "border-purple-100 bg-purple-50 text-purple-800 shadow-sm"
                  : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
              {count !== null && (
                <span
                  className={`rounded px-1.5 text-xs ${tab === key ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {count}
                </span>
              )}
              {key === "monitor" && incidentsOpenCount > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700" title={`${incidentsOpenCount} open incident${incidentsOpenCount === 1 ? "" : "s"}`}>
                  {incidentsOpenCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "questions" && (
          <QuestionsTab
            contestId={id}
            pluginType={effectivePluginType}
            questions={questions}
            onRefresh={load}
          />
        )}
        {tab === "participants" && (
          <ParticipantsTab
            contestId={id}
            invites={invites}
            onRefresh={load}
          />
        )}
        {tab === "leaderboard" && contest && (
          <LeaderboardTab contestId={id} contestStatus={contest.status} contest={contest} onGoToSettings={goToSettings} />
        )}
        {tab === "monitor" && (
          <MonitorTab contestId={id} openIncidentCount={incidentsOpenCount} />
        )}
        {tab === "settings" && (
          <SettingsTab
            contest={contest}
            forcedMode={forcedMode}
            onSaved={load}
            onDeleted={goToDashboard}
          />
        )}
      </div>
    </div>
  );
}

type SupportIncident = {
  id: string;
  contest_id: string | null;
  session_id: string | null;
  candidate_email: string;
  kind: string;
  summary: string;
  details: Record<string, unknown> | null;
  status: "OPEN" | "RESOLVED";
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

const INCIDENT_KIND_LABEL: Record<string, string> = {
  LOGIN: "Sign-in",
  READINESS: "Device readiness",
  POLICY_BLOCK: "Entry blocked",
  DISCONNECT: "Disconnect / rejoin",
  OTHER: "Other",
};

function IncidentsTab({ contestId }: { contestId: string }) {
  const [items, setItems] = useState<SupportIncident[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const data = await apiFetch<{ items: SupportIncident[] }>(
        `/api/org/contests/${contestId}/incidents`
      );
      setItems(data.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unable to load incidents.");
    } finally {
      setBusy(false);
    }
  }, [contestId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(id: string) {
    setResolving(id);
    try {
      await apiFetch(`/api/org/contests/${contestId}/incidents/${id}/resolve`, { method: "POST" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unable to resolve incident.");
    } finally {
      setResolving(null);
    }
  }

  const openCount = items.filter((i) => i.status === "OPEN").length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Candidate help requests
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            Incidents
            {openCount > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {openCount} open
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Raised by candidates from the login, device-check, and rejoin screens.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      ) : busy && items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Loading incidents…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No help requests. Candidates who get stuck will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((incident) => {
            const isOpen = incident.status === "OPEN";
            const isExpanded = expanded === incident.id;
            return (
              <div
                key={incident.id}
                className={`rounded-xl border ${isOpen ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"}`}
              >
                <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                          isOpen
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isOpen ? "Open" : "Resolved"}
                      </span>
                      <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {INCIDENT_KIND_LABEL[incident.kind] ?? incident.kind}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(incident.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-900">{incident.summary}</p>
                    <p className="text-xs text-slate-500">{incident.candidate_email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : incident.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
                    >
                      {isExpanded ? "Hide details" : "Details"}
                    </button>
                    {isOpen && (
                      <button
                        type="button"
                        disabled={resolving === incident.id}
                        onClick={() => void resolve(incident.id)}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {resolving === incident.id ? "…" : "Mark resolved"}
                      </button>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <pre className="overflow-x-auto border-t border-slate-200 bg-slate-950 px-4 py-3 text-xs leading-5 text-slate-200">
{JSON.stringify(incident.details ?? {}, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// Skeleton that mirrors the real contest workspace layout (breadcrumb, header
// band, launch checklist, 5-tab bar, content) so the page resolves into place
// without a spinner flash or layout jump. Memoized + prop-less so the parent's
// state churn during load (judge fetch, etc.) never re-renders this tree — it
// mounts once, shimmers (paint-only, disabled under reduced-motion), then
// unmounts the instant data arrives, leaving zero steady-state cost.
const ContestDetailSkeleton = memo(function ContestDetailSkeleton() {
  return (
    <div className="light min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: "var(--font-geist), system-ui, sans-serif" }}>
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Breadcrumb */}
        <Skeleton className="mb-3 h-3 w-20" />

        {/* Header band */}
        <div className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="space-y-2.5">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl lg:w-60" />
        </div>

        {/* Launch checklist card */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-52" />
            </div>
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </div>

        {/* Tab bar */}
        <div className="mb-6 grid grid-cols-5 gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-xl" />
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
});

function LaunchChecklistPanel({
  items,
  state,
}: {
  items: LaunchChecklistItem[];
  state: { label: string; tone: "draft" | "ready" | "live" | "attention" | "ended" };
}) {
  const completeCount = items.filter((item) => item.state === "complete").length;
  // A fully-configured contest doesn't need its all-green checklist dominating
  // the page on every visit — collapse it by default once ready/live/ended, but
  // leave it open while there's still setup to do (draft/attention).
  const [collapsed, setCollapsed] = useState(
    () => state.tone === "ready" || state.tone === "live" || state.tone === "ended"
  );
  const stateClass =
    state.tone === "ready" || state.tone === "live"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : state.tone === "attention"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : state.tone === "ended"
      ? "border-slate-200 bg-slate-100 text-slate-600"
      : "border-purple-200 bg-purple-50 text-purple-700";

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="launch-readiness-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Launch readiness</p>
          <h2 id="launch-readiness-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            Contest launch checklist
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {completeCount} of {items.length} checks complete before launch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={"inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold " + stateClass}>
            {state.label}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-controls="launch-readiness-items"
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            {collapsed ? "Show checks" : "Hide checks"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        </div>
      </div>

      {collapsed ? null : (
      <div id="launch-readiness-items" className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const complete = item.state === "complete";
          const blocked = item.state === "blocked";
          const Icon = complete ? CheckCircle2 : blocked ? AlertTriangle : HelpCircle;
          const itemClass = complete
            ? "border-emerald-100 bg-emerald-50/60 text-emerald-700"
            : blocked
            ? "border-red-100 bg-red-50/60 text-red-700"
            : "border-slate-200 bg-slate-50 text-slate-500";

          return (
            <div key={item.id} className={"rounded-xl border p-3 " + itemClass}>
              <div className="flex items-start gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-current opacity-80">{item.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}

function LiveMonitorTab({ contestId }: { contestId: string }) {
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [subs, setSubs] = useState<LiveSubmission[]>([]);
  const [proctor, setProctor] = useState<LiveProctorEvent[]>([]);
  const [infra, setInfra] = useState<LiveInfraEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [transport, setTransport] = useState<"SSE" | "POLLING">("SSE");

  const loadLive = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const [runtimeData, submissionsData, proctorData, infraData] = await Promise.all([
        apiFetch<RuntimeStatus>(`/api/org/contests/${contestId}/runtime-status`),
        apiFetch<{ items: LiveSubmission[] }>(`/api/org/contests/${contestId}/live/submissions`),
        apiFetch<{ items: LiveProctorEvent[] }>(`/api/org/contests/${contestId}/live/proctor-events`),
        apiFetch<{ items: LiveInfraEvent[] }>(`/api/org/contests/${contestId}/live/infra-events`),
      ]);
      setRuntime(runtimeData);
      setSubs(submissionsData.items ?? []);
      setProctor(proctorData.items ?? []);
      setInfra(infraData.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unable to load live monitor.");
    } finally {
      setBusy(false);
    }
  }, [contestId]);

  useEffect(() => {
    // Initial fetch to load historical items
    void loadLive();

    let eventSource: EventSource | null = null;
    let pollInterval: any = null;

    const startPolling = () => {
      setTransport("POLLING");
      if (pollInterval) return;
      pollInterval = setInterval(() => {
        void loadLive();
      }, 5000);
    };

    const startSSE = () => {
      setTransport("SSE");
      eventSource = new EventSource(`/api/org/contests/${contestId}/live/stream`);

      eventSource.addEventListener("submission.updated", (event: MessageEvent) => {
        try {
          const newSub = JSON.parse(event.data) as LiveSubmission;
          setSubs((prev) => {
            const idx = prev.findIndex((s) => s.attempt_id === newSub.attempt_id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = newSub;
              return next;
            }
            return [newSub, ...prev].slice(0, 500);
          });
        } catch (e) {
          console.error("Error parsing SSE submission", e);
        }
      });

      eventSource.addEventListener("activity.event", (event: MessageEvent) => {
        try {
          const newProc = JSON.parse(event.data) as LiveProctorEvent;
          setProctor((prev) => {
            const idx = prev.findIndex((p) => p.id === newProc.id);
            if (idx >= 0) return prev;
            return [newProc, ...prev].slice(0, 1000);
          });
        } catch (e) {
          console.error("Error parsing SSE proctor event", e);
        }
      });

      eventSource.addEventListener("infra.event", (event: MessageEvent) => {
        try {
          const newInfra = JSON.parse(event.data) as LiveInfraEvent;
          setInfra((prev) => {
            const idx = prev.findIndex((i) => i.entity_id === newInfra.entity_id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = newInfra;
              return next;
            }
            return [newInfra, ...prev].slice(0, 300);
          });
        } catch (e) {
          console.error("Error parsing SSE infra event", e);
        }
      });

      eventSource.onerror = (e) => {
        console.warn("SSE stream error, switching to fallback short polling", e);
        if (eventSource) {
          eventSource.close();
        }
        startPolling();
      };
    };

    startSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [contestId, loadLive]);

  async function runReadinessCheck() {
    setErr(null);
    try {
      await apiFetch(`/api/org/contests/${contestId}/runtime-readiness/check`, { method: "POST" });
      await loadLive();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Readiness check failed.");
    }
  }

  const runtimeStatusColor = runtime?.runtime_status === "READY"
    ? "text-emerald-600"
    : runtime?.runtime_status === "WARMING"
    ? "text-amber-500"
    : runtime?.runtime_status === "DEGRADED"
    ? "text-red-600"
    : "text-slate-500";

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-2xl font-bold tracking-tight ${runtimeStatusColor}`}>
                {runtime?.runtime_status ?? "UNKNOWN"}
              </span>
              {runtime?.runtime_ready && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  READY
                </span>
              )}
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  transport === "SSE"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border-amber-200 bg-amber-50 text-amber-600"
                }`}
              >
                {transport === "SSE" ? "SSE live" : "Polling fallback"}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              <Cpu className="mb-0.5 mr-1 inline h-3 w-3" />
              {runtime
                ? `${runtime.capacity.running_instances ?? 0} / ${runtime.capacity.total_instances ?? 0} instances up · target ${runtime.capacity.target_size}`
                : "No runtime data"}
            </p>
            {runtime?.ready_checked_at && (
              <p className="mt-0.5 text-[11px] text-slate-400">
                Last readiness check: {new Date(runtime.ready_checked_at).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadLive()}
              title="Refresh"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40"
              disabled={busy}
            >
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => void runReadinessCheck()} className="ams-btn ams-btn-success ams-btn-sm">
              <Zap className="h-3.5 w-3.5" />
              Run readiness check
            </button>
          </div>
        </div>
      </div>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <LiveTable
          title="Submissions"
          count={subs.length}
          items={subs}
          render={(item) => (
            <>
              <span className="font-mono text-[11px] text-slate-700">{item.candidate}</span>
              <span className={`text-[11px] font-medium ${item.final_verdict === "AC" ? "text-emerald-600" : item.final_verdict ? "text-red-500" : "text-slate-400"}`}>
                {item.final_verdict ?? item.status}
              </span>
            </>
          )}
        />
        <LiveTable
          title="Proctor Events"
          count={proctor.length}
          items={proctor}
          rowClass={(item) =>
            item.severity === "CRITICAL"
              ? "border-l-2 border-l-red-400 bg-red-50/40"
              : item.severity === "WARN"
              ? "border-l-2 border-l-amber-400 bg-amber-50/30"
              : ""
          }
          render={(item) => (
            <>
              <span className="font-mono text-[11px] text-slate-700">{item.candidate}</span>
              <span className={`text-[11px] font-medium ${
                item.severity === "CRITICAL"
                  ? "text-red-600"
                  : item.severity === "WARN"
                  ? "text-amber-600"
                  : "text-slate-500"
              }`}>
                {item.event_type}
              </span>
            </>
          )}
        />
        <LiveTable
          title="Infra Events"
          count={infra.length}
          items={infra}
          render={(item) => (
            <>
              <span className="font-mono text-[11px] text-slate-700">{item.status}</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                {item.source ?? item.reason_code}
              </span>
            </>
          )}
        />
      </div>
    </div>
  );
}

function LiveTable<T>({
  title,
  count,
  items,
  render,
  rowClass,
}: {
  title: string;
  count?: number;
  items: T[];
  render: (item: T) => ReactNode;
  rowClass?: (item: T) => string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2.5">
        <span className="text-xs font-semibold text-slate-700">{title}</span>
        {count !== undefined && (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {count}
          </span>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="mb-2 h-5 w-5 text-slate-300" />
            <p className="text-[11px] text-slate-400">No events yet</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between border-b border-slate-100 px-3 py-2 last:border-b-0 ${idx % 2 === 1 ? "bg-slate-50/40" : ""} ${rowClass ? rowClass(item) : ""}`}
            >
              {render(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LeaderboardTabImpl({
  contestId,
  contestStatus,
  contest,
  onGoToSettings,
}: {
  contestId: string;
  contestStatus: string;
  contest: Contest;
  onGoToSettings: () => void;
}) {
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState<HistoricalSubmission[]>([]);
  const [submissionsBusy, setSubmissionsBusy] = useState(false);
  const [submissionsErr, setSubmissionsErr] = useState<string | null>(null);

  // Drag-and-drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);

  // Per-row delete confirmation: null | "confirm1" | "confirm2"
  const [deleteConfirm, setDeleteConfirm] = useState<{ sessionId: string; step: 1 | 2 } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Client-side filter by candidate name / email. While a filter is active,
  // drag-reorder is disabled (the rendered subset would corrupt index-based
  // reordering); the hint and the off-state make that explicit.
  const [query, setQuery] = useState("");

  const loadBoard = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const data = await apiFetch<LeaderboardResponse>(`/api/org/contests/${contestId}/leaderboard`);
      setBoard(data);
      setEntries(data.entries);
      setOrderDirty(false);
      setSelectedSessionId((current) => current ?? data.entries[0]?.session_id ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unable to load leaderboard.");
    } finally {
      setBusy(false);
    }
  }, [contestId]);

  const loadSubmissions = useCallback(async (sessionId: string) => {
    setSubmissionsBusy(true);
    setSubmissionsErr(null);
    try {
      const data = await apiFetch<HistoricalSubmission[]>(
        `/api/org/contests/${contestId}/leaderboard/sessions/${sessionId}/submissions`
      );
      setSubmissions(data);
    } catch (e) {
      setSubmissionsErr(e instanceof Error ? e.message : "Unable to load submissions.");
    } finally {
      setSubmissionsBusy(false);
    }
  }, [contestId]);

  useEffect(() => { void loadBoard(); }, [loadBoard]);

  // Suspend the live auto-refresh while the admin is mid-interaction (unsaved
  // drag reorder or an open delete confirmation), otherwise the 2s poll would
  // call loadBoard() and clobber the in-progress edit with server data.
  const suspendRefreshRef = useRef(false);
  useEffect(() => {
    suspendRefreshRef.current = orderDirty || deleteConfirm !== null;
  }, [orderDirty, deleteConfirm]);

  useEffect(() => {
    if (contestStatus !== "ACTIVE") return;
    const timer = setInterval(() => {
      if (!suspendRefreshRef.current) void loadBoard();
    }, 2000);
    return () => clearInterval(timer);
  }, [contestStatus, loadBoard]);

  useEffect(() => {
    if (!showSubmissions || !selectedSessionId) return;
    void loadSubmissions(selectedSessionId);
    if (contestStatus !== "ACTIVE") return;
    const timer = setInterval(() => void loadSubmissions(selectedSessionId), 2000);
    return () => clearInterval(timer);
  }, [contestStatus, loadSubmissions, selectedSessionId, showSubmissions]);

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────
  function onDragStart(index: number) { setDragIndex(index); }
  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setEntries((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next.map((entry, i) => ({ ...entry, rank: i + 1 }));
    });
    setDragIndex(index);
    setOrderDirty(true);
    setOrderSaved(false);
  }
  function onDragEnd() { setDragIndex(null); }

  async function saveOrder() {
    setSavingOrder(true);
    try {
      await apiFetch(`/api/org/contests/${contestId}/leaderboard/order`, {
        method: "PUT",
        body: JSON.stringify({ order: entries.map((e) => e.session_id) }),
      });
      setOrderDirty(false);
      setOrderSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save order.");
    } finally {
      setSavingOrder(false);
    }
  }

  // ── Delete from leaderboard ─────────────────────────────────────────────────
  async function confirmDelete(sessionId: string) {
    if (!deleteConfirm || deleteConfirm.step !== 2) return;
    setDeleting(true);
    try {
      await apiFetch(
        `/api/org/contests/${contestId}/leaderboard/sessions/${sessionId}/exclude`,
        { method: "DELETE" }
      );
      setDeleteConfirm(null);
      await loadBoard();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove candidate.");
    } finally {
      setDeleting(false);
    }
  }

  const selectedEntry =
    entries.find((entry) => entry.session_id === selectedSessionId) ?? entries[0] ?? null;

  // O(1) verdict lookup per cell instead of entry.problems.find() on every poll.
  const verdictByEntry = useMemo(() => {
    const m = new Map<string, Map<string, string>>();
    for (const entry of entries) {
      const inner = new Map<string, string>();
      for (const p of entry.problems) inner.set(p.question_id, p.verdict);
      m.set(entry.session_id, inner);
    }
    return m;
  }, [entries]);

  const trimmedQuery = query.trim().toLowerCase();
  const filtering = trimmedQuery.length > 0;
  const visibleEntries = filtering
    ? entries.filter(
        (entry) =>
          entry.candidate_name.toLowerCase().includes(trimmedQuery) ||
          entry.candidate_email.toLowerCase().includes(trimmedQuery)
      )
    : entries;

  // Build a CSV from the full board (not the filtered view) and trigger a
  // client-side download. Fields are quote-escaped so commas/quotes in names
  // can't break columns.
  function exportCsv() {
    if (!board) return;
    const esc = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const header = [
      "Rank",
      "Candidate",
      "Email",
      "Score",
      "Solved",
      "Penalty (seconds)",
      ...board.questions.map((q) => `Q${q.order_index + 1}`),
    ];
    const rows = entries.map((entry) => [
      entry.rank,
      entry.candidate_name,
      entry.candidate_email,
      entry.total_score,
      entry.solved_count,
      entry.penalty_seconds,
      ...board.questions.map((q) => entry.problems.find((p) => p.question_id === q.id)?.verdict ?? "UNATTEMPTED"),
    ]);
    const csv = [header, ...rows].map((row) => row.map(esc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leaderboard-${contestId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Contest standings</p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Leaderboard</h2>
              {orderDirty && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                  Unsaved order
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Drag rows to reorder. Click the trash icon to remove a candidate (hidden from all leaderboard views).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {orderDirty && (
              <button
                type="button"
                onClick={() => void saveOrder()}
                disabled={savingOrder}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                {savingOrder ? "Saving…" : orderSaved ? "Saved!" : "Save Order"}
              </button>
            )}
            {orderDirty && (
              <button
                type="button"
                onClick={() => { setEntries(board?.entries ?? []); setOrderDirty(false); setOrderSaved(false); }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadBoard()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!board || entries.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <Upload className="h-3.5 w-3.5 rotate-180" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => { if (!selectedEntry) return; setShowSubmissions(true); }}
              disabled={!selectedEntry}
              className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              View Submissions
            </button>
          </div>
        </div>

        {/* Results visibility banner */}
        {contest.results_visible_at && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Lock className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Results visible to candidates after{" "}
              <strong>{new Date(contest.results_visible_at).toLocaleString()}</strong>.{" "}
              <button
                type="button"
                onClick={onGoToSettings}
                className="font-semibold text-amber-900 underline underline-offset-2 transition hover:text-amber-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                Edit in Settings
              </button>{" "}
              to change.
            </span>
          </div>
        )}

        {err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
        ) : busy && !board ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Loading leaderboard…</div>
        ) : !board || entries.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No ranked submissions yet.
          </div>
        ) : (
          <>
            {selectedEntry ? (
              <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Selected: #{selectedEntry.rank} {selectedEntry.candidate_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedEntry.total_score} points · {selectedEntry.solved_count} solved · penalty {formatPenaltySeconds(selectedEntry.penalty_seconds)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {board.updated_at ? `Updated ${new Date(board.updated_at).toLocaleTimeString()}` : ""}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by name or email"
                  aria-label="Filter candidates by name or email"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear filter"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {filtering && (
                <p className="text-xs text-slate-400">
                  {visibleEntries.length} of {entries.length} shown · reordering paused while filtering
                </p>
              )}
            </div>

            {filtering && visibleEntries.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No candidates match &ldquo;{query.trim()}&rdquo;.
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-400">
                    <th className="w-6 px-1 py-3" />
                    <th className="px-3 py-3 font-semibold">Rank</th>
                    <th className="px-3 py-3 font-semibold">Candidate</th>
                    <th className="px-3 py-3 font-semibold">Score</th>
                    <th className="px-3 py-3 font-semibold">Solved</th>
                    <th className="px-3 py-3 font-semibold">Penalty</th>
                    {board.questions.map((question) => (
                      <th key={question.id} className="px-2 py-3 text-center font-semibold">
                        Q{question.order_index + 1}
                      </th>
                    ))}
                    <th className="px-2 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEntries.map((entry, index) => {
                    const active = entry.session_id === selectedSessionId;
                    const isConfirming = deleteConfirm?.sessionId === entry.session_id;
                    return (
                      <tr
                        key={entry.session_id}
                        draggable={!filtering}
                        onDragStart={() => onDragStart(index)}
                        onDragOver={(e) => onDragOver(e, index)}
                        onDragEnd={onDragEnd}
                        onClick={() => {
                          if (!isConfirming) setSelectedSessionId(entry.session_id);
                        }}
                        onKeyDown={(e) => {
                          if (isConfirming) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedSessionId(entry.session_id);
                          }
                        }}
                        tabIndex={0}
                        aria-selected={active}
                        className={`group cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400 ${
                          active ? "bg-purple-50/70" : "bg-white"
                        } ${dragIndex === index ? "opacity-50" : ""}`}
                      >
                        {/* Drag handle — appears on row hover, full-cell grab target. Hidden while filtering (reordering is paused). */}
                        <td className="px-1 py-3">
                          {!filtering && (
                            <span
                              className="flex h-7 w-6 items-center justify-center rounded text-slate-300 opacity-0 transition cursor-grab hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing group-hover:opacity-100 group-focus-within:opacity-100"
                              title="Drag to reorder"
                              aria-hidden="true"
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-900">#{entry.rank}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-900">{entry.candidate_name}</div>
                          <div className="text-xs text-slate-500">{entry.candidate_email}</div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-900">{entry.total_score}</td>
                        <td className="px-3 py-3 text-slate-600">{entry.solved_count}</td>
                        <td className="px-3 py-3 text-slate-600">{formatPenaltySeconds(entry.penalty_seconds)}</td>
                        {board.questions.map((question) => {
                          const verdict = verdictByEntry.get(entry.session_id)?.get(question.id) ?? "UNATTEMPTED";
                          return (
                            <td key={`${entry.session_id}:${question.id}`} className="px-2 py-3 text-center">
                              <VerdictBadge verdict={verdict} />
                            </td>
                          );
                        })}
                        {/* Delete actions */}
                        <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {isConfirming && deleteConfirm.step === 1 ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-xs text-slate-600">Remove?</span>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm({ sessionId: entry.session_id, step: 2 })}
                                className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
                              >
                                No
                              </button>
                            </div>
                          ) : isConfirming && deleteConfirm.step === 2 ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-xs font-semibold text-red-700">Confirm remove?</span>
                              <button
                                type="button"
                                disabled={deleting}
                                onClick={() => void confirmDelete(entry.session_id)}
                                className="rounded border border-red-400 bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {deleting ? "…" : "Remove"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              title="Remove from leaderboard"
                              aria-label={`Remove ${entry.candidate_name} from leaderboard`}
                              onClick={() => setDeleteConfirm({ sessionId: entry.session_id, step: 1 })}
                              className="rounded p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </>
        )}
      </section>

      {selectedEntry ? (
        <Modal
          open={showSubmissions}
          onClose={() => setShowSubmissions(false)}
          labelledBy="submission-history-title"
          describedBy="submission-history-desc"
          cardClassName="max-w-5xl"
        >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p id="submission-history-title" className="text-sm font-semibold text-slate-900">
                  {selectedEntry.candidate_name} · Submission history
                </p>
                <p id="submission-history-desc" className="mt-1 text-xs text-slate-500">
                  Historical solutions with verdicts across all questions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmissions(false)}
                aria-label="Close"
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {submissionsErr ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submissionsErr}</div>
              ) : submissionsBusy && submissions.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Loading submissions…</div>
              ) : submissions.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No submissions found for this participant.</div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => {
                    const verdict = submission.final_verdict ?? submission.status ?? "PENDING";
                    return (
                      <article key={submission.id} className="overflow-hidden rounded-2xl border border-slate-200">
                        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{submission.question_title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Attempt #{submission.attempt_no} · {submission.language} · {new Date(submission.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`inline-flex items-center rounded-md border px-2 py-1 font-semibold ${verdictTone(verdict)}`}>
                              {verdict}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600">Score {submission.score}</span>
                            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600">
                              {submission.runtime_ms != null ? `${submission.runtime_ms}ms` : "Runtime N/A"}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600">
                              {submission.memory_kb != null ? `${Math.round(submission.memory_kb / 1024)}MB` : "Memory N/A"}
                            </span>
                          </div>
                        </div>
                        {submission.error_message ? (
                          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                            {submission.error_message}
                          </div>
                        ) : null}
                        <pre className="overflow-x-auto bg-slate-950 px-4 py-4 text-xs leading-6 text-slate-200">
{submission.source_code || "// Submitted source unavailable"}
                        </pre>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
        </Modal>
      ) : null}
    </>
  );
}

// ─── Questions tab ───────────────────────────────────────────
function QuestionsTabImpl({ contestId, pluginType, questions, onRefresh }: {
  contestId: string; pluginType: string; questions: Question[]; onRefresh: () => void;
}) {
  const isChessContest = String(pluginType ?? "").toUpperCase() === "CHESS";
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Auto-dismiss the success notice; auto-reset a pending delete confirmation.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

  async function deleteQuestion(qId: string) {
    setDeleting(qId);
    setConfirmDeleteId(null);
    try {
      await apiFetch<{ deleted: boolean }>(`/api/org/contests/${contestId}/questions/${qId}`, { method: "DELETE" });
      setNotice("Question deleted.");
      onRefresh();
    } finally {
      setDeleting(null);
    }
  }

  function startAdding() {
    setAdding(true);
    setEditId(null);
    setConfirmDeleteId(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </p>
          {questions.length > 1 && !isChessContest && (
            <p className="text-[11px] text-slate-400">Listed in the order candidates will see them.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isChessContest ? (
            <Link
              href={`/org/contests/${contestId}/chess/testplay`}
              className="ams-btn ams-btn-success ams-btn-md"
            >
              <Play className="h-4 w-4" />
              Open Chess Test Play
            </Link>
          ) : (
            <button
              onClick={startAdding}
              className="ams-btn ams-btn-primary ams-btn-md"
            >
              <Plus className="h-4 w-4" />
              Add question
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      {isChessContest ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">This contest is in CHESS mode.</p>
          <p className="mt-1 text-xs text-emerald-700/75">
            CP question editing is disabled for CHESS contests. Use the Chess Test Play workflow for rulesets, validation, and move simulation.
          </p>
        </div>
      ) : null}

      {adding && !isChessContest && (
        <QuestionForm
          contestId={contestId}
          nextIndex={questions.length + 1}
          onSaved={(warning) => { setAdding(false); setNotice(warning ?? "Question created successfully."); onRefresh(); }}
          onCancel={() => setAdding(false)}
          saving={saving}
          setSaving={setSaving}
        />
      )}

      <div className="space-y-3">
        {isChessContest ? null : questions.map((q, i) => {
          const qType = normalizeQuestionType(q.question_type);
          const typeBorderClass = qType === "code" ? "border-l-purple-400" : qType === "interactive" ? "border-l-indigo-400" : qType === "follow_up" ? "border-l-amber-400" : "border-l-teal-400";
          const typePillClass = qType === "code" ? "bg-purple-50 text-purple-700 border border-purple-200" : qType === "interactive" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : qType === "follow_up" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-teal-50 text-teal-700 border border-teal-200";
          return (
            <div key={q.id}>
              {editId === q.id ? (
                <QuestionForm
                  contestId={contestId}
                  existing={q}
                  nextIndex={q.order_index}
                  onSaved={(warning) => { setEditId(null); setNotice(warning ?? "Question updated successfully."); onRefresh(); }}
                  onCancel={() => setEditId(null)}
                  saving={saving}
                  setSaving={setSaving}
                />
              ) : (
                <div className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md ${typeBorderClass}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-slate-950">{q.title}</span>
                        <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          {q.points} pts
                        </span>
                      </div>
                      {q.description && qType !== "follow_up" && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{q.description}</p>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${typePillClass}`}>
                          {QUESTION_TYPE_META[qType].label}
                        </span>
                        {(qType === "code" || qType === "interactive") && (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                            {q.time_limit_ms} ms
                          </span>
                        )}
                        {(qType === "code" || qType === "interactive") && (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                            {q.memory_limit_mb} MB
                          </span>
                        )}
                        {qType === "follow_up" && (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">
                            {parseFollowUpParts(q.description).length} part{parseFollowUpParts(q.description).length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => { setEditId(q.id); setAdding(false); setConfirmDeleteId(null); }}
                        className="ams-btn ams-btn-secondary ams-btn-sm"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === q.id ? (
                        <button
                          onClick={() => void deleteQuestion(q.id)}
                          disabled={deleting === q.id}
                          className="ams-btn ams-btn-danger ams-btn-sm"
                        >
                          {deleting === q.id ? "Deleting…" : "Confirm?"}
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(q.id)}
                          disabled={deleting === q.id}
                          aria-label="Delete question"
                          title="Delete question"
                          className="ams-btn ams-btn-danger ams-icon-btn-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {questions.length === 0 && !adding && !isChessContest && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
              <Code2 className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-950">No questions yet</p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs">
              Add judged problems, interactive questions, short-answer follow-ups, or Markov-chain diagrams.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {(["Code submission", "Interactive", "Follow Up", "Markov Chain"] as const).map((t) => (
                <span key={t} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                  {t}
                </span>
              ))}
            </div>
            <button
              onClick={startAdding}
              className="ams-btn ams-btn-primary ams-btn-md mt-5"
            >
              <Plus className="h-4 w-4" />
              Add your first question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Question form (add / edit) ──────────────────────────────
type CpConfigSnapshot = {
  checker_type: "token" | "custom";
  checker_code: string | null;
  validator_code: string;
};

type FollowUpPart = {
  id: string;
  statement: string;
  expected_answer: string;
  points: number;
};

const QUESTION_TYPE_META: Record<"code" | "interactive" | "follow_up" | "markov", { label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = {
  code: { label: "Code submission", hint: "Classic judged problem — statement, tests, validator and checker. Graded automatically by the judge.", icon: Code2 },
  interactive: { label: "Interactive", hint: "The student's program converses with your custom checker over stdin/stdout. Requires a custom checker.", icon: MessageSquare },
  follow_up: { label: "Follow Up", hint: "Short-answer parts with expected answers. Total points are the sum of all parts.", icon: ListChecks },
  markov: { label: "Markov Chain", hint: "The student draws a Markov chain; it is graded against the answer-key chain you build below.", icon: Share2 },
};

function normalizeQuestionType(raw: string | undefined): "code" | "interactive" | "follow_up" | "markov" {
  return raw === "interactive" || raw === "follow_up" || raw === "markov" ? raw : "code";
}

// Section heading for the long question form — matches the uppercase-tracked
// label style used on the leaderboard/incidents panels so the form reads as a
// sequence of steps rather than a flat stack.
function FormSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{children}</p>
  );
}

function parseFollowUpParts(raw: string): FollowUpPart[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as FollowUpPart[];
  } catch { /* empty */ }
  return [];
}

function QuestionForm({ contestId, existing, nextIndex, onSaved, onCancel, saving, setSaving }: {
  contestId: string;
  existing?: Question;
  nextIndex: number;
  onSaved: (warning?: string) => void;
  onCancel: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  // Ref to the CP studio — used to read validator/checker code synchronously on save
  const studioRef = useRef<CPProblemStudioHandle>(null);
  const [title, setTitle]             = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [html, setHtml]               = useState(existing?.html_starter ?? "");
  const [css, setCss]                 = useState(existing?.css_starter ?? "");
  const [js, setJs]                   = useState(existing?.js_starter ?? "");
  const [points, setPoints]           = useState(existing?.points ?? 10);
  const originalType = existing ? normalizeQuestionType(existing.question_type) : null;
  const [questionType, setQuestionType] = useState<"code" | "interactive" | "follow_up" | "markov">(
    normalizeQuestionType(existing?.question_type)
  );
  const [markovChain, setMarkovChain] = useState<MarkovChain>(() => {
    if (existing?.markov_answer_json) {
      try { return JSON.parse(existing.markov_answer_json) as MarkovChain; } catch { /**/ }
    }
    return { states: [], transitions: [] };
  });
  const [followUpParts, setFollowUpParts] = useState<FollowUpPart[]>(() =>
    existing?.question_type === "follow_up"
      ? (parseFollowUpParts(existing.description).length > 0
          ? parseFollowUpParts(existing.description)
          : [{ id: crypto.randomUUID(), statement: "", expected_answer: "", points: 10 }])
      : [{ id: crypto.randomUUID(), statement: "", expected_answer: "", points: 10 }]
  );
  const [timeLimit, setTimeLimit]     = useState(existing?.time_limit_ms ?? 2000);
  const [memoryLimit, setMemoryLimit] = useState(existing?.memory_limit_mb ?? 256);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);

  useEffect(() => {
    // Widen the page while the editor is open, then restore the container's
    // ORIGINAL classes verbatim on unmount. (Snapshotting avoids the bug where
    // restoring a hardcoded width leaves the page permanently narrowed if the
    // base class — currently max-w-5xl — ever differs from the assumed one.)
    const wrapper = document.getElementById("contest-page-container");
    if (!wrapper) return;
    const originalClassName = wrapper.className;
    wrapper.classList.remove("max-w-5xl", "max-w-4xl");
    wrapper.classList.add("max-w-[98vw]", "lg:max-w-[95vw]");
    return () => {
      wrapper.className = originalClassName;
    };
  }, [contestId]);

  function isDirty(): boolean {
    if (!existing) {
      // New question: any meaningful content counts as dirty.
      return Boolean(
        title.trim() ||
        description.trim() ||
        (questionType === "follow_up" && followUpParts.some((p) => p.statement.trim() || p.expected_answer.trim())) ||
        (questionType === "markov" && markovChain.states.length > 0)
      );
    }
    if (title !== existing.title) return true;
    if (questionType !== originalType) return true;
    if (questionType === "follow_up") {
      return JSON.stringify(followUpParts) !== existing.description;
    }
    if (questionType === "markov") {
      if (description !== existing.description) return true;
      return JSON.stringify(normalizeChain(markovChain)) !== (existing.markov_answer_json ?? "");
    }
    // code / interactive: the compose effect keeps `description` change-only, so
    // comparing it here is safe (no spurious prompts on open).
    return (
      description !== existing.description ||
      points !== existing.points ||
      timeLimit !== existing.time_limit_ms ||
      memoryLimit !== existing.memory_limit_mb
    );
  }

  function handleCancel() {
    if (saving) return;
    if (isDirty() && !window.confirm("Discard unsaved changes to this question?")) return;
    onCancel();
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);
    if (!title.trim()) { setError("Title is required."); return; }
    if (questionType !== "follow_up" && (!Number.isFinite(points) || points < 1)) {
      setError("Points must be at least 1.");
      return;
    }

    if (questionType === "follow_up") {
      if (followUpParts.length === 0) { setError("Add at least one part."); return; }
      if (followUpParts.some((p) => !Number.isFinite(p.points) || p.points < 1)) {
        setError("Each part needs at least 1 point.");
        return;
      }
      const totalPts = followUpParts.reduce((s, p) => s + p.points, 0);
      const fuDescription = JSON.stringify(followUpParts);
      setSaving(true);
      try {
        if (existing) {
          await apiFetch<{ saved: boolean }>(`/api/org/contests/${contestId}/questions/${existing.id}`, {
            method: "PATCH",
            body: JSON.stringify({ title, description: fuDescription, points: totalPts, question_type: "follow_up", time_limit_ms: 2000, memory_limit_mb: 256 }),
          });
        } else {
          await apiFetch<{ id: string }>(`/api/org/contests/${contestId}/questions`, {
            method: "POST",
            body: JSON.stringify({ title, description: fuDescription, points: totalPts, order_index: nextIndex, question_type: "follow_up", time_limit_ms: 2000, memory_limit_mb: 256 }),
          });
        }
        setSuccess(existing ? "Question updated successfully." : "Question created successfully.");
        onSaved();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save question.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (questionType === "markov") {
      if (!description.trim()) { setError("Problem statement is required."); return; }
      if (markovChain.states.length === 0) { setError("Define at least one state in the answer key."); return; }
      setSaving(true);
      try {
        const body = JSON.stringify({
          title, description, points, question_type: "markov",
          time_limit_ms: 2000, memory_limit_mb: 256,
          markov_answer_json: JSON.stringify(normalizeChain(markovChain)),
          ...(existing ? {} : { order_index: nextIndex }),
        });
        if (existing) {
          await apiFetch<{ saved: boolean }>(`/api/org/contests/${contestId}/questions/${existing.id}`, { method: "PATCH", body });
        } else {
          await apiFetch<{ id: string }>(`/api/org/contests/${contestId}/questions`, { method: "POST", body });
        }
        setSuccess(existing ? "Question updated successfully." : "Question created successfully.");
        onSaved();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save question.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!Number.isFinite(timeLimit) || timeLimit < 100) {
      setError("Time limit must be at least 100 ms.");
      return;
    }
    if (!Number.isFinite(memoryLimit) || memoryLimit < 16) {
      setError("Memory limit must be at least 16 MB.");
      return;
    }

    // Capture editor state synchronously before any await — prevents the
    // studio component from changing underneath us mid-save.
    const snap = studioRef.current?.getCpConfig() ?? {
      checker_type: "token" as const,
      checker_code: null,
      validator_code: "",
      generator_script: "",
    };
    const cpPayload = {
      checker_type: snap.checker_type,
      checker_code: snap.checker_code,
      validator_code: snap.validator_code,
      generator_script: snap.generator_script,
    };

    setSaving(true);
    try {
      if (existing) {
        // Existing question: save cp-config FIRST so that if the metadata
        // PATCH fails, cp-config is already committed (the less-harmful
        // direction of partial failure — metadata drift is visible immediately,
        // cp-config drift would be silently wrong).
        await apiFetch<{ ok: boolean }>(`/api/org/contests/${contestId}/questions/${existing.id}/cp-config`, {
          method: "PUT",
          body: JSON.stringify(cpPayload),
        });
        await apiFetch<{ saved: boolean }>(`/api/org/contests/${contestId}/questions/${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, description, html_starter: html, css_starter: css, js_starter: js, points, question_type: questionType, time_limit_ms: timeLimit, memory_limit_mb: memoryLimit })
        });
      } else {
        // New question: POST to create the record and get the ID, then
        // PUT cp-config. If cp-config fails, issue a compensating DELETE so
        // the orphaned record is removed and the next retry starts clean
        // (otherwise retry would POST again and create a duplicate question).
        const created = await apiFetch<{ id: string }>(`/api/org/contests/${contestId}/questions`, {
          method: "POST",
          body: JSON.stringify({ title, description, html_starter: html, css_starter: css, js_starter: js, points, order_index: nextIndex, question_type: questionType, time_limit_ms: timeLimit, memory_limit_mb: memoryLimit })
        });
        try {
          await apiFetch<{ ok: boolean }>(`/api/org/contests/${contestId}/questions/${created.id}/cp-config`, {
            method: "PUT",
            body: JSON.stringify(cpPayload),
          });
        } catch (cpErr) {
          // The question row is already created and committed. Deleting it on a
          // transient config-save failure destroys the author's work (this is the
          // "I added a question and it vanished" footgun). Keep the question and
          // surface a recoverable warning instead — the author can reopen it and
          // re-save the configuration, which goes through the existing-question
          // (PATCH) path and won't create a duplicate.
          onSaved("Question created, but its problem configuration didn't save" + (cpErr instanceof Error ? `: ${cpErr.message}` : "") + ". Open the question and save its configuration again.");
          return;
        }
      }

      setSuccess(existing ? "Question updated successfully." : "Question created successfully.");
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save question.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <p className="mb-4 text-sm font-medium text-slate-950">{existing ? "Edit question" : "New question"}</p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
      )}

      {/* ─── Basics ─────────────────────────────────────────── */}
      <FormSectionHeading>Basics</FormSectionHeading>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Build a responsive navbar"
          className="glass-input text-sm text-slate-950"
        />
      </div>

      {/* Question type — card selector */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-slate-500">Question type</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(["code", "interactive", "follow_up", "markov"] as const).map((qt) => {
            const meta = QUESTION_TYPE_META[qt];
            const Icon = meta.icon;
            const selected = questionType === qt;
            return (
              <button
                key={qt}
                type="button"
                onClick={() => setQuestionType(qt)}
                aria-pressed={selected}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                  selected
                    ? "border-purple-300 bg-purple-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                    selected ? "border-purple-200 bg-white text-purple-600" : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${selected ? "text-purple-900" : "text-slate-900"}`}>
                    {meta.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500">{meta.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        {originalType !== null && questionType !== originalType && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="font-semibold">Heads up:</span> changing the type of an existing question changes how it is
            graded <span className="font-semibold">and can replace its content</span>. The statement, answer key, or
            follow-up parts authored for the previous type — plus its grading config (tests, checker, or answer key) —
            may be overwritten or no longer apply once you save. Consider creating a new question instead.
          </div>
        )}
      </div>

      {/* ─── Grading & limits ───────────────────────────────── */}
      {questionType !== "follow_up" && (
        <div className="mt-6">
          <FormSectionHeading>Grading &amp; limits</FormSectionHeading>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="w-28">
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Points</label>
              <input
                type="number"
                min={1}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="glass-input text-sm text-slate-950"
              />
            </div>
            {questionType !== "markov" && (
              <>
                <div className="flex-1 min-w-[8rem]">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Time limit (ms)</label>
                  <input
                    type="number"
                    min={100}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="glass-input text-sm text-slate-950"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Min: 100 ms</p>
                </div>
                <div className="flex-1 min-w-[8rem]">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Memory limit (MB)</label>
                  <input
                    type="number"
                    min={16}
                    value={memoryLimit}
                    onChange={(e) => setMemoryLimit(Number(e.target.value))}
                    className="glass-input text-sm text-slate-950"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Min: 16 MB</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Problem content ────────────────────────────────── */}
      <div className="mt-6">
        <FormSectionHeading>Problem content</FormSectionHeading>
      </div>

      {/* Follow Up editor */}
      {questionType === "follow_up" && (
        <FollowUpEditor parts={followUpParts} onChange={setFollowUpParts} />
      )}

      {/* Markov editor — lazy-loaded (keeps its KaTeX + canvas out of the initial bundle) */}
      {questionType === "markov" && (
        <Suspense fallback={<div className="mb-4 h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />}>
          <MarkovQuestionEditor
            description={description}
            setDescription={setDescription}
            markovChain={markovChain}
            setMarkovChain={setMarkovChain}
          />
        </Suspense>
      )}

      {/* Problem Studio — only for code/interactive */}
      {questionType !== "follow_up" && questionType !== "markov" && (
        <>
          {!existing && (
            <div className="mb-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Save the question to unlock tests &amp; validation</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700/80">
                  Fill in the statement, checker and validator below, then use <span className="font-medium">Save question</span>.
                  Once saved you can upload test cases and run jury validation.
                </p>
              </div>
            </div>
          )}
          <p className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Info className="h-3 w-3 shrink-0" />
            The problem editor below uses a dark theme for code legibility.
          </p>
          <Suspense fallback={<div className="my-5 h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />}>
            <CPProblemStudio
              key={existing?.id ?? "new"}
              ref={studioRef}
              contestId={contestId}
              questionId={existing?.id}
              title={title}
              setTitle={setTitle}
              points={points}
              setPoints={setPoints}
              description={description}
              setDescription={setDescription}
              questionType={questionType as "code" | "interactive"}
              timeLimit={timeLimit}
              setTimeLimit={setTimeLimit}
              memoryLimit={memoryLimit}
              setMemoryLimit={setMemoryLimit}
              initialValidatorCode={existing?.validator_code ?? undefined}
              initialCheckerCode={existing?.checker_code ?? undefined}
              initialCheckerType={existing?.checker_type === "custom" ? "custom" : undefined}
              initialGeneratorScript={existing?.generator_script ?? undefined}
            />
          </Suspense>
        </>
      )}

      {/* Sticky save bar — stays visible while scrolling the long editor above */}
      <div className="sticky bottom-0 z-20 -mx-5 -mb-5 mt-5 flex flex-wrap items-center gap-3 rounded-b-2xl border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="ams-btn ams-btn-primary ams-btn-md disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save question"}
        </button>
        <button
          onClick={handleCancel}
          className="ams-btn ams-btn-secondary ams-btn-md"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <p className="text-xs text-slate-500">
          {saving ? "Saving question… please wait."
            : questionType === "follow_up" ? "Points are the sum of all parts."
            : questionType === "markov" ? "Define the correct Markov chain as the answer key."
            : existing ? "Changes to the statement and grading config apply once you save."
            : "Save to unlock test uploads and jury validation."}
        </p>
      </div>
    </div>
  );
}

// ─── Follow-up editor ────────────────────────────────────────
function FollowUpEditor({ parts, onChange }: {
  parts: FollowUpPart[];
  onChange: (parts: FollowUpPart[]) => void;
}) {
  function addPart() {
    onChange([...parts, { id: crypto.randomUUID(), statement: "", expected_answer: "", points: 10 }]);
  }

  function removePart(id: string) {
    onChange(parts.filter((p) => p.id !== id));
  }

  function updatePart(id: string, patch: Partial<FollowUpPart>) {
    onChange(parts.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  const totalPoints = parts.reduce((s, p) => s + p.points, 0);

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-500">
          Parts
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
            {totalPoints} pts total
          </span>
        </label>
        <button
          type="button"
          onClick={addPart}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
        >
          <Plus className="h-3.5 w-3.5" />
          Add part
        </button>
      </div>

      {parts.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
          No parts yet — click &quot;Add part&quot; to begin.
        </p>
      )}

      {parts.map((part, idx) => (
        <div
          key={part.id}
          className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Part {idx + 1}</span>
            <button
              type="button"
              onClick={() => removePart(part.id)}
              className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Statement <span className="text-slate-400 font-normal">(Markdown + MathJax)</span>
            </label>
            <textarea
              rows={4}
              value={part.statement}
              onChange={(e) => updatePart(part.id, { statement: e.target.value })}
              placeholder={"Find the value of $x$ such that $x^2 + 5x + 6 = 0$."}
              className="glass-input w-full resize-y font-mono text-xs text-slate-950"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Expected answer</label>
            <input
              type="text"
              value={part.expected_answer}
              onChange={(e) => updatePart(part.id, { expected_answer: e.target.value })}
              placeholder="-2 or -3"
              className="glass-input text-sm text-slate-950"
            />
          </div>

          <div className="w-28">
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Points</label>
            <input
              type="number"
              min={1}
              value={part.points}
              onChange={(e) => updatePart(part.id, { points: Math.max(1, Number(e.target.value)) })}
              className="glass-input text-sm text-slate-950"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Invites tab ─────────────────────────────────────────────
type SessionCode = {
  id: string;
  contest_id: string;
  code: string;
  is_active: boolean;
  created_at: string;
};

// ─── Sub-tab navigation ──────────────────────────────────────
// Segmented control used to host two related panels under one primary tab
// (Participants = Invited/Students, Monitor = Activity/Incidents). Keeps the
// primary tab bar short without losing any destination.
function SegmentedNav<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string; badge?: number; badgeTone?: "neutral" | "alert" }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {items.map((it) => {
        const active = value === it.key;
        const showBadge = it.badge !== undefined && it.badge > 0;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              active
                ? "border border-purple-200 bg-purple-50 text-purple-700"
                : "border border-transparent text-slate-500 hover:bg-white hover:text-slate-900"
            }`}
          >
            {it.label}
            {showBadge && (
              <span
                className={`rounded-full px-1.5 text-xs font-semibold ${
                  it.badgeTone === "alert"
                    ? "bg-red-100 text-red-700"
                    : active
                    ? "bg-purple-100 text-purple-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Participants = the people taking the contest. Invited list + enrolled students.
function ParticipantsTabImpl({ contestId, invites, onRefresh }: {
  contestId: string; invites: Invite[]; onRefresh: () => void;
}) {
  const [sub, setSub] = useState<"invited" | "students">("invited");
  return (
    <div>
      <SegmentedNav
        items={[
          { key: "invited", label: "Invited", badge: invites.length },
          { key: "students", label: "Students" },
        ]}
        value={sub}
        onChange={setSub}
      />
      {sub === "invited"
        ? <InvitesTab contestId={contestId} invites={invites} onRefresh={onRefresh} />
        : <StudentsTab contestId={contestId} />}
    </div>
  );
}

// Monitor = watching the contest run. Live activity + candidate help requests.
function MonitorTabImpl({ contestId, openIncidentCount }: {
  contestId: string; openIncidentCount: number;
}) {
  const [sub, setSub] = useState<"activity" | "incidents">("activity");
  return (
    <div>
      <SegmentedNav
        items={[
          { key: "activity", label: "Activity" },
          { key: "incidents", label: "Incidents", badge: openIncidentCount, badgeTone: "alert" },
        ]}
        value={sub}
        onChange={setSub}
      />
      {sub === "activity"
        ? <LiveMonitorTab contestId={contestId} />
        : <IncidentsTab contestId={contestId} />}
    </div>
  );
}

function InvitesTab({ contestId, invites, onRefresh }: {
  contestId: string; invites: Invite[]; onRefresh: () => void;
}) {
  const [emailInput, setEmailInput] = useState("");
  const [subject, setSubject] = useState("AMS Access contest invite");
  const [template, setTemplate] = useState("You have been invited to an AMS Access contest.\n\nInstall the desktop app from {{download_url}} and sign in with {{email}}.\n");
  const [allowBulkInvites, setAllowBulkInvites] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionCode, setSessionCode] = useState<SessionCode | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const settings = await apiFetch<{
          allow_bulk_invites: boolean;
          invite_subject_template: string;
          invite_body_template: string;
        }>("/api/org/settings");
        if (!mounted) return;
        setAllowBulkInvites(settings.allow_bulk_invites);
        if (settings.invite_subject_template) setSubject(settings.invite_subject_template);
        if (settings.invite_body_template) setTemplate(settings.invite_body_template);
      } catch {
        // keep local defaults
      }
      try {
        const codes = await apiFetch<SessionCode[]>(`/api/org/contests/${contestId}/session-codes`);
        if (!mounted) return;
        setSessionCode((codes ?? []).find((c) => c.is_active) ?? null);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [contestId]);

  async function generateSessionCode() {
    setCodeBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const code = await apiFetch<SessionCode>(`/api/org/contests/${contestId}/session-codes`, {
        method: "POST",
      });
      setSessionCode(code);
      setSuccess("Session code generated. Share this code with students to unlock this contest in proctor.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to generate session code.");
    } finally {
      setCodeBusy(false);
    }
  }

  async function addInvites() {
    setError(null);
    setSuccess(null);
    const emails = emailInput
      .split(/\n+/)
      .flatMap((line) => line.split(","))
      .map((e) => {
        const parts = e.trim().split(/[<\s]+/).filter(Boolean);
        return parts[parts.length - 1]?.replace(">", "").toLowerCase() ?? "";
      })
      .filter((e) => e.includes("@"));

    if (emails.length === 0) { setError("Enter at least one valid email."); return; }

    setSaving(true);
    try {
      const result = await apiFetch<{ invited: number; emailsSent: number }>(`/api/org/contests/${contestId}/invites`, {
        method: "POST",
        body: JSON.stringify({ emails, subject, body: template })
      });

      setEmailInput("");
      setSuccess(`Invited ${result.invited} candidate${result.invited !== 1 ? "s" : ""}${result.emailsSent ? ` and sent ${result.emailsSent} email${result.emailsSent !== 1 ? "s" : ""}` : ""}.`);
      onRefresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save invites.");
    } finally {
      setSaving(false);
    }
  }

  async function removeInvite(inviteId: string) {
    setRemoving(inviteId);
    try {
      await apiFetch<{ deleted: boolean }>(`/api/org/contests/${contestId}/invites/${inviteId}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setRemoving(null);
    }
  }

  // Parse emails live for counter
  const parsedEmailCount = emailInput
    .split(/\n+/)
    .flatMap((line) => line.split(","))
    .map((e) => {
      const parts = e.trim().split(/[<\s]+/).filter(Boolean);
      return parts[parts.length - 1]?.replace(">", "").toLowerCase() ?? "";
    })
    .filter((e) => e.includes("@")).length;

  return (
    <div className="space-y-6">
      {/* Session code highlight card */}
      {sessionCode && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100">
              <Key className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Contest Session Code</p>
              <p className="mt-0.5 font-mono text-lg font-bold tracking-widest text-purple-900">{sessionCode.code}</p>
            </div>
          </div>
          <button
            onClick={() => { void navigator.clipboard.writeText(sessionCode.code); }}
            title="Copy code"
            className="flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
        </div>
      )}

      {/* Compose + Preview side-by-side */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Compose form */}
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-semibold text-slate-950">Invite candidates</p>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            One email per line, or comma-separated. Accepts <code className="text-slate-700">Name &lt;email&gt;</code> format.
          </p>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
          )}

          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">Recipients</label>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${parsedEmailCount > 0 ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"}`}>
              {parsedEmailCount} email{parsedEmailCount !== 1 ? "s" : ""}
            </span>
          </div>
          <textarea
            rows={4}
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder={"Alice Doe <alice@college.edu>\nbob@university.edu\ncharlie@institute.ac.in"}
            className="glass-input mb-3 resize-none text-sm text-slate-950"
            style={{ fontFamily: "monospace" }}
          />

          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject — use {{email}} for recipient address"
            className="glass-input mb-3 text-sm text-slate-950"
          />

          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">Body template</label>
            <span className="text-[11px] text-slate-400">
              vars: <code className="text-slate-600">{"{{email}}"}</code> · <code className="text-slate-600">{"{{download_url}}"}</code>
            </span>
          </div>
          <textarea
            rows={5}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder={"Use {{email}} and {{download_url}} in the message body."}
            className="glass-input mb-4 resize-y text-sm text-slate-950"
          />
          <button
            onClick={() => void addInvites()}
            disabled={saving || !allowBulkInvites || parsedEmailCount === 0}
            className="ams-btn ams-btn-primary ams-btn-md w-full justify-center disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {!allowBulkInvites ? "Bulk invites disabled by AMS admin" : saving ? "Sending…" : `Send to ${parsedEmailCount || "…"} recipient${parsedEmailCount !== 1 ? "s" : ""}`}
          </button>
        </div>

        {/* Live preview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Live preview</p>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-900">
              {subject.replaceAll("{{email}}", "candidate@example.com") || <span className="italic text-slate-400">Subject line</span>}
            </p>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
              {template.replaceAll("{{email}}", "candidate@example.com").replaceAll("{{download_url}}", "https://amsaccess.com/download") || <span className="italic text-slate-400">Body preview…</span>}
            </pre>
          </div>
          {!sessionCode && (
            <button
              onClick={() => void generateSessionCode()}
              disabled={codeBusy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-purple-300 bg-purple-50 py-2.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
            >
              <Key className="h-3.5 w-3.5" />
              {codeBusy ? "Generating…" : "Generate session code"}
            </button>
          )}
        </div>
      </div>

      {/* Invites list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {invites.length} invite{invites.length !== 1 ? "s" : ""}
          </p>
          {invites.length > 0 && (
            <button
              onClick={() => {
                void navigator.clipboard.writeText(invites.map((i) => i.email).join("\n"));
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Copy className="h-3 w-3" />
              Copy all emails
            </button>
          )}
        </div>
        {invites.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <Mail className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-950">No invites yet</p>
            <p className="mt-1 text-xs text-slate-500">Send your first invite using the form above.</p>
          </div>
        ) : (
          <div className="overflow-hidden glass-card">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Invited</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 transition hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">{inv.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          inv.status === "accepted"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void removeInvite(inv.id)}
                        disabled={removing === inv.id}
                        aria-label="Remove invite"
                        className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings tab ────────────────────────────────────────────
function SettingsTabImpl({ contest, forcedMode, onSaved, onDeleted }: {
  contest: Contest; forcedMode: "CHESS" | null; onSaved: () => void; onDeleted: () => void;
}) {
  const [title, setTitle]           = useState(contest.title);
  const [description, setDesc]      = useState(contest.description ?? "");
  const [startAt, setStartAt]       = useState(toDateTimeLocalValue(contest.start_at));
  const [endAt, setEndAt]           = useState(toDateTimeLocalValue(contest.end_at));
  const [timezone, setTimezone]     = useState(contest.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [resultsVisibleAt, setResultsVisibleAt] = useState(
    contest.results_visible_at ? toDateTimeLocalValue(contest.results_visible_at) : ""
  );
  const [status, setStatus]         = useState(contest.status);
  const [scoringType, setScoringType] = useState(contest.scoring_type ?? "ICPC");
  const [allowedLangs, setAllowedLangs] = useState<string[]>(contest.allowed_languages ?? ["C++17", "Python3", "Java17"]);
  const [pluginType, setPluginType] = useState<"CP" | "CHESS">(() => {
    if (forcedMode === "CHESS") return "CHESS";
    return String(contest.plugin_type ?? "CP").toUpperCase() === "CHESS" ? "CHESS" : "CP";
  });
  const [pluginConfig, setPluginConfig] = useState<string>(contest.plugin_config ?? "{}");
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);

  useEffect(() => {
    setTitle(contest.title);
    setDesc(contest.description ?? "");
    setStartAt(toDateTimeLocalValue(contest.start_at));
    setEndAt(toDateTimeLocalValue(contest.end_at));
    setTimezone(contest.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    setResultsVisibleAt(contest.results_visible_at ? toDateTimeLocalValue(contest.results_visible_at) : "");
    setStatus(contest.status);
    setScoringType(contest.scoring_type ?? "ICPC");
    setAllowedLangs(contest.allowed_languages ?? ["C++17", "Python3", "Java17"]);
    setPluginType(
      forcedMode === "CHESS"
        ? "CHESS"
        : String(contest.plugin_type ?? "CP").toUpperCase() === "CHESS"
        ? "CHESS"
        : "CP"
    );
    setPluginConfig(contest.plugin_config ?? "{}");
  }, [contest, forcedMode]);

  async function save() {
    setError(null);
    setSuccess(false);
    if (new Date(endAt) <= new Date(startAt)) { setError("End time must be after start time."); return; }
    try {
      JSON.parse(pluginConfig.trim() || "{}");
    } catch {
      setError("Plugin config must be valid JSON.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch<{ saved: boolean }>(`/api/org/contests/${contest.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          description,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          timezone,
          results_visible_at: resultsVisibleAt ? new Date(resultsVisibleAt).toISOString() : undefined,
          status,
          scoring_type: scoringType,
          allowed_languages: allowedLangs,
          plugin_type: pluginType,
          plugin_config: pluginConfig.trim() || "{}",
          pluginType,
          pluginConfig: pluginConfig.trim() || "{}",
        })
      });
      setSuccess(true);
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save contest.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContest() {
    if (!confirm("Delete this contest and all its questions/invites? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiFetch<{ deleted: boolean }>(`/api/org/contests/${contest.id}`, { method: "DELETE" });
      onDeleted();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete contest.");
    } finally {
      setDeleting(false);
    }
  }

  const fieldClass = "w-full rounded-xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100";
  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";
  const sectionClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const sectionHeadClass = "mb-4 flex items-center gap-2";
  const sectionTitleClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400";
  const pillClass = (active: boolean, tone: "purple" | "emerald" = "purple") => {
    if (active && tone === "emerald") return "rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition";
    if (active) return "rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-sm transition";
    return "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950";
  };

  const statusMeta: Record<string, string> = {
    DRAFT: "not visible to students",
    SCHEDULED: "auto-opens at start time",
    ACTIVE: "students can join now",
    ENDED: "submissions closed",
  };

  const langColors: Record<string, string> = {
    "C++17": "bg-blue-400",
    "Python3": "bg-yellow-400",
    "Java17": "bg-orange-400",
    "Go": "bg-cyan-400",
    "Rust": "bg-red-400",
  };

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className={sectionClass}>
        <div className={sectionHeadClass}>
          <Info className="h-3.5 w-3.5 text-slate-400" />
          <h3 className={sectionTitleClass}>Basic Information</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea rows={3} value={description} onChange={(e) => setDesc(e.target.value)} className={fieldClass + " resize-none"} />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <div className={sectionHeadClass}>
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <h3 className={sectionTitleClass}>Scheduling</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Start</label>
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={fieldClass} style={{ colorScheme: "light" }} />
          </div>
          <div>
            <label className={labelClass}>End</label>
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={fieldClass} style={{ colorScheme: "light" }} />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Timezone</label>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={fieldClass}
            placeholder="Asia/Kolkata"
          />
        </div>
        <div className="mt-4">
          <label className={labelClass}>Results visible to candidates after</label>
          <input
            type="datetime-local"
            value={resultsVisibleAt}
            onChange={(e) => setResultsVisibleAt(e.target.value)}
            className={fieldClass}
            style={{ colorScheme: "light" }}
          />
          <p className="mt-1 text-xs text-slate-400">
            Defaults to end time + 48 h. Candidates see the full leaderboard and their own breakdown only after this time.
          </p>
        </div>
      </div>

      <div className={sectionClass}>
        <div className={sectionHeadClass}>
          <Sliders className="h-3.5 w-3.5 text-slate-400" />
          <h3 className={sectionTitleClass}>Contest Parameters</h3>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className={labelClass}>Status</label>
            <div className="flex flex-wrap gap-2">
              {(["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} className={pillClass(status === s)}>
                  <span className="block">{s}</span>
                  {status === s && (
                    <span className="block mt-0.5 text-[10px] font-normal opacity-70">{statusMeta[s]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Scoring type</label>
            <div className="flex flex-wrap gap-2">
              {(["IOI", "ICPC", "CF"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setScoringType(s)} className={pillClass(scoringType === s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className={labelClass}>Allowed languages</label>
            <div className="flex flex-wrap gap-2">
              {(["C++17", "Python3", "Java17", "Go", "Rust"] as const).map((lang) => {
                const active = allowedLangs.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() =>
                      setAllowedLangs(
                        active ? allowedLangs.filter((l) => l !== lang) : [...allowedLangs, lang]
                      )
                    }
                    className={pillClass(active)}
                  >
                    <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${langColors[lang] ?? "bg-slate-400"}`} />
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className={labelClass}>Contest mode</label>
            <div className="flex flex-wrap gap-2">
              {(["CP", "CHESS"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setPluginType(s)} className={pillClass(pluginType === s, "emerald")}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <div className={sectionHeadClass}>
          <Puzzle className="h-3.5 w-3.5 text-slate-400" />
          <h3 className={sectionTitleClass}>Plugin Configuration</h3>
        </div>
        <label className={labelClass}>Plugin config (JSON)</label>
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-inner focus-within:border-purple-300 focus-within:ring-4 focus-within:ring-purple-100">
          <div className="flex min-h-24">
            <div className="select-none border-r border-white/10 bg-slate-900 px-3 py-3 text-right font-mono text-xs leading-6 text-slate-500">
              {pluginConfig.split("\n").map((_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>
            <textarea
              rows={3}
              value={pluginConfig}
              onChange={(e) => setPluginConfig(e.target.value)}
              className="min-h-24 flex-1 resize-y bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-slate-100 outline-none placeholder:text-slate-500"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Save footer */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
        <button
          onClick={() => void save()} disabled={saving}
          className="ams-btn ams-btn-primary ams-btn-md"
        >
          {success ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : success ? "Saved!" : "Save changes"}
        </button>
        {success && <span className="text-xs text-emerald-600">Changes saved successfully.</span>}
      </div>

      {/* Danger zone — delete */}
      <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-900">Delete contest</p>
            <p className="mt-0.5 text-xs text-red-700">
              Permanently removes this contest, all questions, and all invites. This action cannot be undone.
            </p>
            <button
              onClick={() => void deleteContest()} disabled={deleting}
              className="ams-btn ams-btn-danger ams-btn-sm mt-3"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "Deleting…" : "Delete contest"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentsTab({ contestId }: { contestId: string }) {
  const [activeSubTab, setActiveSubTab] = useState<"provision" | "emails">("provision");

  // Provision Sub-Tab States
  const [csvContent, setCsvContent] = useState("");
  const [importStatus, setImportStatus] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [students, setStudents] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Email Sub-Tab States
  const [subject, setSubject] = useState("Welcome to {{name}} Assessment Onboarding");
  const [bodyTemplate, setBodyTemplate] = useState(
    `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #121214; color: #e4e4e7; padding: 20px; }
    .card { background-color: #1a1a1e; border: 1px solid #27272a; padding: 24px; border-radius: 12px; }
    .header { font-size: 20px; font-weight: bold; color: #a78bfa; margin-bottom: 16px; }
    .cred-box { background-color: #0c0c0e; border-left: 4px solid #8b5cf6; padding: 16px; margin: 16px 0; border-radius: 4px; }
    .code { font-family: monospace; font-size: 16px; color: #a78bfa; font-weight: bold; }
    .footer { font-size: 12px; color: #71717a; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">Contest Access Onboarding Portal</div>
    <p>Hello <strong>{{name}}</strong>,</p>
    <p>You have been provisioned access to register for the assessment round.</p>
    <p>Your unique access credentials are generated below:</p>
    <div class="cred-box">
      <strong>Login Username:</strong> {{username}}<br/>
      <strong>Password:</strong> {{password}}<br/>
      <strong>Access Contest Code:</strong> <span class="code">{{contestcode}}</span>
    </div>
    <p>Please launch your secure Proctor client and enter the Access Contest Code above to enter onboarding.</p>
    <div class="footer">Algorithms &amp; Mathematics Society Integrity Layer</div>
  </div>
</body>
</html>`
  );
  const [sessionCode, setSessionCode] = useState<string>("");
  const [loadingCode, setLoadingCode] = useState(false);
  const [emailPreviewMode, setEmailPreviewMode] = useState<"compose" | "preview">("compose");

  // Dispatch Job States
  const [currentJob, setCurrentJob] = useState<any | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Template Options
  const templates = [
    {
      name: "Standard Onboarding Invite",
      subject: "Welcome to {{name}} Assessment Onboarding",
      body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #121214; color: #e4e4e7; padding: 20px; }
    .card { background-color: #1a1a1e; border: 1px solid #27272a; padding: 24px; border-radius: 12px; }
    .header { font-size: 20px; font-weight: bold; color: #a78bfa; margin-bottom: 16px; }
    .cred-box { background-color: #0c0c0e; border-left: 4px solid #8b5cf6; padding: 16px; margin: 16px 0; border-radius: 4px; }
    .code { font-family: monospace; font-size: 16px; color: #a78bfa; font-weight: bold; }
    .footer { font-size: 12px; color: #71717a; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">Contest Access Onboarding Portal</div>
    <p>Hello <strong>{{name}}</strong>,</p>
    <p>You have been provisioned access to register for the assessment round.</p>
    <p>Your unique access credentials are generated below:</p>
    <div class="cred-box">
      <strong>Login Username:</strong> {{username}}<br/>
      <strong>Password:</strong> {{password}}<br/>
      <strong>Access Contest Code:</strong> <span class="code">{{contestcode}}</span>
    </div>
    <p>Please launch your secure Proctor client and enter the Access Contest Code above to enter onboarding.</p>
    <div class="footer">Algorithms &amp; Mathematics Society Integrity Layer</div>
  </div>
</body>
</html>`
    },
    {
      name: "Final Warning / Pre-Assessment Alert",
      subject: "IMMEDIATE ACTION REQUIRED: {{name}} Assessment Access Verification",
      body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #121214; color: #e4e4e7; padding: 20px; }
    .card { background-color: #1a1a1e; border: 1px solid #f87171; padding: 24px; border-radius: 12px; }
    .header { font-size: 20px; font-weight: bold; color: #f87171; margin-bottom: 16px; }
    .cred-box { background-color: #0c0c0e; border-left: 4px solid #f87171; padding: 16px; margin: 16px 0; border-radius: 4px; }
    .code { font-family: monospace; font-size: 16px; color: #f87171; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">Final Verification Required</div>
    <p>Hi <strong>{{name}}</strong>,</p>
    <p>Your secure session credentials are set to expire shortly. Please log in immediately using the credentials below:</p>
    <div class="cred-box">
      <strong>Access Code:</strong> <span class="code">{{contestcode}}</span><br/>
      <strong>Username:</strong> {{username}}<br/>
      <strong>Password:</strong> {{password}}
    </div>
    <p>Ensure your camera, microphone, and platform environment are fully validated before opening.</p>
  </div>
</body>
</html>`
    }
  ];

  // Load Students list
  const loadStudents = useCallback(async () => {
    try {
      const res = await apiFetch<any>(
        `/api/org/contests/${contestId}/students?search=${encodeURIComponent(
          search
        )}&limit=${limit}&offset=${(page - 1) * limit}`
      );
      setStudents(res.items ?? []);
      setTotalCount(res.total_count ?? 0);
    } catch (e) {
      console.error(e);
    }
  }, [contestId, search, page]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  // Fetch or Auto-Create Session Code
  const fetchSessionCode = useCallback(async () => {
    setLoadingCode(true);
    try {
      const codes = await apiFetch<any[]>(`/api/org/contests/${contestId}/session-codes`);
      let active = (codes ?? []).find((c) => c.is_active);
      if (!active) {
        // Idempotently create one
        active = await apiFetch<any>(`/api/org/contests/${contestId}/session-codes`, {
          method: "POST"
        });
      }
      if (active) {
        setSessionCode(active.code);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCode(false);
    }
  }, [contestId]);

  useEffect(() => {
    void fetchSessionCode();
  }, [fetchSessionCode]);

  // Check running job status continuously.
  // Uses recursive setTimeout so a slow response never causes concurrent in-flight requests.
  useEffect(() => {
    if (!currentJob || currentJob.status === "COMPLETED" || currentJob.status === "FAILED") return;
    let cancelled = false;
    async function poll() {
      if (cancelled) return;
      try {
        const job = await apiFetch<any>(`/api/org/contests/${contestId}/emails/jobs/${currentJob!.id}`);
        if (cancelled) return;
        setCurrentJob(job);
        if (job.status === "COMPLETED" || job.status === "FAILED" || job.status === "PARTIAL") {
          void loadStudents();
          return;
        }
      } catch {
        return;
      }
      setTimeout(poll, 2000);
    }
    void poll();
    return () => { cancelled = true; };
  }, [currentJob, contestId, loadStudents]);

  // Import CSV Handler
  async function handleImport() {
    if (!csvContent) {
      setImportError("Please enter CSV contents or upload a file first.");
      return;
    }
    setImporting(true);
    setImportError(null);
    setImportStatus(null);
    try {
      const res = await apiFetch<any>(`/api/org/contests/${contestId}/students/import`, {
        method: "POST",
        body: JSON.stringify({ csv: csvContent })
      });
      setImportStatus(res);
      setCsvContent("");
      void loadStudents();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "CSV Import failed.");
    } finally {
      setImporting(false);
    }
  }

  // File Upload Helper
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCsvContent(event.target.result as string);
      }
    };
    reader.readAsText(file);
  }

  // Bulk Email Dispatch Trigger
  async function handleSendEmails() {
    setSendingEmail(true);
    try {
      const res = await apiFetch<any>(`/api/org/contests/${contestId}/emails/send`, {
        method: "POST",
        body: JSON.stringify({ subject, body_template: bodyTemplate })
      });
      setCurrentJob(res);
      setEmailPreviewMode("compose");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to dispatch emails.");
    } finally {
      setSendingEmail(false);
    }
  }

  // Retry Failed Emails Trigger
  async function handleRetryEmails() {
    if (!currentJob) return;
    try {
      await apiFetch<any>(`/api/org/contests/${contestId}/emails/jobs/${currentJob.id}/retry`, {
        method: "POST"
      });
      setCurrentJob((prev: any) => ({ ...prev, status: "RUNNING" }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to trigger retry.");
    }
  }

  // Replace placeholders in real-time preview
  function getPreviewHTML() {
    let html = bodyTemplate;
    html = html.replace(/{{name}}/g, "Jane Doe");
    html = html.replace(/{{username}}/g, "janedoe@amsaccess.com");
    html = html.replace(/{{password}}/g, "xYz97531!#$");
    html = html.replace(/{{contestcode}}/g, sessionCode || "RESOLVING...");
    return html;
  }

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Selector */}
      <div className="flex gap-4 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab("provision")}
          className={`pb-2 text-sm font-semibold transition ${
            activeSubTab === "provision"
              ? "text-purple-600 border-b-2 border-purple-200"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Student Provisioning
        </button>
        <button
          onClick={() => setActiveSubTab("emails")}
          className={`pb-2 text-sm font-semibold transition ${
            activeSubTab === "emails"
              ? "text-purple-600 border-b-2 border-purple-200"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Email Invites Dispatcher
        </button>
      </div>

      {activeSubTab === "provision" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Import Area */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <h3 className="text-sm font-medium text-slate-950 flex items-center gap-2">
                <Upload className="h-4 w-4 text-purple-600" />
                Upload CSV Student Roster
              </h3>
              <p className="text-xs text-slate-500">
                Provide a CSV containing columns <code className="text-purple-600">name</code> and{" "}
                <code className="text-purple-600">email</code>. We will generate unique{" "}
                <code className="text-purple-600">@amsaccess.com</code> login credentials for each student.
              </p>

              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  Choose File
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <span className="text-xs text-slate-400">or paste plain CSV content below:</span>
              </div>

              <textarea
                rows={6}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="name,email&#10;Jane Doe,jane@domain.com&#10;John Smith,john@domain.com"
                className="w-full glass-input resize-none font-mono text-xs text-slate-950"
              />

              <button
                onClick={() => void handleImport()}
                disabled={importing}
                className="w-full ams-btn ams-btn-primary ams-btn-md"
              >
                {importing ? "Provisioning..." : "Process & Import Roster"}
              </button>

              {importError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importStatus && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Provisioning Success!
                  </div>
                  <div>Processed Rows: {importStatus.total_rows}</div>
                  <div>Successfully Created: {importStatus.imported}</div>
                  {importStatus.errors && importStatus.errors.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-emerald-500/10 pt-2 text-[10px] text-slate-500 max-h-24 overflow-y-auto">
                      {importStatus.errors.map((e: string, idx: number) => (
                        <div key={idx}>• {e}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Permanent Code Box */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <h3 className="text-sm font-medium text-slate-950 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-purple-600" />
                Permanent Contest Access Code
              </h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                This contest features a permanent access code that students use to unlock the assessment in the Proctor Secure app. You do not need to generate code each time.
              </p>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 p-4">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Fixed Access Code</span>
                  <span className="font-mono text-xl font-bold text-purple-600 tracking-wider">
                    {loadingCode ? "RESOLVING..." : sessionCode || "NO CODE ASSIGNED"}
                  </span>
                </div>
                <button
                  onClick={() => void fetchSessionCode()}
                  disabled={loadingCode}
                  className="ams-btn ams-btn-secondary ams-btn-sm"
                >
                  Sync Code
                </button>
              </div>
            </div>
          </div>

          {/* Searchable Paginated List */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-sm font-medium text-slate-950">Provisioned Student Credentials</h3>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 glass-input text-xs text-slate-950"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 font-normal">
                <thead className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Registered Email</th>
                    <th className="py-2.5 px-3">Generated User</th>
                    <th className="py-2.5 px-3">Generated Password</th>
                    <th className="py-2.5 px-3">Invite Status</th>
                    <th className="py-2.5 px-3">Provision Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">
                        No students provisioned yet.
                      </td>
                    </tr>
                  ) : (
                    students.map((st) => (
                      <tr key={st.id} className="hover:bg-white transition">
                        <td className="py-3 px-3 font-semibold text-slate-950">{st.name}</td>
                        <td className="py-3 px-3 text-slate-500">{st.email}</td>
                        <td className="py-3 px-3 font-mono text-purple-600">{st.generated_username}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{st.generated_password}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                              st.delivery_status === "sent"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : st.delivery_status === "failed"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-zinc-500/10 text-slate-500 border-zinc-500/20"
                            }`}
                          >
                            {st.delivery_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">{new Date(st.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalCount > limit && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
                <span>
                  Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)} of {totalCount} students
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => (p * limit < totalCount ? p + 1 : p))}
                    disabled={page * limit >= totalCount}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "emails" && (
        <div className="space-y-6">
          {/* Dispatch Job Live progress widget */}
          {currentJob && (
            <div className="rounded-xl border border-purple-200/25 bg-purple-50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-950">Live Email Dispatch Job Status</h4>
                  <p className="text-xs text-slate-400 font-normal">Job ID: {currentJob.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                      currentJob.status === "RUNNING"
                        ? "bg-violet-500/20 text-purple-600 border-purple-200/30 animate-pulse"
                        : currentJob.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : currentJob.status === "PARTIAL"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-red-500/20 text-red-300 border-red-500/30"
                    }`}
                  >
                    {currentJob.status}
                  </span>
                  {currentJob.status === "PARTIAL" && (
                    <button
                      onClick={() => void handleRetryEmails()}
                      className="ams-btn ams-btn-primary ams-btn-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry Failures
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Counters */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-white rounded-lg border border-slate-100 p-3">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Total Recipients</div>
                  <div className="text-lg font-bold text-slate-950 mt-1">{currentJob.total_count}</div>
                </div>
                <div className="bg-white rounded-lg border border-slate-100 p-3">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Progress</div>
                  <div className="text-lg font-bold text-purple-600 mt-1 font-mono">
                    {Math.round(((currentJob.sent_count + currentJob.failed_count) / currentJob.total_count) * 100)}%
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-slate-100 p-3">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Successfully Sent</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">{currentJob.sent_count}</div>
                </div>
                <div className="bg-white rounded-lg border border-slate-100 p-3">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Failed Delivery</div>
                  <div className="text-lg font-bold text-red-400 mt-1">{currentJob.failed_count}</div>
                </div>
              </div>

              {/* Recipient Details */}
              {currentJob.recipients && currentJob.recipients.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-3 max-h-48 overflow-y-auto text-xs">
                  <div className="font-bold text-slate-500 mb-2 border-b border-slate-100 pb-1 uppercase tracking-wider text-[10px]">Delivery Logs</div>
                  <div className="space-y-1.5">
                    {currentJob.recipients.map((rec: any) => (
                      <div key={rec.id} className="flex justify-between items-center text-[11px]">
                        <span className="font-mono text-slate-600">
                          {rec.name} ({rec.email})
                        </span>
                        <span
                          className={`font-semibold ${
                            rec.status === "SENT"
                              ? "text-emerald-400"
                              : rec.status === "FAILED"
                              ? "text-red-400"
                              : "text-slate-400"
                          }`}
                        >
                          {rec.status} {rec.failure_reason ? `(${rec.failure_reason})` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Email Template Composer & Gmail Preview */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Editor Area */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-slate-950 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-purple-600" />
                  Compose Invitation Template
                </h3>
              </div>

              {/* Template dropdown options */}
              <div>
                <label className="mb-1 block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Quick Template Preset</label>
                <div className="flex gap-2">
                  {templates.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSubject(t.subject);
                        setBodyTemplate(t.body);
                      }}
                      className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full glass-input text-xs text-slate-950"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">HTML Body Template</label>
                <textarea
                  rows={14}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className="w-full glass-input font-mono text-xs text-slate-950 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEmailPreviewMode("preview")}
                  className="flex-1 ams-btn ams-btn-secondary ams-btn-sm"
                >
                  <Eye className="h-4 w-4 text-purple-600" />
                  See Real-Time Preview
                </button>
                <button
                  onClick={() => void handleSendEmails()}
                  disabled={sendingEmail}
                  className="flex-1 ams-btn ams-btn-primary ams-btn-sm"
                >
                  <Send className="h-4 w-4" />
                  {sendingEmail ? "Dispatching..." : "Send Bulk Invites"}
                </button>
              </div>
            </div>

            {/* Live Gmail Preview Panel */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 flex flex-col">
              <h3 className="text-sm font-medium text-slate-950 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Gmail-style Real-Time HTML Preview
              </h3>
              <p className="text-xs text-slate-500 leading-normal font-normal">
                This shows exactly what students will see in their inboxes. All template variables are compiled in real-time.
              </p>

              <div className="flex-1 rounded-xl bg-white border border-slate-100 overflow-hidden flex flex-col min-h-[400px]">
                <div className="bg-slate-50 border-b border-slate-100 p-3 space-y-1">
                  <div className="text-[11px] text-slate-400 font-normal">
                    <span className="font-semibold text-slate-500">Subject:</span> {subject}
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    <span className="font-semibold text-slate-500">From:</span> ams-access-system@amsaccess.com
                  </div>
                </div>
                <div className="flex-1 p-4 bg-white overflow-auto">
                  <iframe
                    title="Live Email Render"
                    srcDoc={getPreviewHTML()}
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
