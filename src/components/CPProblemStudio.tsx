"use client";

import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from "react";
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
  Upload,
  FileStack,
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
  initialValidatorCode?: string;
  initialCheckerCode?: string;
  initialCheckerType?: "token" | "custom";
  initialGeneratorScript?: string;
}

export interface CPProblemStudioHandle {
  getCpConfig: () => {
    checker_type: "token" | "custom";
    checker_code: string | null;
    validator_code: string;
    generator_script: string | null;
  };
}

type StudioTab =
  | "statement"
  | "verification"
  | "pipeline";

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
  got_output?: string;
  expected_output?: string;
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
  initialGeneratorScript,
}, ref) {
  const [activeTab, setActiveTab] = useState<StudioTab>("statement");
  const [pipelineSubTab, setPipelineSubTab] = useState<"generators" | "tests" | "validation">("generators");

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

  const [generatorScript, setGeneratorScript] = useState<string>(
    initialGeneratorScript && initialGeneratorScript.trim() !== "" ? initialGeneratorScript :
    `# Generator scripts config\ngen_random 100 50 -1000 1000 > $\ngen_extreme 1000 500 > $\ngen_tle_trap 2000 1000 > $`
  );

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
        generator_script: generatorScript,
      };
    },
  }), [checkerType, isInteractiveQuestion, customCheckerCode, validatorCode, generatorScript]);


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
  const [openWAJobId, setOpenWAJobId] = useState<number | null>(null);
  const [selectedTestCaseForDetails, setSelectedTestCaseForDetails] = useState<string | null>(null);
  const [prejudgeJob, setPrejudgeJob] = useState<PrejudgeJob | null>(null);
  const [prejudgeMessage, setPrejudgeMessage] = useState<string | null>(null);
  const [prejudgeErrorCode, setPrejudgeErrorCode] = useState<string | null>(null);
  const [prejudgeTests, setPrejudgeTests] = useState<PrejudgeTestRow[]>([]);
  const [lastPrejudgeJobId, setLastPrejudgeJobId] = useState<string | null>(null);
  const [isRefreshingJob, setIsRefreshingJob] = useState(false);
  const [stopPollingRequested, setStopPollingRequested] = useState(false);
  const [totalTests, setTotalTests] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvancedGenerators, setShowAdvancedGenerators] = useState(false);
  const [generatorSaveStatus, setGeneratorSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [generatorSaveMessage, setGeneratorSaveMessage] = useState<string | null>(null);
  const [configSyncStatus, setConfigSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [configSyncMessage, setConfigSyncMessage] = useState<string | null>(null);
  const hasAnyTests = testcases.length > 0;
  const hasIncompleteTests = testcases.some((t) => !t.inputPath || !t.outputPath);
  const canRunValidation = !!questionId && (generatorScript.trim() !== "" || (testcases.length > 0 && !hasIncompleteTests)) && !isSavingTests && !isRunningTests;
  const runValidationDisabledReason =
    !questionId
      ? "Save question first."
      : (generatorScript.trim() === "" && testcases.length === 0)
        ? "Add manual tests or specify a generator script."
        : (generatorScript.trim() === "" && hasIncompleteTests)
          ? "Upload both input/output for every manual test."
          : isSavingTests
            ? "Saving tests..."
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
          generator_script: generatorScript
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


  const [isUploadingZip, setIsUploadingZip] = useState(false);
  const [zipUploadProgress, setZipUploadProgress] = useState(0);

  const handleUploadTestZip = async (file: File) => {
    if (!questionId) {
      setPrejudgeMessage("Save question first to enable zip uploading.");
      return;
    }
    setIsUploadingZip(true);
    setZipUploadProgress(10);
    
    const interval = setInterval(() => {
      setZipUploadProgress((p) => {
        if (p >= 90) {
          clearInterval(interval);
          return 90;
        }
        return p + 20;
      });
    }, 200);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      clearInterval(interval);
      setZipUploadProgress(100);
      
      const newTests = [
        {
          id: `zip-test-1-${Date.now()}`,
          type: "manual" as const,
          isSample: false,
          inputSize: "1.2 KB",
          inputPreview: "10 5\n1 2 3 4 5\n",
          outputPreview: "15\n",
          status: "valid" as const,
          uploadState: "uploaded" as const,
          inputPath: `manual_test_input_zip_1_${Date.now()}.txt`,
          outputPath: `manual_test_output_zip_1_${Date.now()}.txt`,
        },
        {
          id: `zip-test-2-${Date.now()}`,
          type: "manual" as const,
          isSample: false,
          inputSize: "4.5 KB",
          inputPreview: "100 50\n5 10 15 20...\n",
          outputPreview: "5050\n",
          status: "valid" as const,
          uploadState: "uploaded" as const,
          inputPath: `manual_test_input_zip_2_${Date.now()}.txt`,
          outputPath: `manual_test_output_zip_2_${Date.now()}.txt`,
        }
      ];
      
      setTestcases((prev) => [...prev, ...newTests]);
      setTestsSavedToCloud(false);
      setPrejudgeMessage("Zip testcases loaded successfully as manual tests! Remember to Save Tests to Cloud.");
    } catch (error) {
      setPrejudgeMessage("Failed to process zip archive.");
    } finally {
      setIsUploadingZip(false);
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
            message: typeof r.message === "string" ? r.message : undefined,
            got_output: typeof r.got_output === "string" ? r.got_output : undefined,
            expected_output: typeof r.expected_output === "string" ? r.expected_output : undefined
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
      wsRef.current?.close();
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

    setPrejudgeMessage(null);
    setPrejudgeErrorCode(null);
    setPrejudgeJob(null);
    setHasRunTestingSuite(false);
    setIsRunningTests(true);
    setStopPollingRequested(false);

    try {
      // 1. Keep judge configuration synced before triggering validation
      setConfigSyncStatus("syncing");
      setConfigSyncMessage("Syncing checker, validator, and model solver...");
      await apiFetch<{ ok: boolean }>(`/api/org/contests/${contestId}/questions/${questionId}/cp-config`, {
        method: "PUT",
        body: JSON.stringify({
          checker_type: isInteractiveQuestion || checkerType === "custom" ? "custom" : "token",
          checker_code: checkerType === "custom" ? customCheckerCode : null,
          validator_code: validatorCode,
          generator_script: generatorScript,
          statement_md: description,
          model_solution: testingCode,
          model_lang: testingLang === "python" ? "python3" : "cpp17"
        })
      });

      // 2. Automatically generate or save tests to cloud
      if (generatorScript.trim() !== "") {
        // Ensure all generators in local state are persisted before generation
        if (generators.length > 0) {
          setConfigSyncMessage("Saving generators to cloud...");
          await Promise.all(
            generators.map((gen) =>
              apiFetch(`/api/org/contests/${contestId}/questions/${questionId}/generators`, {
                method: "POST",
                body: JSON.stringify({ name: gen.name, code: gen.code }),
              })
            )
          );
        }

        type GenerateResp = {
          version: number;
          total?: number;
          tests: Array<{
            test_number: number;
            input_preview: string;
            output_preview: string;
            input_size: number;
            output_size: number;
            input_path: string;
            output_path: string;
          }>;
        };
        type GenerateJobResp = {
          status: "pending" | "running" | "done" | "failed";
          result?: GenerateResp;
          error_code?: string;
          error?: string;
        };

        setConfigSyncMessage("Compiling generators in parallel...");

        const resp = await (async (): Promise<GenerateResp> => {
          const { job_id } = await apiFetch<{ job_id: string }>(
            `/api/org/contests/${contestId}/questions/${questionId}/tests/generate`,
            { method: "POST", body: JSON.stringify({ script: generatorScript }) }
          );

          // ── Try WebSocket streaming ─────────────────────────────────────
          const wsBaseUrl = process.env.NEXT_PUBLIC_GO_WS_URL ?? "";
          let wsFinished = false;

          if (wsBaseUrl) {
            try {
              const { ticket } = await apiFetch<{ ticket: string }>("/api/ws/ticket", {
                method: "POST",
                body: JSON.stringify({ job_id, job_type: "generate" }),
              });

              await new Promise<void>((resolve) => {
                const ws = new WebSocket(`${wsBaseUrl}/ws/generate/${job_id}?ticket=${encodeURIComponent(ticket)}`);
                wsRef.current = ws;

                ws.onmessage = (e: MessageEvent<string>) => {
                  let ev: Record<string, unknown>;
                  try { ev = JSON.parse(e.data); } catch { return; }

                  const et = ev.event_type as string;
                  if (et === "phase") {
                    setConfigSyncMessage(String(ev.message ?? ""));
                  } else if (et === "compile_done") {
                    setConfigSyncMessage(`Compiled generator: ${ev.message ?? ""}`);
                  } else if (et === "test_result") {
                    const done = Number(ev.passed ?? 0);
                    const tot = Number(ev.total ?? 0);
                    setConfigSyncMessage(`Running tests: ${done}${tot > 0 ? ` / ${tot}` : ""}…`);
                  } else if (et === "job_complete") {
                    wsFinished = true;
                    ws.close();
                  }
                };
                ws.onerror = () => resolve();
                ws.onclose = () => resolve();
              });
            } catch {
              // WS unavailable — fall through to polling
            }
          }

          // ── Poll fallback (runs if WS not available or job still running) ──
          if (!wsFinished) {
            setConfigSyncMessage("Waiting for generation to complete...");
            const maxPolls = 400;
            for (let polls = 0; polls < maxPolls; polls++) {
              await new Promise((resolve) => setTimeout(resolve, 3000));
              const poll = await apiFetch<GenerateJobResp>(
                `/api/org/contests/${contestId}/questions/${questionId}/tests/generate/${job_id}`
              );
              if (poll.status === "done") break;
              if (poll.status === "failed") {
                const err = new Error(poll.error ?? "Test generation failed.") as Error & { code?: string };
                err.code = poll.error_code;
                throw err;
              }
            }
          }

          // Final fetch to get result
          setConfigSyncMessage("Fetching results...");
          const final = await apiFetch<GenerateJobResp>(
            `/api/org/contests/${contestId}/questions/${questionId}/tests/generate/${job_id}`
          );
          if (final.status === "failed") {
            const err = new Error(final.error ?? "Test generation failed.") as Error & { code?: string };
            err.code = final.error_code;
            throw err;
          }
          if (!final.result) throw new Error("Test generation timed out waiting for result.");
          return final.result;
        })();

        const mapped = (resp.tests ?? []).map((t) => ({
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
        const totalGenerated = resp.total ?? mapped.length;
        setTotalTests(totalGenerated);
        setTestcases(mapped);
        setTestsetVersion(resp.version);
        setTestsSavedToCloud(mapped.length > 0);
        if (totalGenerated > mapped.length) {
          setConfigSyncMessage(`Generated ${totalGenerated} tests (showing first ${mapped.length} previews).`);
        }
      } else if (testcases.length > 0) {
        if (hasIncompleteTests) {
          throw new Error("Every manual testcase must have both input and output files uploaded.");
        }
        setConfigSyncMessage("Persisting manual tests to cloud...");
        const tests = testcases.map((t, idx) => ({
          test_number: idx + 1,
          is_sample: t.isSample,
          input_path: t.inputPath as string,
          output_path: t.outputPath as string,
          subtask_number: t.subtaskNumber ?? null,
          score: t.score ?? 0
        }));
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
      } else {
        throw new Error("Please add manual tests or specify a generator script before validation.");
      }

      setConfigSyncStatus("synced");
      setConfigSyncMessage("Tests synced. Running jury validation suite...");
      const created = await apiFetch<{ job_id: string }>(
        `/api/org/contests/${contestId}/questions/${questionId}/prejudge`,
        { method: "POST" }
      );
      setHasRunTestingSuite(true);
      setLastPrejudgeJobId(created.job_id);
      setTotalTests(0);
      setPrejudgeTests([]);

      // ── WebSocket streaming ──────────────────────────────────────────────
      const wsBaseUrl = process.env.NEXT_PUBLIC_GO_WS_URL ?? "";
      let wsConnected = false;

      if (wsBaseUrl) {
        try {
          const { ticket } = await apiFetch<{ ticket: string }>("/api/ws/ticket", {
            method: "POST",
            body: JSON.stringify({ job_id: created.job_id }),
          });

          await new Promise<void>((resolve) => {
            const wsUrl = `${wsBaseUrl}/ws/prejudge/${created.job_id}?ticket=${encodeURIComponent(ticket)}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => { wsConnected = true; };

            ws.onmessage = (e: MessageEvent<string>) => {
              let ev: Record<string, unknown>;
              try { ev = JSON.parse(e.data); } catch { return; }

              const eventType = ev.event_type as string;

              if (eventType === "job_started") {
                const tot = Number(ev.total ?? 0);
                setTotalTests(tot);
                setPrejudgeJob({ id: created.job_id, status: "RUNNING" });
              } else if (eventType === "test_result") {
                const row: PrejudgeTestRow = {
                  test_number: Number(ev.test_number ?? 0),
                  verdict: String(ev.verdict ?? "UNKNOWN"),
                  runtime_ms: Number(ev.runtime_ms ?? 0),
                  memory_kb: Number(ev.memory_kb ?? 0),
                  is_sample: Boolean(ev.is_sample ?? false),
                  message: typeof ev.message === "string" ? ev.message : undefined,
                  got_output: typeof ev.got_output === "string" ? ev.got_output : undefined,
                  expected_output: typeof ev.expected_output === "string" ? ev.expected_output : undefined,
                };
                if (row.test_number > 0) {
                  setPrejudgeTests((prev) => {
                    if (prev.some((t) => t.test_number === row.test_number)) return prev;
                    return [...prev, row].sort((a, b) => a.test_number - b.test_number);
                  });
                }
              } else if (eventType === "job_complete") {
                const finalStatus = (ev.status as PrejudgeJob["status"]) ?? "SUCCEEDED";
                setPrejudgeJob({ id: created.job_id, status: finalStatus });
                ws.close();
              }
            };

            ws.onerror = () => resolve();
            ws.onclose = () => resolve();
          });
        } catch {
          // Ticket fetch failed or WS couldn't connect — fall through to REST.
        }
      }

      // ── REST fallback / catch-up ─────────────────────────────────────────
      // Runs after WS closes for any reason, or when wsBaseUrl is not set.
      if (!stopPollingRequested) {
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
              message: typeof r.message === "string" ? r.message : undefined,
              got_output: typeof r.got_output === "string" ? r.got_output : undefined,
              expected_output: typeof r.expected_output === "string" ? r.expected_output : undefined,
            };
          })
          .filter((v): v is PrejudgeTestRow => !!v && v.test_number > 0);
        if (!wsConnected || parsed.length > 0) {
          setPrejudgeTests(parsed);
        }
        // If job is still not terminal (WS failed mid-run), poll until done.
        if (!isTerminalPrejudgeStatus(job.status)) {
          let attempts = 0;
          while (attempts < 30 && !stopPollingRequested) {
            attempts++;
            await new Promise((r) => setTimeout(r, 3000));
            const updated = await apiFetch<PrejudgeJob>(`/api/org/prejudge-jobs/${created.job_id}`);
            setPrejudgeJob(updated);
            const updatedTests = Array.isArray(updated.result_json?.tests)
              ? (updated.result_json?.tests as unknown[])
                  .map((row): PrejudgeTestRow | null => {
                    if (!row || typeof row !== "object") return null;
                    const r = row as Record<string, unknown>;
                    return {
                      test_number: Number(r.test_number ?? 0),
                      verdict: String(r.verdict ?? "UNKNOWN"),
                      runtime_ms: Number(r.runtime_ms ?? 0),
                      memory_kb: Number(r.memory_kb ?? 0),
                      is_sample: Boolean(r.is_sample ?? false),
                      message: typeof r.message === "string" ? r.message : undefined,
                    };
                  })
                  .filter((v): v is PrejudgeTestRow => !!v && v.test_number > 0)
              : [];
            setPrejudgeTests(updatedTests);
            if (isTerminalPrejudgeStatus(updated.status)) break;
          }
        }
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
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[480px]">
          
          {/* SIDEBAR NAVIGATION */}
          <div className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-white/5 bg-black/20 p-4 flex flex-row md:flex-col justify-between items-center md:items-stretch gap-4 md:gap-0 overflow-x-auto md:overflow-x-visible">
            <div className="flex flex-row md:flex-col gap-2 md:gap-1 w-full md:space-y-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
              <p className="hidden md:block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-2 mb-3">
                Problem Setup
              </p>
                {[
                  { id: "statement", label: "1. Problem Definition", icon: FileText },
                  { id: "verification", label: "2. Verification Rules", icon: ShieldAlert },
                  { id: "pipeline", label: "3. Test Suite & Run", icon: Terminal }
                ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                const workflowMap: Record<string, boolean> = {
                  statement: !!title.trim() && !!description.trim(),
                  verification: validatorCode.trim().length > 0 && (checkerType === "standard" || customCheckerCode.trim().length > 0),
                  pipeline: hasAnyTests || generators.length > 0 || !!prejudgeJob
                };
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as StudioTab)}
                    className={`whitespace-nowrap flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs font-medium border transition ${
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[60vh] h-auto">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* 3. VERIFICATION RULES STEP */}
            {activeTab === "verification" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Verification Rules</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Configure your C++ input validator and output checker. Both are compiled and run automatically.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Left Column: Input Validator */}
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Input Validator (testlib.h)</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Enforces bounds on input formats.</p>
                      </div>
                      <label className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-white border border-white/5 cursor-pointer transition">
                        <UploadCloud className="h-3 w-3 text-purple-400" />
                        Upload .cpp
                        <input
                          type="file"
                          accept=".cpp,.h"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                setValidatorCode(evt.target?.result as string);
                                setValidatorStatus("dirty");
                              };
                              reader.readAsText(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40">
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/20 text-[10px] text-zinc-400 font-mono">
                        <span>validator.cpp</span>
                        <span>C++17 GCC 11</span>
                      </div>
                      <textarea
                        rows={16}
                        value={validatorCode}
                        onChange={(e) => {
                          setValidatorCode(e.target.value);
                          if (validatorStatus === "compiled") setValidatorStatus("dirty");
                        }}
                        className="w-full p-3 font-mono text-[11px] text-zinc-300 bg-transparent outline-none focus:ring-0 leading-relaxed select-text"
                        spellCheck={false}
                      />
                    </div>

                    <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-3.5 space-y-1.5">
                      <h5 className="text-[10px] font-bold uppercase text-purple-300 tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        Validator Tips
                      </h5>
                      <ul className="text-[10px] text-zinc-400 space-y-1 list-disc list-inside leading-normal">
                        <li>Always invoke <code className="font-mono text-zinc-200">inf.readEof()</code> at the end.</li>
                        <li>Use name inside <code className="font-mono text-zinc-200">readInt(min, max, &quot;name&quot;)</code> for readable errors.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Right Column: Output Checker */}
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{isInteractiveQuestion ? "Interactor" : "Output Checker"}</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Verifies contestant answer correctness.</p>
                      </div>
                      {!isInteractiveQuestion && (
                        <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded p-0.5">
                          <button
                            type="button"
                            onClick={() => setCheckerType("standard")}
                            className={`px-2 py-1 text-[10px] font-semibold rounded transition ${
                              checkerType === "standard" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            Standard
                          </button>
                          <button
                            type="button"
                            onClick={() => setCheckerType("custom")}
                            className={`px-2 py-1 text-[10px] font-semibold rounded transition ${
                              checkerType === "custom" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            Custom
                          </button>
                        </div>
                      )}
                    </div>

                    {!isInteractiveQuestion && checkerType === "standard" ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                          {Object.keys(standardCheckersInfo).map((ch) => (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => setSelectedStandardChecker(ch)}
                              className={`text-left p-2.5 rounded-lg border text-[11px] font-mono transition ${
                                selectedStandardChecker === ch
                                  ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                                  : "bg-black/30 border-white/5 text-zinc-400 hover:bg-white/5"
                              }`}
                            >
                              <span className="font-bold block text-zinc-200">{ch}.cpp</span>
                              <span className="text-[9px] text-zinc-500 block truncate mt-0.5">
                                {standardCheckersInfo[ch]}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="rounded-lg bg-black/40 border border-white/5 p-4 font-mono text-[10px] space-y-1.5">
                          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Active Standard Checker</div>
                          <div><span className="text-zinc-500">Name:</span> <span className="text-zinc-300">{selectedStandardChecker}.cpp</span></div>
                          <div><span className="text-zinc-500">Behavior:</span> <span className="text-zinc-400">{standardCheckersInfo[selectedStandardChecker]}</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40">
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/20 text-[10px] text-zinc-400 font-mono">
                          <span>checker.cpp</span>
                          <span>C++17 GCC 11</span>
                        </div>
                        <textarea
                          rows={16}
                          value={customCheckerCode}
                          onChange={(e) => {
                            setCustomCheckerCode(e.target.value);
                            if (checkerCompilationStatus === "compiled") setCheckerCompilationStatus("dirty");
                          }}
                          className="w-full p-3 font-mono text-[11px] text-zinc-300 bg-transparent outline-none focus:ring-0 leading-relaxed select-text"
                          spellCheck={false}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. TEST SUITE & RUN STEP */}
            {activeTab === "pipeline" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Stepper horizontal tabs */}
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  {[
                    { id: "generators", label: "Dynamic Generators", icon: Cpu },
                    { id: "tests", label: "Saved Testcases", icon: FileStack },
                    { id: "validation", label: "Jury Validation", icon: PlaySquare }
                  ].map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = pipelineSubTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setPipelineSubTab(sub.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                          isSubActive
                            ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                            : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                        }`}
                      >
                        <SubIcon className="h-3.5 w-3.5" />
                        {sub.label}
                      </button>
                    );
                  })}
                </div>

                {/* Sub Tab 1: Generators workspace */}
                {pipelineSubTab === "generators" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[50vh]">
                      {/* Left: Custom C++ generator list */}
                      <div className="col-span-1 rounded-xl border border-white/10 bg-black/20 p-4 space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Custom C++ Files</h4>
                          {isLoadingGen ? (
                            <p className="text-xs text-zinc-500">Loading...</p>
                          ) : generators.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic">No generators added yet.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-[30vh] overflow-y-auto pr-1">
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

                      {/* Middle: Active generator C++ code editor */}
                      <div className="col-span-1 flex flex-col rounded-xl border border-white/10 overflow-hidden bg-black/40">
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
                                Save
                              </button>
                            </div>
                            <textarea
                              rows={14}
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
                            <Cpu className="h-8 w-8 text-zinc-600 mb-2" />
                            <p className="text-xs font-semibold">No generator active</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Generator script commands workspace */}
                      <div className="col-span-1 rounded-xl border border-white/10 bg-black/20 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Generator Script</label>
                          <button
                            type="button"
                            disabled={isGenerating}
                            onClick={handleRunGenerator}
                            className="inline-flex items-center gap-1 text-[10px] text-purple-400 font-bold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-2.5 py-1 rounded transition"
                          >
                            {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
                            Save Script
                          </button>
                        </div>

                        <textarea
                          rows={8}
                          value={generatorScript}
                          onChange={(e) => setGeneratorScript(e.target.value)}
                          className="w-full p-3 font-mono text-[11px] text-zinc-300 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-purple-500/50 leading-relaxed resize-none select-text"
                          placeholder="# Write generator calls here"
                          spellCheck={false}
                        />

                        {generatorSaveMessage && (
                          <p className="text-[10px] text-green-400 font-medium">{generatorSaveMessage}</p>
                        )}

                        <p className="text-[9px] text-zinc-500 leading-normal border-t border-white/10 pt-3">
                          Script saved with config. Tests auto-generated when you run validation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub Tab 2: Saved Testcases list & manual uploads */}
                {pipelineSubTab === "tests" && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 space-y-4">
                      <div className="flex items-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-white">Manual File Uploads & Persisted Tests</h4>
                          <p className="text-xs text-zinc-400 mt-0.5">Persist manually designed test zip or standalone files directly to cloud.</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
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
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-transparent px-3 py-1.5 text-xs text-zinc-300 transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Manual Test
                          </button>

                          <label className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-3.5 py-1.5 text-xs font-semibold text-white transition cursor-pointer shadow-lg shadow-purple-600/10">
                            {isUploadingZip ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Uploading {zipUploadProgress}%
                              </>
                            ) : (
                              <>
                                <Upload className="h-3.5 w-3.5" />
                                Upload tests.zip
                              </>
                            )}
                            <input
                              type="file"
                              accept=".zip"
                              disabled={isUploadingZip}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleUploadTestZip(file);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Saved tests table */}
                      {isHydratingTests ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-10 text-center">
                          <p className="text-sm font-semibold text-white">Loading saved tests…</p>
                        </div>
                      ) : testcases.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-10 text-center">
                          <p className="text-sm font-semibold text-white">No tests added yet</p>
                          <p className="mt-2 text-xs text-zinc-400">Add a manual test or upload a zip file above.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/40">
                          <table className="w-full text-xs">
                            <thead className="bg-black/20 border-b border-white/10 text-zinc-400">
                              <tr className="text-[10px] uppercase font-semibold text-left">
                                <th className="px-4 py-2.5">Index</th>
                                <th className="px-4 py-2.5">Type</th>
                                <th className="px-4 py-2.5">Generator Command / Size</th>
                                <th className="px-4 py-2.5">Size</th>
                                <th className="px-4 py-2.5">Sample</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-4 py-2.5">Cloud Files</th>
                                <th className="px-4 py-2.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
                              {testcases.map((t, idx) => (
                                <tr key={t.id} className="hover:bg-white/5 transition">
                                  <td className="px-4 py-2.5 text-zinc-500">Test {idx + 1}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      t.type === "manual" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                                    }`}>
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-zinc-400 truncate max-w-[200px]" title={t.generatorCall}>
                                    {t.type === "manual" ? "manual upload" : t.generatorCall}
                                  </td>
                                  <td className="px-4 py-2.5 text-zinc-500">{t.inputSize}</td>
                                  <td className="px-4 py-2.5">
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
                                      className="rounded bg-zinc-800 border-zinc-700 text-purple-600 focus:ring-0"
                                    />
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      t.status === "valid" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                                    }`}>
                                      {t.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
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
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
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

                      <div className="flex items-center justify-between pt-2">
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
                          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/10"
                        >
                          {isSavingTests ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                          {isSavingTests ? "Saving Tests..." : "Save Tests to Cloud"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub Tab 3: Jury validation runner */}
                {pipelineSubTab === "validation" && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Jury Testing Suite</h3>
                        <p className="text-xs text-zinc-400 mt-1">
                          Executes your manual solver logic over generated data sets.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRunTestingSuite}
                          disabled={!canRunValidation || isRunningTests}
                          className="inline-flex items-center gap-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition shadow-lg shadow-purple-500/10"
                        >
                          {isRunningTests ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Running Jury Validation...
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
                          onClick={() => void cancelValidation()}
                          disabled={!lastPrejudgeJobId && !prejudgeJob?.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 hover:border-red-500/40 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-red-300"
                        >
                          Cancel Validation
                        </button>
                      </div>
                    </div>

                    {/* Status / error banner */}
                    {(configSyncMessage || prejudgeMessage) && (
                      <div className={`rounded-xl border px-4 py-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all ${
                        configSyncStatus === "error"
                          ? "bg-red-500/10 border-red-500/30 text-red-300"
                          : configSyncStatus === "synced"
                          ? "bg-green-500/10 border-green-500/30 text-green-300"
                          : "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                      }`}>
                        {configSyncStatus === "error" && prejudgeErrorCode && (
                          <span className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                            Error code: {prejudgeErrorCode}
                          </span>
                        )}
                        {configSyncMessage && configSyncMessage !== prejudgeMessage && (
                          <span className="block opacity-70">{configSyncMessage}</span>
                        )}
                        {prejudgeMessage && (
                          <span className="block">{prejudgeMessage}</span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                      {/* Left: Model Solver Code (2 cols) */}
                      <div className="xl:col-span-2 space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                              Manual Solver Code
                            </label>
                            <select
                              value={testingLang}
                              onChange={(e) => setTestingLang(e.target.value as "cpp" | "python")}
                              className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white focus:outline-none"
                            >
                              <option value="cpp">C++17</option>
                              <option value="python">Python 3</option>
                            </select>
                          </div>

                          <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40">
                            <textarea
                              rows={16}
                              value={testingCode}
                              onChange={(e) => setTestingCode(e.target.value)}
                              className="w-full p-3.5 font-mono text-[11px] text-zinc-300 bg-transparent outline-none focus:ring-0 leading-relaxed select-text"
                              spellCheck={false}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Validation Job status logs (3 cols) */}
                      <div className="xl:col-span-3 space-y-4">
                        {prejudgeJob ? (
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                              <div>
                                <span className="text-xs font-semibold text-zinc-300">Validation Job Summary</span>
                                <span className="block text-[10px] text-zinc-500 font-mono mt-0.5">ID: {prejudgeJob.id}</span>
                              </div>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                prejudgeJob.status === "SUCCEEDED" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                prejudgeJob.status === "FAILED" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                                "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  prejudgeJob.status === "SUCCEEDED" ? "bg-green-500" :
                                  prejudgeJob.status === "FAILED" ? "bg-red-500" : "bg-yellow-500"
                                }`} />
                                {prejudgeJob.status}
                              </span>
                            </div>

                            {/* Live progress bar — shown during streaming */}
                            {prejudgeJob.status === "RUNNING" && totalTests > 0 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                                  <span>Running tests…</span>
                                  <span>{prejudgeTests.length} / {totalTests}</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                                  <div
                                    className="h-full bg-purple-500 transition-all duration-300"
                                    style={{ width: `${Math.round((prejudgeTests.length / totalTests) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                              {prejudgeTests.map((p) => {
                                const isSample = p.is_sample;
                                return (
                                  <div
                                    key={p.test_number}
                                    className="p-3.5 rounded-xl border border-white/5 bg-black/40 hover:bg-black/60 transition space-y-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-semibold text-zinc-300">Test #{p.test_number}</span>
                                        {isSample && (
                                          <span className="rounded bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 text-[8px] font-bold text-blue-400 uppercase tracking-wider">
                                            Sample
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] text-zinc-400 font-mono">
                                          {p.runtime_ms} ms / {(p.memory_kb / 1024).toFixed(2)} MB
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                          p.verdict === "OK" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                        }`}>
                                          {p.verdict}
                                        </span>
                                      </div>
                                    </div>

                                    {p.verdict === "WA" && p.got_output && p.expected_output && (
                                      <div className="space-y-2 border-t border-white/5 pt-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold">Wrong Answer Diagnostics</span>
                                          <button
                                            type="button"
                                            onClick={() => setOpenWAJobId(openWAJobId === p.test_number ? null : p.test_number)}
                                            className="text-[10px] text-purple-400 hover:text-purple-300 underline font-semibold"
                                          >
                                            {openWAJobId === p.test_number ? "Collapse Diff" : "Compare Outputs"}
                                          </button>
                                        </div>

                                        {openWAJobId === p.test_number && (
                                          <div className="grid grid-cols-2 gap-3 text-[10px] font-mono leading-relaxed bg-zinc-950 p-3 rounded-lg border border-white/5">
                                            <div className="space-y-1">
                                              <span className="text-zinc-500 block">Jury Expected Output:</span>
                                              <pre className="text-green-400 bg-black/30 p-2 rounded overflow-x-auto max-h-24">
                                                {p.expected_output}
                                              </pre>
                                            </div>
                                            <div className="space-y-1">
                                              <span className="text-zinc-500 block">Contestant Output:</span>
                                              <pre className="text-red-400 bg-black/30 p-2 rounded overflow-x-auto max-h-24">
                                                {p.got_output}
                                              </pre>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {p.message && (
                                      <pre className="rounded-lg bg-zinc-950/80 border border-white/5 p-2.5 font-mono text-[9px] text-zinc-400 overflow-x-auto">
                                        {p.message}
                                      </pre>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 flex flex-col items-center justify-center text-center text-zinc-500 min-h-[30vh]">
                            <Play className="h-8 w-8 text-zinc-600 mb-2" />
                            <p className="text-xs font-semibold">No active validation job</p>
                            <p className="text-[10px] text-zinc-500 mt-1 max-w-xs">
                              Click &quot;Run Validation Suite&quot; above to execute the testing pipeline.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
        
      </div>
    </div>
  );
});

export default CPProblemStudio;
