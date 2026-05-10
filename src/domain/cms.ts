import type { RubricCriterion } from "@/domain/types";

export const ASSESSMENT_STATUSES = ["DRAFT", "SCHEDULED", "LIVE", "CLOSED"] as const;
export const QUESTION_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export const QUESTION_TYPES = [
  ["WRITTEN_REASONING", "Written reasoning"],
  ["MATH_DERIVATION", "Math derivation"],
  ["PROBABILITY_PUZZLE", "Probability puzzle"],
  ["ESTIMATION_FERMI", "Estimation/Fermi"],
  ["SYSTEM_DESIGN", "System design"],
  ["CASE_STUDY", "Case study"],
  ["CODE_PSEUDOCODE_EXPLANATION", "Code/pseudocode explanation"],
  ["DATA_INTERPRETATION", "Data interpretation"]
] as const;

export const DEFAULT_RUBRIC: RubricCriterion[] = [
  { label: "Correct reasoning", marks: 4, description: "Reasoning is valid and complete." },
  { label: "Assumptions stated", marks: 2, description: "Important assumptions are explicit." },
  { label: "Edge cases", marks: 2, description: "Key edge cases are considered." },
  { label: "Clarity", marks: 1, description: "Explanation is clear and reviewable." },
  { label: "Final answer", marks: 1, description: "Final answer is concise when required." }
];

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatCsv(value: string[] | null | undefined) {
  return (value ?? []).join(", ");
}

export function safeRubric(value: unknown): RubricCriterion[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<RubricCriterion[]>((items, item) => {
    if (!item || typeof item !== "object") return items;
    const record = item as Record<string, unknown>;
    const label = String(record.label ?? "");
    if (!label) return items;
    items.push({
      label,
      marks: Number(record.marks ?? 0),
      description: record.description ? String(record.description) : ""
    });
    return items;
  }, []);
}

export function sanitizeStorageName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
