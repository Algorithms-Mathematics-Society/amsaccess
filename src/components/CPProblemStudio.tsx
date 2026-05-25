"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  X,
  Plus,
  Trash2,
  Play,
  Check,
  AlertCircle,
  Cloud,
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
  XCircle,
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

type PolygonTab =
  | "statement"
  | "validator"
  | "checker"
  | "tests"
  | "solutions"
  | "testing"
  | "s3";

interface Testcase {
  id: string;
  type: "manual" | "generated";
  generatorCall?: string;
  inputSize: string;
  isSample: boolean;
  inputPreview: string;
  outputPreview: string;
  status: "valid" | "failed" | "pending";
}

interface SolutionFile {
  id: string;
  name: string;
  lang: string;
  expectedVerdict: "OK" | "WA" | "TLE" | "MLE" | "RE";
  actualVerdict?: "OK" | "WA" | "TLE" | "MLE" | "RE" | "pending";
  passedCount?: number;
  totalCount?: number;
  status: "success" | "failed" | "idle" | "running";
}

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
  const [activeTab, setActiveTab] = useState<PolygonTab>("statement");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- IO / Stream Styles (Advanced Settings maintained locally in studio) ---
  const [inputStyle, setInputStyle] = useState<"stdin" | "file">("stdin");
  const [inputFileName, setInputFileName] = useState("input.txt");
  const [outputStyle, setOutputStyle] = useState<"stdout" | "file">("stdout");
  const [outputFileName, setOutputFileName] = useState("output.txt");
  const [inputFormatText, setInputFormatText] = useState("A single integer $N$ followed by $N$ space-separated values.");
  const [outputFormatText, setOutputFormatText] = useState("A single integer denoting the maximum subarray sum.");
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

  // --- Custom Markdown, LaTeX Math, Image and Interactive Code Parser ---
  const parseInlineFormatting = (line: string): React.ReactNode[] => {
    if (!line) return [];
    // Split by Markdown bold (**text**), LaTeX ($formula$), and Markdown image (![alt](url))
    const parts = line.split(/(\!\[.*?\]\(.*?\))|(\*\*.*?\*\*)|(\$.*?\$)/g);

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

      // 3. LaTeX Math Match: $formula$
      if (part.startsWith("$") && part.endsWith("$")) {
        const formula = part.substring(1, part.length - 1);
        return (
          <span key={pIdx} className="mx-0.5 inline-block font-mono text-[11px] font-semibold text-purple-300 bg-purple-500/10 px-1 py-0.5 rounded border border-purple-500/10">
            {formula}
          </span>
        );
      }

      // 4. Regular text chunk
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

  // --- Jury Testing Grid & Sandbox States ---
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

  const handleRunTestingSuite = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      setIsRunningTests(false);
      setHasRunTestingSuite(true);
    }, 1800);
  };

  // --- Tests States ---
  const [testcases, setTestcases] = useState<Testcase[]>([
    {
      id: "1",
      type: "manual",
      isSample: true,
      inputSize: "53 B",
      inputPreview: "9\n-2 1 -3 4 -1 2 1 -5 4",
      outputPreview: "6",
      status: "valid"
    },
    {
      id: "2",
      type: "manual",
      isSample: true,
      inputSize: "12 B",
      inputPreview: "4\n5 4 -1 78",
      outputPreview: "86",
      status: "valid"
    },
    {
      id: "3",
      type: "generated",
      generatorCall: "gen_random 10 -100 100 42",
      isSample: false,
      inputSize: "45 B",
      inputPreview: "10\n-3 12 56 -98 4 12 -4 89 -10 5",
      outputPreview: "159",
      status: "valid"
    },
    {
      id: "4",
      type: "generated",
      generatorCall: "gen_random 1000 -1000000 1000000 2026",
      isSample: false,
      inputSize: "8.4 KB",
      inputPreview: "1000\n562981 -294821 ...",
      outputPreview: "148902847",
      status: "valid"
    }
  ]);
  const [generatorScript, setGeneratorScript] = useState<string>(
    `# Generator scripts config\ngen_random 10 -100 100 42 > $\ngen_random 1000 -1000000 1000000 2026 > $\ngen_extreme_all_negative 50000 -1000000000 > $\ngen_extreme_all_positive 100000 1000000000 > $`
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Solution States ---
  const [solutions, setSolutions] = useState<SolutionFile[]>([
    {
      id: "s1",
      name: "solution_main.cpp",
      lang: "C++17",
      expectedVerdict: "OK",
      status: "idle"
    },
    {
      id: "s2",
      name: "solution_kadane.py",
      lang: "Python3",
      expectedVerdict: "OK",
      status: "idle"
    },
    {
      id: "s3",
      name: "solution_bruteforce_wa.cpp",
      lang: "C++17",
      expectedVerdict: "WA",
      status: "idle"
    },
    {
      id: "s4",
      name: "solution_slow_tle.java",
      lang: "Java17",
      expectedVerdict: "TLE",
      status: "idle"
    }
  ]);
  const [verifyingAll, setVerifyingAll] = useState(false);

  // --- AWS S3 Setup States ---
  const [s3Bucket, setS3Bucket] = useState("ams-assessment-testlib-assets");
  const [s3Region, setS3Region] = useState("ap-south-1");
  const [s3PathPrefix, setS3PathPrefix] = useState(`contests/${contestId}/problems/${questionId || "new-problem"}`);
  const [s3Status, setS3Status] = useState<"connected" | "disconnected" | "testing">("connected");

  // Compile helper simulation
  const handleCompile = (type: "validator" | "checker") => {
    if (type === "validator") {
      setValidatorStatus("dirty");
      setTimeout(() => setValidatorStatus("compiled"), 600);
    } else {
      setCheckerCompilationStatus("dirty");
      setTimeout(() => setCheckerCompilationStatus("compiled"), 600);
    }
  };

  // Run generator script simulation
  const handleRunGenerator = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      // Mock append a generated test case
      const newId = (testcases.length + 1).toString();
      setTestcases((prev) => [
        ...prev,
        {
          id: newId,
          type: "generated",
          generatorCall: "gen_extreme_all_positive 100000 1000000000",
          isSample: false,
          inputSize: "820 KB",
          inputPreview: "100000\n984123847 84920834 ...",
          outputPreview: "98412384700000",
          status: "valid"
        }
      ]);
    }, 1200);
  };

  // Verify all solutions simulation
  const handleVerifySolutions = () => {
    setVerifyingAll(true);
    // Set all to running
    setSolutions((prev) => prev.map((s) => ({ ...s, status: "running", actualVerdict: "pending" })));

    setTimeout(() => {
      setSolutions((prev) =>
        prev.map((s, idx) => {
          let actual: "OK" | "WA" | "TLE" = "OK";
          if (s.name.includes("wa")) actual = "WA";
          else if (s.name.includes("tle")) actual = "TLE";

          const success = actual === s.expectedVerdict;
          return {
            ...s,
            status: success ? "success" : "failed",
            actualVerdict: actual,
            passedCount: idx === 3 ? 12 : 25, // Slow one TLEs at test 13
            totalCount: 25
          };
        })
      );
      setVerifyingAll(false);
    }, 2000);
  };

  // Save changes simulation
  const handleSavePolygon = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
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
            <span className="text-xs font-semibold tracking-tight">Advanced Testlib Specs</span>
            <span className="rounded bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300 uppercase tracking-wider">
              testlib.h config
            </span>
          </div>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded">
              <Check className="h-3 w-3" />
              Specs updated
            </span>
          )}
        </div>

        {/* WORKSPACE AREA */}
        <div className="flex flex-1 overflow-hidden min-h-[480px]">
          
          {/* SIDEBAR NAVIGATION (POLYGON STEP FLOW) */}
          <div className="w-56 shrink-0 border-r border-white/5 bg-black/20 p-4 flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-2 mb-3">
                Coding Specs
              </p>
              {[
                { id: "statement", label: "Problem Statement", icon: FileText },
                { id: "validator", label: "Input Validator", icon: ShieldAlert },
                { id: "checker", label: "Output Checker", icon: CheckCircle2 },
                { id: "tests", label: "Tests & Generators", icon: Terminal },
                { id: "solutions", label: "Solution Verifier", icon: Activity },
                { id: "testing", label: "Jury Testing Grid", icon: PlaySquare },
                { id: "s3", label: "AWS S3 Assets", icon: Cloud }
              ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as PolygonTab)}
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

            {/* Quick S3 Widget status */}
            <div className="rounded-xl border border-white/5 bg-black/40 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">AWS Storage Status</span>
                <span className="flex h-1.5 w-1.5 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    s3Status === "connected" ? "bg-green-400" : "bg-red-400"
                  }`} />
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    s3Status === "connected" ? "bg-green-500" : "bg-red-500"
                  }`} />
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] font-mono truncate text-zinc-200">{s3Bucket}</span>
              </div>
              <p className="text-[9px] text-zinc-500">
                Validators, custom checkers, testcases and solutions synchronize to S3 automatically.
              </p>
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
                  </div>
 
                  {/* Right: Statement Live Preview */}
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 overflow-y-auto space-y-4 relative">
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 text-[10px] text-purple-400 font-semibold tracking-wide bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded">
                      <Eye className="h-3 w-3" />
                      Live Sandbox Render
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

                      {/* Hardcoded Sample tests grid */}
                      <div>
                        <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[10px]">Sample Tests</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-xl bg-black/50 border border-white/5 p-3.5 font-mono text-zinc-400">
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Standard Input</span>
                            <pre className="text-zinc-200">9{"\n"}-2 1 -3 4 -1 2 1 -5 4</pre>
                          </div>
                          <div className="rounded-xl bg-black/50 border border-white/5 p-3.5 font-mono text-zinc-400">
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Standard Output</span>
                            <pre className="text-zinc-200">6</pre>
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

                    <button
                      onClick={() => handleCompile("validator")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3.5 py-2 text-xs font-semibold text-white border border-white/5 transition"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${validatorStatus === "dirty" ? "animate-spin" : ""}`} />
                      Compile
                    </button>
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
                    Polygon Validator Tips
                  </h4>
                  <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside leading-relaxed">
                    <li>Always invoke <code className="font-mono text-zinc-200">inf.readEof()</code> to block trailing dirty data.</li>
                    <li>Use variables inside <code className="font-mono text-zinc-200">readInt(min, max, "name")</code> so incorrect cases show readable errors on logs.</li>
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
                    Verifies whether the participant's output corresponds to the standard correct model (jury answers).
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
                        Selected Checker Sandbox Details
                      </h4>
                      <div className="rounded-lg bg-black/40 border border-white/5 p-4 font-mono text-[11px] space-y-2">
                        <div>
                          <span className="text-zinc-500">Name:</span> <span className="text-zinc-200">{selectedStandardChecker}.cpp</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Compilation:</span> <span className="text-green-400 font-bold">Default pre-compiled binary available</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Includes:</span> <span className="text-zinc-400">#include "testlib.h"</span>
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

                        <button
                          onClick={() => handleCompile("checker")}
                          className="inline-flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-white border border-white/5 transition"
                        >
                          <RefreshCw className={`h-3 w-3 ${checkerCompilationStatus === "dirty" ? "animate-spin" : ""}`} />
                          Compile
                        </button>
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
                  <h3 className="text-lg font-semibold text-white">Test Cases & Generator Scripts</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Manage inputs manually or write deterministic generator scripts. S3 automatically stores all generated text files.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {/* Left Column: Generator Scripts */}
                  <div className="space-y-4 border-r border-white/5 pr-6">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Generator Commands
                      </label>
                      <button
                        onClick={handleRunGenerator}
                        disabled={isGenerating}
                        className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-bold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-2.5 py-1 rounded"
                      >
                        {isGenerating ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        Run Commands
                      </button>
                    </div>
                    
                    <textarea
                      rows={12}
                      value={generatorScript}
                      onChange={(e) => setGeneratorScript(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 p-3.5 text-xs font-mono text-zinc-300 focus:border-purple-500/50 focus:outline-none leading-relaxed"
                    />
                    <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                      Lines represent console calls to C++ generators compiled on S3. <code className="font-mono text-zinc-300">&gt; $</code> indicates test numbering gets auto-mapped sequentially.
                    </p>
                  </div>

                  {/* Right Column: Tests list */}
                  <div className="col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Active Generated & Manual Tests ({testcases.length})
                      </label>
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-transparent px-3 py-1 text-xs text-zinc-300 transition">
                        <Plus className="h-3.5 w-3.5" />
                        Add Manual Test
                      </button>
                    </div>

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
                                  valid
                                </span>
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
                  </div>
                </div>
              </div>
            )}

            {/* 6. SOLUTIONS TAB */}
            {activeTab === "solutions" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Solution Verifier (Integration Sandbox)</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Runs several solutions with known characteristics on all generated tests to assure correctness of constraints.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleVerifySolutions}
                    disabled={verifyingAll}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${verifyingAll ? "animate-spin" : ""}`} />
                    Verify Solution Matrix
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {/* Solution Matrix Grid */}
                  <div className="col-span-2 space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/25">
                      <table className="w-full text-xs">
                        <thead className="bg-black/40 border-b border-white/5 text-zinc-500">
                          <tr className="text-[10px] uppercase font-semibold text-left">
                            <th className="px-4 py-3">Solution Filename</th>
                            <th className="px-4 py-3">Language</th>
                            <th className="px-4 py-3">Expected Verdict</th>
                            <th className="px-4 py-3">Actual Verdict</th>
                            <th className="px-4 py-3">Tests Passed</th>
                            <th className="px-4 py-3 text-right">Verification Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
                          {solutions.map((s) => (
                            <tr key={s.id} className="hover:bg-white/5 transition">
                              <td className="px-4 py-3 font-semibold text-zinc-100">{s.name}</td>
                              <td className="px-4 py-3 text-zinc-500">{s.lang}</td>
                              <td className="px-4 py-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  s.expectedVerdict === "OK" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                }`}>
                                  {s.expectedVerdict}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {s.actualVerdict ? (
                                  s.actualVerdict === "pending" ? (
                                    <span className="text-zinc-500 animate-pulse">Running...</span>
                                  ) : (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      s.actualVerdict === "OK" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                    }`}>
                                      {s.actualVerdict}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {s.passedCount !== undefined ? (
                                  <span className="font-semibold text-zinc-300">
                                    {s.passedCount}/{s.totalCount}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {s.status === "idle" && (
                                  <span className="text-zinc-500 text-[11px] font-sans">not run yet</span>
                                )}
                                {s.status === "running" && (
                                  <span className="text-purple-400 text-[11px] font-sans flex items-center justify-end gap-1">
                                    <RefreshCw className="h-3 w-3 animate-spin" /> Invocations...
                                  </span>
                                )}
                                {s.status === "success" && (
                                  <span className="text-green-400 text-[11px] font-semibold font-sans flex items-center justify-end gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Verdict OK
                                  </span>
                                )}
                                {s.status === "failed" && (
                                  <span className="text-red-400 text-[11px] font-semibold font-sans flex items-center justify-end gap-1">
                                    <XCircle className="h-3.5 w-3.5" /> Verdict Mismatch
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Verification Tips Column */}
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-5 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Why Solution Verification?
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      A robust competitive programming assessment setup requires validating that:
                    </p>
                    <div className="space-y-3 font-sans text-xs text-zinc-400">
                      <div className="flex gap-2">
                        <Check className="h-4 w-4 text-purple-400 shrink-0" />
                        <span>The main model solution runs cleanly on all generated test bounds.</span>
                      </div>
                      <div className="flex gap-2">
                        <Check className="h-4 w-4 text-purple-400 shrink-0" />
                        <span>Known sub-optimal submissions (e.g. $O(N^2)$ brute forces) hit actual Time Limit Exceeded as defined.</span>
                      </div>
                      <div className="flex gap-2">
                        <Check className="h-4 w-4 text-purple-400 shrink-0" />
                        <span>Wrong approaches fail at least one random/extreme corner case.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. AWS S3 TAB */}
            {activeTab === "s3" && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-lg font-semibold text-white">AWS S3 Cloud Assets Integration</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Store validator compiled outputs, test cases, and statements inside a secure S3 bucket context.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-300">AWS S3 Target Bucket Name</label>
                    <input
                      type="text"
                      value={s3Bucket}
                      onChange={(e) => setS3Bucket(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white focus:border-purple-500/50 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-300">AWS S3 Region</label>
                    <select
                      value={s3Region}
                      onChange={(e) => setS3Region(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#121216] p-3 text-sm text-white focus:border-purple-500/50 focus:outline-none"
                    >
                      <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                      <option value="us-east-1">us-east-1 (N. Virginia)</option>
                      <option value="us-west-2">us-west-2 (Oregon)</option>
                      <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                      <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-300">S3 Store Prefix (Automatic Key Mapping)</label>
                  <input
                    type="text"
                    readOnly
                    value={s3PathPrefix}
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-zinc-500 font-mono focus:outline-none cursor-not-allowed select-all"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1.5">
                    For contest isolation, this relative directory prefix contains subfolders for <code className="font-mono">/tests</code>, <code className="font-mono">/validator</code>, <code className="font-mono">/solutions</code>, and <code className="font-mono">/statement</code>.
                  </p>
                </div>

                <div className="border-t border-white/5 pt-6 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">AWS Cloud Synchronization</h4>
                  <div className="flex gap-4">
                    <div className="flex-1 rounded-xl bg-black/30 border border-white/5 p-4 space-y-2">
                      <span className="text-[10px] uppercase text-zinc-500 font-bold block">Bucket Credentials Scope</span>
                      <p className="text-[11px] text-zinc-400">
                        Supabase handles secure cloud role switching. Under the hood, presigned URLs are securely issued by your NextJS backend handlers using the AWS SDK so credentials never leak to candidate browsers.
                      </p>
                    </div>

                    <div className="flex-1 rounded-xl bg-black/30 border border-white/5 p-4 space-y-3 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">CORS & Access Rules</span>
                        <p className="text-[11px] text-zinc-400">
                          Direct multipart S3 uploads are authorized. Ensure CORS rules permit headers from this domain.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10 px-3 py-2 text-xs text-zinc-200 hover:text-purple-300 transition w-full"
                      >
                        <UploadCloud className="h-3.5 w-3.5 animate-pulse" />
                        Verify AWS Bucket Permissions
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. JURY TESTING GRID & MANUAL RUNNER */}
            {activeTab === "testing" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Jury Testing Grid & Sandbox Runner</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Validate candidate code submissions against the compiled input validator, output checker, and full test suite.
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
                          Running Sandbox Suite...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          Run Testing Suite
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
                        <span className="font-semibold text-purple-300">💡 Manual Sandbox Testing:</span> Paste any candidate code here and trigger the test suite run. It compiles inside the temporary sandbox to check performance, memory footprints, and correctness.
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
                              {validatorStatus === "error" || checkerCompilationStatus === "error" ? (
                                <span className="text-red-400">COMPILATION FAILED</span>
                              ) : (
                                <>
                                  {testcases.length - 1} / {testcases.length} PASSED
                                  <span className="text-xs font-normal text-zinc-400 ml-2">
                                    ({Math.floor(((testcases.length - 1) / testcases.length) * 100)}%)
                                  </span>
                                </>
                              )}
                            </h4>
                          </div>
                          <div className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                            validatorStatus === "error" || checkerCompilationStatus === "error"
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : "bg-green-500/10 border-green-500/20 text-green-400"
                          }`}>
                            {validatorStatus === "error" || checkerCompilationStatus === "error"
                              ? "CRITICAL WARNING"
                              : "TEST SUITE COMPLETED"}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>Test suite run progress</span>
                            <span>
                              {validatorStatus === "error" || checkerCompilationStatus === "error" ? "0%" : `${Math.floor(((testcases.length - 1) / testcases.length) * 100)}%`}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${
                                validatorStatus === "error" || checkerCompilationStatus === "error" ? "bg-red-500 w-0" : "bg-purple-500 w-[93%]"
                              }`}
                              style={{
                                width: validatorStatus === "error" || checkerCompilationStatus === "error" ? "0%" : `${((testcases.length - 1) / testcases.length) * 100}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Script verification tags */}
                        <div className="flex gap-4 pt-1 text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${validatorStatus === "compiled" ? "bg-green-400" : "bg-red-400"}`} />
                            <span className="text-zinc-400">Validator Script:</span>
                            <span className="font-semibold text-zinc-200">
                              {validatorStatus === "compiled" ? "ACTIVE (testlib.h)" : "ERROR / DIRTY"}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${checkerCompilationStatus === "compiled" ? "bg-green-400" : "bg-red-400"}`} />
                            <span className="text-zinc-400">Jury Checker:</span>
                            <span className="font-semibold text-zinc-200">
                              {checkerCompilationStatus === "compiled" ? "ACTIVE (testlib.h)" : "ERROR / DIRTY"}
                            </span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/5 p-12 text-center">
                        <Play className="mx-auto h-8 w-8 text-zinc-600 mb-3 animate-pulse" />
                        <h4 className="text-sm font-semibold text-white">Testing Suite Idle</h4>
                        <p className="mt-1.5 text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                          Click "Run Testing Suite" above to compile your manual solver and execute all test inputs against the C++ validator and checker scripts.
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
                          {testcases.map((tc, index) => {
                            const isFailedCase = index === testcases.length - 1 && index !== 0; // let's mock one WA failure to show off checker diagnostics
                            const isCompFailed = validatorStatus === "error" || checkerCompilationStatus === "error";

                            let verdict = "OK";
                            let verdictColor = "text-green-400";
                            let verdictBg = "bg-green-500/10 border-green-500/20";
                            let timeUsed = `${Math.floor(Math.random() * 30) + 10} ms`;
                            let memoryUsed = `${(Math.random() * 3 + 1.2).toFixed(2)} MB`;

                            if (isCompFailed) {
                              verdict = "FAIL";
                              verdictColor = "text-red-400";
                              verdictBg = "bg-red-500/10 border-red-500/20";
                              timeUsed = "--";
                              memoryUsed = "--";
                            } else if (isFailedCase) {
                              verdict = "WA";
                              verdictColor = "text-red-400";
                              verdictBg = "bg-red-500/10 border-red-500/20";
                              timeUsed = `${Math.floor(Math.random() * 40) + 20} ms`;
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
                                    {tc.isSample && (
                                      <span className="text-[9px] font-medium text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                        Sample
                                      </span>
                                    )}
                                    <span className="text-[11px] text-zinc-400 font-mono hidden md:inline">
                                      Size: {tc.inputSize}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-6 text-[11px]">
                                    <div className="hidden md:flex gap-4 text-zinc-500">
                                      <span>Time: <span className="text-zinc-300 font-medium">{timeUsed}</span></span>
                                      <span>Memory: <span className="text-zinc-300 font-medium">{memoryUsed}</span></span>
                                    </div>
                                    <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                                      {isCompFailed ? (
                                        <span className="text-red-400 font-semibold">✖ Scripts Broken</span>
                                      ) : isFailedCase ? (
                                        <>
                                          <span className="text-green-400">✔ Validated</span>
                                          <span className="text-zinc-600">|</span>
                                          <span className="text-red-400 font-semibold">✖ Wrong Answer</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-green-400">✔ Validated</span>
                                          <span className="text-zinc-600">|</span>
                                          <span className="text-green-400 font-semibold">✔ Match</span>
                                        </>
                                      )}
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
                                          {tc.inputPreview || "9\n-2 1 -3 4 -1 2 1 -5 4"}
                                        </pre>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Expected output (ans)</span>
                                        <pre className="rounded-lg bg-zinc-950/80 border border-white/5 p-2.5 font-mono text-[10px] text-zinc-300 max-h-28 overflow-y-auto">
                                          {tc.outputPreview || "6"}
                                        </pre>
                                      </div>
                                    </div>

                                    {!isCompFailed && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Participant stdout (ouf)</span>
                                          <pre className="rounded-lg bg-zinc-950/80 border border-white/5 p-2.5 font-mono text-[10px] text-zinc-300 max-h-28 overflow-y-auto">
                                            {isFailedCase ? "-1" : tc.outputPreview || "6"}
                                          </pre>
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Jury Checker standard log (xml_verdict)</span>
                                          <div className={`rounded-lg border p-3 font-mono text-[10px] leading-relaxed ${
                                            isFailedCase
                                              ? "bg-red-500/5 border-red-500/10 text-red-300"
                                              : "bg-green-500/5 border-green-500/10 text-green-300"
                                          }`}>
                                            {isFailedCase ? (
                                              <>
                                                <div className="font-bold uppercase tracking-wider text-[9px] text-red-400 mb-1">FAIL: _wa verdict thrown</div>
                                                line 1: expected integer 6, found -1 (mismatch at token index 0)
                                              </>
                                            ) : (
                                              <>
                                                <div className="font-bold uppercase tracking-wider text-[9px] text-green-400 mb-1">OK: correct verdict matches jury</div>
                                                line 1: candidate output matches expected output - exit code 0
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {isCompFailed && (
                                      <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3.5 font-mono text-[10px] text-red-400">
                                        <span className="font-bold uppercase tracking-wider text-[9px] block mb-1">Sandbox Compile Error:</span>
                                        Input Validator / Output Checker is in a 'dirty' or 'error' state. Please recompile the C++ testlib script templates to enable complete automated verification.
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
