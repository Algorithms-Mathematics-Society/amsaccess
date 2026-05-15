import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight, Monitor } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { PlatformLogo } from "@/components/PlatformLogo";
import { PricingVolumeModeler } from "@/components/PricingVolumeModeler";
import { comparisonGroups, plans } from "./pricingData";

const platforms = ["Windows", "macOS", "Linux"] as const;

export default function PricingPage() {
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
        <div className="absolute left-1/2 top-1/2 -z-10 h-[420px] w-[880px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6] opacity-[0.07] blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Pricing</p>
            <h1 className="bg-gradient-to-b from-white via-[#F4F4F5] to-[#A1A1AA] bg-clip-text text-5xl font-semibold leading-[0.96] tracking-tight text-transparent md:text-7xl">
              Pricing for evaluation infrastructure.
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/60">
              Choose by operating model first, then validate the limits underneath: session isolation, judge capacity, reviewer evidence, deployment, and support.
            </p>
          </div>

          <div className="mt-10 max-w-3xl rounded-[8px] border border-white/10 bg-white/[0.026] px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur">
            <p className="ams-label">Pricing philosophy</p>
            <p className="mt-3 text-xl font-semibold tracking-tight text-white md:text-2xl">
              We charge for evaluated sessions, not reviewer seats.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/56">
              Invite the reviewers, admins, security teams, and program operators you need without slowing the round down. Pricing is tied to the candidate compute, controlled session context, and evidence storage that Access actually runs.
            </p>
          </div>

          <PricingVolumeModeler />

          <div className="mt-6 rounded-[8px] border border-white/10 bg-white/[0.035] px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-black/35 text-white">
                  <Monitor className="h-5 w-5" />
                </span>
                <div>
                  <p className="ams-label">Desktop shell architecture</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                    Downloadable desktop-first shell for controlled sessions across Windows, macOS, and Linux.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                {platforms.map((name) => (
                  <div key={name} className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-black/30 px-3 text-sm font-medium text-white/70">
                    <PlatformLogo platform={name} className="h-4 w-4 text-white/75" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="mt-16">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="ams-label">SLAs & trust</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Operational guarantees for live rounds.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-white/52">
                Event and institutional deployments are scoped with uptime windows, response commitments, and evidence retention terms before launch.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="ams-trust-card rounded-[8px] border border-white/10 p-5">
                <p className="ams-label">Uptime guarantee</p>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-white">99.99%</p>
                <p className="mt-3 text-sm leading-6 text-white/54">
                  Targeted uptime during contracted event windows, with launch monitoring and escalation paths for high-stakes rounds.
                </p>
              </article>

              <article className="ams-trust-card rounded-[8px] border border-white/10 p-5">
                <p className="ams-label">Support SLA</p>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-white">1 hour</p>
                <p className="mt-3 text-sm leading-6 text-white/54">
                  Priority response for Event, Institution, and Enterprise tiers during active evaluation windows.
                </p>
              </article>

              <article className="ams-trust-card rounded-[8px] border border-white/10 p-5">
                <p className="ams-label">Evidence retention</p>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-white">Policy-bound</p>
                <p className="mt-3 text-sm leading-6 text-white/54">
                  Session evidence is retained only for the agreed review period, then securely wiped according to deployment policy.
                </p>
              </article>
            </div>

            <div className="mt-4 rounded-[8px] border border-white/10 bg-black/35 px-5 py-4 text-sm leading-6 text-white/48">
              Compliance documentation, data processing terms, and custom retention schedules are available for institutional procurement reviews.
            </div>
          </section>

          <section className="relative mt-24">
            <div className="absolute left-1/2 top-24 -z-10 h-72 w-[64rem] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[120px]" />
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="ams-label">Technical comparison</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  Limits, isolation, and operating model.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-white/52">
                Built for teams that need to price infrastructure by control surface, review depth, and deployment ownership rather than a simple seat count.
              </p>
            </div>

            <div className="ams-pricing-matrix overflow-hidden rounded-[8px] border border-white/10 bg-[#050506]/85 shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="w-[24%] px-5 py-5 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-white/38">Capability</th>
                      {plans.map((plan) => (
                        <th key={plan.name} className="px-5 py-5 text-sm font-semibold text-white">
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonGroups.map((group) => (
                      <Fragment key={group.category}>
                        <tr key={`${group.category}-heading`}>
                          <td colSpan={5} className="border-t border-white/10 bg-white/[0.025] px-5 py-3">
                            <span className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-purple-200/55">{group.category}</span>
                          </td>
                        </tr>
                        {group.rows.map(([feature, pilot, event, institution, enterprise]) => (
                          <tr key={`${group.category}-${feature}`} className="ams-pricing-matrix-row">
                            <th className="border-t border-white/[0.07] px-5 py-4 text-sm font-medium text-white/72">{feature}</th>
                            <td className="border-t border-white/[0.07] px-5 py-4 text-sm leading-6 text-white/52">{pilot}</td>
                            <td className="border-t border-white/[0.07] px-5 py-4 text-sm leading-6 text-white/60">{event}</td>
                            <td className="border-t border-white/[0.07] px-5 py-4 text-sm leading-6 text-white/68">{institution}</td>
                            <td className="border-t border-white/[0.07] px-5 py-4 text-sm leading-6 text-white/68">{enterprise}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-[8px] border border-white/10 bg-white/[0.025] px-5 py-4 text-sm leading-6 text-white/52 md:flex-row md:items-center md:justify-between">
              <span>Need isolation, retention, or deployment terms outside these limits?</span>
              <Link className="inline-flex items-center gap-2 font-semibold text-purple-200/80 transition hover:text-white" href="/contact">
                Discuss deployment
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
