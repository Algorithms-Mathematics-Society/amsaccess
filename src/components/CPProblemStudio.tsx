"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/client/apiClient";
import {
  X,
  Plus,
  Trash2,
  Play,
  Check,
  AlertCircle,
  Database,
  Code,
  FileText,
  Terminal,
  Settings,
  Activity,
  Eye,
  RefreshCw,
  Sliders,
  Download,
  ExternalLink,
  Lock,
  Sparkles,
  Layers,
  FileCode,
  CheckCircle2,
  HelpCircle,
  UploadCloud,
  ArrowRight,
  ShieldAlert,
  PlaySquare
} from "lucide-react";

interface CPProblemStudioProps {
  contestId: string;
  questionId?: string;
  title: string;
  setTitle: (v: string) => void;
  points: number;
  setPoints: (v: number) => void;
  description: string;
  setDescription: (v: string) => void;
  timeLimit: number;
  setTimeLimit: (v: number) => void;
  memoryLimit: number;
  setMemoryLimit: (v: number) => void;
}

type StudioTab =
  | "statement"
  | "validator"
  | "checker"
  | "tests"
  | "testing";

interface Testcase {
  id: string;
  type: "manual" | "generated";
  generatorCall?: string;
  inputSize: string;
  isSample: boolean;
  inputPreview: string;
  outputPreview: string;
  inputPath?: string;
  outputPath?: string;
  subtaskNumber?: number;
  score?: number;
  status: "valid" | "failed" | "pending";
  uploadState?: "idle" | "uploading" | "uploaded" | "error";
}

type PrejudgeJob = {
  id: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  summary?: string | null;
  error_message?: string | null;
  result_json?: Record<string, unknown> | null;
};

type PrejudgeTestRow = {
  test_number: number;
  verdict: string;
  runtime_ms: number;
  memory_kb: number;
  is_sample: boolean;
  message?: string;
};

