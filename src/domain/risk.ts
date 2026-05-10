import type { EventType, ProctorEvent } from "@/domain/types";

export const EVENT_RISK_WEIGHTS: Record<EventType, number> = {
  // Fullscreen — strongest signal
  FULLSCREEN_EXIT: 10,
  FULLSCREEN_ENTER: 0,

  // Tab / window focus — very common cheating vector
  TAB_HIDDEN: 8,
  TAB_VISIBLE: 0,
  WINDOW_BLUR: 5,
  WINDOW_FOCUS: 0,

  // Clipboard — moderate signal (could be accidental)
  COPY: 3,
  CUT: 3,
  PASTE: 6,

  // Input interception
  CONTEXT_MENU: 2,
  KEYBOARD_SHORTCUT_BLOCKED: 15, // F12 / Ctrl+Shift+I = strong DevTools intent

  // DevTools heuristic
  DEVTOOLS_SUSPECTED: 12,

  // Mouse left viewport — mild signal (dual monitor use)
  MOUSE_LEFT_WINDOW: 2,
  MOUSE_RETURNED: 0,

  // Idle — mild (bathroom break vs. looking something up externally)
  IDLE_30S: 0,
  IDLE_60S: 3,
  IDLE_120S: 8,

  // Network — notable signal
  NETWORK_OFFLINE: 15,
  NETWORK_ONLINE: 0,

  // Print — strong (trying to capture question content)
  PRINT_ATTEMPT: 20,

  // Answer integrity
  TYPING_SPIKE: 10,  // high cpm burst — possible keyboard macro
  ANSWER_SPIKE: 18,  // large answer delta in one save cycle — possible workaround

  // Lifecycle — no risk
  SUBMISSION_STARTED: 0,
  SUBMISSION_COMPLETED: 0,
};

export function calculateRiskScore(events: Pick<ProctorEvent, "event_type">[]) {
  return Math.min(
    100,
    events.reduce((total, event) => total + (EVENT_RISK_WEIGHTS[event.event_type] ?? 0), 0)
  );
}

export function riskTone(score: number): "Low" | "Moderate" | "High" | "Critical" {
  if (score >= 75) return "Critical";
  if (score >= 40) return "High";
  if (score >= 20) return "Moderate";
  return "Low";
}

export function riskColor(score: number): string {
  if (score >= 75) return "text-red-400 border-red-500/30 bg-red-500/10";
  if (score >= 40) return "text-orange-400 border-orange-500/30 bg-orange-500/10";
  if (score >= 20) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
}
