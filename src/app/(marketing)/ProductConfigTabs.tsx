"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export function ProductConfigTabs() {
  const [tab, setTab] = useState<"summary" | "config">("summary");

  return (
    <div className="glass-card flex min-h-[260px] flex-col overflow-x-auto overflow-y-hidden bg-[#09090B] md:overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="flex rounded-full border border-white/10 bg-black/20 p-1">
          {[
            ["summary", "Summary"],
            ["config", "Config"]
          ].map(([value, label]) => (
            <button
              key={value}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${tab === value ? "bg-white text-black" : "text-white/65 hover:text-white md:text-white/50"}`}
              type="button"
              onClick={() => setTab(value as "summary" | "config")}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs tracking-tight text-[#A1A1AA]">ams.session.config</span>
      </div>

      {tab === "summary" ? (
        <div className="grid flex-1 content-center gap-3 bg-[#09090B]/50 p-6">
          {[
            "Desktop session boundary",
            "Fullscreen operating mode",
            "Timeline evidence capture",
            "Reviewer-ready handoff"
          ].map((item) => (
            <div key={item} className="flex items-center justify-between rounded border border-white/10 bg-white/[0.025] px-3 py-2 text-xs">
              <span className="text-white/60">{item}</span>
              <Check className="h-3.5 w-3.5 text-[#8B5CF6]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="min-w-max flex-1 overflow-x-auto bg-[#09090B]/50 p-6 font-mono text-[11px] leading-relaxed text-[#A1A1AA] md:min-w-0 md:overflow-visible">
          <p>{"{"}</p>
          <p className="ml-4"><span className="text-[#38BDF8]">&quot;desktopSession&quot;</span>: <span className="text-[#FDE047]">true</span>,</p>
          <p className="ml-4"><span className="text-[#38BDF8]">&quot;fullscreenMode&quot;</span>: <span className="text-[#FDE047]">&quot;controlled&quot;</span>,</p>
          <p className="ml-4"><span className="text-[#38BDF8]">&quot;evidence&quot;</span>: {"{"}</p>
          <p className="ml-8"><span className="text-[#38BDF8]">&quot;timeline&quot;</span>: <span className="text-[#FDE047]">true</span>,</p>
          <p className="ml-8"><span className="text-[#38BDF8]">&quot;reviewReady&quot;</span>: <span className="text-[#FDE047]">true</span></p>
          <p className="ml-4">{"},"}</p>
          <p className="ml-4"><span className="text-[#38BDF8]">&quot;downloadable&quot;</span>: <span className="text-purple-400">true</span></p>
          <p>{"}"}</p>
        </div>
      )}
    </div>
  );
}
