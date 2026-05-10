"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Clock, FileText, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";

const responseTypes = ["Written response", "Markdown response", "Short answer"];

export default function ControlledRoundPage() {
  const [roundName, setRoundName] = useState("Scholarship writing round");
  const [duration, setDuration] = useState(60);
  const [responseType, setResponseType] = useState(responseTypes[0]);
  const [fullscreenRequired, setFullscreenRequired] = useState(true);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [timelineEnabled, setTimelineEnabled] = useState(true);

  const policy = useMemo(
    () => ({
      round: roundName || "Untitled controlled round",
      duration: `${duration} minutes`,
      responseType,
      fullscreen: fullscreenRequired ? "Required" : "Optional",
      autosave: autosaveEnabled ? "Enabled" : "Disabled",
      reviewTimeline: timelineEnabled ? "Enabled" : "Disabled"
    }),
    [autosaveEnabled, duration, fullscreenRequired, responseType, roundName, timelineEnabled]
  );

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <MarketingHeader />
      <section
        className="raycast-hero ams-hero-grid relative min-h-screen overflow-hidden px-5 pb-24 pt-36"
        style={{
          backgroundImage: "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      >
        <div className="raycast-hero-bg" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6] opacity-20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="ams-label mb-6">Controlled Round</p>
            <h1 className="bg-gradient-to-b from-white via-[#F4F4F5] to-[#A1A1AA] bg-clip-text text-5xl font-semibold leading-[0.96] tracking-tight text-transparent md:text-7xl">
              Configure a controlled round
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/60">
              A small frontend demo of how session policy, review timeline, and activity context can be shaped before an evaluation begins.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
            <section className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-purple-200" />
                <h2 className="text-xl font-semibold tracking-tight text-white">Session policy</h2>
              </div>

              <label className="mt-8 block text-xs font-medium text-white/55">Round name</label>
              <input
                className="mt-2 h-12 w-full rounded border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-purple-500"
                onChange={(event) => setRoundName(event.target.value)}
                value={roundName}
              />

              <label className="mt-6 block text-xs font-medium text-white/55">Duration</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  className="h-12 w-28 rounded border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition focus:border-purple-500"
                  max={240}
                  min={15}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  type="number"
                  value={duration}
                />
                <span className="text-sm text-white/45">minutes</span>
              </div>

              <label className="mt-6 block text-xs font-medium text-white/55">Allowed response type</label>
              <select
                className="mt-2 h-12 w-full rounded border border-white/10 bg-[#09090B] px-4 text-sm text-white outline-none transition focus:border-purple-500"
                onChange={(event) => setResponseType(event.target.value)}
                value={responseType}
              >
                {responseTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>

              <div className="mt-8 grid gap-3">
                <Toggle label="Fullscreen required" onChange={setFullscreenRequired} value={fullscreenRequired} />
                <Toggle label="Autosave enabled" onChange={setAutosaveEnabled} value={autosaveEnabled} />
                <Toggle label="Review timeline enabled" onChange={setTimelineEnabled} value={timelineEnabled} />
              </div>
            </section>

            <section className="glass-card ams-card-featured overflow-hidden p-6 md:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="ams-label mb-4">Live Preview</p>
                  <h2 className="text-3xl font-semibold tracking-tight text-white">Generated session policy</h2>
                </div>
                <Clock className="h-5 w-5 text-white/35" />
              </div>

              <div className="mt-8 rounded border border-white/10 bg-[#09090B] p-5 font-mono text-xs leading-6 text-white/62">
                <p>{`{`}</p>
                <PolicyLine label="round" value={policy.round} />
                <PolicyLine label="duration" value={policy.duration} />
                <PolicyLine label="responseType" value={policy.responseType} />
                <PolicyLine label="fullscreen" value={policy.fullscreen} />
                <PolicyLine label="autosave" value={policy.autosave} />
                <PolicyLine label="reviewTimeline" value={policy.reviewTimeline} last />
                <p>{`}`}</p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <PreviewMetric icon={<ShieldCheck className="h-4 w-4" />} label="Environment" value={policy.fullscreen} />
                <PreviewMetric icon={<FileText className="h-4 w-4" />} label="Response" value={policy.responseType} />
                <PreviewMetric icon={<Clock className="h-4 w-4" />} label="Review" value={policy.reviewTimeline} />
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-[#8B5CF6] hover:text-white" href="/contact">
                  Request access
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white" href="/docs">
                  Read Docs
                </Link>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Toggle({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (next: boolean) => void;
  value: boolean;
}) {
  return (
    <button
      className="flex h-12 items-center justify-between rounded border border-white/10 bg-white/[0.025] px-4 text-left text-sm text-white/70 transition hover:border-white/20"
      onClick={() => onChange(!value)}
      type="button"
    >
      <span>{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition ${value ? "bg-[#8B5CF6]" : "bg-white/15"}`}>
        <span className={`absolute top-1 h-3 w-3 rounded-full bg-white transition ${value ? "left-5" : "left-1"}`} />
      </span>
    </button>
  );
}

function PolicyLine({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <p className="ml-4">
      <span className="text-[#38BDF8]">&quot;{label}&quot;</span>: <span className="text-[#FDE047]">&quot;{value}&quot;</span>
      {last ? "" : ","}
    </p>
  );
}

function PreviewMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.025] p-4">
      <div className="text-white/35">{icon}</div>
      <p className="mt-4 text-xs text-white/35">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
