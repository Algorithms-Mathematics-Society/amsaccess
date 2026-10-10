"use client";

import { Plus, Trash2 } from "lucide-react";
import { CodeBox, Field, PlainBox, inputClass } from "./CodeBox";
import type { Package, SymbolicRule } from "./types";
import { slugify } from "./types";

type Patch = (next: Partial<Package>) => void;

/**
 * The pages of the editor.
 *
 * Split into steps rather than one long form because a problem has eight
 * parts and six of them are optional. A single page would show a setter
 * everything cxxprobe can do at the moment they are trying to do the one
 * simple thing, and the optional parts would read as required.
 *
 * Every step stands alone: you can verify after step three and come back.
 * Nothing here blocks on anything later, which is what makes leaving a
 * problem half written and returning to it survivable.
 */

export function OverviewStep({
  pkg,
  patch,
  slug,
  onSlug,
}: {
  pkg: Package;
  patch: Patch;
  slug: string;
  onSlug: (next: string) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Name" hint="What contestants see. Conventionally prefixed with the label, like “A: Sum Two Numbers”.">
        <input
          className={inputClass}
          value={pkg.name}
          onChange={(e) => {
            patch({ name: e.target.value });
            // Only while the slug is still following the name. Once it has
            // been edited by hand, retyping the title must not silently
            // move the directory a setter may already have referenced.
            if (!slug || slug === slugify(pkg.name)) onSlug(slugify(e.target.value));
          }}
          placeholder="A: Sum Two Numbers"
        />
      </Field>

      <Field label="Slug" hint="The directory name inside the package. Lowercase, hyphenated.">
        <input className={inputClass} value={slug} onChange={(e) => onSlug(e.target.value)} />
      </Field>

      <Field label="Tags" hint="Comma separated. Used by search and by the talent filters.">
        <input
          className={inputClass}
          value={pkg.tags.join(", ")}
          onChange={(e) =>
            patch({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
          }
          placeholder="graphs, dijkstra"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Memory (MB)">
          <input
            type="number"
            className={inputClass}
            value={pkg.limits.memory_mb}
            onChange={(e) =>
              patch({ limits: { ...pkg.limits, memory_mb: Number(e.target.value) || 256 } })
            }
          />
        </Field>
        <Field label="CPU (ms)">
          <input
            type="number"
            className={inputClass}
            value={pkg.limits.cpu_ms}
            onChange={(e) =>
              patch({ limits: { ...pkg.limits, cpu_ms: Number(e.target.value) || 5000 } })
            }
          />
        </Field>
        <Field label="Wall (ms)" hint="Should exceed CPU: it also covers startup and I/O.">
          <input
            type="number"
            className={inputClass}
            value={pkg.limits.wall_ms}
            onChange={(e) =>
              patch({ limits: { ...pkg.limits, wall_ms: Number(e.target.value) || 10000 } })
            }
          />
        </Field>
      </div>
    </div>
  );
}

export function StatementStep({ pkg, patch }: { pkg: Package; patch: Patch }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Markdown. State the constraints here that the tests actually contain, because a
        statement promising 10<sup>5</sup> against tests that stop at 10 proves nothing.
      </p>
      <CodeBox
        value={pkg.statement_md}
        onChange={(statement_md) => patch({ statement_md })}
        language="markdown"
        minHeight={420}
      />
    </div>
  );
}

export function SolutionStep({ pkg, patch }: { pkg: Package; patch: Patch }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        The reference solution. Required, and the one every test is judged against.
      </p>
      <CodeBox
        value={pkg.solution_cpp}
        onChange={(solution_cpp) => patch({ solution_cpp })}
        minHeight={420}
      />
    </div>
  );
}

