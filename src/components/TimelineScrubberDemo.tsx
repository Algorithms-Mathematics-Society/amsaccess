"use client";

import { useMemo, useState } from "react";
import { Code2 } from "lucide-react";

const timelineStates = [
  {
    time: "10:24",
    label: "Session started",
    event: "fullscreen_enter",
    risk: "Normal",
    answer: ["function deriveAccess(round) {", "  return round.policy.fullscreen;", "}"],
    log: ["> fullscreen boundary armed [OK]", "> response workspace ready [OK]", "> reviewer timeline recording"]
  },
  {
    time: "10:31",
    label: "Autosave checkpoint",
    event: "answer_autosaved",
    risk: "Normal",
    answer: ["function deriveAccess(round) {", "  const evidence = round.timeline;", "  return evidence.capture();", "}"],
    log: ["> answer autosaved at 10:31:04", "> cursor position preserved", "> no policy interruption"]
  },
  {
    time: "10:36",
    label: "Focus event",
    event: "focus_blur",
    risk: "Needs review",
    answer: ["function deriveAccess(round) {", "  const evidence = round.timeline;", "  return evidence.flag(\"focus_blur\");", "}"],
    log: ["> focus_blur observed", "> reviewer marker added", "> session remained active"]
  },
  {
    time: "10:58",
    label: "Submitted",
    event: "submitted",
    risk: "Ready",
    answer: ["function deriveAccess(round) {", "  return reviewPacket.submit({", "    timeline: evidence", "  });", "}"],
    log: ["> final answer saved", "> timeline sealed", "> review packet ready"]
  }
] as const;

export function TimelineScrubberDemo() {
  const [position, setPosition] = useState(1);
  const index = Math.min(timelineStates.length - 1, Math.max(0, Math.round(position)));
  const state = timelineStates[index];

  const progress = useMemo(() => {
    return `${(position / (timelineStates.length - 1)) * 100}%`;
  }, [position]);

  return (
    <div className="glass-card overflow-hidden rounded bg-transparent p-5">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-xs text-white/65 md:text-white/50">
          <Code2 className="h-4 w-4" />
          session-timeline.log
        </div>
        <div key={state.event} className="ams-scrub-fade rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[10px] text-white/40">
          {state.time} · {state.label}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.82fr]">
        <div className="ams-embedded-screen min-h-[230px] rounded p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">answer-state.ts</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${state.risk === "Needs review" ? "border-amber-300/20 bg-amber-300/10 text-amber-100/80" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100/75"}`}>
              {state.risk}
            </span>
          </div>
          <div key={state.event} className="ams-scrub-fade font-mono text-[11px] leading-6">
            {state.answer.map((line, lineIndex) => (
              <p key={`${state.event}-${line}`} className="text-white/58">
                <span className="mr-3 text-white/18">{lineIndex + 1}</span>
                <span className={line.includes("return") || line.includes("const") ? "text-purple-200/80" : "text-white/62"}>{line}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="ams-embedded-screen rounded p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">timeline event</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
          </div>
          <div key={`${state.event}-logs`} className="ams-scrub-fade space-y-2 font-mono text-[10px] leading-5">
            {state.log.map((line) => (
              <p key={line} className="rounded border border-white/[0.04] bg-white/[0.018] px-2 py-1.5 text-white/48">
                {line}
              </p>
            ))}
          </div>
          <div key={`${state.event}-marker`} className="ams-scrub-fade mt-4 rounded border border-purple-300/10 bg-purple-500/[0.045] px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-purple-100/45">current marker</p>
            <p className="mt-1 font-mono text-xs text-purple-100/80">{state.event}</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-white/32">
          <span>10:24</span>
          <span>10:58</span>
        </div>
        <div className="relative">
          <div className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-purple-300/40" style={{ width: progress }} />
          <input
            aria-label="Scrub reviewer timeline"
            type="range"
            min={0}
            max={timelineStates.length - 1}
            step={0.01}
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            className="ams-timeline-slider relative z-10 w-full"
          />
        </div>
      </div>
    </div>
  );
}
