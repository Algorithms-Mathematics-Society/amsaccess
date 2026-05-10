export type EventType =
  // Fullscreen
  | "FULLSCREEN_ENTER"
  | "FULLSCREEN_EXIT"
  // Tab / window focus
  | "TAB_HIDDEN"
  | "TAB_VISIBLE"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  // Clipboard
  | "COPY"
  | "PASTE"
  | "CUT"
  // Input interception
  | "CONTEXT_MENU"
  | "KEYBOARD_SHORTCUT_BLOCKED"
  // DevTools
  | "DEVTOOLS_SUSPECTED"
  // Mouse
  | "MOUSE_LEFT_WINDOW"
  | "MOUSE_RETURNED"
  // Idle
  | "IDLE_30S"
  | "IDLE_60S"
  | "IDLE_120S"
  // Network
  | "NETWORK_OFFLINE"
  | "NETWORK_ONLINE"
  // Print
  | "PRINT_ATTEMPT"
  // Answer integrity
  | "TYPING_SPIKE"    // chars per minute exceeded threshold (possible macro / keyboard shortcut workaround)
  | "ANSWER_SPIKE"    // answer length jumped dramatically between two save cycles
  // Session lifecycle
  | "SUBMISSION_STARTED"
  | "SUBMISSION_COMPLETED";

export type Assessment = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  duration_minutes: number;
  is_active: boolean;
  status: "DRAFT" | "SCHEDULED" | "LIVE" | "CLOSED" | string;
  instructions: string | null;
  rules: string | null;
  allowed_browsers: string[] | null;
  allowed_devices: string[] | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type QuestionType =
  | "WRITTEN_REASONING"
  | "MATH_DERIVATION"
  | "PROBABILITY_PUZZLE"
  | "ESTIMATION_FERMI"
  | "SYSTEM_DESIGN"
  | "CASE_STUDY"
  | "CODE_PSEUDOCODE_EXPLANATION"
  | "DATA_INTERPRETATION";

export type RubricCriterion = {
  label: string;
  marks: number;
  description?: string;
};

export type QuestionAsset = {
  id: string;
  question_id: string;
  storage_path: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  caption: string | null;
  alt_text: string | null;
  created_at: string;
};

export type Question = {
  id: string;
  assessment_id: string | null;
  order_index: number;
  title: string;
  statement: string;
  max_score: number;
  short_code: string | null;
  type: QuestionType | string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | string;
  tags: string[] | null;
  expected_output: string | null;
  rubric: RubricCriterion[] | null;
  assets: QuestionAsset[] | Record<string, unknown>[] | null;
  status: "DRAFT" | "PUBLISHED" | string;
  requires_final_answer: boolean;
  requires_explanation: boolean;
  allows_diagrams: boolean;
  allows_code: boolean;
  allows_assumptions: boolean;
  allows_multiple_methods: boolean;
  version: number;
  change_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AssessmentQuestion = {
  id: string;
  assessment_id: string;
  question_id: string;
  order_index: number;
  created_at: string;
};

export type Session = {
  id: string;
  assessment_id: string;
  candidate_name: string;
  candidate_email: string;
  started_at: string;
  submitted_at: string | null;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | string;
  risk_score: number;
  user_agent: string | null;
};

export type Answer = {
  id: string;
  session_id: string;
  question_id: string;
  answer_text: string | null;
  final_answer: string | null;
  updated_at: string;
};

export type ProctorEvent = {
  id: string;
  session_id: string;
  event_type: EventType;
  created_at: string;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
};

export type Review = {
  id: string;
  session_id: string;
  score: number | null;
  comments: string | null;
  decision: string | null;
  rubric_scores: Record<string, number | null> | null;
  created_at: string;
};
