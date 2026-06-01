"use client";

import React, { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { apiFetch } from "@/lib/client/apiClient";
import type { ApiClientError } from "@/lib/client/apiClient";
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
  PlaySquare,
  Cpu
} from "lucide-react";

interface CPProblemStudioProps {
  contestId: string;
  questionId?: string;
  questionType: "code" | "interactive";
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
  // Persisted cp-config — used to seed the editor on open
  initialValidatorCode?: string;
  initialCheckerCode?: string;
  initialCheckerType?: "token" | "custom";
}

export interface CPProblemStudioHandle {
  getCpConfig: () => { checker_type: "token" | "custom"; checker_code: string | null; validator_code: string };
}

type StudioTab =
  | "statement"
  | "validator"
  | "checker"
  | "generators"
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

type PersistedTestset = {
  testset_id: string;
  version: number;
  checker_type: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  tests: Array<{
    test_number: number;
    is_sample: boolean;
    input_path: string;
    output_path: string;
    subtask_number: number | null;
    score: number;
    input_preview?: string;
    output_preview?: string;
  }>;
};

type SaveTestsResponse = {
  ok: boolean;
  testset_id: string;
  version: number;
};

const DEFAULT_VALIDATOR = `#include "testlib.h"
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
}`;

const DEFAULT_CHECKER = `#include "testlib.h"
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
}`;

