"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { plans, planStyles } from "@/app/(marketing)/pricing/pricingData";
import { ProctorNetwork } from "@/components/ProctorNetwork";

const sliderMax = 24;
const sliderPower = 1;

const volumeMarks = [
  { label: "Pilot", value: 1 },
  { label: "Event", value: 3 },
  { label: "Institution", value: 10 },
  { label: "Enterprise", value: 20 }
] as const;

function sliderToVolume(sliderValue: number) {
  const ratio = sliderValue / 100;
  const scaled = 1 + (sliderMax - 1) * Math.pow(ratio, sliderPower);
  return Math.round(scaled);
}

function markPosition(value: number) {
  const ratio = Math.pow((value - 1) / (sliderMax - 1), 1 / sliderPower);
  return `${Math.max(0, Math.min(1, ratio)) * 100}%`;
}

function getRecommendedPlanIndex(volume: number) {
  if (volume < 3) return 0;
  if (volume < 10) return 1;
  if (volume < 20) return 2;
  return 3;
}

function formatVolume(volume: number) {
  return new Intl.NumberFormat("en-US").format(volume);
}

export function PricingVolumeModeler() {
  const [sliderValue, setSliderValue] = useState(0);
  const volume = useMemo(() => sliderToVolume(sliderValue), [sliderValue]);
  const recommendedPlanIndex = getRecommendedPlanIndex(volume);
  const recommendedPlan = plans[recommendedPlanIndex];

  return (
    <section className="mt-16">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Volume modeler</p>
            <h2 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              How many evaluated sessions are you running?
            </h2>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Recommended</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{recommendedPlan.name}</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <span className="text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">{formatVolume(volume)}</span>
            <span className="pb-1 text-sm text-slate-400">{volume === 1 ? "session" : "sessions"}</span>
          </div>

          <div className="relative mt-7 pb-9">
            <div
              className="pointer-events-none absolute left-0 top-[0.64rem] h-px rounded-full bg-purple-400/60"
              style={{ width: `${sliderValue}%` }}
            />
            <input
              aria-label="Evaluated sessions"
              className="ams-volume-slider ams-volume-slider-light relative z-10 w-full"
              max={100}
              min={0}
              step={0.1}
              type="range"
              value={sliderValue}
              onChange={(event) => setSliderValue(Number(event.target.value))}
            />
            <div className="pointer-events-none absolute inset-x-0 top-8 h-5">
              {volumeMarks.map((mark) => (
                <span
                  key={mark.label}
                  className="absolute top-0 h-2 w-px -translate-x-1/2 bg-slate-300"
                  style={{ left: markPosition(mark.value) }}
                >
                  <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {mark.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-4">
        {plans.map((plan, index) => {
          const isRecommended = index === recommendedPlanIndex;

          return (
            <article
              key={plan.name}
              className={`relative flex flex-col overflow-hidden rounded-xl border p-6 shadow-sm transition-all ${
                isRecommended
                  ? "border-transparent shadow-xl shadow-black/30"
                  : `bg-white hover:shadow-md ${planStyles[index]}`
              }`}
              style={isRecommended ? { backgroundColor: "rgb(var(--ams-dark))" } : undefined}
            >
              {isRecommended && (
                <ProctorNetwork nodeCount={18} connectDist={90} mouseRadius={110} />
              )}

              <div className="relative z-10 flex min-h-8 items-start justify-between gap-3">
                <h2 className={`text-2xl font-semibold tracking-tight ${isRecommended ? "text-white" : "text-slate-900"}`}>
                  {plan.name}
                </h2>
                {isRecommended ? (
                  <span className="rounded-full border border-purple-400/40 bg-purple-500/20 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-purple-300">
                    Fit
                  </span>
                ) : null}
              </div>

              <p className={`relative z-10 mt-5 min-h-24 text-sm leading-6 ${isRecommended ? "text-white/55" : "text-slate-500"}`}>
                {plan.for}
              </p>

              <div className={`relative z-10 mt-8 border-t pt-5 ${isRecommended ? "border-white/10" : "border-slate-100"}`}>
                <p className={`mb-4 text-xs font-semibold uppercase tracking-[0.24em] ${isRecommended ? "text-white/40" : "text-slate-400"}`}>
                  Capability
                </p>
                <ul className={`grid gap-3 text-sm leading-6 ${isRecommended ? "text-white/60" : "text-slate-500"}`}>
                  {plan.capabilities.map((capability) => (
                    <li key={capability} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                      {capability}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                className={`relative z-10 mt-8 ams-btn ams-btn-md ${
                  isRecommended
                    ? "ams-btn-inverse"
                    : "ams-btn-primary"
                }`}
                href={plan.href}
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
