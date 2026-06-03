"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Terminal, CheckCircle2, ShieldCheck, Copy, Check } from "lucide-react";
import { OrgPortalShell } from "@/components/OrgPortalShell";

export default function ProblemsettingDocsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "generators" | "validators" | "scripts">("overview");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  function handleCopy(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    setCopiedText(label);
    copyTimer.current = setTimeout(() => setCopiedText(null), 2000);
  }

  const generatorCodeSnippet = `#include "testlib.h"
#include <iostream>

using namespace std;

int main(int argc, char* argv[]) {
    // 1. Initialize generator with testlib
    registerGen(argc, argv, 1);

    // 2. Read parameters safely via opt helper
    int n = opt<int>("n");
    int max_val = opt<int>("max_val");

    // 3. Print testcase size
    println(n);

    // 4. Generate random values using rnd engine
    for (int i = 0; i < n; ++i) {
        if (i > 0) print(" ");
        print(rnd.next(1, max_val));
    }
    println();

    return 0;
}`;

  const validatorCodeSnippet = `#include "testlib.h"

using namespace std;

int main(int argc, char* argv[]) {
    // 1. Initialize validation suite
    registerValidation(argc, argv);

    // 2. Read and enforce integer boundaries: size N in [2, 100000]
    int n = inf.readInt(2, 100000, "n");
    inf.readEoln();

    // 3. Read and validate array elements
    inf.readInts(n, 1, 1000000000, "a");
    inf.readEoln();

    // 4. Verify no extra spaces or inputs remain
    inf.readEof();

    return 0;
}`;

  const scriptSnippet = `# Small testcases
gen_array -n 10 -max_val 100 > $
gen_array -n 50 -max_val 500 > $

# Medium testcases
gen_array -n 1000 -max_val 100000 > $

# Extreme & Large Bounds (Max limits)
gen_array -n 100000 -max_val 1000000000 > $
gen_array -n 100000 -max_val 1000000000 > $`;

  return (
    <OrgPortalShell active="docs">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-8 py-6 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Problemsetting Guide</h1>
          <p className="mt-1 text-sm text-slate-500">Create robust C++ testcase generators with Codeforces Polygon parity</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Sub Navigation Tabs */}
        <div className="mb-6 flex gap-1 border-b border-slate-200 pb-px">
          {[
            { id: "overview", label: "Pipeline Overview" },
            { id: "generators", label: "C++ Generators" },
            { id: "validators", label: "Input Validators" },
            { id: "scripts", label: "Generation Scripts" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as "overview" | "generators" | "validators" | "scripts")}
              className={`relative px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === t.id ? "text-slate-950" : "text-slate-500 hover:text-slate-950"
              }`}
            >
              {t.label}
              {activeTab === t.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
              )}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="flex items-center gap-2 text-lg font-medium text-slate-950">
                <ShieldCheck className="h-5 w-5 text-purple-500" />
                Codeforces Polygon-Parity Pipeline
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                The AMS contest engine enables full C++ testing capabilities, matching competitive programming platforms like Polygon. Rather than uploading huge manual text files directly, you write sandboxed <strong>C++ generators</strong> utilizing the standardized <code className="text-violet-600">testlib.h</code> library.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-950">1. Write & Compile</h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Upload your C++ source codes. The sandboxed Worker automatically compiles them on-the-fly using <code className="text-slate-500">g++ -O3 -std=c++20</code>.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-950">2. Automate & Validate</h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Run generation scripts with variable seeds. The generated input runs through your C++ validator to assert absolute syntax and bounds correctness.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-950">3. Capture Outputs</h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Inputs are automatically piped into your Model Reference solution, generating matching output files securely inside the compute container.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-base font-medium text-slate-950">Security & Execution Limits</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                To prevent CPU locking or directory escapes, all generator and solution executions are wrapped with strict limits inside isolated namespaces:
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-500 list-disc list-inside">
                <li><strong>CPU Time Limit:</strong> Up to 3.0 seconds per generated testcase.</li>
                <li><strong>Execution Account:</strong> Restricted system accounts (<code className="text-slate-500">nobody</code> user).</li>
                <li><strong>Memory Cap:</strong> Maximum 512 MB sandbox allocation.</li>
                <li><strong>Isolated Namespaces:</strong> No network connectivity or container metadata endpoint access allowed.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "generators" && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-slate-950">Standard C++ testlib Generator</h3>
                <button
                  onClick={() => handleCopy(generatorCodeSnippet, "gen")}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
                >
                  {copiedText === "gen" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  {copiedText === "gen" ? "Copied!" : "Copy code"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Always use <code className="text-violet-600">rnd.next(...)</code> instead of standard <code className="text-slate-500">rand()</code> or <code className="text-slate-500">mt19977</code> to maintain seed determinism across machines.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-xs font-mono text-slate-200">
                {generatorCodeSnippet}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "validators" && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-slate-950">Input Validator Snippet</h3>
                <button
                  onClick={() => handleCopy(validatorCodeSnippet, "val")}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
                >
                  {copiedText === "val" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  {copiedText === "val" ? "Copied!" : "Copy code"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Validators check if the generated input file matches the format strictly. They are essential to guard against invalid bounds or formatting issues.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-xs font-mono text-slate-200">
                {validatorCodeSnippet}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "scripts" && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-slate-950">Script DSL Syntax</h3>
                <button
                  onClick={() => handleCopy(scriptSnippet, "script")}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
                >
                  {copiedText === "script" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  {copiedText === "script" ? "Copied!" : "Copy code"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 font-medium">
                Use the wildcard <code className="text-violet-600">&gt; $</code> to instruct the system to automatically assign consecutive testcase numbers.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-xs font-mono text-violet-300">
                {scriptSnippet}
              </pre>
            </div>
          </div>
        )}
      </div>
    </OrgPortalShell>
  );
}
