"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { plans, planStyles } from "@/app/(marketing)/pricing/pricingData";

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
  if (volume < 3) {
    return 0;
  }

  if (volume < 10) {
    return 1;
  }

  if (volume < 20) {
    return 2;
  }

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
      <div className="ams-volume-modeler rounded-[8px] border border-white/10 p-5 md:p-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="ams-label">Volume modeler</p>
            <h2 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight text-white md:text-4xl">
              How many evaluated sessions are you running?
            </h2>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-black/50 px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-white/35">Recommended</p>
            <p className="mt-1 text-lg font-semibold text-white">{recommendedPlan.name}</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <span className="text-4xl font-semibold tracking-tight text-white md:text-6xl">{formatVolume(volume)}</span>
            <span className="pb-1 text-sm text-white/45">{volume === 1 ? "session" : "sessions"}</span>
          </div>

          <div className="relative mt-7 pb-9">
            <div
              className="pointer-events-none absolute left-0 top-[0.64rem] h-px rounded-full bg-purple-300/45"
              style={{ width: `${sliderValue}%` }}
            />
            <input
              aria-label="Evaluated sessions"
              className="ams-volume-slider relative z-10 w-full"
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
                  className="absolute top-0 h-2 w-px -translate-x-1/2 bg-white/14"
                  style={{ left: markPosition(mark.value) }}
                >
                  <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-white/34">
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
              className={`glass-card ams-pricing-card flex flex-col p-6 ${planStyles[index]}`}
              data-recommended={isRecommended ? "true" : "false"}
            >
              <div className="flex min-h-8 items-start justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-white">{plan.name}</h2>
                {isRecommended ? (
                  <span className="rounded-full border border-purple-200/20 bg-purple-300/10 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-purple-100/80">
                    Fit
                  </span>
                ) : null}
              </div>
              <p className="mt-5 min-h-24 text-sm leading-6 text-white/55">{plan.for}</p>
              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="ams-label mb-4">Capability</p>
                <ul className="grid gap-3 text-sm leading-6 text-white/55">
                  {plan.capabilities.map((capability) => (
                    <li key={capability}>{capability}</li>
                  ))}
                </ul>
              </div>
              <Link className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-violet-500 hover:text-white" href={plan.href}>
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
