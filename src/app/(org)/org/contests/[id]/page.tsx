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

// ─── Helpers ─────────────────────────────────────────────────
function statusColor(s: string) {
  if (s === "ACTIVE")     return { bg: "rgba(34,197,94,0.1)",    border: "rgba(34,197,94,0.3)",    text: "#22c55e" };
  if (s === "SCHEDULED")  return { bg: "rgba(139,92,246,0.1)",   border: "rgba(139,92,246,0.3)",   text: "#a855f7" };
  if (s === "ENDED")      return { bg: "rgba(100,116,139,0.1)",  border: "rgba(100,116,139,0.3)",  text: "#94a3b8" };
  return { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", text: "#f59e0b" };
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
      const data = await apiFetch<ContestDetailResponse>(`/api/org/contests/${id}`);
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
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#000000" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-purple-500" />
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#000000" }}>
        <div className="text-center">
          <p className="text-sm text-red-400">{error ?? "Contest not found."}</p>
          <Link href="/org/dashboard" className="mt-4 inline-block text-sm" style={{ color: "#a855f7" }}>← Back</Link>
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
  const col = statusColor(contest.status);
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
  const judgeDotClass = judgePhase === "ready" ? "bg-green-500" : judgePhase === "starting" ? "bg-amber-400" : judgePhase === "stopping" ? "bg-orange-400" : "bg-zinc-500";

  return (
    <div className="min-h-screen" style={{ background: "#000000", fontFamily: "var(--font-geist), system-ui, sans-serif" }}>
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div id="contest-page-container" className="relative mx-auto max-w-4xl px-6 py-8 transition-all duration-300">
        {/* Back */}
        <Link
          href="/org/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm transition"
          style={{ color: "#71717A" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        {/* Contest header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-white">{contest.title}</h1>
              <span
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ background: col.bg, border: `1px solid ${col.border}`, color: col.text }}
              >
                {contest.status}
              </span>
            </div>
            {contest.description && (
              <p className="mt-1 text-sm" style={{ color: "#64748b" }}>{contest.description}</p>
            )}
            <p className="mt-1 text-xs" style={{ color: "#52525B" }}>
              {new Date(contest.start_at).toLocaleString()} → {new Date(contest.end_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs border" style={{ borderColor: "rgba(255,255,255,0.15)", color: "#d4d4d8" }}>
              <span className={`h-2 w-2 rounded-full ${judgeDotClass}`} />
              {judge
                ? `Judge: ${judgeLabel} (${judge.running_instances ?? 0}/${judge.total_instances ?? 0} up, target ${judge.target_size}) · mode ${judge.mode ?? "AUTO"}`
                : "Judge: Unknown"}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void controlJudge("start")}
                disabled={judgeBusy}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50"
                style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)" }}
              >
                <Play className="h-3.5 w-3.5" />
                Start Compute
              </button>
              <button
                onClick={() => void controlJudge("stop")}
                disabled={judgeBusy}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
                style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }}
              >
                <Square className="h-3.5 w-3.5" />
                Stop Compute
              </button>
              <button
                onClick={() => void loadJudge()}
                disabled={judgeBusy}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
                style={{ color: "#a1a1aa", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${judgeBusy ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
            {judgeError ? <p className="text-[11px] text-red-400">{judgeError}</p> : null}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {([["questions", "Questions", questions.length], ["invites", "Invites", invites.length], ["students", "Students", null], ["live", "Live", null], ["settings", "Settings", null]] as const).map(
            ([key, label, count]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition"
                style={
                  tab === key
                    ? { background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }
                    : { color: "#71717A", border: "1px solid transparent" }
                }
              >
                {label}
                {count !== null && (
                  <span
                    className="rounded px-1.5 text-xs"
                    style={tab === key ? { background: "rgba(139,92,246,0.3)", color: "#c4b5fd" } : { background: "rgba(255,255,255,0.06)", color: "#71717A" }}
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
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.12em] text-zinc-400">Runtime Status</p>
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
          <p className="mt-1 text-lg font-semibold text-white">
            {runtime?.runtime_status ?? "UNKNOWN"}
            {runtime?.runtime_ready ? " · READY" : ""}
          </p>
          <p className="text-xs text-zinc-500">
            {runtime ? `instances ${runtime.capacity.running_instances ?? 0}/${runtime.capacity.total_instances ?? 0}, target ${runtime.capacity.target_size}` : "No runtime data"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadLive()} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-zinc-200">
            {busy ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={() => void runReadinessCheck()} className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300">
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
              <span className="font-mono text-[11px] text-zinc-300">{item.candidate}</span>
              <span className="text-[11px] text-zinc-500">{item.final_verdict ?? item.status}</span>
            </>
          )}
        />
        <LiveTable
          title="Proctor Events"
          items={proctor}
          render={(item) => (
            <>
              <span className="font-mono text-[11px] text-zinc-300">{item.candidate}</span>
              <span className={`text-[11px] ${
                item.severity === "CRITICAL"
                  ? "text-red-300"
                  : item.severity === "WARN"
                  ? "text-amber-300"
                  : "text-zinc-400"
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
              <span className="font-mono text-[11px] text-zinc-300">{item.status}</span>
              <span className="text-[11px] text-zinc-500">{item.reason_code ?? item.source}</span>
            </>
          )}
        />
      </div>
    </div>
  );
}

function LiveTable<T>({ title, items, render }: { title: string; items: T[]; render: (item: T) => ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10 px-3 py-2 text-xs font-medium text-zinc-300">{title}</div>
      <div className="max-h-72 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-3 py-3 text-xs text-zinc-500">No events</div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between border-b border-white/5 px-3 py-2 last:border-b-0">
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

  async function deleteQuestion(qId: string) {
    setDeleting(qId);
    try {
      await apiFetch<{ deleted: boolean }>(`/api/org/contests/${contestId}/questions/${qId}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm" style={{ color: "#71717A" }}>
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          {isChessContest ? (
            <Link
              href={`/org/contests/${contestId}/chess/testplay`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
              style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.35)" }}
            >
              <Play className="h-4 w-4" />
              Open Chess Test Play
            </Link>
          ) : (
            <button
              onClick={() => { setAdding(true); setEditId(null); }}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              <Plus className="h-4 w-4" />
              Add question
            </button>
          )}
        </div>
      </div>

      {isChessContest ? (
        <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <p className="text-sm font-medium text-emerald-300">This contest is in CHESS mode.</p>
          <p className="mt-1 text-xs text-zinc-400">
            CP question editing is disabled for CHESS contests. Use the Chess Test Play workflow for rulesets, validation, and move simulation.
          </p>
        </div>
      ) : null}

      {adding && !isChessContest && (
        <QuestionForm
          contestId={contestId}
          nextIndex={questions.length + 1}
          onSaved={() => { setAdding(false); onRefresh(); }}
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
                onSaved={() => { setEditId(null); onRefresh(); }}
                onCancel={() => setEditId(null)}
                saving={saving}
                setSaving={setSaving}
              />
            ) : (
              <div className="glass-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: "#52525B" }}>Q{i + 1}</span>
                      <span className="font-medium text-white">{q.title}</span>
                      <span className="text-xs" style={{ color: "#a855f7" }}>{q.points} pts</span>
                    </div>
                    {q.description && (
                      <p className="mt-1.5 text-sm line-clamp-2" style={{ color: "#71717A" }}>{q.description}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      {(["HTML", "CSS", "JS"] as const).map((lang) => {
                        const key = `${lang.toLowerCase()}_starter` as keyof Question;
                        const val = q[key] as string;
                        return val ? (
                          <span key={lang} className="rounded px-1.5 py-0.5 text-xs font-mono" style={{ background: "rgba(139,92,246,0.1)", color: "#a855f7" }}>
                            {lang}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setEditId(q.id)}
                      className="rounded-lg px-3 py-1.5 text-xs transition"
                      style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void deleteQuestion(q.id)}
                      disabled={deleting === q.id}
                      className="rounded-lg px-3 py-1.5 text-xs transition disabled:opacity-40"
                      style={{ border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {questions.length === 0 && !adding && !isChessContest && (
          <div
            className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
            style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
          >
            <Code2 className="mb-3 h-8 w-8" style={{ color: "#3F3F46" }} />
            <p className="text-sm font-medium text-white">No questions yet</p>
            <p className="mt-1 text-xs" style={{ color: "#52525B" }}>Add competitive programming problems</p>
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
  const [description, setDescription] = useState(existing?.description ?? `Given an array of $N$ integers, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

### Problem Visualization
![Maximum Subarray Explanation Matrix](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80)

### Interactive Array Simulator
<code>
<div class="p-4 bg-zinc-950/80 border border-purple-500/20 rounded-xl space-y-3 shadow-inner">
  <div class="flex justify-between items-center">
    <span class="text-xs font-semibold text-zinc-300">Simulated Array Size (N):</span>
    <span id="n-val" class="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">45</span>
  </div>
  <input 
    type="range" 
    min="5" 
    max="100" 
    value="45" 
    style="width: 100%; height: 4px; background: #3f3f46; border-radius: 9999px; outline: none; cursor: pointer; accent-color: #a855f7;"
    oninput="document.getElementById('n-val').innerText = this.value; const arr = Array.from({length: 5}, () => Math.floor(Math.random() * 20) - 10); document.getElementById('arr-val').innerText = '[' + arr.join(', ') + ', ...]';" 
  />
  <div class="bg-black/40 p-2.5 rounded-lg border border-white/5 font-mono text-[10px] text-zinc-400">
    <span class="text-zinc-500">Sample Segment:</span> <span id="arr-val">[-3, 4, -1, 2, ...]</span>
  </div>
</div>
</code>

### Input Format
- The first line contains a single integer $N$ ($1 \\le N \\le 10^5$), representing the size of the array.
- The second line contains $N$ space-separated integers $A_1, A_2, \\dots, A_N$ ($-10^9 \\le A_i \\le 10^9$).

### Output Format
- Output a single integer representing the maximum contiguous subarray sum.`);
  const [html, setHtml]               = useState(existing?.html_starter ?? "");
  const [css, setCss]                 = useState(existing?.css_starter ?? "");
  const [js, setJs]                   = useState(existing?.js_starter ?? "");
  const [points, setPoints]           = useState(existing?.points ?? 10);
  const [questionType, setQuestionType] = useState<"code" | "interactive">(
    existing?.question_type === "interactive" ? "interactive" : "code"
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

  async function handleSave() {
    setError(null);
    setSuccess(null);
    if (!title.trim()) { setError("Title is required."); return; }
    if (!Number.isFinite(timeLimit) || timeLimit < 100) {
      setError("Time limit must be at least 100 ms.");
      return;
    }
    if (!Number.isFinite(memoryLimit) || memoryLimit < 16) {
      setError("Memory limit must be at least 16 MB.");
      return;
    }
    setSaving(true);
    try {
      let questionId = existing?.id;
      if (existing) {
        await apiFetch<{ saved: boolean }>(`/api/org/contests/${contestId}/questions/${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, description, html_starter: html, css_starter: css, js_starter: js, points, question_type: questionType, time_limit_ms: timeLimit, memory_limit_mb: memoryLimit })
        });
      } else {
        const created = await apiFetch<{ id: string }>(`/api/org/contests/${contestId}/questions`, {
          method: "POST",
          body: JSON.stringify({ title, description, html_starter: html, css_starter: css, js_starter: js, points, order_index: nextIndex, question_type: questionType, time_limit_ms: timeLimit, memory_limit_mb: memoryLimit })
        });
        questionId = created.id;
      }
      // Always persist cp-config alongside basic question save
      if (questionId) {
        const snap = studioRef.current?.getCpConfig() ?? {
          checker_type: "token" as const,
          checker_code: null,
          validator_code: "",
          generator_script: "",
        };
        console.log("CP CONFIG SNAPSHOT BEFORE SAVE:", snap);
        try {
          await apiFetch<{ ok: boolean }>(`/api/org/contests/${contestId}/questions/${questionId}/cp-config`, {
            method: "PUT",
            body: JSON.stringify({
              checker_type: snap.checker_type,
              checker_code: snap.checker_code,
              validator_code: snap.validator_code,
              generator_script: snap.generator_script,
            }),
          });
        } catch (cpErr) {
          console.error("cp-config save failed", cpErr);
          throw new Error("Failed to save custom C++ configurations (validator/checker): " + (cpErr instanceof Error ? cpErr.message : String(cpErr)));
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
      className="rounded-xl p-5"
      style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.2)" }}
    >
      <p className="mb-4 text-sm font-medium text-white">{existing ? "Edit question" : "New question"}</p>

      {error && (
        <div className="mb-4 rounded px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.08)", color: "#fca5a5" }}>{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded px-3 py-2 text-sm" style={{ background: "rgba(34,197,94,0.12)", color: "#86efac" }}>{success}</div>
      )}

      {/* Title + points */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Build a responsive navbar"
            className="glass-input text-sm text-white"
          />
        </div>
        <div className="w-24">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Points</label>
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="glass-input text-sm text-white"
          />
        </div>
      </div>

      {/* Question type */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Question type</label>
        <div className="inline-flex gap-2">
          <button
            type="button"
            onClick={() => setQuestionType("code")}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              background: questionType === "code" ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.02)",
              border: questionType === "code" ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.12)",
              color: questionType === "code" ? "#c4b5fd" : "#A1A1AA",
            }}
          >
            Code submission
          </button>
          <button
            type="button"
            onClick={() => setQuestionType("interactive")}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              background: questionType === "interactive" ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.02)",
              border: questionType === "interactive" ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.12)",
              color: questionType === "interactive" ? "#c4b5fd" : "#A1A1AA",
            }}
          >
            Interactive
          </button>
        </div>
      </div>

      {/* Time / memory limits */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Time limit (ms)</label>
          <input
            type="number"
            min={100}
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="glass-input text-sm text-white"
          />
          <p className="mt-1 text-[11px]" style={{ color: "#71717A" }}>Min: 100 ms</p>
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Memory limit (MB)</label>
          <input
            type="number"
            min={16}
            value={memoryLimit}
            onChange={(e) => setMemoryLimit(Number(e.target.value))}
            className="glass-input text-sm text-white"
          />
          <p className="mt-1 text-[11px]" style={{ color: "#71717A" }}>Min: 16 MB</p>
        </div>
      </div>

      {/* Problem Studio */}
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
        questionType={questionType}
        timeLimit={timeLimit}
        setTimeLimit={setTimeLimit}
        memoryLimit={memoryLimit}
        setMemoryLimit={setMemoryLimit}
        initialValidatorCode={existing?.validator_code ?? undefined}
        initialCheckerCode={existing?.checker_code ?? undefined}
        initialCheckerType={existing?.checker_type === "custom" ? "custom" : undefined}
        initialGeneratorScript={existing?.generator_script ?? undefined}
      />

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          style={{ background: "rgb(139,92,246)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(124,58,237)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgb(139,92,246)"; }}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save question"}
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition"
          style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#71717A" }}
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
      <p className="mt-2 text-xs" style={{ color: "#71717A" }}>
        {saving ? "Saving question... please wait." : "Save question first, then upload tests and run validation."}
      </p>
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
          <UserPlus className="h-4 w-4" style={{ color: "#a855f7" }} />
          <p className="text-sm font-medium text-white">Invite candidates</p>
        </div>
        <p className="mb-3 text-xs" style={{ color: "#64748b" }}>
          Enter email addresses or `Name &lt;email&gt;` lines. Use the template below to send the desktop download link in one batch.
        </p>

        {error && (
          <div className="mb-3 rounded px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.08)", color: "#fca5a5" }}>{error}</div>
        )}
        {success && (
          <div className="mb-3 rounded px-3 py-2 text-sm" style={{ background: "rgba(34,197,94,0.08)", color: "#86efac" }}>{success}</div>
        )}

        <textarea
          rows={4}
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder={"Alice Doe <alice@college.edu>\nbob@university.edu\nCharlie, charlie@institute.ac.in"}
          className="glass-input mb-3 resize-none text-sm text-white"
          style={{ fontFamily: "monospace" }}
        />
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
          className="glass-input mb-3 text-sm text-white"
        />
        <textarea
          rows={6}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder={"Use {{email}} and {{download_url}} in the message body."}
          className="glass-input mb-3 resize-y text-sm text-white"
        />
        <button
          onClick={() => void addInvites()}
          disabled={saving || !allowBulkInvites}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          style={{ background: "rgb(139,92,246)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(124,58,237)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgb(139,92,246)"; }}
        >
          <Mail className="h-4 w-4" />
          {!allowBulkInvites ? "Bulk invites disabled by AMS admin" : saving ? "Saving…" : "Send invites"}
        </button>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded border border-white/10 p-3">
            <p className="mb-2 text-xs uppercase tracking-widest" style={{ color: "#64748b" }}>Template Preview</p>
            <p className="text-sm font-medium text-white">{subject.replaceAll("{{email}}", "candidate@example.com")}</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-white/80">
              {template.replaceAll("{{email}}", "candidate@example.com").replaceAll("{{download_url}}", "https://amsaccess.com/download")}
            </pre>
          </div>
          <div className="rounded border border-white/10 p-3 text-xs" style={{ color: "#94a3b8" }}>
            Allowed placeholders: <code>{"{{email}}"}</code>, <code>{"{{download_url}}"}</code>
          </div>
        </div>
      </div>

      {/* Invites list */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest" style={{ color: "#52525B" }}>
          {invites.length} invite{invites.length !== 1 ? "s" : ""}
        </p>
        {invites.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl py-12 text-center"
            style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
          >
            <Mail className="mb-3 h-8 w-8" style={{ color: "#3F3F46" }} />
            <p className="text-sm font-medium text-white">No invites yet</p>
          </div>
        ) : (
          <div className="overflow-hidden glass-card">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <tr className="text-xs uppercase tracking-widest" style={{ color: "#52525B" }}>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Invited</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td className="px-4 py-3 font-mono text-white">{inv.email}</td>
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
                    <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void removeInvite(inv.id)}
                        disabled={removing === inv.id}
                        className="rounded p-1.5 transition disabled:opacity-40"
                        style={{ color: "#71717A" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#71717A"; }}
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

  return (
    <div className="space-y-4 glass-card p-7">
      {error && <div className="rounded px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.08)", color: "#fca5a5" }}>{error}</div>}
      {success && <div className="rounded px-3 py-2 text-sm" style={{ background: "rgba(34,197,94,0.08)", color: "#86efac" }}>Saved.</div>}

      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="glass-input text-sm text-white" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDesc(e.target.value)} className="glass-input resize-none text-sm text-white" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Start</label>
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="glass-input text-sm text-white" style={{ colorScheme: "dark" }} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>End</label>
          <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="glass-input text-sm text-white" style={{ colorScheme: "dark" }} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Timezone</label>
        <input
          type="text"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="glass-input text-sm text-white"
          placeholder="Asia/Kolkata"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Status</label>
        <div className="flex gap-2">
          {(["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"] as const).map((s) => (
            <button
              key={s} type="button" onClick={() => setStatus(s)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
              style={status === s
                ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#c4b5fd" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#71717A" }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Scoring type</label>
        <div className="flex gap-2">
          {(["IOI", "ICPC", "CF"] as const).map((s) => (
            <button
              key={s} type="button" onClick={() => setScoringType(s)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
              style={scoringType === s
                ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#c4b5fd" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#71717A" }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Allowed languages</label>
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
                className="rounded-md px-3 py-1 text-xs font-medium transition"
                style={
                  active
                    ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#c4b5fd" }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#71717A" }
                }
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Contest mode</label>
        <div className="flex gap-2">
          {(["CP", "CHESS"] as const).map((s) => (
            <button
              key={s} type="button" onClick={() => setPluginType(s)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
              style={pluginType === s
                ? { background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#6ee7b7" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#71717A" }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Plugin config (JSON)</label>
        <textarea
          rows={3}
          value={pluginConfig}
          onChange={(e) => setPluginConfig(e.target.value)}
          className="glass-input resize-none font-mono text-xs text-white"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => void save()} disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          style={{ background: "rgb(139,92,246)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(124,58,237)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgb(139,92,246)"; }}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={() => void deleteContest()} disabled={deleting}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50"
          style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
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

  // Check running job status continuously
  useEffect(() => {
    if (!currentJob || currentJob.status === "COMPLETED" || currentJob.status === "FAILED") return;
    const interval = setInterval(async () => {
      try {
        const job = await apiFetch<any>(`/api/org/contests/${contestId}/emails/jobs/${currentJob.id}`);
        setCurrentJob(job);
        if (job.status === "COMPLETED" || job.status === "FAILED" || job.status === "PARTIAL") {
          clearInterval(interval);
          void loadStudents();
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
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
      <div className="flex gap-4 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveSubTab("provision")}
          className={`pb-2 text-sm font-semibold transition ${
            activeSubTab === "provision"
              ? "text-violet-400 border-b-2 border-violet-500"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Student Provisioning
        </button>
        <button
          onClick={() => setActiveSubTab("emails")}
          className={`pb-2 text-sm font-semibold transition ${
            activeSubTab === "emails"
              ? "text-violet-400 border-b-2 border-violet-500"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Email Invites Dispatcher
        </button>
      </div>

      {activeSubTab === "provision" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Import Area */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-violet-400" />
                Upload CSV Student Roster
              </h3>
              <p className="text-xs text-zinc-400">
                Provide a CSV containing columns <code className="text-violet-300">name</code> and{" "}
                <code className="text-violet-300">email</code>. We will generate unique{" "}
                <code className="text-violet-300">@amsaccess.com</code> login credentials for each student.
              </p>

              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] transition">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  Choose File
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <span className="text-xs text-zinc-500">or paste plain CSV content below:</span>
              </div>

              <textarea
                rows={6}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="name,email&#10;Jane Doe,jane@domain.com&#10;John Smith,john@domain.com"
                className="w-full glass-input resize-none font-mono text-xs text-white"
              />

              <button
                onClick={() => void handleImport()}
                disabled={importing}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
                style={{ background: "rgb(139,92,246)" }}
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
                    <div className="mt-2 space-y-1 border-t border-emerald-500/10 pt-2 text-[10px] text-zinc-400 max-h-24 overflow-y-auto">
                      {importStatus.errors.map((e: string, idx: number) => (
                        <div key={idx}>• {e}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Permanent Code Box */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-violet-400" />
                Permanent Contest Access Code
              </h3>
              <p className="text-xs text-zinc-400 font-normal leading-relaxed">
                This contest features a permanent access code that students use to unlock the assessment in the Proctor Secure app. You do not need to generate code each time.
              </p>
              <div className="flex items-center justify-between rounded-lg bg-black/40 border border-white/10 p-4">
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 font-semibold block">Fixed Access Code</span>
                  <span className="font-mono text-xl font-bold text-violet-400 tracking-wider">
                    {loadingCode ? "RESOLVING..." : sessionCode || "NO CODE ASSIGNED"}
                  </span>
                </div>
                <button
                  onClick={() => void fetchSessionCode()}
                  disabled={loadingCode}
                  className="rounded-lg border border-white/20 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.08]"
                >
                  Sync Code
                </button>
              </div>
            </div>
          </div>

          {/* Searchable Paginated List */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-sm font-medium text-white">Provisioned Student Credentials</h3>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 glass-input text-xs text-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300 font-normal">
                <thead className="border-b border-white/10 text-zinc-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Registered Email</th>
                    <th className="py-2.5 px-3">Generated User</th>
                    <th className="py-2.5 px-3">Generated Password</th>
                    <th className="py-2.5 px-3">Invite Status</th>
                    <th className="py-2.5 px-3">Provision Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-zinc-500">
                        No students provisioned yet.
                      </td>
                    </tr>
                  ) : (
                    students.map((st) => (
                      <tr key={st.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3 font-semibold text-white">{st.name}</td>
                        <td className="py-3 px-3 text-zinc-400">{st.email}</td>
                        <td className="py-3 px-3 font-mono text-violet-300">{st.generated_username}</td>
                        <td className="py-3 px-3 font-mono text-zinc-400">{st.generated_password}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                              st.delivery_status === "sent"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : st.delivery_status === "failed"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                            }`}
                          >
                            {st.delivery_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-zinc-500">{new Date(st.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalCount > limit && (
              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-400">
                <span>
                  Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)} of {totalCount} students
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-zinc-300 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => (p * limit < totalCount ? p + 1 : p))}
                    disabled={page * limit >= totalCount}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-zinc-300 disabled:opacity-40"
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
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.03] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">Live Email Dispatch Job Status</h4>
                  <p className="text-xs text-zinc-500 font-normal">Job ID: {currentJob.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                      currentJob.status === "RUNNING"
                        ? "bg-violet-500/20 text-violet-300 border-violet-500/30 animate-pulse"
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
                      className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry Failures
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Counters */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-black/35 rounded-lg border border-white/5 p-3">
                  <div className="text-zinc-500 text-[10px] uppercase font-bold">Total Recipients</div>
                  <div className="text-lg font-bold text-white mt-1">{currentJob.total_count}</div>
                </div>
                <div className="bg-black/35 rounded-lg border border-white/5 p-3">
                  <div className="text-zinc-500 text-[10px] uppercase font-bold">Progress</div>
                  <div className="text-lg font-bold text-violet-400 mt-1 font-mono">
                    {Math.round(((currentJob.sent_count + currentJob.failed_count) / currentJob.total_count) * 100)}%
                  </div>
                </div>
                <div className="bg-black/35 rounded-lg border border-white/5 p-3">
                  <div className="text-zinc-500 text-[10px] uppercase font-bold">Successfully Sent</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">{currentJob.sent_count}</div>
                </div>
                <div className="bg-black/35 rounded-lg border border-white/5 p-3">
                  <div className="text-zinc-500 text-[10px] uppercase font-bold">Failed Delivery</div>
                  <div className="text-lg font-bold text-red-400 mt-1">{currentJob.failed_count}</div>
                </div>
              </div>

              {/* Recipient Details */}
              {currentJob.recipients && currentJob.recipients.length > 0 && (
                <div className="bg-black/25 rounded-lg border border-white/10 p-3 max-h-48 overflow-y-auto text-xs">
                  <div className="font-bold text-zinc-400 mb-2 border-b border-white/5 pb-1 uppercase tracking-wider text-[10px]">Delivery Logs</div>
                  <div className="space-y-1.5">
                    {currentJob.recipients.map((rec: any) => (
                      <div key={rec.id} className="flex justify-between items-center text-[11px]">
                        <span className="font-mono text-zinc-300">
                          {rec.name} ({rec.email})
                        </span>
                        <span
                          className={`font-semibold ${
                            rec.status === "SENT"
                              ? "text-emerald-400"
                              : rec.status === "FAILED"
                              ? "text-red-400"
                              : "text-zinc-500"
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
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Mail className="h-4 w-4 text-violet-400" />
                  Compose Invitation Template
                </h3>
              </div>

              {/* Template dropdown options */}
              <div>
                <label className="mb-1 block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Quick Template Preset</label>
                <div className="flex gap-2">
                  {templates.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSubject(t.subject);
                        setBodyTemplate(t.body);
                      }}
                      className="rounded border border-white/15 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/[0.08]"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">HTML Body Template</label>
                <textarea
                  rows={14}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className="w-full glass-input font-mono text-xs text-white resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEmailPreviewMode("preview")}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] transition"
                >
                  <Eye className="h-4 w-4 text-violet-400" />
                  See Real-Time Preview
                </button>
                <button
                  onClick={() => void handleSendEmails()}
                  disabled={sendingEmail}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-white transition disabled:opacity-50"
                  style={{ background: "rgb(139,92,246)" }}
                >
                  <Send className="h-4 w-4" />
                  {sendingEmail ? "Dispatching..." : "Send Bulk Invites"}
                </button>
              </div>
            </div>

            {/* Live Gmail Preview Panel */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4 flex flex-col">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                Gmail-style Real-Time HTML Preview
              </h3>
              <p className="text-xs text-zinc-400 leading-normal font-normal">
                This shows exactly what students will see in their inboxes. All template variables are compiled in real-time.
              </p>

              <div className="flex-1 rounded-xl bg-[#0c0c0e] border border-white/5 overflow-hidden flex flex-col min-h-[400px]">
                <div className="bg-[#121214] border-b border-white/5 p-3 space-y-1">
                  <div className="text-[11px] text-zinc-500 font-normal">
                    <span className="font-semibold text-zinc-400">Subject:</span> {subject}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-normal">
                    <span className="font-semibold text-zinc-400">From:</span> ams-access-system@amsaccess.com
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

