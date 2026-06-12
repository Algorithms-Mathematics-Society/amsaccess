"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, Save, Code2, Mail, UserPlus,
  X, Sparkles, Monitor, Play, Square, RefreshCw,
  Upload, Search, FileSpreadsheet, Eye, Send, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle
} from "lucide-react";
import { apiFetch } from "@/lib/client/apiClient";
import CPProblemStudio, { type CPProblemStudioHandle } from "@/components/CPProblemStudio";
import MarkovEditor, { type MarkovChain, normalizeChain } from "@/components/MarkovEditor";

// ─── Types ───────────────────────────────────────────────────
type Contest = {
  id: string; title: string; description: string | null;
  start_at: string; end_at: string; timezone?: string; status: string; org_id: string;
  scoring_type: string; allowed_languages: string[];
  plugin_type?: string; plugin_config?: string;
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

type Tab = "questions" | "invites" | "students" | "live" | "settings";

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

type ReadinessState = "complete" | "pending" | "blocked";

type LaunchChecklistItem = {
  id: string;
  label: string;
  state: ReadinessState;
  detail: string;
};

// ─── Helpers ─────────────────────────────────────────────────
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

function renderMarkdownPreview(md: string): string {
  // Minimal markdown → HTML for problem statement preview
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // fenced code blocks
    .replace(/```[\s\S]*?```/g, (m) => {
      const inner = m.slice(3, -3).replace(/^\w*\n/, "");
      return `<pre style="background:#0f172a;border-radius:6px;padding:8px 12px;overflow-x:auto;font-size:12px;color:#94a3b8;margin:8px 0">${inner}</pre>`;
    })
    // headers
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:600;margin:10px 0 4px;color:#e2e8f0">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:600;margin:12px 0 4px;color:#e2e8f0">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:700;margin:14px 0 4px;color:#f1f5f9">$1</h1>')
    // inline code
    .replace(/`([^`]+)`/g, '<code style="background:#1e293b;border-radius:3px;padding:1px 5px;font-size:12px;color:#c084fc;font-family:monospace">$1</code>')
    // bold / italic
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // images — render inline
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:6px 0;display:block" />')
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#a855f7;text-decoration:underline">$1</a>')
    // dollar signs (math notation) — keep as-is but wrap
    .replace(/\$([^$]+)\$/g, '<span style="font-style:italic;color:#c084fc">$1</span>');

  // paragraphs: split by blank lines
  const paras = html.split(/\n{2,}/);
  return paras
    .map((p) => {
      p = p.trim();
      if (!p) return "";
      if (p.startsWith("<h") || p.startsWith("<pre") || p.startsWith("<img")) return p;
      return `<p style="margin:6px 0;line-height:1.6;color:#cbd5e1;font-size:13px">${p.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
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

  useEffect(() => {
    if (!contest || modeReconciled) return;
    if (forcedMode !== "CHESS") return;
    if (String(contest.plugin_type ?? "").toUpperCase() === "CHESS") {
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
  }, [contest, forcedMode, id, load, modeReconciled]);

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

  async function controlJudge(action: "start" | "stop") {
    setJudgeBusy(true);
    setJudgeError(null);
    try {
      const data = await apiFetch<JudgeCapacity>(`/api/org/judge-capacity/${action}`, { method: "POST" });
      setJudge(data);
    } catch (e) {
      setJudgeError(e instanceof Error ? e.message : `Unable to ${action} judge capacity.`);
    } finally {
      setJudgeBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-purple-500" />
      </div>
    );
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
        {/* Back */}
        <Link
          href="/org/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        {/* Contest header */}
        <div className="mb-6 flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-start">
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
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              <span className={`h-2 w-2 rounded-full ${judgeDotClass}`} />
              {judge
                ? `Judge: ${judgeLabel} (${judge.running_instances ?? 0}/${judge.total_instances ?? 0} up, target ${judge.target_size}) · mode ${judge.mode ?? "AUTO"}`
                : "Judge: Unknown"}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void controlJudge("start")}
                disabled={judgeBusy}
                className="ams-btn ams-btn-success ams-btn-sm"
              >
                <Play className="h-3.5 w-3.5" />
                Start Compute
              </button>
              <button
                onClick={() => void controlJudge("stop")}
                disabled={judgeBusy}
                className="ams-btn ams-btn-danger ams-btn-sm"
              >
                <Square className="h-3.5 w-3.5" />
                Stop Compute
              </button>
              <button
                onClick={() => void loadJudge()}
                disabled={judgeBusy}
                className="ams-btn ams-btn-secondary ams-btn-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${judgeBusy ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
            {judgeError ? <p className="text-[11px] text-red-600">{judgeError}</p> : null}
          </div>
        </div>

        <LaunchChecklistPanel items={launchChecklist} state={launchState} />

        {/* Tabs */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:grid-cols-5">
          {([["questions", "Questions", questions.length], ["invites", "Invites", invites.length], ["students", "Students", null], ["live", "Live", null], ["settings", "Settings", null]] as const).map(
            ([key, label, count]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-sm font-medium transition ${
                  tab === key
                    ? "border-purple-100 bg-purple-50 text-slate-950 shadow-sm"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {label}
                {count !== null && (
                  <span
                    className={`rounded px-1.5 text-xs ${tab === key ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          )}
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
        {tab === "invites" && (
          <InvitesTab
            contestId={id}
            invites={invites}
            onRefresh={load}
          />
        )}
        {tab === "students" && (
          <StudentsTab contestId={id} />
        )}
        {tab === "live" && (
          <LiveMonitorTab contestId={id} />
        )}
        {tab === "settings" && (
          <SettingsTab
            contest={contest}
            forcedMode={forcedMode}
            onSaved={load}
            onDeleted={() => router.push("/org/dashboard")}
          />
        )}
      </div>
    </div>
  );
}

function LaunchChecklistPanel({
  items,
  state,
}: {
  items: LaunchChecklistItem[];
  state: { label: string; tone: "draft" | "ready" | "live" | "attention" | "ended" };
}) {
  const completeCount = items.filter((item) => item.state === "complete").length;
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Launch readiness</p>
          <h2 id="launch-readiness-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            Contest launch checklist
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {completeCount} of {items.length} checks complete before launch.
          </p>
        </div>
        <span className={"inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold " + stateClass}>
          {state.label}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Runtime Status</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                transport === "SSE"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              {transport === "SSE" ? "LIVE STREAMED (SSE)" : "POLLING FALLBACK"}
            </span>
          </div>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {runtime?.runtime_status ?? "UNKNOWN"}
            {runtime?.runtime_ready ? " · READY" : ""}
          </p>
          <p className="text-xs text-slate-400">
            {runtime ? `instances ${runtime.capacity.running_instances ?? 0}/${runtime.capacity.total_instances ?? 0}, target ${runtime.capacity.target_size}` : "No runtime data"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadLive()} className="ams-btn ams-btn-secondary ams-btn-sm">
            {busy ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={() => void runReadinessCheck()} className="ams-btn ams-btn-success ams-btn-sm">
            Run readiness check
          </button>
        </div>
      </div>
      {err ? <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <LiveTable
          title="Submissions"
          items={subs}
          render={(item) => (
            <>
              <span className="font-mono text-[11px] text-slate-600">{item.candidate}</span>
              <span className="text-[11px] text-slate-400">{item.final_verdict ?? item.status}</span>
            </>
          )}
        />
        <LiveTable
          title="Proctor Events"
          items={proctor}
          render={(item) => (
            <>
              <span className="font-mono text-[11px] text-slate-600">{item.candidate}</span>
              <span className={`text-[11px] ${
                item.severity === "CRITICAL"
                  ? "text-red-300"
                  : item.severity === "WARN"
                  ? "text-amber-300"
                  : "text-slate-500"
              }`}>
                {item.event_type} {item.severity ? `(${item.severity})` : ""}
              </span>
            </>
          )}
        />
        <LiveTable
          title="Infra Events"
          items={infra}
          render={(item) => (
            <>
              <span className="font-mono text-[11px] text-slate-600">{item.status}</span>
              <span className="text-[11px] text-slate-400">{item.reason_code ?? item.source}</span>
            </>
          )}
        />
      </div>
    </div>
  );
}

function LiveTable<T>({ title, items, render }: { title: string; items: T[]; render: (item: T) => ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">{title}</div>
      <div className="max-h-72 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-3 py-3 text-xs text-slate-400">No events</div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between border-b border-slate-100 px-3 py-2 last:border-b-0">
              {render(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Questions tab ───────────────────────────────────────────
function QuestionsTab({ contestId, pluginType, questions, onRefresh }: {
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
        <p className="text-sm font-medium text-slate-500">
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </p>
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
          onSaved={() => { setAdding(false); setNotice("Question created successfully."); onRefresh(); }}
          onCancel={() => setAdding(false)}
          saving={saving}
          setSaving={setSaving}
        />
      )}

      <div className="space-y-3">
        {isChessContest ? null : questions.map((q, i) => (
          <div key={q.id}>
            {editId === q.id ? (
              <QuestionForm
                contestId={contestId}
                existing={q}
                nextIndex={q.order_index}
                onSaved={() => { setEditId(null); setNotice("Question updated successfully."); onRefresh(); }}
                onCancel={() => setEditId(null)}
                saving={saving}
                setSaving={setSaving}
              />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">Q{i + 1}</span>
                      <span className="font-semibold text-slate-950">{q.title}</span>
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">{q.points} pts</span>
                    </div>
                    {q.description && normalizeQuestionType(q.question_type) !== "follow_up" && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{q.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                        {QUESTION_TYPE_META[normalizeQuestionType(q.question_type)].label}
                      </span>
                      {(normalizeQuestionType(q.question_type) === "code" || normalizeQuestionType(q.question_type) === "interactive") && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-medium text-slate-500">
                          {q.time_limit_ms} ms · {q.memory_limit_mb} MB
                        </span>
                      )}
                      {normalizeQuestionType(q.question_type) === "follow_up" && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                          {parseFollowUpParts(q.description).length} part{parseFollowUpParts(q.description).length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
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
                        {deleting === q.id ? "Deleting…" : "Confirm delete?"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(q.id)}
                        disabled={deleting === q.id}
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
        ))}

        {questions.length === 0 && !adding && !isChessContest && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            </span>
            <p className="text-sm font-semibold text-slate-950">No questions yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Code, interactive, follow-up, and Markov-chain questions are all supported.
            </p>
            <button
              onClick={startAdding}
              className="ams-btn ams-btn-primary ams-btn-md mt-4"
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

const QUESTION_TYPE_META: Record<"code" | "interactive" | "follow_up" | "markov", { label: string; hint: string }> = {
  code: { label: "Code submission", hint: "Classic judged problem — statement, tests, validator and checker. Graded automatically by the judge." },
  interactive: { label: "Interactive", hint: "The student's program converses with your custom checker over stdin/stdout. Requires a custom checker." },
  follow_up: { label: "Follow Up", hint: "Short-answer parts with expected answers. Total points are the sum of all parts." },
  markov: { label: "Markov Chain", hint: "The student draws a Markov chain; it is graded against the answer-key chain you build below." },
};

function normalizeQuestionType(raw: string | undefined): "code" | "interactive" | "follow_up" | "markov" {
  return raw === "interactive" || raw === "follow_up" || raw === "markov" ? raw : "code";
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
  onSaved: () => void;
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
    const wrapper = document.getElementById("contest-page-container");
    if (wrapper) {
      wrapper.classList.remove("max-w-4xl");
      wrapper.classList.add("max-w-[98vw]", "lg:max-w-[95vw]");
    }
    return () => {
      if (wrapper) {
        wrapper.classList.remove("max-w-[98vw]", "lg:max-w-[95vw]");
        wrapper.classList.add("max-w-4xl");
      }
    }
  }, [contestId]);

  function handleCancel() {
    if (saving) return;
    // Lightweight dirty check: for an existing question only the title is
    // compared (the studio re-composes `description`, so it can differ from
    // the stored value without user edits); for a new question, any content.
    const dirty = existing
      ? title !== existing.title
      : Boolean(title.trim() || description.trim());
    if (dirty && !window.confirm("Discard unsaved changes to this question?")) return;
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
          // Best-effort cleanup: remove the orphaned question so retry
          // doesn't accumulate duplicates. Ignore cleanup errors.
          await apiFetch(`/api/org/contests/${contestId}/questions/${created.id}`, { method: "DELETE" }).catch(() => null);
          throw new Error("CP configuration could not be saved" + (cpErr instanceof Error ? `: ${cpErr.message}` : "") + ". The question was not created — please try again.");
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

      {/* Title + points */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Build a responsive navbar"
            className="glass-input text-sm text-slate-950"
          />
        </div>
        {questionType !== "follow_up" && (
          <div className="w-24">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Points</label>
            <input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="glass-input text-sm text-slate-950"
            />
          </div>
        )}
      </div>

      {/* Question type */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Question type</label>
        <div className="inline-flex flex-wrap gap-2">
          {(["code", "interactive", "follow_up", "markov"] as const).map((qt) => (
            <button
              key={qt}
              type="button"
              onClick={() => setQuestionType(qt)}
              aria-pressed={questionType === qt}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                questionType === qt
                  ? "border-purple-300 bg-purple-50 text-purple-800"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {QUESTION_TYPE_META[qt].label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">{QUESTION_TYPE_META[questionType].hint}</p>
        {originalType !== null && questionType !== originalType && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="font-semibold">Heads up:</span> changing the type of an existing question replaces how it is
            graded. Its previous grading configuration (tests, checker, or answer key) may no longer apply after saving.
          </div>
        )}
      </div>

      {/* Time / memory limits — hidden for follow_up and markov */}
      {questionType !== "follow_up" && questionType !== "markov" && (
        <div className="mb-4 flex gap-3">
          <div className="flex-1">
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
          <div className="flex-1">
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
        </div>
      )}

      {/* Follow Up editor */}
      {questionType === "follow_up" && (
        <FollowUpEditor parts={followUpParts} onChange={setFollowUpParts} />
      )}

      {/* Markov editor — problem statement + answer key chain */}
      {questionType === "markov" && (
        <div className="mb-4">
          {/* Problem statement + live preview */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Problem Statement</label>
              <textarea
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the Markov chain problem the student must solve…"
                className="glass-input w-full text-sm font-mono"
                style={{ resize: "vertical", minHeight: 160 }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Preview</label>
              <div
                style={{
                  minHeight: 160,
                  background: "rgba(7,17,36,0.7)",
                  border: "1px solid rgba(100,116,139,0.18)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  overflowY: "auto",
                  maxHeight: 320,
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(description) || '<span style="color:#475569;font-size:12px">Preview will appear here…</span>' }}
              />
            </div>
          </div>

          {/* Answer key editor + live JSON */}
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Answer Key — build the correct Markov chain below
          </label>
          <p className="mb-2 text-[11px] text-slate-400">
            Double-click canvas to add state · Drag to move · Right-click state to toggle initial/accepting · Click arrow label to edit probability
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 12, alignItems: "start" }}>
            <MarkovEditor value={markovChain} onChange={setMarkovChain} />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Live JSON</label>
              <pre
                style={{
                  background: "#0a0f1e",
                  border: "1px solid rgba(168,85,247,0.18)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 10.5,
                  color: "#94a3b8",
                  overflowY: "auto",
                  maxHeight: 460,
                  margin: 0,
                  fontFamily: "monospace",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {JSON.stringify(normalizeChain(markovChain), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Problem Studio — only for code/interactive */}
      {questionType !== "follow_up" && questionType !== "markov" && <CPProblemStudio
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
      />}

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
          {saving ? "Saving question... please wait."
            : questionType === "follow_up" ? "Points are the sum of all parts."
            : questionType === "markov" ? "Define the correct Markov chain as the answer key."
            : "Save question first, then upload tests and run validation."}
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
              min={0}
              value={part.points}
              onChange={(e) => updatePart(part.id, { points: Math.max(0, Number(e.target.value)) })}
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

  return (
    <div>
      {/* Add invites */}
      <div className="glass-card mb-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-purple-600" />
          <p className="text-sm font-medium text-slate-950">Invite candidates</p>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Enter email addresses or `Name &lt;email&gt;` lines. Use the template below to send the desktop download link in one batch.
        </p>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
        )}

        <textarea
          rows={4}
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder={"Alice Doe <alice@college.edu>\nbob@university.edu\nCharlie, charlie@institute.ac.in"}
          className="glass-input mb-3 resize-none text-sm text-slate-950"
          style={{ fontFamily: "monospace" }}
        />
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
          className="glass-input mb-3 text-sm text-slate-950"
        />
        <textarea
          rows={6}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder={"Use {{email}} and {{download_url}} in the message body."}
          className="glass-input mb-3 resize-y text-sm text-slate-950"
        />
        <button
          onClick={() => void addInvites()}
          disabled={saving || !allowBulkInvites}
          className="ams-btn ams-btn-primary ams-btn-md disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          {!allowBulkInvites ? "Bulk invites disabled by AMS admin" : saving ? "Saving…" : "Send invites"}
        </button>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded border border-slate-200 p-3">
            <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Template Preview</p>
            <p className="text-sm font-medium text-slate-950">{subject.replaceAll("{{email}}", "candidate@example.com")}</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
              {template.replaceAll("{{email}}", "candidate@example.com").replaceAll("{{download_url}}", "https://amsaccess.com/download")}
            </pre>
          </div>
          <div className="rounded border border-slate-200 p-3 text-xs text-slate-500">
            Allowed placeholders: <code>{"{{email}}"}</code>, <code>{"{{download_url}}"}</code>
          </div>
        </div>
      </div>

      {/* Invites list */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate-400">
          {invites.length} invite{invites.length !== 1 ? "s" : ""}
        </p>
        {invites.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm"
          >
            <Mail className="mb-3 h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-950">No invites yet</p>
          </div>
        ) : (
          <div className="overflow-hidden glass-card">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr className="text-xs uppercase tracking-widest text-slate-400">
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Invited</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-slate-950">{inv.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded px-2 py-0.5 text-xs"
                        style={
                          inv.status === "accepted"
                            ? { background: "rgba(34,197,94,0.1)", color: "#22c55e" }
                            : { background: "rgba(245,158,11,0.1)", color: "#f59e0b" }
                        }
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void removeInvite(inv.id)}
                        disabled={removing === inv.id}
                        className="rounded p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
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
function SettingsTab({ contest, forcedMode, onSaved, onDeleted }: {
  contest: Contest; forcedMode: "CHESS" | null; onSaved: () => void; onDeleted: () => void;
}) {
  const [title, setTitle]           = useState(contest.title);
  const [description, setDesc]      = useState(contest.description ?? "");
  const [startAt, setStartAt]       = useState(toDateTimeLocalValue(contest.start_at));
  const [endAt, setEndAt]           = useState(toDateTimeLocalValue(contest.end_at));
  const [timezone, setTimezone]     = useState(contest.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
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
  const sectionTitleClass = "mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400";
  const pillClass = (active: boolean, tone: "purple" | "emerald" = "purple") => {
    if (active && tone === "emerald") return "rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition";
    if (active) return "rounded-md border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-sm transition";
    return "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950";
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-5 p-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</div>}

        <section className={sectionClass}>
          <h3 className={sectionTitleClass}>Basic Information</h3>
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
        </section>

        <section className={sectionClass}>
          <h3 className={sectionTitleClass}>Scheduling</h3>
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
        </section>

        <section className={sectionClass}>
          <h3 className={sectionTitleClass}>Contest Parameters</h3>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className={labelClass}>Status</label>
              <div className="flex flex-wrap gap-2">
                {(["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setStatus(s)} className={pillClass(status === s)}>
                    {s}
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
        </section>

        <section className={sectionClass}>
          <h3 className={sectionTitleClass}>Plugin Configuration</h3>
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
        </section>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => void save()} disabled={saving}
          className="ams-btn ams-btn-primary ams-btn-md"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={() => void deleteContest()} disabled={deleting}
          className="ams-btn ams-btn-danger ams-btn-md"
        >
          <Trash2 className="h-4 w-4" />
          Delete contest
        </button>
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

