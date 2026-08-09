"use client";

/**
 * How to write a problem for this platform.
 *
 * The previous version documented Codeforces Polygon: testlib.h generators,
 * input validators, generation scripts. None of that is how cxxprobe works,
 * so a setter following it would produce a package the judge cannot run.
 *
 * Everything here is checked against the real thing — the `ams-ascent`
 * problems and `cxxprobe --help` — rather than written from memory, and the
 * places where the platform does *not* do something are stated rather than
 * quietly omitted.
 */

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Copy,
  FileCode2,
  FlaskConical,
  Info,
  Package,
  ScanSearch,
  Upload,
} from "lucide-react";
import { OrgShell } from "@/components/org/OrgShell";
import { JudgingPipeline } from "./JudgingPipeline";
import {
  BEHAVIOUR,
  GTEST,
  LAYOUT,
  PROBLEM_YAML,
  STATEMENT,
  SYMBOLIC,
  WORKFLOW,
} from "./snippets";

type TabId = "start" | "statement" | "tests" | "rules" | "ship";

const TABS: { id: TabId; label: string }[] = [
  { id: "start", label: "How judging works" },
  { id: "statement", label: "Statement" },
  { id: "tests", label: "Tests" },
  { id: "rules", label: "Limits & rules" },
  { id: "ship", label: "Pack & upload" },
];

