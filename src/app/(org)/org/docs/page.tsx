"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, CalendarDays, Plus, LogOut, BookOpen, Terminal, CheckCircle2, ShieldCheck, Copy, Check } from "lucide-react";
import { apiFetch } from "@/lib/client/apiClient";

type Org = { id: string; name: string; slug: string };

export default function ProblemsettingDocsPage() {
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "generators" | "validators" | "scripts">("overview");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ org: Org }>("/api/org/dashboard");
      setOrg(data.org);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message.includes("Organization setup")) {
        router.push("/org/setup");
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function signOut() {
    document.cookie = "ams_session=; Max-Age=0; path=/";
    router.push("/org/login");
  }

  function handleCopy(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
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
    <div className="flex min-h-screen" style={{ background: "#000000", fontFamily: "var(--font-geist), system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside
        className="flex w-56 flex-shrink-0 flex-col"
        style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: "rgba(9,9,11,0.8)" }}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
          >
            <Building2 className="h-4 w-4" style={{ color: "#a855f7" }} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{org?.name ?? "…"}</p>
            <p className="text-xs" style={{ color: "#52525B" }}>Organization</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-widest" style={{ color: "#3F3F46" }}>Menu</p>
          <SideLink href="/org/dashboard" icon={<CalendarDays className="h-4 w-4" />} label="Dashboard" />
          <SideLink href="/org/contests/new" icon={<Plus className="h-4 w-4" />} label="New Contest" />
          <SideLink href="/org/docs" active icon={<BookOpen className="h-4 w-4" />} label="Problemsetting Guide" />
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition"
            style={{ color: "#71717A" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#71717A"; e.currentTarget.style.background = "transparent"; }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Problemsetting Guide</h1>
            <p className="mt-0.5 text-sm" style={{ color: "#64748b" }}>Create robust C++ testcase generators with Codeforces Polygon parity</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Sub Navigation Tabs */}
          <div className="mb-6 flex gap-2 border-b border-white/5 pb-px">
            {[
              { id: "overview", label: "Pipeline Overview" },
              { id: "generators", label: "C++ Generators" },
              { id: "validators", label: "Input Validators" },
              { id: "scripts", label: "Generation Scripts" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className="px-4 py-2.5 text-sm font-medium transition-all relative"
                style={{
                  color: activeTab === t.id ? "#ffffff" : "#71717A",
                }}
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
                <h3 className="flex items-center gap-2 text-lg font-medium text-white">
                  <ShieldCheck className="h-5 w-5 text-purple-400" />
                  Codeforces Polygon-Parity Pipeline
                </h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  The AMS contest engine enables full C++ testing capabilities, matching competitive programming platforms like Polygon. Rather than uploading huge manual text files directly, you write sandboxed **C++ generators** utilizing the standardized <code className="text-purple-300">testlib.h</code> library.
                </p>
                
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-400">
                      <Terminal className="h-4 w-4" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-white">1. Write & Compile</h4>
                    <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                      Upload your C++ source codes. The sandboxed Worker automatically compiles them on-the-fly using <code className="text-zinc-400">g++ -O3 -std=c++20</code>.
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-white">2. Automate & Validate</h4>
                    <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                      Run generation scripts with variable seeds. The generated input runs through your C++ validator to assert absolute syntax and bounds correctness.
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-400">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-white">3. Capture Outputs</h4>
                    <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                      Inputs are automatically piped into your Model Reference solution, generating matching output files securely inside the compute container.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-base font-medium text-white">Security & Execution Limits</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  To prevent CPU locking or directory escapes, all generator and solution executions are wrapped with strict limits inside isolated namespaces:
                </p>
                <ul className="mt-4 space-y-2 text-xs text-zinc-500 list-disc list-inside">
                  <li>**CPU Time Limit**: Up to 3.0 seconds per generated testcase.</li>
                  <li>**Execution Account**: Restricted system accounts (<code className="text-zinc-400">nobody</code> user).</li>
                  <li>**Memory Cap**: Maximum 512 MB sandbox allocation.</li>
                  <li>**Isolated Namespaces**: No network connectivity or container metadata endpoint access allowed.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "generators" && (
            <div className="space-y-6">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-white">Standard C++ testlib Generator</h3>
                  <button
                    onClick={() => handleCopy(generatorCodeSnippet, "gen")}
                    className="flex items-center gap-1.5 rounded bg-white/5 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  >
                    {copiedText === "gen" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    {copiedText === "gen" ? "Copied!" : "Copy code"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  Always use <code className="text-purple-300">rnd.next(...)</code> instead of standard <code className="text-zinc-400">rand()</code> or <code className="text-zinc-400">mt19977</code> to maintain seed determinism across machines.
                </p>
                <pre className="mt-4 overflow-x-auto rounded-lg border border-white/5 bg-zinc-950/60 p-4 text-xs font-mono text-zinc-300">
                  {generatorCodeSnippet}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "validators" && (
            <div className="space-y-6">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-white">Input Validator Snippet</h3>
                  <button
                    onClick={() => handleCopy(validatorCodeSnippet, "val")}
                    className="flex items-center gap-1.5 rounded bg-white/5 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  >
                    {copiedText === "val" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    {copiedText === "val" ? "Copied!" : "Copy code"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  Validators check if the generated input file matches the format strictly. They are essential to guard against invalid bounds or formatting issues.
                </p>
                <pre className="mt-4 overflow-x-auto rounded-lg border border-white/5 bg-zinc-950/60 p-4 text-xs font-mono text-zinc-300">
                  {validatorCodeSnippet}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "scripts" && (
            <div className="space-y-6">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-white">Script DSL Syntax</h3>
                  <button
                    onClick={() => handleCopy(scriptSnippet, "script")}
                    className="flex items-center gap-1.5 rounded bg-white/5 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  >
                    {copiedText === "script" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    {copiedText === "script" ? "Copied!" : "Copy code"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-400 font-medium">
                  Use the wildcard <code className="text-purple-300">&gt; $</code> to instruct the system to automatically assign consecutive testcase numbers.
                </p>
                <pre className="mt-4 overflow-x-auto rounded-lg border border-white/5 bg-zinc-950/60 p-4 text-xs font-mono text-purple-300">
                  {scriptSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SideLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition"
      style={{
        color: active ? "#ffffff" : "#71717A",
        background: active ? "rgba(139,92,246,0.12)" : "transparent",
        border: active ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
      }}
    >
      <span style={{ color: active ? "#a855f7" : "#52525B" }}>{icon}</span>
      {label}
    </Link>
  );
}
