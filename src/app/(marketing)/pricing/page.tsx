import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight, Monitor } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";
import { PlatformLogo } from "@/components/PlatformLogo";
import { PricingVolumeModeler } from "@/components/PricingVolumeModeler";
import { comparisonGroups, plans } from "./pricingData";

const platforms = ["Windows", "macOS", "Linux"] as const;

export default function PricingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-purple-200 selection:text-purple-900">
      <MarketingHeader />
      <section className="relative min-h-screen overflow-hidden px-5 pb-24 pt-36">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-slate-50/30 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Pricing</p>
            <h1 className="text-5xl font-semibold leading-[0.96] tracking-tight text-slate-900 md:text-7xl">
              Pricing for evaluation infrastructure.
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-slate-500">
              Choose by operating model first, then validate the limits underneath: session isolation, judge capacity, reviewer evidence, deployment, and support.
            </p>
          </div>

          <div className="mt-10 max-w-3xl rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Pricing philosophy</p>
            <p className="mt-3 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              We charge for evaluated sessions, not reviewer seats.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Invite the reviewers, admins, security teams, and program operators you need without slowing the round down. Pricing is tied to the candidate compute, controlled session context, and evidence storage that Access actually runs.
            </p>
          </div>

          <PricingVolumeModeler />

          <div className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                  <Monitor className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Desktop shell architecture</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Downloadable desktop-first shell for controlled sessions across Windows, macOS, and Linux.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                {platforms.map((name) => (
                  <div key={name} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
                    <PlatformLogo platform={name} className="h-4 w-4 text-slate-500" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="mt-16">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">SLAs &amp; trust</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                  Operational guarantees for live rounds.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-500">
                Event and institutional deployments are scoped with uptime windows, response commitments, and evidence retention terms before launch.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Uptime guarantee</p>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">99.99%</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Targeted uptime during contracted event windows, with launch monitoring and escalation paths for high-stakes rounds.
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Support SLA</p>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">1 hour</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Priority response for Event, Institution, and Enterprise tiers during active evaluation windows.
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Evidence retention</p>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Policy-bound</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Session evidence is retained only for the agreed review period, then securely wiped according to deployment policy.
                </p>
              </article>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-500">
              Compliance documentation, data processing terms, and custom retention schedules are available for institutional procurement reviews.
            </div>
          </section>

          <section className="relative mt-24">
            <div className="absolute left-1/2 top-24 -z-10 h-72 w-[64rem] -translate-x-1/2 rounded-full bg-purple-100/60 blur-[120px]" />
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Technical comparison</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                  Limits, isolation, and operating model.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-500">
                Built for teams that need to price infrastructure by control surface, review depth, and deployment ownership rather than a simple seat count.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-[24%] px-5 py-5 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Capability</th>
                      {plans.map((plan) => (
                        <th key={plan.name} className="px-5 py-5 text-sm font-semibold text-slate-900">
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonGroups.map((group) => (
                      <Fragment key={group.category}>
                        <tr key={`${group.category}-heading`}>
                          <td colSpan={5} className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                            <span className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-purple-600">{group.category}</span>
                          </td>
                        </tr>
                        {group.rows.map(([feature, pilot, event, institution, enterprise]) => (
                          <tr
                            key={`${group.category}-${feature}`}
                            className="transition-colors hover:bg-slate-50"
                          >
                            <th className="border-t border-slate-100 px-5 py-4 text-sm font-medium text-slate-700">{feature}</th>
                            <td className="border-t border-l border-slate-100 px-5 py-4 text-sm leading-6 text-slate-500">{pilot}</td>
                            <td className="border-t border-l border-slate-100 px-5 py-4 text-sm leading-6 text-slate-600">{event}</td>
                            <td className="border-t border-l border-slate-100 px-5 py-4 text-sm leading-6 text-slate-700">{institution}</td>
                            <td className="border-t border-l border-slate-100 px-5 py-4 text-sm leading-6 text-slate-700">{enterprise}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-500 shadow-sm md:flex-row md:items-center md:justify-between">
              <span>Need isolation, retention, or deployment terms outside these limits?</span>
              <Link className="inline-flex items-center gap-2 font-semibold text-purple-700 transition hover:text-purple-900" href="/contact">
                Discuss deployment
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
