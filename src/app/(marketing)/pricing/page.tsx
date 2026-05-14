import Link from "next/link";
import { ArrowRight, Monitor } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { PlatformLogo } from "@/components/PlatformLogo";

const plans = [
  {
    name: "Pilot",
    for: "For teams validating controlled rounds with a small cohort.",
    capabilities: ["Fullscreen controlled sessions", "Written response workflows", "Reviewer timeline controls"],
    cta: "Request access",
    href: "/contact"
  },
  {
    name: "Event",
    for: "For hiring windows, olympiads, scholarship rounds, and one-time evaluations.",
    capabilities: ["Operational visibility", "Session timelines", "Reviewer evidence collection"],
    cta: "Request access",
    href: "/contact"
  },
  {
    name: "Institution",
    for: "For universities and organizations running recurring high-trust evaluations.",
    capabilities: ["Operational visibility", "Session timelines", "Autoscaling judge fleet"],
    cta: "Contact us",
    href: "/contact"
  },
  {
    name: "Enterprise",
    for: "For custom deployment, procurement, and integration requirements.",
    capabilities: ["Autoscaling judge fleet", "Operational visibility", "Deployment planning"],
    cta: "Contact us",
    href: "/contact"
  }
];

const planStyles = [
  "border-white/10",
  "border-purple-300/15",
  "border-purple-300/25 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.11),transparent_18rem)]",
  "border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012))]"
];

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
        <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6] opacity-20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Pricing</p>
            <h1 className="bg-gradient-to-b from-white via-[#F4F4F5] to-[#A1A1AA] bg-clip-text text-5xl font-semibold leading-[0.96] tracking-tight text-transparent md:text-7xl">
              Plans for high-trust evaluation.
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/60">
              Choose by operating model: pilot, event, institution, or custom deployment. Exact pricing is handled through access requests and procurement conversations.
            </p>
          </div>

          <div className="mt-20 grid gap-5 md:grid-cols-4">
            {plans.map((plan, index) => (
              <article key={plan.name} className={`glass-card ams-pricing-card flex flex-col p-6 ${planStyles[index]} ${index === 2 ? "ams-card-featured" : ""}`}>
                <h2 className="text-2xl font-semibold tracking-tight text-white">{plan.name}</h2>
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
            ))}
          </div>

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
        </div>
      </section>
    </main>
  );
}