export function TestsStep({ pkg, patch }: { pkg: Package; patch: Patch }) {
  const set = (index: number, next: Partial<Package["tests"][number]>) =>
    patch({ tests: pkg.tests.map((t, i) => (i === index ? { ...t, ...next } : t)) });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-slate-500">
          Exact token comparison by default. Include the minimum, the maximum, and whatever is
          degenerate for this problem. Leave the expected output blank to run a case without
          judging it.
        </p>
        <button
          type="button"
          onClick={() =>
            patch({
              tests: [...pkg.tests, { label: String(pkg.tests.length + 1), input: "", answer: "" }],
            })
          }
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" /> Add case
        </button>
      </div>

      {pkg.tests.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          No test cases. A problem with none compiles and proves nothing.
        </p>
      )}

      <div className="space-y-4">
        {pkg.tests.map((test, index) => (
          <div key={index} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <input
                value={test.label}
                onChange={(e) => set(index, { label: e.target.value })}
                className="w-32 rounded-lg border border-slate-200 px-2 py-1 font-mono text-sm"
                aria-label={`Label for case ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => patch({ tests: pkg.tests.filter((_, i) => i !== index) })}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove case ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Input">
                <PlainBox value={test.input} onChange={(input) => set(index, { input })} />
              </Field>
              <Field label="Expected output" hint="Blank runs the case without judging it.">
                <PlainBox value={test.answer} onChange={(answer) => set(index, { answer })} />
              </Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChecksStep({ pkg, patch }: { pkg: Package; patch: Patch }) {
  const rules: SymbolicRule[] = pkg.symbolic.must_not_include;

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">Validator</h3>
        <p className="text-sm text-slate-500">
          Judges the <em>input</em>. Without one, a malformed test silently punishes contestants
          for a setter&rsquo;s mistake. Leave empty to skip. testlib conventions work unmodified.
        </p>
        <CodeBox
          value={pkg.validator_cpp}
          onChange={(validator_cpp) => patch({ validator_cpp })}
          minHeight={160}
          placeholder="// validator/validator.cpp"
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">Output checker</h3>
        <p className="text-sm text-slate-500">
          Judges the <em>output</em>. Needed for floating point, several valid answers, or
          &ldquo;print any&rdquo;. Leave empty for exact token comparison.
        </p>
        <CodeBox
          value={pkg.checker_cpp}
          onChange={(checker_cpp) => patch({ checker_cpp })}
          minHeight={160}
          placeholder="// checker/checker.cpp"
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">Behaviour checks</h3>
        <p className="text-sm text-slate-500">
          GTest compiled together with the submission, so you can assert on its internal API:
          RAII, move semantics, types. Include with <code>CXXPROBE_SOLUTION_FILE</code>, never a
          hardcoded path, and <code>#define main solution_main</code> around it.
        </p>
        <CodeBox
          value={pkg.behavior_gtest_cpp}
          onChange={(behavior_gtest_cpp) => patch({ behavior_gtest_cpp })}
          minHeight={160}
          placeholder="// checker/behavior_gtest.cpp"
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Symbolic rules</h3>
        <p className="text-sm text-slate-500">
          For problems where <em>how</em> matters. The scan strips comments and string literals
          first, so merely mentioning a banned call does not trip it.
        </p>

        <Field label="Must include" hint="One per line. Literal substrings.">
          <PlainBox
            rows={3}
            value={pkg.symbolic.must_include.join("\n")}
            onChange={(text) =>
              patch({
                symbolic: {
                  ...pkg.symbolic,
                  must_include: text.split("\n").map((s) => s.trim()).filter(Boolean),
                },
              })
            }
            placeholder="std::bit_cast"
          />
        </Field>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">Must not include</span>
            <button
              type="button"
              onClick={() =>
                patch({
                  symbolic: {
                    ...pkg.symbolic,
                    must_not_include: [...rules, { pattern: "", regex: false, message: "" }],
                  },
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add rule
            </button>
          </div>
          {rules.map((rule, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]">
              <input
                className={inputClass}
                value={rule.pattern}
                onChange={(e) =>
                  patch({
                    symbolic: {
                      ...pkg.symbolic,
                      must_not_include: rules.map((r, i) =>
                        i === index ? { ...r, pattern: e.target.value } : r,
                      ),
                    },
                  })
                }
                placeholder="\\bmemcpy\\s*\\("
              />
              <input
                className={inputClass}
                value={rule.message ?? ""}
                onChange={(e) =>
                  patch({
                    symbolic: {
                      ...pkg.symbolic,
                      must_not_include: rules.map((r, i) =>
                        i === index ? { ...r, message: e.target.value } : r,
                      ),
                    },
                  })
                }
                placeholder="Message shown when it trips"
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={Boolean(rule.regex)}
                    onChange={(e) =>
                      patch({
                        symbolic: {
                          ...pkg.symbolic,
                          must_not_include: rules.map((r, i) =>
                            i === index ? { ...r, regex: e.target.checked } : r,
                          ),
                        },
                      })
                    }
                  />
                  regex
                </label>
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      symbolic: {
                        ...pkg.symbolic,
                        must_not_include: rules.filter((_, i) => i !== index),
                      },
                    })
                  }
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove rule ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const VERDICTS = ["WA", "TLE", "MLE", "RE", "CE", "OLE"];

export function StrengthStep({ pkg, patch }: { pkg: Package; patch: Patch }) {
  const alts = pkg.additional_solutions;
  const set = (index: number, next: Partial<Package["additional_solutions"][number]>) =>
    patch({ additional_solutions: alts.map((a, i) => (i === index ? { ...a, ...next } : a)) });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-slate-500">
          Solutions you expect to <em>fail</em>, and the verdict each should earn. This is how you
          find out the tests are too weak: a quadratic solution that was supposed to time out and
          did not means the data is too small to separate it from an efficient one. A mismatch
          does not fail the problem, it tells you something.
        </p>
        <button
          type="button"
          onClick={() =>
            patch({
              additional_solutions: [
                ...alts,
                { filename: `wrong_${alts.length + 1}.cpp`, source: "", expected_verdict: "WA" },
              ],
            })
          }
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" /> Add solution
        </button>
      </div>

      {alts.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          None yet. Optional, and the single most useful thing you can add once the problem
          passes.
        </p>
      )}

      {alts.map((alt, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={alt.filename}
              onChange={(e) => set(index, { filename: e.target.value })}
              className="w-56 rounded-lg border border-slate-200 px-2 py-1 font-mono text-sm"
              aria-label={`Filename for solution ${index + 1}`}
            />
            <select
              value={alt.expected_verdict}
              onChange={(e) => set(index, { expected_verdict: e.target.value })}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              aria-label={`Expected verdict for solution ${index + 1}`}
            >
              {VERDICTS.map((v) => (
                <option key={v} value={v}>
                  expect {v}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                patch({ additional_solutions: alts.filter((_, i) => i !== index) })
              }
              className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Remove solution ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <CodeBox
            value={alt.source}
            onChange={(source) => set(index, { source })}
            minHeight={160}
          />
        </div>
      ))}
    </div>
  );
}