export default function ProblemsettingDocsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("start");
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function handleCopy(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    if (timer.current) clearTimeout(timer.current);
    setCopied(label);
    timer.current = setTimeout(() => setCopied(null), 2000);
  }

  function Code({ text, label }: { text: string; label: string }) {
    return (
      <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
        <button
          onClick={() => handleCopy(text, label)}
          className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md bg-slate-800/80 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700"
        >
          {copied === label ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied === label ? "Copied" : "Copy"}
        </button>
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-slate-300">
          <code>{text}</code>
        </pre>
      </div>
    );
  }

  return (
    <OrgShell>
      <header className="border-b border-slate-200 bg-white/80 px-8 py-6 backdrop-blur-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Problemsetting Guide
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Writing, packing and uploading a problem for the cxxprobe judge
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200 pb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
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

        {/* ── How judging works ─────────────────────────────────────────── */}
        {activeTab === "start" && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="flex items-center gap-2 text-lg font-medium text-slate-950">
                <FlaskConical className="h-5 w-5 text-purple-500" />
                Three independent checks
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                cxxprobe judges a submission three ways. A problem can use any combination —
                most use one or two. Understanding which you are writing is the whole job.
              </p>
              <div className="mt-6">
                <JudgingPipeline />
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="flex items-center gap-2 text-lg font-medium text-slate-950">
                <FileCode2 className="h-5 w-5 text-purple-500" />
                What a problem looks like
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                One directory per problem. Its name is the slug candidates never see but you
                will type constantly.
              </p>
              <Code text={LAYOUT} label="layout" />
              <p className="mt-4 text-sm text-slate-600">
                Optional sections switch on by their entry file existing — there is no
                &ldquo;enabled: true&rdquo; anywhere. Delete <code className="rounded bg-slate-100 px-1 text-violet-600">checker/</code>{" "}
                and the problem simply has no behaviour tests.
              </p>
              <Code text={PROBLEM_YAML} label="problem.yaml" />
            </div>
          </div>
        )}

        {/* ── Statement ─────────────────────────────────────────────────── */}
        {activeTab === "statement" && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="flex items-center gap-2 text-lg font-medium text-slate-950">
                <BookOpen className="h-5 w-5 text-purple-500" />
                statement/problem.md
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                Plain markdown, rendered in the contest room. Headings, lists, inline code and
                fenced code blocks all work; fenced blocks get a copy button automatically.
              </p>
              <Code text={STATEMENT} label="statement" />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                Images do not reach candidates yet
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
                You can put an image in <code className="rounded bg-amber-100 px-1">statement/</code>{" "}
                and <code className="rounded bg-amber-100 px-1">pack</code> will include it, but
                the contest room does not serve statement assets — an{" "}
                <code className="rounded bg-amber-100 px-1">![](diagram.png)</code> renders as a
                broken image to the candidate. Until that ships, express diagrams as a fenced
                code block of ASCII art, which renders fine and copies cleanly.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Info className="h-4 w-4 text-slate-400" />
                Write the constraints out
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Limits are enforced by the sandbox but are <em>not</em> injected into your
                statement. If a solution has to be O(n log n), the statement is the only place a
                candidate can learn it.
              </p>
            </div>
          </div>
        )}

        {/* ── Tests ─────────────────────────────────────────────────────── */}
        {activeTab === "tests" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-rose-900">
                <AlertTriangle className="h-4 w-4" />
                Every test in tests/ is public
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-rose-900/90">
                There is no public/hidden split in the pack format. The first{" "}
                <strong>five</strong> cases in <code className="rounded bg-rose-100 px-1">tests/</code>{" "}
                are shown to candidates as worked examples, and all of them are judged. If you put
                your tricky edge case in as <code className="rounded bg-rose-100 px-1">3.in</code>,
                a candidate reads it in the statement.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-rose-900/90">
                So: put your two or three <em>illustrative</em> cases first, and rely on{" "}
                <strong>behaviour tests</strong> for anything you need kept back — those are
                compiled in and never shown.
              </p>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-medium text-slate-950">I/O tests</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Pairs of files in <code className="rounded bg-slate-100 px-1 text-violet-600">tests/</code>{" "}
                matched by name: <code className="rounded bg-slate-100 px-1 text-violet-600">1.in</code>{" "}
                with <code className="rounded bg-slate-100 px-1 text-violet-600">1.ans</code>. Output
                is compared literally after trimming trailing whitespace. An{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">.in</code> with no{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">.ans</code> is skipped —{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">package validate</code>{" "}
                warns about it, which is worth reading, because the package otherwise looks fine
                while testing less than you think.
              </p>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-medium text-slate-950">Behaviour tests</h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                A GoogleTest file compiled <em>together with</em> the submission, so it calls the
                candidate&rsquo;s own types. This is how you set problems about a data structure
                or a class rather than about stdin and stdout — and it is the only way to keep a
                test case out of the candidate&rsquo;s view.
              </p>
              <Code text={BEHAVIOUR} label="behaviour-yaml" />
              <Code text={GTEST} label="gtest" />
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                A problem may have behaviour tests and no I/O tests at all — an empty{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">tests/</code> is
                legitimate and <code className="rounded bg-slate-100 px-1 text-violet-600">validate</code>{" "}
                will not complain when a behaviour checker is present. If the candidate&rsquo;s
                code crashes the test binary, that surfaces as <strong>RE</strong>, not a broken
                judge.
              </p>
            </div>
          </div>
        )}

        {/* ── Limits & rules ────────────────────────────────────────────── */}
        {activeTab === "rules" && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-medium text-slate-950">Limits</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Leave them <code className="rounded bg-slate-100 px-1 text-violet-600">null</code>{" "}
                for the platform defaults — 256 MB, 5 s CPU, 10 s wall. Set them only when the
                problem genuinely needs it. A contest can also tighten a limit for its own round,
                and the candidate is shown whichever actually applies.
              </p>
            </div>

            <div className="glass-card p-6">
              <h3 className="flex items-center gap-2 text-lg font-medium text-slate-950">
                <ScanSearch className="h-5 w-5 text-purple-500" />
                Symbolic rules
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                Patterns the source must or must not contain. This is how you set{" "}
                &ldquo;implement it yourself&rdquo; problems: forbid{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">std::vector</code> and
                a candidate cannot wrap the standard library and call it done.
              </p>
              <Code text={SYMBOLIC} label="symbolic" />
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-5">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-rose-900">
                  <AlertTriangle className="h-4 w-4" />
                  A rule is all-or-nothing
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-rose-900/90">
                  Symbolic checks score nothing themselves, and breaking one scores{" "}
                  <strong>zero for the whole problem</strong> — every passing I/O and behaviour
                  case is discarded. Use them for genuine prohibitions, not for style.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-rose-900/90">
                  Your <code className="rounded bg-rose-100 px-1">message</code> is shown to the
                  candidate in the statement, before they write anything, and again on the verdict
                  if they break it. Write it as an instruction —{" "}
                  &ldquo;Implement your own buffer management&rdquo; — not as a rule id.
                </p>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                <code className="rounded bg-slate-100 px-1 text-violet-600">regex: false</code> is a
                plain substring match and is what you want most of the time. With{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">regex: true</code>,
                anchor on a word boundary (<code className="rounded bg-slate-100 px-1 text-violet-600">\bmemcpy\s*\(</code>)
                so you match the call and not the word inside a comment.
              </p>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-medium text-slate-950">Reference solution</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Put a correct solution in{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">solutions/main.cpp</code>.{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">cxxprobe test problem</code>{" "}
                runs it against everything you wrote, which is the only way to find out that your{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">.ans</code> files have a
                trailing-newline disagreement before ten thousand candidates do. It must satisfy
                your own symbolic rules too — a reference solution that trips its own gate is the
                fastest way to discover a pattern that is too broad.
              </p>
            </div>
          </div>
        )}

        {/* ── Pack & upload ─────────────────────────────────────────────── */}
        {activeTab === "ship" && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="flex items-center gap-2 text-lg font-medium text-slate-950">
                <Package className="h-5 w-5 text-purple-500" />
                The whole workflow
              </h3>
              <Code text={WORKFLOW} label="workflow" />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                One problem per pack
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
                <code className="rounded bg-amber-100 px-1">pack</code> will happily bundle a whole
                contest, but the upload form binds one package to one problem version, so a
                multi-problem pack is rejected. Always pass{" "}
                <code className="rounded bg-amber-100 px-1">--problems &lt;slug&gt;</code>.
              </p>
            </div>

            <div className="glass-card p-6">
              <h3 className="flex items-center gap-2 text-lg font-medium text-slate-950">
                <Upload className="h-5 w-5 text-purple-500" />
                Uploading
              </h3>
              <ol className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                <li>
                  <strong className="text-slate-900">1.</strong> Go to{" "}
                  <strong className="text-slate-900">Problems</strong> → create the problem, or
                  open an existing one.
                </li>
                <li>
                  <strong className="text-slate-900">2.</strong> Upload the{" "}
                  <code className="rounded bg-slate-100 px-1 text-violet-600">.cxxpkg</code>. Each
                  upload creates a new <em>version</em>; versions are immutable, so a contest that
                  already ran cannot change under you.
                </li>
                <li>
                  <strong className="text-slate-900">3.</strong> Read the inspection summary. It
                  shows the statement, the samples, the case counts and the number of symbolic
                  rules — if a count is zero and you expected otherwise, the package is wrong and
                  this is the last cheap moment to find out.
                </li>
                <li>
                  <strong className="text-slate-900">4.</strong> Add the version to a contest under{" "}
                  <strong className="text-slate-900">Contests</strong>, giving it a label and a
                  score.
                </li>
                <li>
                  <strong className="text-slate-900">5.</strong> Run it yourself in a practice
                  contest before the real one. Uploading is not testing.
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Info className="h-4 w-4 text-slate-400" />
                &ldquo;create cgroup root … Permission denied&rdquo;
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                <code className="rounded bg-slate-100 px-1 text-violet-600">cxxprobe test problem</code>{" "}
                runs the solution in a real sandbox, which needs cgroup v2 delegation. Inside a
                container without it you get this and{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">Overall: ERROR</code> —
                it is your environment, not your package. Everything else
                (<code className="rounded bg-slate-100 px-1 text-violet-600">validate</code>,{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">inspect</code>,{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">pack</code>, and the
                symbolic checks) works anywhere. Set problems on a normal Linux desktop, or upload
                and test in a practice contest.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Info className="h-4 w-4 text-slate-400" />
                A bare problem folder is not a pack
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Zipping <code className="rounded bg-slate-100 px-1 text-violet-600">a-beet-cast/</code>{" "}
                by hand produces an archive with no{" "}
                <code className="rounded bg-slate-100 px-1 text-violet-600">manifest.json</code>. The
                upload will reject it — and it is worth knowing that it rejects it{" "}
                <em>because</em> the judge could not have run it, not as a formality.
              </p>
            </div>
          </div>
        )}
      </div>
    </OrgShell>
  );
}
