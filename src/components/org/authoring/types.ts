/**
 * The draft as the editor holds it.
 *
 * Mirrors the cxxprobe package rather than inventing a parallel vocabulary:
 * a setter who later opens the published directory should recognise every
 * field. `services/authoring.py` on the API side turns this into the real
 * layout, and is the only thing that knows the directory names.
 *
 * Every optional part is enabled by having content. There is no "use a
 * checker" switch, because writing a checker is the switch, and a flag
 * would be a second source of truth that could disagree with the text.
 */

export type DraftStatus = "draft" | "verifying" | "verified" | "failed" | "published";

export type TestCase = {
  label: string;
  input: string;
  /** Absent means run it but judge nothing, which is a legitimate smoke test. */
  answer: string;
};

export type AltSolution = {
  filename: string;
  source: string;
  /** What this wrong solution should earn. A mismatch means weak tests. */
  expected_verdict: string;
};

export type SymbolicRule = {
  pattern: string;
  regex?: boolean;
  message?: string;
};

export type GeneratorPlanEntry = {
  args?: string[];
  label?: string;
};

export type Generator = {
  filename: string;
  source: string;
  plan: GeneratorPlanEntry[];
};

export type Package = {
  name: string;
  statement_md: string;
  solution_cpp: string;
  tests: TestCase[];
  additional_solutions: AltSolution[];
  validator_cpp: string;
  checker_cpp: string;
  behavior_gtest_cpp: string;
  symbolic: { must_include: string[]; must_not_include: SymbolicRule[] };
  generators: Generator[];
  limits: { memory_mb: number; cpu_ms: number; wall_ms: number };
  tags: string[];
};

export type DraftSummary = {
  uid: string;
  title: string;
  slug: string;
  status: DraftStatus;
  updated_at: string;
  last_verified_at: string | null;
  published_version: number | null;
};

export type DraftDetail = DraftSummary & {
  package: Partial<Package>;
  last_report: CxxprobeReport | null;
  last_error: string;
};

/** cxxprobe's own report, passed through rather than summarised. */
export type CheckSection = {
  status?: string;
  passed?: number;
  total?: number;
  cases?: {
    label?: string;
    verdict?: string;
    cpu_time_ms?: number;
    wall_time_ms?: number;
    peak_memory_bytes?: number;
    checker_diagnostics?: string;
  }[];
  checks?: { rule?: string; satisfied?: boolean; message?: string }[];
};

export type CxxprobeReport = {
  problem_name?: string;
  slug?: string;
  overall?: string;
  tests?: { manual?: CheckSection; symbolic?: CheckSection; behavior?: CheckSection };
  compile?: Record<string, { ok?: boolean; exit_code?: number; diagnostics?: string }>;
  additional_solutions?: {
    file?: string;
    expected_verdict?: string;
    actual_verdict?: string;
    matched?: boolean;
    diagnostics?: string;
  }[];
};

/** Fills the gaps so the editor never reads undefined off a partial draft. */
export function withDefaults(partial: Partial<Package>): Package {
  return {
    name: partial.name ?? "",
    statement_md: partial.statement_md ?? "",
    solution_cpp: partial.solution_cpp ?? "",
    tests: partial.tests ?? [],
    additional_solutions: partial.additional_solutions ?? [],
    validator_cpp: partial.validator_cpp ?? "",
    checker_cpp: partial.checker_cpp ?? "",
    behavior_gtest_cpp: partial.behavior_gtest_cpp ?? "",
    symbolic: {
      must_include: partial.symbolic?.must_include ?? [],
      must_not_include: partial.symbolic?.must_not_include ?? [],
    },
    generators: partial.generators ?? [],
    limits: {
      memory_mb: partial.limits?.memory_mb ?? 256,
      cpu_ms: partial.limits?.cpu_ms ?? 5000,
      wall_ms: partial.limits?.wall_ms ?? 10000,
    },
    tags: partial.tags ?? [],
  };
}

/** Kebab-case, because a slug is a directory name. Matches the API's rule. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}
