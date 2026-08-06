/** Shapes returned by ams-api. Kept in one place so the UI and the route
 *  handlers cannot drift from each other. */

export type ContestProblem = {
  uid: string;
  label: string;
  position: number;
  score: number;
  title: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  statement_md: string;
  samples: { label?: string; input: string; output: string }[];
};

export type Contest = {
  uid: string;
  title: string;
  slug: string;
  description: string;
  visibility: string;
  status: "draft" | "scheduled" | "running" | "ended" | "archived";
  starts_at: string;
  ends_at: string;
  is_practice: boolean;
  invite_code: string | null;
  problems: ContestProblem[];
  joined: boolean;
  frozen: boolean;
};

/** Which of cxxprobe's three checks a row came from. */
export type TestKind = "io" | "behavior" | "symbolic";

export const TEST_KIND_LABELS: Record<string, string> = {
  io: "Input / output",
  behavior: "Behaviour (GTest)",
  symbolic: "Source rules",
};

/** What each family actually verifies — a setter reading a failure needs to
 * know whether the output was wrong or the code broke a rule. */
export const TEST_KIND_HINTS: Record<string, string> = {
  io: "The program was run and its output compared.",
  behavior: "Compiled against the submission's own API and asserted on.",
  symbolic: "The source was checked for required or forbidden constructs.",
};

export type Testcase = {
  kind: TestKind;
  testcase_no: number;
  label: string;
  verdict: string;
  runtime_ms: number;
  memory_kb: number;
  checker_message: string;
};

export type Submission = {
  uid: string;
  problem_label: string;
  language: string;
  status: "pending" | "queued" | "running" | "completed" | "failed";
  created_at: string;
  verdict: string | null;
  score: number;
  passed_count: number;
  total_count: number;
  max_runtime_ms: number;
  max_memory_kb: number;
  compile_output: string;
  testcases: Testcase[];
};

export type ScoreCell = {
  label: string;
  attempts: number;
  solved: boolean;
  penalty_minutes: number;
  solved_at_minutes: number | null;
};

export type ScoreRow = {
  rank: number;
  user_uid: string;
  username: string;
  display_name: string;
  solved: number;
  penalty: number;
  score: number;
  cells: Record<string, ScoreCell>;
};

export type Scoreboard = {
  contest_uid: string;
  frozen: boolean;
  generated_at: string;
  rows: ScoreRow[];
};

/** Verdict → tailwind classes. One mapping, used by every surface that
 *  renders a verdict, so AC is never green in one place and teal in another. */
export const VERDICT_STYLES: Record<string, string> = {
  AC: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  WA: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  TLE: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  MLE: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  OLE: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  RE: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  CE: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  SE: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

export const VERDICT_LABELS: Record<string, string> = {
  AC: "Accepted",
  WA: "Wrong Answer",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  OLE: "Output Limit Exceeded",
  RE: "Runtime Error",
  CE: "Compile Error",
  SE: "System Error",
};

export function verdictClass(v: string | null | undefined): string {
  if (!v) return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return VERDICT_STYLES[v] ?? VERDICT_STYLES.SE;
}
