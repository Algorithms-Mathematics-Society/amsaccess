"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, Save, Code2, Mail, UserPlus,
  X, Sparkles, Monitor,
} from "lucide-react";
import { apiFetch } from "@/lib/client/apiClient";
import CPProblemStudio from "@/components/CPProblemStudio";

// ─── Types ───────────────────────────────────────────────────
type Contest = {
  id: string; title: string; description: string | null;
  start_at: string; end_at: string; status: string; org_id: string;
  scoring_type: string; allowed_languages: string[];
};

type Question = {
  id: string; contest_id: string; title: string; description: string;
  html_starter: string; css_starter: string; js_starter: string;
  points: number; order_index: number;
  question_type: string; time_limit_ms: number; memory_limit_mb: number;
};

type Invite = {
  id: string; email: string; status: string; created_at: string;
};

type Tab = "questions" | "invites" | "settings";
type CodeTab = "html" | "css" | "js";

type ContestDetailResponse = {
  contest: Contest;
  questions: Question[];
  invites: Invite[];
};

// ─── Helpers ─────────────────────────────────────────────────
function statusColor(s: string) {
  if (s === "ACTIVE")     return { bg: "rgba(34,197,94,0.1)",    border: "rgba(34,197,94,0.3)",    text: "#22c55e" };
  if (s === "SCHEDULED")  return { bg: "rgba(139,92,246,0.1)",   border: "rgba(139,92,246,0.3)",   text: "#a855f7" };
  if (s === "ENDED")      return { bg: "rgba(100,116,139,0.1)",  border: "rgba(100,116,139,0.3)",  text: "#94a3b8" };
  return { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", text: "#f59e0b" };
}

// ─── Main page ───────────────────────────────────────────────
export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("questions");
  const [contest, setContest] = useState<Contest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const col = statusColor(contest.status);

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
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {([["questions", "Questions", questions.length], ["invites", "Invites", invites.length], ["settings", "Settings", null]] as const).map(
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
        {tab === "settings" && (
          <SettingsTab contest={contest} onSaved={load} onDeleted={() => router.push("/org/dashboard")} />
        )}
      </div>
    </div>
  );
}

// ─── Questions tab ───────────────────────────────────────────
function QuestionsTab({ contestId, questions, onRefresh }: {
  contestId: string; questions: Question[]; onRefresh: () => void;
}) {
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
        <button
          onClick={() => { setAdding(true); setEditId(null); }}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      </div>

      {adding && (
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
        {questions.map((q, i) => (
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

        {questions.length === 0 && !adding && (
          <div
            className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
            style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
          >
            <Code2 className="mb-3 h-8 w-8" style={{ color: "#3F3F46" }} />
            <p className="text-sm font-medium text-white">No questions yet</p>
            <p className="mt-1 text-xs" style={{ color: "#52525B" }}>Add HTML/CSS/JS coding challenges</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Question form (add / edit) ──────────────────────────────
function QuestionForm({ contestId, existing, nextIndex, onSaved, onCancel, saving, setSaving }: {
  contestId: string;
  existing?: Question;
  nextIndex: number;
  onSaved: () => void;
  onCancel: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
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
  const [codeTab, setCodeTab]         = useState<CodeTab>("html");
  const [questionType, setQuestionType] = useState<"code" | "output_only">(
    (existing?.question_type as "code" | "output_only") ?? "code"
  );
  const [timeLimit, setTimeLimit]     = useState(existing?.time_limit_ms ?? 2000);
  const [memoryLimit, setMemoryLimit] = useState(existing?.memory_limit_mb ?? 256);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (questionType === "code") {
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
      };
    }
  }, [questionType]);

  async function handleSave() {
    setError(null);
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    try {
      if (existing) {
        await apiFetch<{ saved: boolean }>(`/api/org/contests/${contestId}/questions/${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, description, html_starter: html, css_starter: css, js_starter: js, points, question_type: questionType, time_limit_ms: timeLimit, memory_limit_mb: memoryLimit })
        });
      } else {
        await apiFetch<{ saved: boolean }>(`/api/org/contests/${contestId}/questions`, {
          method: "POST",
          body: JSON.stringify({ title, description, html_starter: html, css_starter: css, js_starter: js, points, order_index: nextIndex, question_type: questionType, time_limit_ms: timeLimit, memory_limit_mb: memoryLimit })
        });
      }
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

      {/* Description */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Problem description</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the problem. You can use HTML formatting…"
          className="glass-input resize-y text-sm text-white"
        />
      </div>

      {/* Question type */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Question type</label>
        <div className="flex gap-3">
          {([["code", "Code submission"], ["output_only", "Output only"]] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setQuestionType(val)}
              className="rounded-lg px-4 py-2 text-sm font-medium transition"
              style={
                questionType === val
                  ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.5)", color: "#c4b5fd" }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#71717A" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Time / memory limits */}
      {questionType === "code" && (
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
          </div>
        </div>
      )}

      {/* Code Editor Tabs segment */}
      {questionType === "code" ? (
        <>
          {/* Desktop full specs view */}
          <div className="hidden md:block">
            <CPProblemStudio
              contestId={contestId}
              questionId={existing?.id}
              title={title}
              setTitle={setTitle}
              points={points}
              setPoints={setPoints}
              description={description}
              setDescription={setDescription}
              timeLimit={timeLimit}
              setTimeLimit={setTimeLimit}
              memoryLimit={memoryLimit}
              setMemoryLimit={setMemoryLimit}
            />
          </div>

          {/* Mobile warning fallback */}
          <div className="block md:hidden my-6 rounded-2xl border border-purple-500/20 bg-purple-950/20 p-8 text-center shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/[0.03] to-transparent pointer-events-none" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-500/5 animate-pulse">
              <Monitor className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white tracking-tight">Desktop Workspace Required</h3>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
              Configuring advanced competitive programming specifications (such as C++ validators, test generators, custom checkers and expected solutions) requires a desktop-class viewport.
            </p>
            <p className="mt-4 text-[10px] font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 inline-block px-3 py-1 rounded-full">
              Please open this page on a desktop device
            </p>
          </div>
        </>
      ) : (
        /* Code editor tabs for visual layout / output_only starter codes */
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: "#A1A1AA" }}>Question display (HTML / CSS / JS)</label>
            <div className="flex rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {(["html", "css", "js"] as CodeTab[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setCodeTab(lang)}
                  className="rounded px-3 py-1 text-xs font-mono font-medium transition"
                  style={
                    codeTab === lang
                      ? { background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }
                      : { color: "#71717A" }
                  }
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {codeTab === "html" && (
            <CodeArea lang="html" value={html} onChange={setHtml} placeholder={`<div class="problem-statement">\n  <!-- Problem statement HTML here -->\n  <!-- Can include graphs, diagrams, input fields -->\n</div>`} />
          )}
          {codeTab === "css" && (
            <CodeArea lang="css" value={css} onChange={setCss} placeholder={`.problem-statement {\n  /* Style the question display */\n}`} />
          )}
          {codeTab === "js" && (
            <CodeArea lang="js" value={js} onChange={setJs} placeholder={`// Interactive question logic (graphs, validators, etc.)\n// For output-only: set up input field and capture answer\n`} />
          )}
        </div>
      )}

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
    </div>
  );
}

function CodeArea({ lang, value, onChange, placeholder }: { lang: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <textarea
      rows={12}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      className="w-full rounded-xl border p-4 text-sm text-white outline-none transition"
      style={{
        fontFamily: "'IBM Plex Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: "13px",
        lineHeight: 1.7,
        background: "rgba(0,0,0,0.4)",
        borderColor: "rgba(255,255,255,0.1)",
        resize: "vertical",
        tabSize: 2,
        caretColor: "#a855f7",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.08)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          const ta = e.currentTarget;
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          const next = ta.value.substring(0, start) + "  " + ta.value.substring(end);
          onChange(next);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = start + 2;
          });
        }
      }}
    />
  );
}

// ─── Invites tab ─────────────────────────────────────────────
function InvitesTab({ contestId, invites, onRefresh }: {
  contestId: string; invites: Invite[]; onRefresh: () => void;
}) {
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function addInvites() {
    setError(null);
    setSuccess(null);
    const emails = emailInput
      .split(/[,\n\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) { setError("Enter at least one valid email."); return; }

    setSaving(true);
    try {
      const result = await apiFetch<{ invited: number }>(`/api/org/contests/${contestId}/invites`, {
        method: "POST",
        body: JSON.stringify({ emails })
      });

      setEmailInput("");
      setSuccess(`Invited ${result.invited} candidate${result.invited !== 1 ? "s" : ""}.`);
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
          Enter email addresses — one per line or comma-separated. Candidates will see the contest in their Access by AMS app.
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
          placeholder={"alice@college.edu\nbob@university.edu\ncharlie@institute.ac.in"}
          className="glass-input mb-3 resize-none text-sm text-white"
          style={{ fontFamily: "monospace" }}
        />
        <button
          onClick={() => void addInvites()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          style={{ background: "rgb(139,92,246)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(124,58,237)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgb(139,92,246)"; }}
        >
          <Mail className="h-4 w-4" />
          {saving ? "Saving…" : "Send invites"}
        </button>
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
function SettingsTab({ contest, onSaved, onDeleted }: {
  contest: Contest; onSaved: () => void; onDeleted: () => void;
}) {
  const [title, setTitle]           = useState(contest.title);
  const [description, setDesc]      = useState(contest.description ?? "");
  const [startAt, setStartAt]       = useState(contest.start_at.slice(0, 16));
  const [endAt, setEndAt]           = useState(contest.end_at.slice(0, 16));
  const [status, setStatus]         = useState(contest.status);
  const [scoringType, setScoringType] = useState(contest.scoring_type ?? "ICPC");
  const [allowedLangs, setAllowedLangs] = useState<string[]>(contest.allowed_languages ?? ["C++17", "Python3", "Java17"]);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);

  async function save() {
    setError(null);
    setSuccess(false);
    if (new Date(endAt) <= new Date(startAt)) { setError("End time must be after start time."); return; }
    setSaving(true);
    try {
      await apiFetch<{ saved: boolean }>(`/api/org/contests/${contest.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          description,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          status,
          scoring_type: scoringType,
          allowed_languages: allowedLangs,
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
