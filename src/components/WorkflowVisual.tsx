"use client";

import { Circle, Check } from "lucide-react";
import { TimelineScrubberDemo } from "./TimelineScrubberDemo";
import { ProductConfigTabs } from "../app/(marketing)/ProductConfigTabs";

const metrics = [
  { value: "Windows", label: "desktop installer" },
  { value: "macOS", label: "desktop package" },
  { value: "Linux", label: "desktop build" },
  { value: "Versioned", label: "release notes" }
] as const;

export function WorkflowVisual({ kind }: { kind: string }) {
  if (kind === "direction") {
    return (
      <div className="glass-card grid min-h-[260px] grid-cols-[180px_1fr] overflow-hidden rounded">
        <div className="border-r border-white/10 bg-[#09090B]/50 p-4">
          {["Session", "Fullscreen", "Responses", "Timeline", "Review"].map((item, index) => (
            <div key={item} className="mb-3 flex items-center gap-2 text-xs text-white/60">
              <Circle className={`h-2.5 w-2.5 ${index < 3 ? "fill-[#8B5CF6] text-[#8B5CF6]" : "text-white/20"}`} />
              {item}
            </div>
          ))}
        </div>
        <div className="bg-transparent p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="h-3 w-32 rounded bg-white/10" />
            <div className="h-2 w-20 rounded bg-white/10" />
          </div>
          <div className="space-y-3">
            <div className="h-2 rounded bg-[#8B5CF6]/80" />
            <div className="h-2 w-11/12 rounded bg-white/10" />
            <div className="h-2 w-9/12 rounded bg-white/10" />
            <div className="mt-8 h-20 rounded border border-white/10 bg-[#09090B]" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "handoff") {
    return (
      <div className="glass-card grid min-h-[260px] grid-cols-2 overflow-hidden rounded">
        <div className="border-r border-white/10 bg-transparent p-5">
          <p className="mb-4 text-xs text-white/65 md:text-white/50">Review packet</p>
          {["Written response", "Activity timeline", "Session status", "Reviewer note", "Submit time"].map((item) => (
            <div key={item} className="mb-2 flex items-center justify-between rounded border border-white/10 bg-white/[0.025] px-3 py-2 text-xs">
              <span className="text-white/60">{item}</span>
              <Check className="h-3.5 w-3.5 text-[#8B5CF6]" />
            </div>
          ))}
        </div>
        <div className="bg-[#09090B]/50 p-5">
          <p className="mb-4 text-xs text-white/65 md:text-white/50">Reviewer workflow</p>
          {["Ready", "Needs review", "In review", "Cleared"].map((item, index) => (
            <div key={item} className="mb-3 rounded border border-white/10 bg-[#09090B] p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">{item}</span>
                <span className="text-white/65 md:text-white/40">{index + 4}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "code") {
    return <TimelineScrubberDemo />;
  }

  if (kind === "progress") {
    return (
      <div className="glass-card grid min-h-[280px] gap-5 rounded bg-transparent p-5 md:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded border border-white/10 bg-[#09090B] p-4">
          <p className="mb-5 text-xs text-white/65 md:text-white/50">Product coverage</p>
          {metrics.map(({ value, label }) => (
            <div key={label} className="mb-4 flex items-end justify-between border-b border-white/10 pb-3">
              <span className="text-xs text-white/65 md:text-white/40">{label}</span>
              <span className="text-xl text-white">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-3 rounded border border-white/10 bg-[#09090B] p-5">
          {[42, 72, 34, 86, 58, 68, 47, 92, 63, 76, 39, 83].map((height, index) => (
            <div key={index} className="flex flex-1 flex-col justify-end">
              <div
                className={`rounded-t ${index % 3 === 0 ? "bg-[#8B5CF6]" : index % 3 === 1 ? "bg-cyan-300" : "bg-violet-300"}`}
                style={{ height: `${height}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <ProductConfigTabs />;
}