export default function CPProblemStudio({
  contestId,
  questionId,
  title,
  setTitle,
  points,
  setPoints,
  description,
  setDescription,
  timeLimit,
  setTimeLimit,
  memoryLimit,
  setMemoryLimit
}: CPProblemStudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>("statement");

  // --- IO / Stream Styles (Advanced Settings maintained locally in studio) ---
  const [inputStyle, setInputStyle] = useState<"stdin" | "file">("stdin");
  const [inputFileName, setInputFileName] = useState("input.txt");
  const [outputStyle, setOutputStyle] = useState<"stdout" | "file">("stdout");
  const [outputFileName, setOutputFileName] = useState("output.txt");
  const [inputFormatText, setInputFormatText] = useState("A single integer $N$ followed by $N$ space-separated values.");
  const [outputFormatText, setOutputFormatText] = useState("A single integer denoting the maximum subarray sum.");
  const [sampleInputText, setSampleInputText] = useState("9\n-2 1 -3 4 -1 2 1 -5 4");
  const [sampleOutputText, setSampleOutputText] = useState("6");
  const [noteText, setNoteText] = useState("For the input array `[-2, 1, -3, 4, -1, 2, 1, -5, 4]`, the contiguous subarray is `[4, -1, 2, 1]` with sum `6`.");

  // --- Validator States ---
  const [validatorCode, setValidatorCode] = useState<string>(`#include "testlib.h"
#include <iostream>

using namespace std;

int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    
    int n = inf.readInt(1, 100000, "n");
    inf.readEoln();
    
    for (int i = 0; i < n; i++) {
        inf.readInt(-1000000000, 1000000000, "A_i");
        if (i < n - 1) {
            inf.readSpace();
        }
    }
    inf.readEoln();
    inf.readEof();
    
    return 0;
}`);
  const [validatorStatus, setValidatorStatus] = useState<"compiled" | "dirty" | "error">("compiled");

  const formatLatexLite = (formula: string): string => {
    return formula
      .replace(/\\leq?/g, "≤")
      .replace(/\\geq?/g, "≥")
      .replace(/\\neq/g, "≠")
      .replace(/\\times/g, "×")
      .replace(/\\cdot/g, "·")
      .replace(/\\dots/g, "…")
      .replace(/\\ldots/g, "…")
      .replace(/\\infty/g, "∞")
      .replace(/\\sqrt\{([^}]*)\}/g, "√($1)")
      .replace(/\^\{([^}]*)\}/g, "^($1)")
      .replace(/_\{([^}]*)\}/g, "_($1)")
      .replace(/\\_/g, "_")
      .replace(/\\\\/g, "\n")
      .trim();
  };

  // --- Custom Markdown, LaTeX Math, Image and Interactive Code Parser ---
  const parseInlineFormatting = (line: string): React.ReactNode[] => {
    if (!line) return [];
    // Split by Markdown bold (**text**), LaTeX ($...$/$$...$$), and Markdown image (![alt](url))
    const parts = line.split(/(\!\[.*?\]\(.*?\))|(\*\*.*?\*\*)|(\$\$[\s\S]*?\$\$)|(\$[^$\n]+\$)/g);

    return parts.map((part, pIdx) => {
      if (!part) return null;

      // 1. Markdown Image Match: ![alt](url)
      if (part.startsWith("![") && part.includes("](") && part.endsWith(")")) {
        const alt = part.substring(2, part.indexOf("]("));
        const url = part.substring(part.indexOf("](") + 2, part.length - 1);
        return (
          <span key={pIdx} className="my-3 block text-center">
            <img
              src={url}
              alt={alt}
              className="mx-auto max-w-full max-h-56 rounded-xl border border-white/10 shadow-lg hover:border-purple-500/30 transition-colors duration-300"
            />
            {alt && <span className="text-[10px] text-zinc-500 mt-1.5 font-medium block">{alt}</span>}
          </span>
        );
      }

      // 2. Bold Match: **text**
      if (part.startsWith("**") && part.endsWith("**")) {
        const boldText = part.substring(2, part.length - 2);
        return <strong key={pIdx} className="font-bold text-white">{boldText}</strong>;
      }

      // 3. Display math: $$formula$$
      if (part.startsWith("$$") && part.endsWith("$$")) {
        const formula = formatLatexLite(part.substring(2, part.length - 2));
        return (
          <div key={pIdx} className="my-2 overflow-x-auto rounded border border-purple-500/20 bg-purple-500/5 px-2 py-1 font-mono text-[11px] text-purple-200 whitespace-pre-wrap">
            {formula}
          </div>
        );
      }

      // 4. Inline math: $formula$
      if (part.startsWith("$") && part.endsWith("$")) {
        const formula = formatLatexLite(part.substring(1, part.length - 1));
        return (
          <span key={pIdx} className="mx-0.5 inline-block font-mono text-[11px] font-semibold text-purple-300 bg-purple-500/10 px-1 py-0.5 rounded border border-purple-500/10">
            {formula}
          </span>
        );
      }

      // 5. Regular text chunk
      return <span key={pIdx}>{part}</span>;
    });
  };

  const renderStatementHtml = (text: string) => {
    if (!text) return null;

    // Split text by <code> and </code> to isolate interactive micro-widgets
    const parts = text.split(/(<code>[\s\S]*?<\/code>)/g);

    return parts.map((part, idx) => {
      if (part.startsWith("<code>") && part.endsWith("</code>")) {
        const htmlContent = part.substring(6, part.length - 7).trim();
        return (
          <div
            key={idx}
            className="my-4 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        );
      }

      // Parse standard markdown line-by-line
      const lines = part.split("\n");
      return (
        <div key={idx} className="space-y-1.5 font-sans text-xs text-zinc-300 leading-relaxed">
          {lines.map((line, lIdx) => {
            let processed = line;

            // Headers
            if (processed.startsWith("### ")) {
              const headerText = processed.substring(4);
              return (
                <h4 key={lIdx} className="text-xs font-semibold text-purple-300 mt-4 mb-2 uppercase tracking-wider">
                  {parseInlineFormatting(headerText)}
                </h4>
              );
            }
            if (processed.startsWith("## ")) {
              const headerText = processed.substring(3);
              return (
                <h3 key={lIdx} className="text-sm font-bold text-white mt-5 mb-2 border-b border-white/5 pb-1">
                  {parseInlineFormatting(headerText)}
                </h3>
              );
            }
            if (processed.startsWith("# ")) {
              const headerText = processed.substring(2);
              return (
                <h2 key={lIdx} className="text-base font-black text-white mt-6 mb-3 tracking-tight">
                  {parseInlineFormatting(headerText)}
                </h2>
              );
            }

            // Lists
            if (processed.trim().startsWith("- ") || processed.trim().startsWith("* ")) {
              const cleanedLine = processed.trim();
              const itemText = cleanedLine.substring(2);
              return (
                <ul key={lIdx} className="list-disc pl-5 my-0.5">
                  <li className="text-zinc-300">
                    {parseInlineFormatting(itemText)}
                  </li>
                </ul>
              );
            }

            // Empty space
            if (processed.trim() === "") {
              return <div key={lIdx} className="h-1.5" />;
            }

            // Normal text line
            return (
              <p key={lIdx} className="leading-relaxed">
                {parseInlineFormatting(processed)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  // --- Checker States ---
  const [checkerType, setCheckerType] = useState<"standard" | "custom">("standard");
  const [selectedStandardChecker, setSelectedStandardChecker] = useState("ncmp"); // sequence of integers
  const [customCheckerCode, setCustomCheckerCode] = useState<string>(`#include "testlib.h"
#include <iostream>

using namespace std;

int main(int argc, char* argv[]) {
    registerTestlibCmd(argc, argv);
    
    long long jury_ans = ans.readLong();
    long long user_ans = ouf.readLong();
    
    if (jury_ans != user_ans) {
        quitf(_wa, "expected %lld, found %lld", jury_ans, user_ans);
    }
    
    quitf(_ok, "correct maximum subarray sum");
    return 0;
}`);
  const [checkerCompilationStatus, setCheckerCompilationStatus] = useState<"compiled" | "dirty" | "error">("compiled");

  // --- Validation Grid States ---
  const [testingCode, setTestingCode] = useState<string>(`#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n;
    if (!(cin >> n)) return 0;
    
    vector<long long> a(n);
    for (int i = 0; i < n; ++i) {
        cin >> a[i];
    }
    
    long long max_so_far = a[0];
    long long curr_max = a[0];
    
    for (size_t i = 1; i < a.size(); i++) {
        curr_max = max(a[i], curr_max + a[i]);
        max_so_far = max(max_so_far, curr_max);
    }
    
    cout << max_so_far << "\n";
    return 0;
}`);
  const [testingLang, setTestingLang] = useState<"cpp" | "python">("cpp");
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [hasRunTestingSuite, setHasRunTestingSuite] = useState(false);
  const [selectedTestCaseForDetails, setSelectedTestCaseForDetails] = useState<string | null>(null);
  const [prejudgeJob, setPrejudgeJob] = useState<PrejudgeJob | null>(null);
  const [prejudgeMessage, setPrejudgeMessage] = useState<string | null>(null);
  const [prejudgeTests, setPrejudgeTests] = useState<PrejudgeTestRow[]>([]);

  // --- Tests States ---
  const [testcases, setTestcases] = useState<Testcase[]>([]);
  const [generatorScript, setGeneratorScript] = useState<string>(
    `# Generator scripts config\ngen_random 10 -100 100 42 > $\ngen_random 1000 -1000000 1000000 2026 > $\ngen_extreme_all_negative 50000 -1000000000 > $\ngen_extreme_all_positive 100000 1000000000 > $`
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvancedGenerators, setShowAdvancedGenerators] = useState(false);

  const handleRunGenerator = () => {
    setIsGenerating(true);
    setPrejudgeMessage("Generator commands are saved in problem config. Use uploaded tests for current validation runs.");
    setIsGenerating(false);
  };

  const uploadTestAsset = async (tcId: string, file: File, kind: "manual_test_input" | "manual_test_output") => {
    if (!questionId) {
      setPrejudgeMessage("Save problem first to get question ID before uploading testcase assets.");
      return;
    }
    setTestcases((prev) => prev.map((t) => (t.id === tcId ? { ...t, uploadState: "uploading" } : t)));
    try {
      const presign = await apiFetch<{ upload_url: string; object_path: string }>(
        `/api/org/contests/${contestId}/questions/${questionId}/assets/presign`,
        {
          method: "POST",
          body: JSON.stringify({
            asset_kind: kind,
            filename: file.name,
            content_type: file.type || "text/plain",
            size_bytes: file.size
          })
        }
      );
      const put = await fetch(presign.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "text/plain" },
        body: file
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      const content = await file.text();
      setTestcases((prev) =>
        prev.map((t) =>
          t.id === tcId
            ? {
                ...t,
                ...(kind === "manual_test_input" ? { inputPath: presign.object_path, inputPreview: content.slice(0, 2000) } : { outputPath: presign.object_path, outputPreview: content.slice(0, 2000) }),
                inputSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
                status: "valid",
                uploadState: "uploaded"
              }
            : t
        )
      );
    } catch (error) {
      setTestcases((prev) => prev.map((t) => (t.id === tcId ? { ...t, uploadState: "error", status: "failed" } : t)));
      setPrejudgeMessage(error instanceof Error ? error.message : "Failed to upload testcase file.");
    }
  };

  const upsertTestsToCloud = async () => {
    if (!questionId) {
      setPrejudgeMessage("Save problem first to get question ID before persisting tests.");
      return;
    }
    const missingPaths = testcases.some((t) => !t.inputPath || !t.outputPath);
    if (missingPaths) {
      setPrejudgeMessage("Upload both input and output files for every testcase before saving tests.");
      return;
    }
    const tests = testcases.map((t, idx) => ({
      test_number: idx + 1,
      is_sample: t.isSample,
      input_path: t.inputPath as string,
      output_path: t.outputPath as string,
      subtask_number: t.subtaskNumber ?? null,
      score: t.score ?? 0
    }));
    await apiFetch<{ ok: boolean; testset_id: string }>(
      `/api/org/contests/${contestId}/questions/${questionId}/tests/upsert`,
      {
        method: "POST",
        body: JSON.stringify({
          version: 1,
          checker_type: checkerType === "custom" ? "custom" : "token",
          time_limit_ms: timeLimit,
          memory_limit_mb: memoryLimit,
          tests,
          subtasks: []
        })
      }
    );
  };

  const isTerminalPrejudgeStatus = (status: string) => status === "SUCCEEDED" || status === "FAILED";

  const handleRunTestingSuite = async () => {
    if (!questionId) {
      setPrejudgeMessage("Save the problem first so it has a real ID before running jury validation.");
      return;
    }

    setPrejudgeMessage(null);
    setPrejudgeJob(null);
    setHasRunTestingSuite(false);
    setIsRunningTests(true);

    try {
      // Keep judge configuration synced before triggering a real prejudge run.
      await apiFetch<{ ok: boolean }>(`/api/org/contests/${contestId}/questions/${questionId}/cp-config`, {
        method: "PUT",
        body: JSON.stringify({
          checker_type: checkerType === "custom" ? "custom" : "token",
          checker_code: checkerType === "custom" ? customCheckerCode : null,
          validator_code: validatorCode,
          generator_code: generatorScript,
          statement_md: description,
          model_solution: testingCode,
          model_lang: testingLang === "python" ? "python3" : "cpp17"
        })
      });
      await upsertTestsToCloud();

      const created = await apiFetch<{ job_id: string }>(
        `/api/org/contests/${contestId}/questions/${questionId}/prejudge`,
        { method: "POST" }
      );
      setHasRunTestingSuite(true);

      let attempts = 0;
      while (attempts < 60) {
        attempts += 1;
        const job = await apiFetch<PrejudgeJob>(`/api/org/prejudge-jobs/${created.job_id}`);
        setPrejudgeJob(job);
        const rawTests = Array.isArray(job.result_json?.tests) ? (job.result_json?.tests as unknown[]) : [];
        const parsed = rawTests
          .map((row): PrejudgeTestRow | null => {
            if (!row || typeof row !== "object") return null;
            const r = row as Record<string, unknown>;
            return {
              test_number: Number(r.test_number ?? 0),
              verdict: String(r.verdict ?? "UNKNOWN"),
              runtime_ms: Number(r.runtime_ms ?? 0),
              memory_kb: Number(r.memory_kb ?? 0),
              is_sample: Boolean(r.is_sample ?? false),
              message: typeof r.message === "string" ? r.message : undefined
            };
          })
          .filter((v): v is PrejudgeTestRow => !!v && v.test_number > 0);
        setPrejudgeTests(parsed);
        if (isTerminalPrejudgeStatus(job.status)) break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      setPrejudgeMessage(error instanceof Error ? error.message : "Failed to run jury validation.");
    } finally {
      setIsRunningTests(false);
    }
  };

  // Standard testlib checkers description dictionary
  const standardCheckersInfo: Record<string, string> = {
    ncmp: "Single or sequence of integers. Compares whitespace-separated list of 64-bit integers.",
    wcmp: "Sequence of strings/tokens. Compares whitespace-separated sequence of strings.",
    rcmp6: "Floats with precision 1e-6. Compares float values with absolute/relative error <= 10^-6.",
    rcmp9: "Floats with precision 1e-9. Compares float values with absolute/relative error <= 10^-9.",
    lcmp: "Line-by-line comparison. Compares lines of text ignoring trailing whitespace characters.",
    yesno: "Case insensitive YES/NO verdict matcher."
  };

  return (
    <div className="my-5 rounded-2xl border border-white/10 bg-[#09090b] text-white shadow-xl overflow-hidden">
      <div className="relative flex flex-col w-full min-h-[550px]">
        
        {/* SUB HEADER / BANNER */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-black/30 px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold tracking-tight">Problem Settings</span>
            <span className="rounded bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300 uppercase tracking-wider">
              real judge flow
            </span>
          </div>
        </div>

        {/* WORKSPACE AREA */}
        <div className="flex flex-1 overflow-hidden min-h-[480px]">
          
          {/* SIDEBAR NAVIGATION */}
          <div className="w-56 shrink-0 border-r border-white/5 bg-black/20 p-4 flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-2 mb-3">
                Problem Setup
              </p>
                {[
                  { id: "statement", label: "Problem Statement", icon: FileText },
                  { id: "validator", label: "Input Validator", icon: ShieldAlert },
                  { id: "checker", label: "Output Checker", icon: CheckCircle2 },
                  { id: "tests", label: "Tests", icon: Terminal },
                  { id: "testing", label: "Run Validation", icon: PlaySquare }
                ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as StudioTab)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium border transition ${
                      isActive
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-300 font-semibold"
                        : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-purple-400" : "text-zinc-500"}`} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN FORM CONFIG AREA */}
          <div className="flex-1 overflow-y-auto bg-[#070708] p-6">
            
            {/* 2. STATEMENT TAB */}
            {activeTab === "statement" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Statement & LaTeX Equations</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Describe the problem logic. Inline formulas use <span className="font-mono text-zinc-200">$x$</span> and block equations use <span className="font-mono text-zinc-200">$$x$$</span>.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8 h-[60vh]">
                  {/* Left: Fields Editor */}
                  <div className="space-y-4 overflow-y-auto pr-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Problem Description
                      </label>
                      <textarea
                        rows={12}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 p-4 text-xs font-mono text-white focus:border-purple-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Input Format Specification
                      </label>
                      <textarea
                        rows={3}
                        value={inputFormatText}
                        onChange={(e) => setInputFormatText(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs font-mono text-white focus:border-purple-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Output Format Specification
                      </label>
                      <textarea
                        rows={3}
                        value={outputFormatText}
                        onChange={(e) => setOutputFormatText(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs font-mono text-white focus:border-purple-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Note / Explanation
                      </label>
                      <textarea
                        rows={3}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs font-mono text-white focus:border-purple-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Sample Input
                      </label>
                      <textarea
                        rows={4}
                        value={sampleInputText}
                        onChange={(e) => setSampleInputText(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs font-mono text-white focus:border-purple-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Sample Output
                      </label>
                      <textarea
                        rows={3}
                        value={sampleOutputText}
                        onChange={(e) => setSampleOutputText(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs font-mono text-white focus:border-purple-500/50 focus:outline-none"
                      />
                    </div>
                  </div>
 
                  {/* Right: Statement Live Preview */}
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 overflow-y-auto space-y-4 relative">
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 text-[10px] text-purple-400 font-semibold tracking-wide bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded">
                      <Eye className="h-3 w-3" />
                      Live Statement Preview
                    </div>
                    
                    <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
                    <div className="flex gap-4 text-[10px] text-zinc-500 border-b border-white/5 pb-3">
                      <span>Time Limit: {timeLimit / 1000}s</span>
                      <span>Memory Limit: {memoryLimit}MB</span>
                      <span>Input: {inputStyle === "stdin" ? "standard input" : inputFileName}</span>
                      <span>Output: {outputStyle === "stdout" ? "standard output" : outputFileName}</span>
                    </div>
 
                    <div className="space-y-4 text-xs text-zinc-300 leading-relaxed font-sans">
                      {/* Description output */}
                      <div className="space-y-2">
                        {renderStatementHtml(description)}
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-white mb-1 uppercase tracking-wider text-[10px]">Input Format</h4>
                        <div className="text-zinc-300">{renderStatementHtml(inputFormatText)}</div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-white mb-1 uppercase tracking-wider text-[10px]">Output Format</h4>
                        <div className="text-zinc-300">{renderStatementHtml(outputFormatText)}</div>
                      </div>

                      {/* Editable sample tests grid */}
                      <div>
                        <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[10px]">Sample Tests</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-xl bg-black/50 border border-white/5 p-3.5 font-mono text-zinc-400">
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Standard Input</span>
                            <pre className="text-zinc-200 whitespace-pre-wrap">{sampleInputText}</pre>
                          </div>
                          <div className="rounded-xl bg-black/50 border border-white/5 p-3.5 font-mono text-zinc-400">
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Standard Output</span>
                            <pre className="text-zinc-200 whitespace-pre-wrap">{sampleOutputText}</pre>
                          </div>
                        </div>
                      </div>

                      {noteText && (
                        <div className="border-l-2 border-purple-500/40 pl-3 py-1 bg-purple-500/[0.02] space-y-1">
                          <h4 className="font-bold text-white mb-1 uppercase tracking-wider text-[10px]">Note</h4>
                          <div className="italic text-zinc-400">{renderStatementHtml(noteText)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. VALIDATOR TAB */}
            {activeTab === "validator" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Input Validator (testlib.h)</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      A robust C++ validator ensures generators and manual files strictly fit description bounds.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      validatorStatus === "compiled"
                        ? "bg-green-500/10 border-green-500/20 text-green-400"
                        : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        validatorStatus === "compiled" ? "bg-green-500" : "bg-yellow-500"
                      }`} />
                      {validatorStatus === "compiled" ? "Validator Compiled Successfully" : "Unsaved Code Edits"}
                    </span>

                    {/* Local File Upload */}
                    <label className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3.5 py-2 text-xs font-semibold text-white border border-white/5 cursor-pointer transition">
                      <UploadCloud className="h-3.5 w-3.5 text-purple-400" />
                      Upload .cpp
                      <input
                        type="file"
                        accept=".cpp,.h"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const content = evt.target?.result as string;
                              setValidatorCode(content);
                              setValidatorStatus("dirty");
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 border border-white/10">
                      Compiled during validation run
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20 text-xs text-zinc-400">
                    <span className="font-mono text-zinc-200">validator.cpp</span>
                    <span className="text-[10px]">C++17 GCC 11</span>
                  </div>
                  <textarea
                    rows={18}
                    value={validatorCode}
                    onChange={(e) => {
                      setValidatorCode(e.target.value);
                      if (validatorStatus === "compiled") setValidatorStatus("dirty");
                    }}
                    className="w-full p-4 font-mono text-xs text-zinc-300 bg-transparent outline-none focus:ring-0 leading-relaxed select-text"
                    spellCheck={false}
                  />
                </div>

                <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    Validator Tips
                  </h4>
                  <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside leading-relaxed">
                    <li>Always invoke <code className="font-mono text-zinc-200">inf.readEof()</code> to block trailing dirty data.</li>
                    <li>Use variables inside <code className="font-mono text-zinc-200">readInt(min, max, &quot;name&quot;)</code> so incorrect cases show readable errors on logs.</li>
                    <li>Always use validator checks for all integers, strings, spaces, and linebreaks (eoln).</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 4. CHECKER TAB */}
            {activeTab === "checker" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Output Checker</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Verifies whether the participant&apos;s output corresponds to the standard correct model (jury answers).
                  </p>
                </div>

                {/* Checker type selector */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setCheckerType("standard")}
                    className={`flex-1 rounded-xl p-4 text-left border transition ${
                      checkerType === "standard"
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                        : "bg-black/20 border-white/5 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span className="block font-semibold text-sm">Standard Checker Library</span>
                    <span className="block text-[10px] text-zinc-500 mt-1">
                      Choose from pre-compiled Codeforces checkers matching standard formats.
                    </span>
                  </button>
                  <button
                    onClick={() => setCheckerType("custom")}
                    className={`flex-1 rounded-xl p-4 text-left border transition ${
                      checkerType === "custom"
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                        : "bg-black/20 border-white/5 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span className="block font-semibold text-sm">Custom testlib Checker</span>
                    <span className="block text-[10px] text-zinc-500 mt-1">
                      Write a custom checker in C++ using <code className="font-mono">testlib.h</code> for non-unique answers.
                    </span>
                  </button>
                </div>

                {/* STANDARD CHECKERS */}
                {checkerType === "standard" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-300">Select Standard Checker</label>
                      <div className="space-y-2">
                        {Object.keys(standardCheckersInfo).map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => setSelectedStandardChecker(ch)}
                            className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-mono transition ${
                              selectedStandardChecker === ch
                                ? "bg-purple-500/15 border-purple-500/40 text-purple-200"
                                : "bg-black/30 border-white/5 text-zinc-400 hover:bg-white/5"
                            }`}
                          >
                            <span className="font-bold block text-white">{ch}.cpp</span>
                            <span className="text-[10px] text-zinc-500 block mt-1">
                              {standardCheckersInfo[ch]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-black/20 p-5 space-y-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Selected Checker Details
                      </h4>
                      <div className="rounded-lg bg-black/40 border border-white/5 p-4 font-mono text-[11px] space-y-2">
                        <div>
                          <span className="text-zinc-500">Name:</span> <span className="text-zinc-200">{selectedStandardChecker}.cpp</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Compilation:</span> <span className="text-green-400 font-bold">Default pre-compiled binary available</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Includes:</span> <span className="text-zinc-400">#include &quot;testlib.h&quot;</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Verdict logic:</span>{" "}
                          <span className="text-zinc-300">
                            Reads whitespace-separated list from candidate output stream (`ouf`) and jury output (`ans`). Throws WRONG ANSWER on mismatch.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // CUSTOM CHECKERS EDITOR
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300">C++ Checker Code Editor</label>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
                          checkerCompilationStatus === "compiled"
                            ? "bg-green-500/10 border-green-500/20 text-green-400"
                            : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${
                            checkerCompilationStatus === "compiled" ? "bg-green-500" : "bg-yellow-500"
                          }`} />
                          {checkerCompilationStatus === "compiled" ? "Compiled" : "Modified"}
                        </span>

                        {/* Local File Upload */}
                        <label className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-white border border-white/5 cursor-pointer transition">
                          <UploadCloud className="h-3.5 w-3.5 text-purple-400" />
                          Upload .cpp
                          <input
                            type="file"
                            accept=".cpp,.h"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  const content = evt.target?.result as string;
                                  setCustomCheckerCode(content);
                                  setCheckerCompilationStatus("dirty");
                                };
                                reader.readAsText(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        <span className="inline-flex items-center gap-1 rounded bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 border border-white/10">
                          Compiled during validation run
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20 text-xs text-zinc-400">
                        <span className="font-mono text-zinc-200">checker.cpp</span>
                        <span className="text-[10px]">C++17 GCC 11</span>
                      </div>
                      <textarea
                        rows={16}
                        value={customCheckerCode}
                        onChange={(e) => {
                          setCustomCheckerCode(e.target.value);
                          if (checkerCompilationStatus === "compiled") setCheckerCompilationStatus("dirty");
                        }}
                        className="w-full p-4 font-mono text-xs text-zinc-300 bg-transparent outline-none focus:ring-0 leading-relaxed select-text"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. TESTS & GENERATORS TAB */}
            {activeTab === "tests" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Tests</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Upload input/output files for each test and persist them to cloud.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Advanced
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedGenerators((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-300 border border-white/10 px-2.5 py-1 rounded hover:border-white/20"
                      >
                        {showAdvancedGenerators ? "Hide generator commands" : "Show generator commands"}
                      </button>
                    </div>
                    {showAdvancedGenerators && (
                      <div className="mt-3 space-y-3">
                        <textarea
                          rows={10}
                          value={generatorScript}
                          onChange={(e) => setGeneratorScript(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-black/40 p-3.5 text-xs font-mono text-zinc-300 focus:border-purple-500/50 focus:outline-none leading-relaxed"
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                            Saved with problem config and used during validation runs.
                          </p>
                          <button
                            onClick={handleRunGenerator}
                            disabled={isGenerating}
                            className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-bold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-2.5 py-1 rounded"
                          >
                            {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                            Save Generator Config
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Manual Tests ({testcases.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newId = String(Date.now());
                          setTestcases((prev) => [
                            ...prev,
                            {
                              id: newId,
                              type: "manual",
                              isSample: false,
                              inputSize: "--",
                              inputPreview: "",
                              outputPreview: "",
                              status: "pending",
                              score: 0,
                              uploadState: "idle"
                            }
                          ]);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-transparent px-3 py-1 text-xs text-zinc-300 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Manual Test
                      </button>
                    </div>

                    {testcases.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-10 text-center">
                        <p className="text-sm font-semibold text-white">No tests added yet</p>
                        <p className="mt-2 text-xs text-zinc-400">Add a manual test, upload input/output files, then save tests to cloud.</p>
                        <button
                          type="button"
                          onClick={() => {
                            const newId = String(Date.now());
                            setTestcases([
                              {
                                id: newId,
                                type: "manual",
                                isSample: false,
                                inputSize: "--",
                                inputPreview: "",
                                outputPreview: "",
                                status: "pending",
                                score: 0,
                                uploadState: "idle"
                              }
                            ]);
                          }}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-transparent px-3 py-1 text-xs text-zinc-300 transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Test
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/25">
                        <table className="w-full text-xs">
                          <thead className="bg-black/40 border-b border-white/5 text-zinc-500">
                            <tr className="text-[10px] uppercase font-semibold text-left">
                              <th className="px-4 py-3">Index</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Source/Parameters</th>
                              <th className="px-4 py-3">Size</th>
                              <th className="px-4 py-3">Sample</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Cloud Files</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
                            {testcases.map((t, idx) => (
                              <tr key={t.id} className="hover:bg-white/5 transition">
                              <td className="px-4 py-3 text-zinc-500">Test {idx + 1}</td>
                              <td className="px-4 py-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  t.type === "manual"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                }`}>
                                  {t.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-zinc-400 truncate max-w-[200px]" title={t.generatorCall}>
                                {t.type === "manual" ? "manual upload" : t.generatorCall}
                              </td>
                              <td className="px-4 py-3 text-zinc-500">{t.inputSize}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={t.isSample}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setTestcases((prev) =>
                                      prev.map((item) =>
                                        item.id === t.id ? { ...item, isSample: checked } : item
                                      )
                                    );
                                  }}
                                  className="rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-0"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-1.5 text-green-400">
                                  <Check className="h-3 w-3" />
                                  {t.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <label className="cursor-pointer rounded border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:border-purple-500/40">
                                    In
                                    <input
                                      type="file"
                                      accept=".txt,.in,*/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) void uploadTestAsset(t.id, f, "manual_test_input");
                                      }}
                                    />
                                  </label>
                                  <label className="cursor-pointer rounded border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:border-purple-500/40">
                                    Out
                                    <input
                                      type="file"
                                      accept=".txt,.out,*/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) void uploadTestAsset(t.id, f, "manual_test_output");
                                      }}
                                    />
                                  </label>
                                  <span className="text-[10px] text-zinc-500">
                                    {t.inputPath && t.outputPath ? "synced" : (t.uploadState ?? "idle")}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setTestcases((prev) => prev.filter((item) => item.id !== t.id))}
                                  className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void upsertTestsToCloud()}
                        className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-semibold text-white"
                      >
                        <Database className="h-3.5 w-3.5" />
                        Save Tests to Cloud
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. VALIDATION GRID & MANUAL RUNNER */}
            {activeTab === "testing" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Run Validation</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      upload tests → save tests → run validation → view verdict table
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRunTestingSuite}
                      disabled={isRunningTests}
                      className="inline-flex items-center gap-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition shadow-lg shadow-purple-500/10"
                    >
                      {isRunningTests ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Running Validation...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          Run Validation
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                  {/* Left Column: Manual Code Runner (2 cols) */}
                  <div className="xl:col-span-2 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                          Manual Solver Code
                        </label>
                        <select
                          value={testingLang}
                          onChange={(e) => setTestingLang(e.target.value as "cpp" | "python")}
                          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-zinc-300 outline-none"
                        >
                          <option value="cpp">C++ (GCC 20)</option>
                          <option value="python">Python (3.10)</option>
                        </select>
                      </div>

                      <textarea
                        rows={16}
                        value={testingCode}
                        onChange={(e) => setTestingCode(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-xs text-zinc-200 focus:border-purple-500/50 focus:outline-none leading-relaxed"
                        spellCheck={false}
                      />
                      
                      <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-3.5 text-[11px] text-zinc-400 leading-relaxed">
                        <span className="font-semibold text-purple-300">Manual test run:</span> Paste reference code here and run validation on the current saved testset.
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Testing Matrix Grid & Status (3 cols) */}
                  <div className="xl:col-span-3 space-y-4">
                    {/* Status Overview Card */}
                    {hasRunTestingSuite ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Verdict Summary</span>
                            <h4 className="text-xl font-bold text-white mt-1">
                              {prejudgeJob?.status === "SUCCEEDED" && <span className="text-green-400">VALIDATION SUCCEEDED</span>}
                              {prejudgeJob?.status === "FAILED" && <span className="text-red-400">VALIDATION FAILED</span>}
                              {prejudgeJob?.status === "RUNNING" && <span className="text-purple-300">VALIDATION RUNNING</span>}
                              {prejudgeJob?.status === "QUEUED" && <span className="text-zinc-300">VALIDATION QUEUED</span>}
                              {!prejudgeJob && <span className="text-zinc-300">JOB CREATED</span>}
                            </h4>
                            {prejudgeJob?.summary ? <p className="mt-1 text-xs text-zinc-400">{prejudgeJob.summary}</p> : null}
                            {prejudgeJob?.error_message ? <p className="mt-1 text-xs text-red-400">{prejudgeJob.error_message}</p> : null}
                          </div>
                          <div className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                            prejudgeJob?.status === "FAILED"
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : prejudgeJob?.status === "SUCCEEDED"
                                ? "bg-green-500/10 border-green-500/20 text-green-400"
                                : "bg-purple-500/10 border-purple-500/20 text-purple-300"
                          }`}>
                            {prejudgeJob?.status ?? "RUNNING"}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>Prejudge job progress</span>
                            <span>
                              {prejudgeJob?.status === "SUCCEEDED" || prejudgeJob?.status === "FAILED"
                                ? "100%"
                                : prejudgeJob?.status === "RUNNING"
                                  ? "60%"
                                  : "20%"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full transition-all duration-1000 bg-purple-500"
                              style={{
                                width: prejudgeJob?.status === "SUCCEEDED" || prejudgeJob?.status === "FAILED"
                                  ? "100%"
                                  : prejudgeJob?.status === "RUNNING"
                                    ? "60%"
                                    : "20%"
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/5 p-12 text-center">
                        <Play className="mx-auto h-8 w-8 text-zinc-600 mb-3 animate-pulse" />
                        <h4 className="text-sm font-semibold text-white">Validation Idle</h4>
                        <p className="mt-1.5 text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                          Click &quot;Run Validation&quot; after tests are uploaded and saved to cloud.
                        </p>
                      </div>
                    )}

                    {/* Test Cases Matrix Grid */}
                    {hasRunTestingSuite && (
                      <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                        <div className="bg-white/[0.02] border-b border-white/5 px-4 py-3">
                          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                            Jury Testing Matrix
                          </h4>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
                          {(prejudgeTests.length > 0 ? prejudgeTests.map((p) => {
                            const tc = testcases[p.test_number - 1];
                            return { tc, index: p.test_number - 1, p };
                          }) : testcases.map((tc, index) => ({ tc, index, p: null as PrejudgeTestRow | null }))).map(({ tc, index, p }) => {
                            let verdict = "PENDING";
                            let verdictColor = "text-zinc-300";
                            let verdictBg = "bg-zinc-500/10 border-zinc-500/20";
                            let timeUsed = "--";
                            let memoryUsed = "--";
                            if (p) {
                              verdict = p.verdict;
                              timeUsed = `${p.runtime_ms} ms`;
                              memoryUsed = `${(p.memory_kb / 1024).toFixed(2)} MB`;
                              if (p.verdict === "AC" || p.verdict === "OK") {
                                verdictColor = "text-green-400";
                                verdictBg = "bg-green-500/10 border-green-500/20";
                              } else if (p.verdict === "RUNNING" || p.verdict === "QUEUED") {
                                verdictColor = "text-purple-300";
                                verdictBg = "bg-purple-500/10 border-purple-500/20";
                              } else {
                                verdictColor = "text-red-400";
                                verdictBg = "bg-red-500/10 border-red-500/20";
                              }
                            } else if (prejudgeJob?.status === "RUNNING") {
                              verdict = "RUN";
                              verdictColor = "text-purple-300";
                              verdictBg = "bg-purple-500/10 border-purple-500/20";
                            } else if (prejudgeJob?.status === "SUCCEEDED") {
                              verdict = "OK";
                              verdictColor = "text-green-400";
                              verdictBg = "bg-green-500/10 border-green-500/20";
                            } else if (prejudgeJob?.status === "FAILED") {
                              verdict = "FAIL";
                              verdictColor = "text-red-400";
                              verdictBg = "bg-red-500/10 border-red-500/20";
                            }

                            const isSelected = selectedTestCaseForDetails === tc.id;

                            return (
                              <div key={tc.id} className="transition-colors hover:bg-white/[0.01]">
                                <div
                                  onClick={() => setSelectedTestCaseForDetails(isSelected ? null : tc.id)}
                                  className="flex items-center justify-between p-4 cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-zinc-500 font-semibold w-10">#{index + 1}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${verdictBg} ${verdictColor}`}>
                                      {verdict}
                                    </span>
                                    {(p?.is_sample || tc?.isSample) && (
                                      <span className="text-[9px] font-medium text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                        Sample
                                      </span>
                                    )}
                                    {tc ? (
                                      <span className="text-[11px] text-zinc-400 font-mono hidden md:inline">
                                        Size: {tc.inputSize}
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-6 text-[11px]">
                                    <div className="hidden md:flex gap-4 text-zinc-500">
                                      <span>Time: <span className="text-zinc-300 font-medium">{timeUsed}</span></span>
                                      <span>Memory: <span className="text-zinc-300 font-medium">{memoryUsed}</span></span>
                                    </div>
                                    <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                                      <span className={verdictColor + " font-semibold"}>{verdict}</span>
                                    </span>
                                  </div>
                                </div>

                                {/* Expanded detail view drawer */}
                                {isSelected && (
                                  <div className="bg-black/40 border-t border-b border-white/5 p-4 space-y-4 text-xs">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Input stream (inf)</span>
                                        <pre className="rounded-lg bg-zinc-950/80 border border-white/5 p-2.5 font-mono text-[10px] text-zinc-300 max-h-28 overflow-y-auto">
                                          {tc?.inputPreview || "Input preview unavailable"}
                                        </pre>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Expected output (ans)</span>
                                        <pre className="rounded-lg bg-zinc-950/80 border border-white/5 p-2.5 font-mono text-[10px] text-zinc-300 max-h-28 overflow-y-auto">
                                          {tc?.outputPreview || "Expected output preview unavailable"}
                                        </pre>
                                      </div>
                                    </div>

                                    {prejudgeJob && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Prejudge Summary</span>
                                          <pre className="rounded-lg bg-zinc-950/80 border border-white/5 p-2.5 font-mono text-[10px] text-zinc-300 max-h-28 overflow-y-auto">
                                            {p?.message ?? prejudgeJob.summary ?? "No summary emitted by worker."}
                                          </pre>
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Worker Result Payload</span>
                                          <pre className="rounded-lg border p-3 font-mono text-[10px] leading-relaxed bg-zinc-950/80 border-white/5 text-zinc-300 max-h-28 overflow-y-auto">
                                            {JSON.stringify(prejudgeJob.result_json ?? {}, null, 2)}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {prejudgeMessage ? (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                        {prejudgeMessage}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
        
      </div>
    </div>
  );
}
