/** Shared types for the organization side.
 *
 * These mirror ams-api's wire schemas. Keeping them in one file means a
 * backend field rename breaks the build rather than silently rendering
 * `undefined`.
 */

export type ProblemVersion = {
  uid: string;
  version: number;
  time_limit_ms: number;
  memory_limit_mb: number;
  notes: string;
  has_package: boolean;
  created_at: string;
};

export type Problem = {
  uid: string;
  title: string;
  slug: string;
  visibility: string;
  created_at: string;
  versions: ProblemVersion[];
};

export type PackageInspection = {
  problem_name: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  testcase_count: number;
  has_checker: boolean;
  has_validator: boolean;
  has_generator: boolean;
  symbolic_rules: number;
  warnings: string[];
};

export type ContestProblem = {
  uid: string;
  label: string;
  position: number;
  score: number;
  title: string;
  time_limit_ms: number;
  memory_limit_mb: number;
};

export type ContestStatus = "draft" | "scheduled" | "running" | "ended" | string;

export type Contest = {
  uid: string;
  title: string;
  slug: string;
  description: string;
  visibility: string;
  status: ContestStatus;
  starts_at: string;
  ends_at: string;
  is_practice: boolean;
  invite_code: string | null;
  problems: ContestProblem[];
  joined: boolean;
  frozen: boolean;
};

export type ContestSubmission = {
  uid: string;
  problem_label: string;
  language: string;
  status: string;
  created_at: string;
  verdict: string | null;
  score: number;
  passed_count: number;
  total_count: number;
  max_runtime_ms: number;
  max_memory_kb: number;
  compile_output: string;
  username: string;
  display_name: string;
};

/** Colours carry meaning here, so they live next to the type they describe. */
export const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  running: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ended: "bg-slate-100 text-slate-500 border-slate-200",
};

export function statusClass(status: string): string {
  return STATUS_STYLES[status] ?? STATUS_STYLES.draft;
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** "in 3 days", "2 hours ago" — a schedule is easier to sanity-check relatively. */
export function relativeWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const deltaMs = then - Date.now();
  const abs = Math.abs(deltaMs);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [1000 * 60 * 60 * 24, "day"],
    [1000 * 60 * 60, "hour"],
    [1000 * 60, "minute"],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [ms, unit] of units) {
    if (abs >= ms) return rtf.format(Math.round(deltaMs / ms), unit);
  }
  return rtf.format(Math.round(deltaMs / 1000), "second");
}
