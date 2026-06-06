"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Clock, FileText, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";

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
    <main className="min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-purple-200 selection:text-purple-900">
      <MarketingHeader />
      <section className="relative min-h-screen overflow-hidden px-5 pb-24 pt-36">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-slate-50/30 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Controlled Round</p>
            <h1 className="text-5xl font-semibold leading-[0.96] tracking-tight text-slate-900 md:text-7xl">
              Configure a controlled round
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-slate-500">
              A small frontend demo of how session policy, review timeline, and activity context can be shaped before an evaluation begins.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-purple-500" />
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Session policy</h2>
              </div>

              <label className="mt-8 block text-xs font-medium text-slate-500">Round name</label>
              <input
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none shadow-sm transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                onChange={(event) => setRoundName(event.target.value)}
                value={roundName}
              />

              <label className="mt-6 block text-xs font-medium text-slate-500">Duration</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  className="h-12 w-28 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  max={240}
                  min={15}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  type="number"
                  value={duration}
                />
                <span className="text-sm text-slate-400">minutes</span>
              </div>

              <label className="mt-6 block text-xs font-medium text-slate-500">Allowed response type</label>
              <select
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
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

            <section className="rounded-2xl border border-purple-200 bg-white overflow-hidden p-6 shadow-sm ring-1 ring-purple-100 md:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-4">Live Preview</p>
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Generated session policy</h2>
                </div>
                <Clock className="h-5 w-5 text-slate-300" />
              </div>

              <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 font-mono text-xs leading-6 text-slate-600">
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
                <Link
                  className="ams-btn ams-btn-primary ams-btn-md"
                  href="/contact"
                >
                  Request access
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  className="ams-btn ams-btn-secondary ams-btn-md"
                  href="/docs"
                >
                  Read Docs
                </Link>
              </div>
            </section>
          </div>
        </div>
      </section>

      <MarketingFooter />
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
      className="flex h-12 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-left text-sm text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
      onClick={() => onChange(!value)}
      type="button"
    >
      <span>{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-purple-500" : "bg-slate-200"}`}>
        <span className={`absolute top-1 h-3 w-3 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-1"}`} />
      </span>
    </button>
  );
}

function PolicyLine({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <p className="ml-4">
      <span className="text-blue-600">&quot;{label}&quot;</span>: <span className="text-purple-600">&quot;{value}&quot;</span>
      {last ? "" : ","}
    </p>
  );
}

function PreviewMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-slate-400">{icon}</div>
      <p className="mt-4 text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
