import type { EventType, ProctorEvent } from "@/lib/types";

type EventTimelineProps = {
  events: ProctorEvent[];
};

type Severity = "critical" | "high" | "medium" | "low" | "neutral";

const EVENT_SEVERITY: Partial<Record<EventType, Severity>> = {
  PRINT_ATTEMPT:             "critical",
  KEYBOARD_SHORTCUT_BLOCKED: "critical",
  DEVTOOLS_SUSPECTED:        "critical",
  NETWORK_OFFLINE:           "high",
  FULLSCREEN_EXIT:           "high",
  TAB_HIDDEN:                "high",
  WINDOW_BLUR:               "medium",
  PASTE:                     "medium",
  COPY:                      "medium",
  CUT:                       "medium",
  IDLE_120S:                 "medium",
  IDLE_60S:                  "low",
  IDLE_30S:                  "low",
  CONTEXT_MENU:              "low",
  MOUSE_LEFT_WINDOW:         "low",
};

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
  high:     "border-orange-500/40 bg-orange-500/10 text-orange-300",
  medium:   "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  low:      "border-white/20 bg-white/5 text-white/60",
  neutral:  "border-white/10 bg-white/5 text-white/40",
};

const EVENT_LABELS: Partial<Record<EventType, string>> = {
  FULLSCREEN_EXIT:           "Fullscreen exit",
  FULLSCREEN_ENTER:          "Fullscreen entered",
  TAB_HIDDEN:                "Tab hidden",
  TAB_VISIBLE:               "Tab visible",
  WINDOW_BLUR:               "Window lost focus",
  WINDOW_FOCUS:              "Window focused",
  COPY:                      "Text copied",
  CUT:                       "Text cut",
  PASTE:                     "Paste detected",
  CONTEXT_MENU:              "Right-click attempt",
  KEYBOARD_SHORTCUT_BLOCKED: "Keyboard shortcut blocked",
  DEVTOOLS_SUSPECTED:        "DevTools suspected",
  MOUSE_LEFT_WINDOW:         "Mouse left window",
  MOUSE_RETURNED:            "Mouse returned",
  IDLE_30S:                  "Idle — 30 seconds",
  IDLE_60S:                  "Idle — 60 seconds",
  IDLE_120S:                 "Idle — 2 minutes",
  NETWORK_OFFLINE:           "Network offline",
  NETWORK_ONLINE:            "Network restored",
  PRINT_ATTEMPT:             "Print attempt",
  SUBMISSION_STARTED:        "Submission started",
  SUBMISSION_COMPLETED:      "Submission completed",
};

export function EventTimeline({ events }: EventTimelineProps) {
  if (!events.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50 backdrop-blur-xl">
        No integrity events recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="space-y-3">
        {events.map((event) => {
          const severity = EVENT_SEVERITY[event.event_type] ?? "neutral";
          const styles   = SEVERITY_STYLES[severity];
          const label    = EVENT_LABELS[event.event_type] ?? event.event_type;

          return (
            <div
              key={event.id}
              className="grid gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0 md:grid-cols-[180px_1fr]"
            >
              <time className="font-mono text-xs text-white/40 pt-0.5">
                {new Date(event.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded border px-2 py-0.5 text-xs font-semibold tracking-wide ${styles}`}>
                    {label}
                  </span>
                  {severity === "critical" || severity === "high" ? (
                    <span className="text-[10px] uppercase tracking-widest text-white/30">
                      {severity}
                    </span>
                  ) : null}
                </div>

                {event.metadata && Object.keys(event.metadata).length > 0 ? (
                  <pre className="mt-2 max-h-36 overflow-auto rounded border border-white/10 bg-black/30 p-3 text-xs leading-5 text-white/50">
                    {JSON.stringify(
                      // Filter out noisy metadata fields for cleaner display
                      Object.fromEntries(
                        Object.entries(event.metadata).filter(
                          ([k]) => !["url", "ts", "viewport"].includes(k)
                        )
                      ),
                      null,
                      2
                    )}
                  </pre>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