const CPProblemStudio = forwardRef<CPProblemStudioHandle, CPProblemStudioProps>(function CPProblemStudio({
  contestId,
  questionId,
  questionType,
  title,
  setTitle,
  points,
  setPoints,
  description,
  setDescription,
  timeLimit,
  setTimeLimit,
  memoryLimit,
  setMemoryLimit,
  initialValidatorCode,
  initialCheckerCode,
  initialCheckerType,
}, ref) {
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

  // --- Validator State — seeded from DB value when editing an existing question ---
  const [validatorCode, setValidatorCode] = useState<string>(initialValidatorCode ?? DEFAULT_VALIDATOR);
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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

  // --- Checker State — seeded from DB value when editing an existing question ---
  // initialCheckerType controls whether we start in custom mode.
  // isInteractiveQuestion always forces custom mode regardless.
  const [checkerType, setCheckerType] = useState<"standard" | "custom">(
    initialCheckerType === "custom" || questionType === "interactive" ? "custom" : "standard"
  );
  const isInteractiveQuestion = questionType === "interactive";
  useEffect(() => {
    if (isInteractiveQuestion) {
      setCheckerType("custom");
    }
  }, [isInteractiveQuestion]);
  const [selectedStandardChecker, setSelectedStandardChecker] = useState("ncmp");
  // Seed custom checker code from DB when editing; fall back to boilerplate for new questions
  const [customCheckerCode, setCustomCheckerCode] = useState<string>(initialCheckerCode ?? DEFAULT_CHECKER);
  const [checkerCompilationStatus, setCheckerCompilationStatus] = useState<"compiled" | "dirty" | "error">("compiled");

  // Expose getCpConfig via ref so the parent QuestionForm can read current editor state
  // synchronously at save time — no async effects, no stale closures.
  useImperativeHandle(ref, () => ({
    getCpConfig() {
      const isCustom = checkerType === "custom" || isInteractiveQuestion;
      return {
        checker_type: isCustom ? "custom" : "token",
        checker_code: isCustom ? customCheckerCode : null,
        validator_code: validatorCode,
      };
    },
  }), [checkerType, isInteractiveQuestion, customCheckerCode, validatorCode]);


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
  const [prejudgeErrorCode, setPrejudgeErrorCode] = useState<string | null>(null);
  const [prejudgeTests, setPrejudgeTests] = useState<PrejudgeTestRow[]>([]);
  const [lastPrejudgeJobId, setLastPrejudgeJobId] = useState<string | null>(null);
  const [isRefreshingJob, setIsRefreshingJob] = useState(false);
  const [stopPollingRequested, setStopPollingRequested] = useState(false);
  const [isSavingTests, setIsSavingTests] = useState(false);
  const [testsSavedToCloud, setTestsSavedToCloud] = useState(false);
  const [isHydratingTests, setIsHydratingTests] = useState(false);
  const [testsetVersion, setTestsetVersion] = useState(0);

  // --- Tests States ---
  const [testcases, setTestcases] = useState<Testcase[]>([]);

  interface GeneratorFile {
    name: string;
    code: string;
    updated_at?: string;
  }
  const [generators, setGenerators] = useState<GeneratorFile[]>([]);
  const [activeGenerator, setActiveGenerator] = useState<GeneratorFile | null>(null);
  const [newGenName, setNewGenName] = useState("");
  const [isSavingGen, setIsSavingGen] = useState(false);
  const [isLoadingGen, setIsLoadingGen] = useState(false);

  useEffect(() => {
    if (!questionId) return;
    let active = true;
    const fetchGenerators = async () => {
      setIsLoadingGen(true);
      try {
        const list = await apiFetch<GeneratorFile[]>(`/api/org/contests/${contestId}/questions/${questionId}/generators`);
        if (!active) return;
        setGenerators(list ?? []);
        if ((list ?? []).length > 0 && !activeGenerator) {
          setActiveGenerator(list[0]);
        }
      } catch (err) {
        console.error("fetchGenerators", err);
      } finally {
        if (active) setIsLoadingGen(false);
      }
    };
    void fetchGenerators();
    return () => {
      active = false;
    };
  }, [questionId, contestId]);

  const handleSaveGeneratorFile = async () => {
    if (!questionId || !activeGenerator) return;
    setIsSavingGen(true);
    try {
      await apiFetch(`/api/org/contests/${contestId}/questions/${questionId}/generators`, {
        method: "POST",
        body: JSON.stringify({
          name: activeGenerator.name,
          code: activeGenerator.code
        })
      });
      const list = await apiFetch<GeneratorFile[]>(`/api/org/contests/${contestId}/questions/${questionId}/generators`);
      setGenerators(list ?? []);
      setPrejudgeMessage(`Generator ${activeGenerator.name} saved successfully.`);
    } catch (err) {
      setPrejudgeMessage(err instanceof Error ? err.message : "Failed to save generator.");
    } finally {
      setIsSavingGen(false);
    }
  };

  const handleDeleteGeneratorFile = async (name: string) => {
    if (!questionId) return;
    try {
      await apiFetch(`/api/org/contests/${contestId}/questions/${questionId}/generators/${name}`, {
        method: "DELETE"
      });
      const list = await apiFetch<GeneratorFile[]>(`/api/org/contests/${contestId}/questions/${questionId}/generators`);
      setGenerators(list ?? []);
      if (activeGenerator?.name === name) {
        setActiveGenerator(list && list.length > 0 ? list[0] : null);
      }
      setPrejudgeMessage(`Generator ${name} deleted.`);
    } catch (err) {
      setPrejudgeMessage(err instanceof Error ? err.message : "Failed to delete generator.");
    }
  };

  const handleAddGeneratorFile = () => {
    const trimmed = newGenName.trim();
    if (!trimmed) return;
    const exists = generators.some((g) => g.name === trimmed);
    if (exists) {
      setPrejudgeMessage("A generator with this name already exists.");
      return;
    }
    const newGen: GeneratorFile = {
      name: trimmed,
      code: `#include "testlib.h"\n#include <iostream>\n\nusing namespace std;\n\nint main(int argc, char* argv[]) {\n    registerGen(argc, argv, 1);\n    // Write your generator logic here\n    return 0;\n}\n`
    };
    setGenerators((prev) => [...prev, newGen]);
    setActiveGenerator(newGen);
    setNewGenName("");
  };
  const [generatorScript, setGeneratorScript] = useState<string>(
    `# Generator scripts config\ngen_random 10 -100 100 42 > $\ngen_random 1000 -1000000 1000000 2026 > $\ngen_extreme_all_negative 50000 -1000000000 > $\ngen_extreme_all_positive 100000 1000000000 > $`
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvancedGenerators, setShowAdvancedGenerators] = useState(false);
  const [generatorSaveStatus, setGeneratorSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [generatorSaveMessage, setGeneratorSaveMessage] = useState<string | null>(null);
  const [configSyncStatus, setConfigSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [configSyncMessage, setConfigSyncMessage] = useState<string | null>(null);
  const hasAnyTests = testcases.length > 0;
  const hasIncompleteTests = testcases.some((t) => !t.inputPath || !t.outputPath);
  const canRunValidation = !!questionId && hasAnyTests && !hasIncompleteTests && testsSavedToCloud && !isSavingTests && !isRunningTests;
  const runValidationDisabledReason =
    !questionId
      ? "Save question first."
      : !hasAnyTests
        ? "Add at least one test."
        : hasIncompleteTests
          ? "Upload both input/output for every test."
          : !testsSavedToCloud
            ? "Save tests to cloud."
            : isSavingTests
              ? "Wait for test save to complete."
                : isRunningTests
                ? "Validation already running."
                : null;
  const workflowSteps: Array<{ id: string; label: string; done: boolean; blocked?: boolean }> = [
    { id: "upload", label: "Upload tests", done: hasAnyTests && !hasIncompleteTests, blocked: !hasAnyTests || hasIncompleteTests },
    { id: "save", label: "Save tests", done: testsSavedToCloud, blocked: !hasAnyTests || hasIncompleteTests || !testsSavedToCloud },
    { id: "run", label: "Run validation", done: !!prejudgeJob, blocked: !canRunValidation && !prejudgeJob },
    { id: "view", label: "View verdict", done: prejudgeJob?.status === "SUCCEEDED" || prejudgeJob?.status === "FAILED", blocked: !prejudgeJob }
  ];
  const syncedTestsCount = testcases.filter((t) => t.inputPath && t.outputPath).length;

  useEffect(() => {
    let active = true;
    const hydrateTests = async () => {
      if (!questionId) {
        setTestcases([]);
        setTestsSavedToCloud(false);
        setTestsetVersion(0);
        return;
      }
      setIsHydratingTests(true);
      try {
        const data = await apiFetch<PersistedTestset>(`/api/org/contests/${contestId}/questions/${questionId}/tests`);
        if (!active) return;
        const mapped: Testcase[] = (data.tests ?? []).map((t) => ({
          id: `persisted-${t.test_number}`,
          type: t.output_path.startsWith("__AUTO_FROM_MODEL__") || t.input_path.includes("/generated_test_input/") ? "generated" : "manual",
          inputSize: "--",
          isSample: !!t.is_sample,
          inputPreview: t.input_preview ?? "",
          outputPreview: t.output_preview ?? "",
          inputPath: t.input_path,
          outputPath: t.output_path,
          subtaskNumber: t.subtask_number ?? undefined,
          score: t.score ?? 0,
          status: "valid",
          uploadState: "uploaded"
        }));
        setTestcases(mapped);
        setTestsSavedToCloud(mapped.length > 0);
        setTestsetVersion(data.version ?? 0);
      } catch (error) {
        if (!active) return;
        setTestcases([]);
        setTestsSavedToCloud(false);
        setTestsetVersion(0);
        const msg = error instanceof Error ? error.message : "";
        if (!msg.toLowerCase().includes("not found")) {
          setPrejudgeMessage(msg || "Failed to load saved tests.");
        }
      } finally {
        if (active) setIsHydratingTests(false);
      }
    };
    void hydrateTests();
    return () => {
      active = false;
    };
  }, [contestId, questionId]);

  const handleRunGenerator = async () => {
    if (!questionId) {
      setGeneratorSaveStatus("error");
      setGeneratorSaveMessage("Save question first so generator config can be persisted.");
      return;
    }
    setIsGenerating(true);
    setConfigSyncStatus("syncing");
    setConfigSyncMessage("Syncing generator config...");
    setGeneratorSaveStatus("idle");
    setGeneratorSaveMessage(null);
    setPrejudgeErrorCode(null);
    try {
      await apiFetch<{ ok: boolean }>(`/api/org/contests/${contestId}/questions/${questionId}/cp-config`, {
        method: "PUT",
        body: JSON.stringify({
          generator_code: generatorScript
        })
      });
      setGeneratorSaveStatus("saved");
      setGeneratorSaveMessage("Generator config saved to backend.");
      setConfigSyncStatus("synced");
      setConfigSyncMessage("Generator config synced.");
      setPrejudgeMessage("Generator config saved. Upload/save tests separately before running validation.");
    } catch (error) {
      const e = error as ApiClientError;
      const msg = e instanceof Error ? e.message : "Failed to save generator config.";
      setGeneratorSaveStatus("error");
      setGeneratorSaveMessage(msg);
      setConfigSyncStatus("error");
      setConfigSyncMessage(msg);
      setPrejudgeErrorCode(e?.code ?? null);
      setPrejudgeMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const [isGeneratingTests, setIsGeneratingTests] = useState(false);

  const handleGenerateTestsFromScript = async () => {
    if (!questionId) {
      setPrejudgeMessage("Save question first so generator pipeline can be executed.");
      return;
    }
    setIsGeneratingTests(true);
    setPrejudgeMessage("Compiling C++ generators and solutions to execute script DSL...");
    try {
      const resp = await apiFetch<{
        version: number;
        tests: Array<{
          test_number: number;
          input_preview: string;
          output_preview: string;
          input_size: number;
          output_size: number;
          input_path: string;
          output_path: string;
        }>;
      }>(
        `/api/org/contests/${contestId}/questions/${questionId}/tests/generate`,
        {
          method: "POST",
          body: JSON.stringify({ script: generatorScript }),
        }
      );

      // Use the response directly — no second fetch needed, backend now returns paths + previews
      const mapped: Testcase[] = (resp.tests ?? []).map((t) => ({
        id: `generated-${t.test_number}`,
        type: "generated" as const,
        inputSize: `${Math.max(1, Math.round(t.input_size / 1024))} KB`,
        isSample: t.test_number === 1,
        inputPreview: t.input_preview ?? "",
        outputPreview: t.output_preview ?? "",
        inputPath: t.input_path,
        outputPath: t.output_path,
        status: "valid" as const,
        uploadState: "uploaded" as const,
      }));

      setTestcases(mapped);
      setTestsSavedToCloud(mapped.length > 0);
      setTestsetVersion(resp.version);
      setPrejudgeMessage(
        `Successfully generated ${resp.tests.length} test${resp.tests.length !== 1 ? "s" : ""} (Version ${resp.version}). Saved to cloud — ready for validation.`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to run C++ generation pipeline.";
      setPrejudgeMessage(msg);
    } finally {
      setIsGeneratingTests(false);
    }
  };



  const uploadTestAsset = async (tcId: string, file: File, kind: "manual_test_input" | "manual_test_output") => {
    if (!questionId) {
      setPrejudgeMessage("Save problem first to get question ID before uploading testcase assets.");
      return;
    }
    setTestcases((prev) => prev.map((t) => (t.id === tcId ? { ...t, uploadState: "uploading" } : t)));
    setTestsSavedToCloud(false);
    try {
      const form = new FormData();
      form.append("asset_kind", kind);
      form.append("file", file);
      const upload = await apiFetch<{ ok: boolean; object_path: string }>(
        `/api/org/contests/${contestId}/questions/${questionId}/assets/upload`,
        { method: "POST", body: form as unknown as BodyInit }
      );
      const content = await file.text();
      setTestcases((prev) =>
        prev.map((t) =>
          t.id === tcId
            ? {
                ...t,
                ...(kind === "manual_test_input"
                  ? { inputPath: upload.object_path, inputPreview: content.slice(0, 2000) }
                  : { outputPath: upload.object_path, outputPreview: content.slice(0, 2000) }),
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
    setIsSavingTests(true);
    setPrejudgeMessage(null);
    setPrejudgeErrorCode(null);
    const tests = testcases.map((t, idx) => ({
      test_number: idx + 1,
      is_sample: t.isSample,
      input_path: t.inputPath as string,
      output_path: t.outputPath as string,
      subtask_number: t.subtaskNumber ?? null,
      score: t.score ?? 0
    }));
    try {
      const saved = await apiFetch<SaveTestsResponse>(
        `/api/org/contests/${contestId}/questions/${questionId}/tests/upsert`,
        {
          method: "POST",
          body: JSON.stringify({
            version: testsetVersion > 0 ? testsetVersion + 1 : 0,
            checker_type: isInteractiveQuestion || checkerType === "custom" ? "custom" : "token",
            time_limit_ms: timeLimit,
            memory_limit_mb: memoryLimit,
            tests,
            subtasks: []
          })
        }
      );
      setTestsetVersion(saved.version ?? testsetVersion + 1);
      setTestsSavedToCloud(true);
      setPrejudgeMessage(`Tests saved to cloud (version ${saved.version}).`);
    } catch (error) {
      const e = error as ApiClientError;
      setTestsSavedToCloud(false);
      setPrejudgeErrorCode(e?.code ?? null);
      setPrejudgeMessage(e instanceof Error ? e.message : "Failed to save tests to cloud.");
      throw error;
    } finally {
      setIsSavingTests(false);
    }
  };

  const isTerminalPrejudgeStatus = (status: string) => status === "SUCCEEDED" || status === "FAILED";
  const isLikelyQueueStall = prejudgeJob?.status === "QUEUED" && prejudgeTests.length === 0;
  const aggregatePassed = typeof prejudgeJob?.result_json?.passed === "number" ? prejudgeJob.result_json.passed : null;
  const aggregateTotal = typeof prejudgeJob?.result_json?.total === "number" ? prejudgeJob.result_json.total : null;
  const aggregateMaxRuntimeMs = typeof prejudgeJob?.result_json?.max_runtime_ms === "number" ? prejudgeJob.result_json.max_runtime_ms : null;
  const aggregateMaxMemoryKb = typeof prejudgeJob?.result_json?.max_memory_kb === "number" ? prejudgeJob.result_json.max_memory_kb : null;

  const normalizeVerdict = (raw: string): string => {
    const v = raw.toUpperCase();
    if (v === "OK") return "AC";
    if (v.includes("COMPILE")) return "CE";
    if (v.includes("RUNTIME")) return "RE";
    if (v.includes("TIME")) return "TLE";
    if (v.includes("MEMORY")) return "MLE";
    if (v.includes("WRONG")) return "WA";
    if (v.includes("PRESENTATION")) return "PE";
    return v;
  };

  const refreshPrejudgeStatus = async () => {
    if (!lastPrejudgeJobId) return;
    setIsRefreshingJob(true);
    try {
      const job = await apiFetch<PrejudgeJob>(`/api/org/prejudge-jobs/${lastPrejudgeJobId}`);
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
    } catch (error) {
      const e = error as ApiClientError;
      setPrejudgeErrorCode(e?.code ?? null);
      setPrejudgeMessage(e instanceof Error ? e.message : "Failed to refresh validation status.");
    } finally {
      setIsRefreshingJob(false);
    }
  };

  const cancelValidation = async () => {
    const jobId = lastPrejudgeJobId ?? prejudgeJob?.id;
    if (!jobId) return;
    try {
      await apiFetch<{ ok: boolean }>(`/api/org/prejudge-jobs/${jobId}/cancel`, { method: "POST" });
      setStopPollingRequested(true);
      setIsRunningTests(false);
      setPrejudgeMessage("Validation cancelled. You can run a new validation now.");
      await refreshPrejudgeStatus();
    } catch (error) {
      const e = error as ApiClientError;
      setPrejudgeErrorCode(e?.code ?? null);
      setPrejudgeMessage(e instanceof Error ? e.message : "Failed to cancel validation.");
    }
  };

  const handleRunTestingSuite = async () => {
    if (!questionId) {
      setPrejudgeMessage("Save the problem first so it has a real ID before running jury validation.");
      return;
    }
    if (!hasAnyTests) {
      setPrejudgeMessage("Add at least one testcase before running validation.");
      return;
    }
    if (hasIncompleteTests) {
      setPrejudgeMessage("Every testcase must have both input and output uploaded before validation.");
      return;
    }
    if (!testsSavedToCloud) {
      setPrejudgeMessage("Save tests to cloud before running validation.");
      return;
    }

    setPrejudgeMessage(null);
    setPrejudgeErrorCode(null);
    setPrejudgeJob(null);
    setHasRunTestingSuite(false);
    setIsRunningTests(true);
    setStopPollingRequested(false);

    try {
      // Keep judge configuration synced before triggering a real prejudge run.
      setConfigSyncStatus("syncing");
      setConfigSyncMessage("Syncing checker/validator/model solution...");
      await apiFetch<{ ok: boolean }>(`/api/org/contests/${contestId}/questions/${questionId}/cp-config`, {
        method: "PUT",
        body: JSON.stringify({
          checker_type: isInteractiveQuestion || checkerType === "custom" ? "custom" : "token",
          checker_code: checkerType === "custom" ? customCheckerCode : null,
          validator_code: validatorCode,
          generator_code: generatorScript,
          statement_md: description,
          model_solution: testingCode,
          model_lang: testingLang === "python" ? "python3" : "cpp17"
        })
      });
      setConfigSyncStatus("synced");
      setConfigSyncMessage("Config synced. Validation queued.");
      const created = await apiFetch<{ job_id: string }>(
        `/api/org/contests/${contestId}/questions/${questionId}/prejudge`,
        { method: "POST" }
      );
      setHasRunTestingSuite(true);
      setLastPrejudgeJobId(created.job_id);

      let attempts = 0;
      while (attempts < 60) {
        if (stopPollingRequested) break;
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
      if (attempts >= 60) {
        setPrejudgeMessage("Validation polling timed out. Use Refresh Status or Retry Validation.");
      }
    } catch (error) {
      const e = error as ApiClientError;
      setConfigSyncStatus("error");
      setConfigSyncMessage(e instanceof Error ? e.message : "Config sync failed.");
      setPrejudgeErrorCode(e?.code ?? null);
      setPrejudgeMessage(e instanceof Error ? e.message : "Failed to run jury validation.");
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
                  { id: "checker", label: isInteractiveQuestion ? "Interactor" : "Output Checker", icon: CheckCircle2 },
                  { id: "generators", label: "Custom Generators", icon: Cpu },
                  { id: "tests", label: "Tests", icon: Terminal },
                  { id: "testing", label: "Run Validation", icon: PlaySquare }
                ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                const workflowMap: Record<string, boolean> = {
                  statement: !!title.trim() && !!description.trim(),
                  validator: validatorCode.trim().length > 0,
                  checker: customCheckerCode.trim().length > 0,
                  generators: generators.length > 0,
                  tests: hasAnyTests && !hasIncompleteTests,
                  testing: !!prejudgeJob
                };
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
                    <span className={`ml-auto h-1.5 w-1.5 rounded-full ${workflowMap[t.id] ? "bg-green-400" : "bg-zinc-600"}`} />
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
                  <h3 className="text-lg font-semibold text-white">{isInteractiveQuestion ? "Interactor" : "Output Checker"}</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {isInteractiveQuestion
                      ? "Provide the interactive judge program (testlib-based). This is used as custom judge logic."
                      : "Verifies whether the participant&apos;s output corresponds to the standard correct model (jury answers)."}
                  </p>
                </div>

                {/* Checker type selector */}
                {!isInteractiveQuestion && <div className="flex gap-4">
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
                </div>}

                {/* STANDARD CHECKERS */}
                {!isInteractiveQuestion && checkerType === "standard" ? (
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

            {/* Custom Generators Tab */}
            {activeTab === "generators" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Custom Generators (testlib.h)</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Manage reusable C++ generator files that dynamically construct random/extreme inputs based on command line arguments.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-6 min-h-[50vh]">
                  {/* Left Sidebar: Generators List */}
                  <div className="col-span-1 rounded-xl border border-white/10 bg-black/20 p-4 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Generators List</h4>
                      {isLoadingGen ? (
                        <p className="text-xs text-zinc-500">Loading...</p>
                      ) : generators.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No generators added yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                          {generators.map((g) => (
                            <div
                              key={g.name}
                              onClick={() => setActiveGenerator(g)}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono cursor-pointer transition ${
                                activeGenerator?.name === g.name
                                  ? "bg-purple-500/10 border-purple-500/35 text-purple-300"
                                  : "bg-black/30 border-white/5 text-zinc-400 hover:bg-white/5"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileCode className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{g.name}.cpp</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteGeneratorFile(g.name);
                                }}
                                className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-white/10 pt-4 space-y-2">
                      <label className="text-[10px] uppercase font-bold text-zinc-500">New Generator Name</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. gen_random"
                          value={newGenName}
                          onChange={(e) => setNewGenName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                          className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white focus:border-purple-500/50 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddGeneratorFile}
                          className="rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-bold text-white transition"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel: Code Editor */}
                  <div className="col-span-2 flex flex-col rounded-xl border border-white/10 overflow-hidden bg-black/40">
                    {activeGenerator ? (
                      <>
                        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20 text-xs text-zinc-400">
                          <span className="font-mono text-zinc-200">{activeGenerator.name}.cpp</span>
                          <button
                            type="button"
                            disabled={isSavingGen}
                            onClick={handleSaveGeneratorFile}
                            className="inline-flex items-center gap-1.5 text-[11px] text-purple-400 font-bold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-3 py-1 rounded transition"
                          >
                            {isSavingGen ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
                            Save Generator
                          </button>
                        </div>
                        <textarea
                          rows={16}
                          value={activeGenerator.code}
                          onChange={(e) => {
                            const updated = { ...activeGenerator, code: e.target.value };
                            setActiveGenerator(updated);
                            setGenerators((prev) => prev.map((g) => (g.name === activeGenerator.name ? updated : g)));
                          }}
                          className="flex-1 w-full p-4 font-mono text-xs text-zinc-300 bg-transparent outline-none focus:ring-0 leading-relaxed resize-none select-text"
                          spellCheck={false}
                        />
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                        <Cpu className="h-10 w-10 text-zinc-600 mb-2 animate-pulse" />
                        <p className="text-sm font-semibold">No generator selected</p>
                        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                          Select a generator from the list or type a name to create a new C++ test generator.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
                          onChange={(e) => {
                            setGeneratorScript(e.target.value);
                            if (generatorSaveStatus !== "idle") {
                              setGeneratorSaveStatus("idle");
                              setGeneratorSaveMessage(null);
                            }
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/40 p-3.5 text-xs font-mono text-zinc-300 focus:border-purple-500/50 focus:outline-none leading-relaxed"
                        />
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-sans leading-relaxed">
                            <p className="text-zinc-500">Saved with problem config and used during validation runs.</p>
                            {generatorSaveMessage ? (
                              <p className={generatorSaveStatus === "saved" ? "text-green-400" : "text-red-400"}>{generatorSaveMessage}</p>
                            ) : null}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleRunGenerator}
                              disabled={isGenerating}
                              className="inline-flex items-center gap-1 text-[11px] text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded"
                            >
                              {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                              Save Script Config
                            </button>
                            <button
                              type="button"
                              onClick={handleGenerateTestsFromScript}
                              disabled={isGeneratingTests}
                              className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-bold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-2.5 py-1 rounded"
                            >
                              {isGeneratingTests ? <RefreshCw className="h-3 w-3 animate-spin" /> : <PlaySquare className="h-3 w-3" />}
                              One-Click Generate Tests
                            </button>
                          </div>
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
                          setTestsSavedToCloud(false);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-transparent px-3 py-1 text-xs text-zinc-300 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Manual Test
                      </button>
                    </div>

                    {isHydratingTests ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-10 text-center">
                        <p className="text-sm font-semibold text-white">Loading saved tests…</p>
                      </div>
                    ) : testcases.length === 0 ? (
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
                                    setTestsSavedToCloud(false);
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
                                  onClick={() => {
                                    setTestcases((prev) => prev.filter((item) => item.id !== t.id));
                                    setTestsSavedToCloud(false);
                                  }}
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
                    <div className="flex items-center justify-between">
                      <div className="text-[11px]">
                        {!questionId && <span className="text-yellow-300">Save question first to enable test uploads.</span>}
                        {questionId && !hasAnyTests && <span className="text-zinc-400">Add tests, upload in/out, then save to cloud.</span>}
                        {questionId && hasAnyTests && hasIncompleteTests && <span className="text-yellow-300">Some tests are incomplete (missing input/output file).</span>}
                        {questionId && hasAnyTests && !hasIncompleteTests && !testsSavedToCloud && <span className="text-yellow-300">Tests changed. Save tests to cloud.</span>}
                        {questionId && hasAnyTests && !hasIncompleteTests && testsSavedToCloud && <span className="text-green-400">Tests synced to cloud.</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => void upsertTestsToCloud()}
                        disabled={!questionId || !hasAnyTests || hasIncompleteTests || isSavingTests}
                        className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white"
                      >
                        {isSavingTests ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                        {isSavingTests ? "Saving Tests..." : "Save Tests to Cloud"}
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
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    {workflowSteps.map((s, idx) => (
                      <React.Fragment key={s.id}>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                          s.done
                            ? "border-green-500/30 bg-green-500/10 text-green-300"
                            : s.blocked
                              ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-200"
                              : "border-white/10 bg-black/30 text-zinc-300"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.done ? "bg-green-400" : s.blocked ? "bg-yellow-300" : "bg-zinc-500"}`} />
                          {s.label}
                        </span>
                        {idx < workflowSteps.length - 1 ? <ArrowRight className="h-3 w-3 text-zinc-600" /> : null}
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">
                    Synced tests: <span className="font-semibold text-zinc-200">{syncedTestsCount}</span>
                    {testsetVersion > 0 ? <> · active testset version <span className="font-semibold text-zinc-200">v{testsetVersion}</span></> : null}
                  </p>
                  {runValidationDisabledReason ? (
                    <p className="mt-1 text-xs text-yellow-300">{runValidationDisabledReason}</p>
                  ) : null}
                    {configSyncMessage ? (
                      <p className={`mt-1 text-xs ${
                        configSyncStatus === "error"
                          ? "text-red-300"
                          : configSyncStatus === "synced"
                            ? "text-green-300"
                            : "text-zinc-400"
                      }`}>
                        {configSyncMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRunTestingSuite}
                      disabled={!canRunValidation}
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
                    <button
                      type="button"
                      onClick={() => void refreshPrejudgeStatus()}
                      disabled={!lastPrejudgeJobId || isRefreshingJob}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 hover:border-white/20 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-zinc-200"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingJob ? "animate-spin" : ""}`} />
                      Refresh Status
                    </button>
                    <button
                      type="button"
                      onClick={() => setStopPollingRequested(true)}
                      disabled={!isRunningTests}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 hover:border-red-500/40 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-red-300"
                    >
                      Stop Polling
                    </button>
                    <button
                      type="button"
                      onClick={() => void cancelValidation()}
                      disabled={!lastPrejudgeJobId && !prejudgeJob?.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 hover:border-red-500/40 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-red-300"
                    >
                      Cancel Validation
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
                            {prejudgeErrorCode ? (
                              <p className="mt-1 text-[10px]">
                                <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-red-300">
                                  {prejudgeErrorCode}
                                </span>
                              </p>
                            ) : null}
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
                        {prejudgeJob?.status === "FAILED" && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                            <p className="font-semibold">Validation failed.</p>
                            <p className="mt-1">Use <span className="font-semibold">Retry Validation</span> to enqueue again after fixing config/infra issues.</p>
                          </div>
                        )}
                        {isLikelyQueueStall && (
                          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                            <p className="font-semibold">Job appears queued without worker progress.</p>
                            <p className="mt-1">Check Pub/Sub publish/worker logs, then click Retry Validation.</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleRunTestingSuite}
                            disabled={!canRunValidation}
                            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Retry Validation
                          </button>
                          <button
                            type="button"
                            onClick={() => void refreshPrejudgeStatus()}
                            disabled={!lastPrejudgeJobId || isRefreshingJob}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 hover:border-white/20 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-zinc-200"
                          >
                            Refresh Status
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Passed</p>
                            <p className="text-sm font-semibold text-white">{aggregatePassed ?? "--"}</p>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Total</p>
                            <p className="text-sm font-semibold text-white">{aggregateTotal ?? "--"}</p>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Max Runtime</p>
                            <p className="text-sm font-semibold text-white">{aggregateMaxRuntimeMs !== null ? `${aggregateMaxRuntimeMs} ms` : "--"}</p>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Max Memory</p>
                            <p className="text-sm font-semibold text-white">{aggregateMaxMemoryKb !== null ? `${(aggregateMaxMemoryKb / 1024).toFixed(2)} MB` : "--"}</p>
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
                              verdict = normalizeVerdict(p.verdict);
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
                              verdict = "NO_DATA";
                              verdictColor = "text-yellow-300";
                              verdictBg = "bg-yellow-500/10 border-yellow-500/20";
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
                                          {tc?.inputPreview || "Input preview not fetched in this session."}
                                        </pre>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Expected output (ans)</span>
                                        <pre className="rounded-lg bg-zinc-950/80 border border-white/5 p-2.5 font-mono text-[10px] text-zinc-300 max-h-28 overflow-y-auto">
                                          {tc?.outputPreview || "Output preview not fetched in this session."}
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
                                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Job Metrics</span>
                                          <pre className="rounded-lg border p-3 font-mono text-[10px] leading-relaxed bg-zinc-950/80 border-white/5 text-zinc-300 max-h-28 overflow-y-auto">
                                            {`passed=${aggregatePassed ?? "--"}\ntotal=${aggregateTotal ?? "--"}\nmax_runtime_ms=${aggregateMaxRuntimeMs ?? "--"}\nmax_memory_kb=${aggregateMaxMemoryKb ?? "--"}`}
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
                        {prejudgeErrorCode ? (
                          <div className="mt-2">
                            <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-[10px] text-red-300">
                              {prejudgeErrorCode}
                            </span>
                          </div>
                        ) : null}
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
});

export default CPProblemStudio;
